"""
Semantic Agent — Intent Resolution & Source Selection.

First node in the LangGraph pipeline. Interprets the user's natural-language
question, maps business terms to SQL expressions via a metric dictionary,
selects the most relevant data sources, and produces a precise analytical
re-statement of the question for downstream agents.
"""
from services.groq_client import call_groq, MODEL_RELIABILITY
from services.metric_dictionary import get_metric_dict_prompt
import json
from datetime import datetime


def run(state: dict) -> dict:
    sources_summary = _format_sources(state["available_sources"])
    all_source_ids = [s["source_id"] for s in state["available_sources"]]
    metric_dict = get_metric_dict_prompt()
    history = state["conversation_history"][-5:]
    system = f"""You are a Semantic Data Analyst. Your job:
1. Read the user's question and understand the analytical intent.
2. Select relevant sources/tables (match by table/column names).
3. Map business terms to SQL expressions.
4. Rewrite as a precise analytical question.

MODE is: {state['mode']}
- quick: Focus on direct intent. Minimize complexity.
- deep: Exhaustive mapping and rigor. High accuracy.
- compare: Specifically identify comparison groups (e.g. Group A vs B) or time periods (e.g. Jan vs Feb). Ensure metrics for BOTH are mapped.

AVAILABLE SOURCES:
{sources_summary}

METRIC DICTIONARY:
{metric_dict}

CONVERSATION HISTORY:
{json.dumps(history)}

Return ONLY valid JSON:
{{
  "resolved_question": "precise re-statement",
  "intent_type": "lookup|aggregation|ranking|comparison|trend",
  "selected_sources": ["<exact source_id>"],
  "cross_db_query": false,
  "metric_mappings": {{"business term": "SQL expression"}},
  "assumptions": [{{"statement": "...", "risk": "SAFE|RISKY|UNKNOWN", "mitigation": "..."}}],
  "source_rationale": "why these sources?"
}}"""

    try:
        result = call_groq(system, state["user_question"], temperature=0.1, model=MODEL_RELIABILITY)
    except Exception:
        result = {}

    # Validate selected_sources — only keep IDs that actually exist
    raw_selected = result.get("selected_sources", [])
    valid_selected = [sid for sid in raw_selected if sid in all_source_ids]
    if not valid_selected:
        valid_selected = all_source_ids

    state["resolved_question"] = result.get("resolved_question", state["user_question"])
    state["selected_sources"] = valid_selected
    state["cross_db_query"] = result.get("cross_db_query", False) and len(valid_selected) > 1
    state["metric_mappings"] = result.get("metric_mappings", {})
    state["assumptions"] = result.get("assumptions", [])

    # Build selected source names for display
    selected_source_names = [
        s["name"] for s in state["available_sources"] if s["source_id"] in valid_selected
    ]

    if not isinstance(state.get("trust_trace"), list):
        state["trust_trace"] = []

    state["trust_trace"].append({
        "agent": "Semantic Agent",
        "action": "Intent Resolution",
        "output": state["resolved_question"],
        "details": {
            "intent": state["resolved_question"],
            "intent_type": result.get("intent_type", "aggregation"),
            "sources": selected_source_names,
            "source_rationale": result.get("source_rationale", ""),
            "metric_mappings": state["metric_mappings"],
            "assumptions": state["assumptions"],
        },
        "color": "agent-semantic",
        "timestamp": datetime.utcnow().isoformat(),
    })
    return state


def _format_sources(sources: list) -> str:
    lines = []
    for s in sources:
        lines.append(
            f"Source ID: {s['source_id']} | Name: {s['name']} | "
            f"Type: {s.get('db_type', 'unknown')} | Safe name: {s['safe_name']}"
        )
        for tname, tinfo in s.get("schema", {}).get("tables", {}).items():
            cols = [c["name"] for c in tinfo.get("columns", [])]
            lines.append(
                f"  Table: \"{tname}\" ({tinfo.get('row_count', '?')} rows) | "
                f"Columns: {', '.join(cols)}"
            )
    return "\n".join(lines) if lines else "No sources available"
