"""
LangGraph Agent Pipeline — Orchestration Graph.

Defines the directed acyclic graph (DAG) that orchestrates all agent nodes.
The pipeline adapts its depth based on the analysis mode:

  Quick:   Semantic → Coder → Executor → Critic → Narrator → END
  Deep:    Semantic → Audit → Coder → Executor → Critic → Confidence → Narrator → Viz → Followup → END
  Compare: Same as Deep, with comparison-specific prompts at each stage.

Self-correction loops (Executor → Coder) retry up to 2 times on failures.
"""
from langgraph.graph import StateGraph, END
from agents.agent_state import AgentState
from agents import semantic_agent, assumptions_auditor, coder_agent, critic_agent, confidence_scorer, narrator_agent, followup_agent
from services import data_engine, viz_recommender

def _execute_node(state: dict) -> dict:
    if state.get("generated_code"):
        result = data_engine.execute_query(
            state["session_id"],
            state["generated_code"],
            state["code_type"],
            state["selected_sources"] or state["source_ids"],
            state.get("cross_db_query", False)
        )
        state["execution_result"] = result
        if result.get("error"):
            state["execution_error"] = result["error"]
        else:
            state["execution_error"] = None
    return state

def _viz_node(state: dict) -> dict:
    if state.get("execution_result") and not state.get("visualization"):
        state["visualization"] = viz_recommender.recommend_viz(
            state["user_question"], state["execution_result"]
        )
    return state

def _route_after_semantic(state):
    # Off-topic questions already have insight_narrative set — skip to END
    if state.get("intent_type") == "offtopic":
        return END
    return "audit" if state["mode"] in ["deep", "compare"] else "coder"

def _route_after_executor(state):
    if state.get("execution_error") and state.get("retry_count", 0) < 2:
        return "self_correct"
    return "critic"

def _route_after_critic(state):
    # Retry if results aren't verified (Deep or Compare mode)
    if not state.get("is_verified") and state.get("retry_count", 0) < 2 and state["mode"] in ["deep", "compare"]:
        return "self_correct"
    
    return "confidence" if state["mode"] in ["deep", "compare"] else "narrator"

def _route_after_narrator(state):
    return END if state["mode"] == "quick" else "viz"

def _route_after_viz(state):
    return END if state["mode"] == "quick" else "followup"

def build_graph() -> StateGraph:
    graph = StateGraph(AgentState)

    graph.add_node("semantic", semantic_agent.run)
    graph.add_node("audit", assumptions_auditor.run)
    graph.add_node("coder", coder_agent.run)
    graph.add_node("executor", _execute_node)
    graph.add_node("self_correct", coder_agent.run_correction)
    graph.add_node("critic", critic_agent.run)
    graph.add_node("confidence", confidence_scorer.run)
    graph.add_node("narrator", narrator_agent.run)
    graph.add_node("viz", _viz_node)
    graph.add_node("followup", followup_agent.run)

    graph.set_entry_point("semantic")

    graph.add_conditional_edges("semantic", _route_after_semantic, {
        "audit": "audit",
        "coder": "coder",
        END: END,
    })
    graph.add_edge("audit", "coder")
    graph.add_edge("coder", "executor")
    graph.add_conditional_edges("executor", _route_after_executor, {
        "self_correct": "self_correct",
        "critic": "critic"
    })
    graph.add_edge("self_correct", "executor")
    graph.add_conditional_edges("critic", _route_after_critic, {
        "self_correct": "self_correct",
        "confidence": "confidence",
        "narrator": "narrator"
    })
    graph.add_edge("confidence", "narrator")
    graph.add_conditional_edges("narrator", _route_after_narrator, {
        "viz": "viz",
        END: END
    })
    graph.add_conditional_edges("viz", _route_after_viz, {
        "followup": "followup",
        END: END
    })
    graph.add_edge("followup", END)

    return graph.compile()

compiled_graph = build_graph()
