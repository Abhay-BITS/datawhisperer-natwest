"""
Follow-up Agent — Contextual Question Suggestions.

Generates 3 follow-up questions that:
- Are grounded in columns that actually exist in the result
- Produce chart-ready (multi-row) output when answered
- Are validated against the real schema before being returned
"""
from services.groq_client import call_groq, MODEL_RELIABILITY
from services.data_engine import get_result_summary
import re


def _col_vocab(state: dict) -> set[str]:
    """Return every column name (and its human-readable form) across all selected sources."""
    vocab: set[str] = set()
    selected = set(state.get("selected_sources") or state.get("source_ids", []))
    for src in state.get("available_sources", []):
        if src["source_id"] not in selected:
            continue
        for _, tinfo in src.get("schema", {}).get("tables", {}).items():
            for c in tinfo.get("columns", []):
                raw = c["name"].lower()
                vocab.add(raw)
                vocab.add(raw.replace("_", " "))
                vocab.update(raw.replace("_", " ").split())
    # Also add every column from the current result (they definitely exist)
    for col in state.get("execution_result", {}).get("columns", []):
        raw = col.lower()
        vocab.add(raw)
        vocab.add(raw.replace("_", " "))
        vocab.update(raw.replace("_", " ").split())
    return vocab


def _is_valid(question: str, vocab: set[str]) -> bool:
    """Reject questions that reference concepts not present in the schema."""
    stopwords = {
        "which", "what", "how", "does", "the", "a", "an", "by", "of", "in",
        "is", "are", "was", "for", "to", "do", "top", "each", "across",
        "between", "and", "or", "vs", "per", "over", "from", "compare",
        "show", "give", "me", "us", "with", "has", "have", "highest",
        "lowest", "most", "least", "best", "worst", "total", "average",
        "trend", "breakdown", "distribution", "number", "count", "last",
        "year", "month", "quarter", "week", "previous", "next", "drill",
        "down", "further", "detail", "more", "other", "another",
    }
    words = re.sub(r"[^a-z0-9 ]", "", question.lower()).split()
    suspicious = [w for w in words if w not in stopwords and len(w) > 3 and w not in vocab]
    return len(suspicious) <= 1


def run(state: dict) -> dict:
    exec_result = state.get("execution_result", {}) or {}
    result_summary = get_result_summary(exec_result)
    result_columns = exec_result.get("columns", [])
    resolved_q = state.get("resolved_question", state["user_question"])
    mode = state.get("mode", "deep")
    tables_used = state.get("tables_used", [])
    vocab = _col_vocab(state)

    col_list = ", ".join(result_columns[:15]) if result_columns else "unknown"

    mode_guidance = {
        "quick": "Suggest: a breakdown by a dimension, a trend over time, and a ranking.",
        "deep":  "Suggest: a drill-down breakdown, a time trend, and a cross-dimension comparison.",
        "compare": "Suggest: what drove the gap, a third group comparison, and a time-trend of the delta.",
    }.get(mode, "Suggest deeper analytical dives.")

    system = f"""You are a data analyst suggesting follow-up questions after answering a business query.

RULES:
1. Suggest exactly 3 questions. Each must return MULTIPLE ROWS so it can be plotted as a chart.
   Use patterns: "[metric] by [dimension]", "Top N [items] by [metric]", "How does [metric] vary by [dim]?"
   AVOID: "What is the total X?" or "What is the average X?" — single values cannot be plotted.
2. ONLY reference columns that exist in the result or schema. The result columns are: {col_list}.
   Do NOT invent columns (e.g. do not suggest "by city" if city is not in the column list).
3. Write natural English — no underscores. "net_profit" → "net profit".
4. Each question under 12 words.
5. {mode_guidance}

Return ONLY valid JSON: {{"followups": ["q1", "q2", "q3"]}}"""

    user = (
        f"Question just answered: {resolved_q}\n"
        f"Result columns: {col_list}\n"
        f"Tables queried: {', '.join(tables_used) if tables_used else 'unknown'}\n"
        f"Result summary:\n{result_summary}"
    )

    try:
        result = call_groq(system, user, temperature=0.4, max_tokens=220, model=MODEL_RELIABILITY)
        raw = result.get("followups", []) if isinstance(result, dict) else []
        # Validate: keep only questions grounded in real columns
        validated = [
            str(q).strip() for q in raw
            if q and str(q).strip() and _is_valid(str(q), vocab)
        ][:3]
        # Pad to 3 with safe generic fallbacks only if we have nothing
        state["suggested_followups"] = validated if validated else []
    except Exception:
        state["suggested_followups"] = []
    return state
