import pytest
from unittest.mock import patch

def test_narrator_quick_mode():
    with patch("backend.agents.narrator_agent.call_groq") as mock_groq:
        mock_groq.return_value = "Sales were $100K in Q1."
        from backend.agents.narrator_agent import run
        state = {
            "user_question": "What were sales in Q1?",
            "execution_result": {"columns": ["sales"], "rows": [[100000]], "row_count": 1},
            "verification_note": "Verified.",
            "mode": "quick",
            "trust_trace": []
        }
        result = run(state)
        assert result["insight_narrative"] == "Sales were $100K in Q1."

def test_followup_agent():
    with patch("backend.agents.followup_agent.call_groq") as mock_groq:
        mock_groq.return_value = {"followups": ["q1", "q2", "q3"]}
        from backend.agents.followup_agent import run
        state = {
            "user_question": "What were sales?",
            "execution_result": {"columns": [], "rows": [], "row_count": 0}
        }
        result = run(state)
        assert len(result["suggested_followups"]) == 3
