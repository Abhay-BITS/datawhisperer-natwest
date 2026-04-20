"""Schema validator — uses Groq (free) to check if question is answerable."""
import json
from services.groq_client import call_groq, MODEL_RELIABILITY

VALID = "valid"
PARTIAL = "partial"
INVALID = "invalid"


def normalize_question_to_english(question: str, language_code: str) -> str:
    """Convert non-English voice transcripts into concise analytics English."""
    if not question:
        return ""
    lang = (language_code or "").strip().lower()
    if lang in ("", "en"):
        return question

    system = """You translate analytics questions into plain English.
Rules:
- Preserve original intent, entities, numbers, dates, and business terms.
- Do not answer the question.
- Return only the translated question text (no quotes, no markdown, no explanations)."""

    user = f"Language code: {lang}\nQuestion: {question}"
    try:
        translated = call_groq(
            system,
            user,
            temperature=0.0,
            max_tokens=120,
            expect_json=False,
            model=MODEL_RELIABILITY,
        )
        if isinstance(translated, str) and translated.strip():
            return translated.strip()
        return question
    except Exception:
        return question


def validate_question_against_schema(question_english: str, schema: dict) -> dict:
    all_columns = []
    for table_name, table_info in schema.get("tables", {}).items():
        for col in table_info.get("columns", []):
            all_columns.append({"table": table_name, "column": col["name"], "type": col.get("type", "")})
    if not all_columns:
        return {"status": INVALID, "matched_columns": [], "unmatched_concepts": []}

    system = """You are a database schema validator.
Determine if this question can be answered from the available columns.
Be lenient with synonyms: "sales"=revenue/amount, "people"=customers/users, "growth"=change/trend.
Be strict for unrelated topics: weather, cricket, stock prices = INVALID.

Return ONLY valid JSON:
{"status": "valid"|"partial"|"invalid", "matched_columns": ["table.column"], "unmatched_concepts": ["..."], "reasoning": "one sentence"}

"partial" = some columns match but full answer impossible (e.g. user wants profit margin but only revenue exists)"""

    user = f'Question: "{question_english}"\n\nAvailable columns:\n{json.dumps(all_columns, indent=2)}'
    try:
        result = call_groq(system, user, temperature=0.05, max_tokens=300)
        return {"status": result.get("status", INVALID), "matched_columns": result.get("matched_columns", []), "unmatched_concepts": result.get("unmatched_concepts", [])}
    except Exception:
        return {"status": VALID, "matched_columns": [], "unmatched_concepts": []}
