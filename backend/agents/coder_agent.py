"""
Coder Agent — SQL Generation & Self-Correction.

Generates dialect-aware SQL from the semantically resolved question.
Supports PostgreSQL, MySQL, SQLite, and DuckDB (for CSV/Excel sources).
Also provides a self-correction entry point: when a query fails execution
or semantic verification, this agent rewrites the SQL using the error as context.
"""
from services.groq_client import call_groq, MODEL_ACCURACY
from datetime import datetime
import json

MODE_RULES = {
    "quick": (
        "Generate SQL that directly and precisely answers the question. "
        "For singular questions (highest/lowest), use ORDER BY + LIMIT 1. "
        "For lists (top products), use LIMIT 10. "
        "Minimize complexity to ensure speed."
    ),
    "deep": (
        "Generate comprehensive analytical SQL. "
        "Always group by relevant dimensions. Always use GROUP BY with SUM/COUNT/AVG. "
        "Add helper columns like 'percentage_share' or 'cumulative_total' where they add business value. "
        "Include multiple business-relevant metrics if applicable."
    ),
    "compare": (
        "Use CTEs to segment the data. Compute period-over-period or group-vs-group deltas. "
        "Always include a 'delta_percentage' column. "
        "If the user asks for growth, identify two points in time and calculate the change."
    ),
}

# SQL dialect guidance per db_type
DIALECT_RULES = {
    "postgresql": (
        "Use standard PostgreSQL SQL. "
        "Date grouping: DATE_TRUNC('month', col). "
        "Date formatting: TO_CHAR(col, 'YYYY-MM'). "
        "Percentages: ROUND(100.0 * x / SUM(x) OVER(), 1)."
    ),
    "mysql": (
        "Use standard MySQL SQL. "
        "Date grouping: DATE_FORMAT(col, '%Y-%m'). "
        "Month: MONTH(col), Year: YEAR(col). "
        "Use backticks for reserved-word column names."
    ),
    "sqlite": (
        "Use SQLite SQL. "
        "Date grouping: strftime('%Y-%m', col). "
        "No FULL OUTER JOIN. Use CAST(x AS REAL) for float division."
    ),
    "csv": (
        "Use DuckDB SQL (the table is an in-memory DuckDB view). "
        "Date grouping: date_trunc('month', col::DATE). "
        "Date formatting: strftime(col::DATE, '%Y-%m'). "
        "Use TRY_CAST for type coercion."
    ),
    "excel": (
        "Use DuckDB SQL (the table is an in-memory DuckDB view). "
        "Date grouping: date_trunc('month', col::DATE). "
        "Date formatting: strftime(col::DATE, '%Y-%m'). "
        "Use TRY_CAST for type coercion."
    ),
}


def run(state: dict) -> dict:
    return _generate(state, correction_error=None)


def run_correction(state: dict) -> dict:
    state["retry_count"] = state.get("retry_count", 0) + 1
    # If no syntax/execution error, use the semantic verification note from Critic
    error_to_fix = state.get("execution_error") or state.get("verification_note")
    return _generate(state, correction_error=error_to_fix)


def _get_selected_schemas(state: dict) -> list:
    """Return schema info for selected sources, including db_type."""
    selected = state.get("selected_sources") or state.get("source_ids", [])
    result = []
    for src in state.get("available_sources", []):
        if src["source_id"] in selected:
            result.append({
                "source_id": src["source_id"],
                "name": src["name"],
                "safe_name": src["safe_name"],
                "db_type": src.get("db_type", "csv"),
                "tables": src.get("schema", {}).get("tables", {}),
            })
    return result


def _build_table_guide(schemas: list) -> tuple[str, str]:
    """
    Build a human-readable list of exactly which table names to use in SQL,
    and determine the dominant SQL dialect.
    """
    lines = []
    db_type = "csv"  # default

    for schema in schemas:
        db_type = schema.get("db_type", "csv")
        for tname, tinfo in schema.get("tables", {}).items():
            cols = ", ".join(c["name"] for c in tinfo.get("columns", []))
            row_count = tinfo.get("row_count", "?")
            lines.append(
                f'  Table name to use in SQL: "{tname}"  '
                f"({row_count} rows) | Columns: {cols}"
            )

    guide = "\n".join(lines) if lines else "  (no tables found)"
    return guide, db_type


def _generate(state: dict, correction_error) -> dict:
    schemas = _get_selected_schemas(state)
    mode = state.get("mode", "deep")

    table_guide, db_type = _build_table_guide(schemas)
    dialect_rule = DIALECT_RULES.get(db_type, DIALECT_RULES["csv"])

    retry_ctx = ""
    if correction_error:
        retry_ctx = (
            f"\n\nPREVIOUS SQL FAILED — fix it:\n"
            f"Failed SQL:\n{state.get('generated_code', '')}\n"
            f"Error message: {correction_error}\n"
            f"Rewrite the SQL to avoid this error."
        )

    system = f"""You are an expert SQL engineer. Generate SQL to answer the user's question.

=== QUERYABLE TABLES ===
{table_guide}

IMPORTANT: The table names above are EXACTLY what you must write in your SQL FROM clause.
Do NOT use the source name, safe_name, or any other identifier — only the table names listed above.

=== FULL SCHEMA (for column reference) ===
{json.dumps(schemas, indent=2)}

=== QUESTION ===
{state.get('resolved_question', state['user_question'])}

=== METRIC MAPPINGS ===
{json.dumps(state.get('metric_mappings', {}))}

=== MODE: {mode} ===
{MODE_RULES.get(mode, MODE_RULES['deep'])}

=== SQL DIALECT: {db_type} ===
{dialect_rule}

=== GENERAL RULES ===
- Maximum 500 rows in result
- Use double quotes for column names that contain spaces or are reserved words
- Do NOT use PIVOT or stored procedures
- If joining tables, use proper JOIN conditions based on matching column names/types
{retry_ctx}

Return ONLY valid JSON. No preamble. No conversational text.
{{
  "code_type": "sql",
  "code": "SELECT ...",
  "explanation": "This query..."
}}"""

    result = call_groq(
        system,
        state.get("resolved_question", state["user_question"]),
        temperature=0.05,
        max_tokens=1200,
        model=MODEL_ACCURACY
    )

    state["generated_code"] = result.get("code", "SELECT 1")
    state["code_type"] = result.get("code_type", "sql")
    state["code_explanation"] = result.get("explanation", "")

    if not isinstance(state.get("trust_trace"), list):
        state["trust_trace"] = []
    state["trust_trace"].append({
        "agent": "Coder Agent",
        "action": f"SQL Generation{' (retry ' + str(state.get('retry_count',0)) + ')' if correction_error else ''}",
        "output": state["generated_code"],
        "details": {
            "sql": state["generated_code"],
            "explanation": state["code_explanation"],
            "dialect": db_type,
            "mode": mode,
            "is_retry": bool(correction_error),
            "retry_error": correction_error or None,
        },
        "color": "agent-coder",
        "timestamp": datetime.utcnow().isoformat(),
    })
    return state
