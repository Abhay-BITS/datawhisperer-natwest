"""
Chat Router — Main Analysis Endpoint.

Receives a natural-language question, invokes the full LangGraph agent
pipeline, and returns a structured response containing the business
narrative, execution results, visualization config, trust trace, and
confidence score.
"""
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from agents.graph import compiled_graph
from agents.agent_state import AgentState
from services.session_store import get_session, append_history, create_session
from services.source_store import list_sources
from services.data_engine import execute_query
from services.viz_recommender import recommend_viz
from services.error_reporter import report_error
import traceback

router = APIRouter()

@router.post("/api/chat")
async def chat(body: dict):
    try:
        session_id = body.get("session_id") or create_session()
        session = get_session(session_id)
        sources = list_sources(session_id)

        if not sources:
            return {"error": "No data sources connected. Please connect a database first.", "session_id": session_id}

        # Use history from request if provided (allows context persistence after server restart)
        history_history = body.get("history_override")
        if history_history is None:
            history_history = session.get("history", [])[-5:]

        initial_state: AgentState = {
            "session_id": session_id,
            "user_question": body["message"],
            "mode": body.get("mode", "deep"),
            "source_ids": body.get("source_ids") or [s.source_id for s in sources],
            "conversation_history": history_history,
            "available_sources": [{
                "source_id": s.source_id,
                "name": s.name,
                "safe_name": s.safe_name,
                "db_type": s.db_type.value,
                "schema": s.schema
            } for s in sources],
            # Semantic stage
            "resolved_question": "",
            "intent_type": "aggregation",
            "metric_mappings": {},
            "assumptions": [],
            "selected_sources": [],
            "cross_db_query": False,
            "available_table_names": [],
            # Audit stage
            "audit_result": None,
            # Code generation stage
            "generated_code": "",
            "code_type": "sql",
            "code_explanation": "",
            "tables_used": [],
            "retry_count": 0,
            # Execution stage
            "execution_result": None,
            "execution_error": None,
            # Verification stage
            "is_verified": False,
            "verification_note": "",
            "value_plausible": True,
            # Confidence stage
            "confidence_score": None,
            "confidence_reasoning": None,
            # Output stage
            "insight_narrative": "",
            "visualization": {},
            "suggested_followups": [],
            "trust_trace": [],
            "voice_mode": body.get("voice_mode", False),
            "response_language": body.get("response_language", "en"),
            "final_error": None,
        }

        state = compiled_graph.invoke(initial_state)

        # Execute query if not already done by graph nodes
        if state.get("generated_code") and not state.get("execution_result"):
            state["execution_result"] = execute_query(
                session_id,
                state["generated_code"],
                state.get("code_type", "sql"),
                state.get("selected_sources") or state.get("source_ids", []),
                state.get("cross_db_query", False)
            )
            if state["execution_result"].get("error"):
                state["execution_error"] = state["execution_result"]["error"]

        # Viz recommendation if not done
        if not state.get("visualization") and state.get("execution_result"):
            state["visualization"] = recommend_viz(
                state["user_question"], state["execution_result"]
            )

        append_history(session_id, "user", body["message"])
        append_history(session_id, "assistant", state.get("insight_narrative", ""))

        return {
            "session_id": session_id,
            "user_message": body["message"],
            "mode": state.get("mode"),
            "insight_narrative": state.get("insight_narrative", ""),
            "execution_result": state.get("execution_result"),
            "visualization": state.get("visualization", {}),
            "assumptions": state.get("assumptions", []),
            "trust_trace": state.get("trust_trace", []),
            "confidence_score": state.get("confidence_score"),
            "confidence_reasoning": state.get("confidence_reasoning"),
            "suggested_followups": state.get("suggested_followups", []),
            "generated_code": state.get("generated_code", ""),
            "code_explanation": state.get("code_explanation", ""),
            "is_verified": state.get("is_verified", False),
            "verification_note": state.get("verification_note", ""),
            "resolved_question": state.get("resolved_question", ""),
            "error": state.get("final_error")
        }

    except Exception as e:
        traceback.print_exc()
        # Send error report via email or local log
        report_error(e, context={
            "endpoint": "/api/chat",
            "message": body.get("message", ""),
            "mode": body.get("mode", ""),
            "session_id": body.get("session_id", ""),
        })
        return JSONResponse(status_code=500, content={
            "error": f"Analysis failed: {str(e)}",
            "session_id": body.get("session_id", "")
        })

@router.get("/api/chat/history")
async def get_history(session_id: str):
    from services.session_store import get_history
    return {"history": get_history(session_id)}
