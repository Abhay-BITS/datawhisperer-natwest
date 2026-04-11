"""
Follow-up Agent — Contextual Question Suggestions.

Generates three natural follow-up questions based on the query results,
enabling iterative exploration of the data without requiring users to
think of what to ask next.
"""
from services.groq_client import call_groq, MODEL_RELIABILITY
from services.data_engine import get_result_summary

def run(state: dict) -> dict:
    result_summary = get_result_summary(state.get("execution_result", {}))
    system = """Suggest 3 natural follow-up questions a business user would ask next.
Each under 10 words. Specific to the data shown.
Return ONLY valid JSON: {"followups": ["q1", "q2", "q3"]}"""

    user = f"""Question just answered: {state['user_question']}
Result: {result_summary}"""

    try:
        result = call_groq(system, user, temperature=0.6, max_tokens=200, model=MODEL_RELIABILITY)
        state["suggested_followups"] = result.get("followups", [])
    except Exception:
        state["suggested_followups"] = []
    return state
