"""
Shared agent state definition for the LangGraph pipeline.

Every agent node reads from and writes to this TypedDict. It acts as the
single source of truth as a user question flows through semantic resolution,
SQL generation, execution, verification, and narration.
"""

from typing import TypedDict, Optional


class AgentState(TypedDict):
    """Typed dictionary representing the full pipeline state.

    Fields are grouped by pipeline stage: input → semantic → code generation
    → execution → verification → narration → output.
    """
    session_id: str
    user_question: str
    mode: str                 # "quick" | "deep" | "compare"
    source_ids: list[str]

    conversation_history: list[dict]
    available_sources: list[dict]

    resolved_question: str
    metric_mappings: dict
    assumptions: list[dict]   # [{statement, risk:"SAFE|RISKY|UNKNOWN", mitigation}]
    selected_sources: list[str]
    cross_db_query: bool

    audit_result: Optional[list[dict]]  # Precise only

    generated_code: str
    code_type: str            # "sql" | "pandas"
    code_explanation: str
    retry_count: int

    execution_result: Optional[dict]
    execution_error: Optional[str]

    is_verified: bool
    verification_note: str

    confidence_score: Optional[int]     # Precise only
    confidence_reasoning: Optional[str] # Precise only

    insight_narrative: str
    visualization: dict
    suggested_followups: list[str]
    trust_trace: list[dict]   # [{agent, action, output, color, details: {...}}]
    final_error: Optional[str]
