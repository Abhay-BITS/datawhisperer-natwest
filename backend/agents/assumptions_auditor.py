"""
Assumptions Auditor — Deep Risk Assessment.

Active in Deep and Compare modes. Takes the assumptions identified by the
Semantic Agent and performs a deeper risk evaluation, categorising each as
SAFE, RISKY, or UNKNOWN with mitigation strategies. This improves the
overall trustworthiness of the analysis pipeline.
"""
from services.groq_client import call_groq, MODEL_RELIABILITY
from datetime import datetime

def run(state: dict) -> dict:
    """In Precise mode: deeply audit each assumption for risk before querying."""
    if not state.get("assumptions"):
        return state

    system = """You are a data audit specialist. For each assumption provided,
evaluate its risk more deeply and suggest mitigations.

Return ONLY valid JSON:
{
  "audited_assumptions": [
    {
      "statement": "...",
      "risk": "SAFE|RISKY|UNKNOWN",
      "mitigation": "...",
      "audit_note": "..."
    }
  ],
  "overall_risk": "LOW|MEDIUM|HIGH"
}"""

    user = f"""Question: {state['user_question']}
Assumptions to audit: {state['assumptions']}
Available schemas: {[s['name'] for s in state['available_sources']]}"""

    try:
        result = call_groq(system, user, temperature=0.1, max_tokens=600, model=MODEL_RELIABILITY)
        state["audit_result"] = result.get("audited_assumptions", state["assumptions"])
        state["assumptions"] = result.get("audited_assumptions", state["assumptions"])
        if not isinstance(state.get("trust_trace"), list):
            state["trust_trace"] = []
        state["trust_trace"].append({
            "agent": "Assumptions Auditor",
            "action": f"Deep Audit — Overall Risk: {result.get('overall_risk','UNKNOWN')}",
            "output": f"Audited {len(state['assumptions'])} assumptions",
            "color": "agent-critic",
            "timestamp": datetime.utcnow().isoformat()
        })
    except Exception:
        pass
    return state
