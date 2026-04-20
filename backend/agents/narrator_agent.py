"""
Narrator Agent — Business Insight Generation.

Converts raw query results into a confident, jargon-free business narrative.
Adapts response length by analysis mode (Quick = 1 sentence, Deep = 2–3,
Compare = 2–4 with delta focus). Gracefully handles query failures with
an honest error narrative.
"""
from services.groq_client import call_groq, MODEL_ACCURACY
from services.data_engine import get_result_summary
from datetime import datetime

LENGTH_BY_MODE = {
    "quick": "1 sentence only.",
    "deep": "3-4 sentences.",
    "compare": "2-4 sentences focusing on growth, deltas, and key comparison insights.",
}


def run(state: dict) -> dict:
    exec_result = state.get("execution_result", {})
    error = exec_result.get("error") if exec_result else None

    # If the query failed, produce an honest error narrative
    if error:
        narrative = (
            f"I wasn't able to retrieve the data for your question. "
            f"The query ran into an issue: {error}. "
            f"Please try rephrasing your question or check that your data source is connected."
        )
        state["insight_narrative"] = narrative
        if not isinstance(state.get("trust_trace"), list):
            state["trust_trace"] = []
        state["trust_trace"].append({
            "agent": "Narrator Agent",
            "action": "Error Report",
            "output": narrative,
            "color": "agent-narrator",
            "timestamp": datetime.utcnow().isoformat(),
        })
        return state

    result_summary = get_result_summary(exec_result)
    is_voice = state.get("voice_mode", False)

    if is_voice:
        system = """You are a friendly data assistant answering a spoken question out loud.
1-2 sentences only — short enough to speak in under 10 seconds.

Rules:
- Start naturally: "Revenue grew...", "The top region is...", "North leads with..."
- Never start with "Based on", "The data shows", "According to", or "I found"
- Use plain English — avoid column names, just say what the column means
- Round large numbers sensibly (say "2.5 crore" not "2,57,00,123")
- Mention the most important number first, then context
- Do not say "let me know", "feel free to ask", or invite follow-ups — that is handled separately
- Never mention SQL, tables, queries, or any technical detail
Return only the spoken answer. No bullet points, no headers, no quotes."""
    else:
        length = LENGTH_BY_MODE.get(state.get("mode", "deep"), "2-3 sentences.")
        system = f"""You are a senior data analyst giving a direct, confident answer to a business user.
{length}

Rules:
- Lead with the direct answer immediately. No preamble, no "based on the data".
- For single-value questions ("who has highest X"): state the name/ID and the exact number first.
- Use specific numbers from the data. Format large numbers with commas (e.g. 2,579,000).
- Never mention SQL, queries, tables, LIMIT, rows, or any technical terms.
- Never say "the data shows" or "according to the results" — just state the fact.
- Never hedge about data completeness unless there are literally 0 rows returned.
- If result is 0 rows, say clearly what was searched and that nothing matched.
- Sound like a confident Bloomberg analyst, not a cautious data engineer.
Return ONLY the narrative. No JSON, no bullet points, no headers."""

    user = f"""Question asked: {state['user_question']}
Data result: {result_summary}
Verification note: {state.get('verification_note', '')}"""

    try:
        temp = 0.55 if is_voice else 0.4
        max_tok = 120 if is_voice else 400
        narrative = call_groq(system, user, temperature=temp, max_tokens=max_tok, expect_json=False, model=MODEL_ACCURACY)
        if not isinstance(narrative, str):
            narrative = str(narrative)
    except Exception:
        narrative = result_summary

    state["insight_narrative"] = narrative

    if not isinstance(state.get("trust_trace"), list):
        state["trust_trace"] = []
    state["trust_trace"].append({
        "agent": "Narrator Agent",
        "action": "Business Insight",
        "output": narrative,
        "color": "agent-narrator",
        "timestamp": datetime.utcnow().isoformat(),
    })
    return state
