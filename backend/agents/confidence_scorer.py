"""
Confidence Scorer — Statistical Trust Assessment.

Computes a 0–100 confidence score for the analysis result. Starts at 100
and applies deductions for risky assumptions, unknown factors, retries,
and low row counts. Used in Deep and Compare modes to give users a
quantitative trust signal alongside the narrative.
"""
from services.groq_client import call_groq, MODEL_RELIABILITY
from datetime import datetime
import json

def run(state: dict) -> dict:
    risky = sum(1 for a in state.get("assumptions", []) if a.get("risk") == "RISKY")
    unknown = sum(1 for a in state.get("assumptions", []) if a.get("risk") == "UNKNOWN")
    retried = state.get("retry_count", 0) > 0
    rows = state.get("execution_result", {}).get("row_count", 10)

    system = """You are a statistical confidence evaluator.
Start at 100. Deduct: 15 per RISKY assumption, 10 per UNKNOWN, 10 if retry needed, 5 if <5 rows.
Return ONLY valid JSON:
{"score": 87, "reasoning": "...", "deductions": [{"reason":"...", "points":15}]}"""

    user = f"""RISKY assumptions: {risky}
UNKNOWN assumptions: {unknown}
Retry occurred: {retried}
Result rows: {rows}
Critic note: {state.get('verification_note','')}"""

    try:
        result = call_groq(system, user, temperature=0.1, max_tokens=300, model=MODEL_RELIABILITY)
        state["confidence_score"] = result.get("score", max(50, 100 - risky*15 - unknown*10))
        state["confidence_reasoning"] = result.get("reasoning", "")
    except Exception:
        state["confidence_score"] = max(50, 100 - risky*15 - unknown*10)
        state["confidence_reasoning"] = "Computed from assumptions."

    if not isinstance(state.get("trust_trace"), list):
        state["trust_trace"] = []
    state["trust_trace"].append({
        "agent": "Confidence Scorer",
        "action": f"Confidence Assessment: {state['confidence_score']}%",
        "output": state.get("confidence_reasoning", ""),
        "color": "agent-critic",
        "timestamp": datetime.utcnow().isoformat()
    })
    return state
