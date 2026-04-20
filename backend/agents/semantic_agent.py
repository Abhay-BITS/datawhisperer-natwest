"""
Semantic Agent — Intent Resolution & Source Selection.

First node in the LangGraph pipeline. Interprets the user's natural-language
question, maps business terms to SQL expressions via a metric dictionary,
selects the most relevant data sources, and produces a precise analytical
re-statement of the question for downstream agents.

Special cases handled:
- Off-topic / conversational questions (e.g. "what is the weather?", "tell me a joke")
  are detected and short-circuited before any SQL is generated.
- Descriptive / exploratory questions ("explain the database", "what tables do we have")
  are routed to a schema-overview path.
"""
from services.groq_client import call_groq, MODEL_RELIABILITY
from services.metric_dictionary import get_metric_dict_prompt
import json
from datetime import datetime

# Questions that indicate schema exploration, not a metric query
_DESCRIPTIVE_KEYWORDS = {
    "explain", "describe", "overview", "what tables", "what data",
    "what columns", "schema", "structure", "show me what", "what do we have",
    "what's in", "whats in", "tell me about", "summarise", "summarize",
    "what information", "what fields", "what does this", "show tables",
}

# Hard off-topic signals — nothing to do with data analysis
_OFFTOPIC_KEYWORDS = {
    "weather", "joke", "recipe", "movie", "sport", "football", "cricket",
    "stock price", "news", "politics", "who is", "what is the capital",
    "tell me a", "write a poem", "write me", "generate code", "help me code",
    "translate", "what time is it", "who won", "how to cook",
}


def _is_descriptive(question: str) -> bool:
    q = question.lower()
    return any(kw in q for kw in _DESCRIPTIVE_KEYWORDS) and not any(
        kw in q for kw in ["compare", "vs", "trend", "growth", "total", "count"]
    )


def _is_offtopic(question: str, schema_summary: str) -> bool:
    """Return True if the question has nothing to do with the connected data."""
    q = question.lower()
    # Hard keyword check first (fast path)
    if any(kw in q for kw in _OFFTOPIC_KEYWORDS):
        return True
    # If the question contains no word that appears in any table/column name,
    # and it's very short and conversational, flag it
    schema_words = set(w.lower() for w in schema_summary.replace(",", " ").split())
    question_words = set(q.split())
    overlap = question_words & schema_words
    # A data question almost always overlaps at least one schema term
    if not overlap and len(question_words) < 6 and "?" in question:
        return True
    return False


def run(state: dict) -> dict:
    sources_summary = _format_sources(state["available_sources"])
    all_source_ids = [s["source_id"] for s in state["available_sources"]]
    question = state["user_question"]

    if not isinstance(state.get("trust_trace"), list):
        state["trust_trace"] = []

    # ── Off-topic guard ───────────────────────────────────────────────────────
    if _is_offtopic(question, sources_summary):
        state["resolved_question"] = question
        state["intent_type"] = "offtopic"
        state["selected_sources"] = all_source_ids
        state["cross_db_query"] = False
        state["metric_mappings"] = {}
        state["assumptions"] = []
        state["available_table_names"] = []
        state["trust_trace"].append({
            "agent": "Semantic Agent",
            "action": "Off-topic Detected",
            "output": "Question is not related to the connected data.",
            "details": {"intent_type": "offtopic"},
            "color": "agent-semantic",
            "timestamp": datetime.utcnow().isoformat(),
        })
        # Short-circuit: inject a clear narrative immediately so downstream agents
        # know not to generate SQL
        state["insight_narrative"] = (
            "That question doesn't seem to be about your connected data. "
            "I can only answer questions about the tables and columns in your data sources. "
            "Try asking something like: 'What is the total revenue?' or "
            "'Show me the top 10 customers by value.'"
        )
        state["execution_result"] = None
        state["generated_code"] = ""
        state["tables_used"] = []
        return state

    # ── Descriptive / schema-overview fast-path ───────────────────────────────
    if _is_descriptive(question):
        intent_type = "describe"
    else:
        intent_type = None  # LLM decides

    metric_dict = get_metric_dict_prompt()
    history = state["conversation_history"][-6:]

    system = f"""You are a Semantic Data Analyst. Your job:
1. Understand the user's precise analytical intent.
2. Select the most relevant data sources and tables.
3. Map any business/domain terms to SQL-ready column expressions.
4. Rewrite the question as an unambiguous analytical instruction.

=== ANALYSIS MODE: {state['mode']} ===
- quick:   Answer the most direct version. Prefer single-table lookups.
- deep:    Exhaustive analysis. Map all relevant metrics. Include breakdowns.
- compare: Identify BOTH comparison groups or time periods explicitly.

=== INTENT TYPE GUIDE ===
- lookup:      Single-row or single-value retrieval.
- aggregation: SUM, COUNT, AVG across a dimension.
- ranking:     TOP N / BOTTOM N.
- comparison:  Two groups or two periods side-by-side.
- trend:       Values over time.
- describe:    Schema overview — user wants to know what tables/columns exist.
- offtopic:    Question has nothing to do with the data (weather, jokes, general chat).
               Set this ONLY if the question is completely unrelated to any table or column.

=== AVAILABLE SOURCES & TABLES ===
{sources_summary}

=== METRIC DICTIONARY ===
{metric_dict}

=== CONVERSATION HISTORY (last 6 turns) ===
{json.dumps(history)}

=== CRITICAL RULES ===
- selected_sources must contain ONLY source_ids listed above.
- If intent_type is "describe", set resolved_question to:
  "Provide a schema overview listing all available tables and their columns."
- If intent_type is "offtopic", set resolved_question to the original question unchanged.
- For compare mode: resolved_question MUST name both groups being compared.
- Never invent table names. Only reference tables shown in AVAILABLE SOURCES.

Return ONLY valid JSON (no markdown):
{{
  "resolved_question": "precise re-statement",
  "intent_type": "lookup|aggregation|ranking|comparison|trend|describe|offtopic",
  "selected_sources": ["<exact source_id>"],
  "cross_db_query": false,
  "metric_mappings": {{"business term": "SQL expression or column name"}},
  "assumptions": [{{"statement": "...", "risk": "SAFE|RISKY|UNKNOWN", "mitigation": "..."}}],
  "source_rationale": "one sentence",
  "tables_hint": ["table_name_1"]
}}"""

    try:
        result = call_groq(system, question, temperature=0.1, model=MODEL_RELIABILITY)
    except Exception:
        result = {}

    resolved_intent = result.get("intent_type", intent_type or "aggregation")

    # If LLM itself classified as off-topic, short-circuit same way
    if resolved_intent == "offtopic":
        state["resolved_question"] = question
        state["intent_type"] = "offtopic"
        state["selected_sources"] = all_source_ids
        state["cross_db_query"] = False
        state["metric_mappings"] = {}
        state["assumptions"] = []
        state["available_table_names"] = []
        state["trust_trace"].append({
            "agent": "Semantic Agent",
            "action": "Off-topic Detected (LLM confirmed)",
            "output": "Question is not related to the connected data.",
            "details": {"intent_type": "offtopic"},
            "color": "agent-semantic",
            "timestamp": datetime.utcnow().isoformat(),
        })
        state["insight_narrative"] = (
            "That question doesn't seem to be about your connected data. "
            "I can only answer questions about the tables and columns in your data sources. "
            "Try asking something like: 'What is the total revenue?' or "
            "'Show me the top 10 rows from the data.'"
        )
        state["execution_result"] = None
        state["generated_code"] = ""
        state["tables_used"] = []
        return state

    # Validate selected_sources
    raw_selected = result.get("selected_sources", [])
    valid_selected = [sid for sid in raw_selected if sid in all_source_ids]
    if not valid_selected:
        valid_selected = all_source_ids

    state["resolved_question"] = result.get("resolved_question", question)
    state["intent_type"] = resolved_intent
    state["selected_sources"] = valid_selected
    state["cross_db_query"] = result.get("cross_db_query", False) and len(valid_selected) > 1
    state["metric_mappings"] = result.get("metric_mappings", {})
    state["assumptions"] = result.get("assumptions", [])

    # Collect all real table names across selected sources
    all_tables_in_selected: list[str] = []
    for src in state["available_sources"]:
        if src["source_id"] in valid_selected:
            all_tables_in_selected.extend(src.get("schema", {}).get("tables", {}).keys())
    state["available_table_names"] = all_tables_in_selected

    selected_source_names = [
        s["name"] for s in state["available_sources"] if s["source_id"] in valid_selected
    ]

    state["trust_trace"].append({
        "agent": "Semantic Agent",
        "action": "Intent Resolution",
        "output": state["resolved_question"],
        "details": {
            "intent": state["resolved_question"],
            "intent_type": state["intent_type"],
            "sources": selected_source_names,
            "tables_available": all_tables_in_selected,
            "source_rationale": result.get("source_rationale", ""),
            "metric_mappings": state["metric_mappings"],
            "assumptions": state["assumptions"],
        },
        "color": "agent-semantic",
        "timestamp": datetime.utcnow().isoformat(),
    })
    return state


def _format_sources(sources: list) -> str:
    if not sources:
        return "No sources connected."
    lines = []
    for s in sources:
        lines.append(
            f"Source ID: {s['source_id']} | Name: {s['name']} | "
            f"Type: {s.get('db_type', 'unknown')} | Safe name: {s['safe_name']}"
        )
        tables = s.get("schema", {}).get("tables", {})
        for tname, tinfo in tables.items():
            cols = [c["name"] for c in tinfo.get("columns", [])]
            col_types = {c["name"]: c.get("type", "?") for c in tinfo.get("columns", [])}
            col_display = ", ".join(f"{c} ({col_types[c]})" for c in cols[:20])
            lines.append(
                f"  Table: \"{tname}\"  ({tinfo.get('row_count', '?')} rows) | "
                f"Columns: {col_display}"
            )
    return "\n".join(lines)
