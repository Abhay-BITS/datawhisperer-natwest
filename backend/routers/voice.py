"""Voice API endpoints used by Talk button flows."""
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse

from services.schema_validator import (
    validate_question_against_schema,
    normalize_question_to_english,
    VALID,
)
from services.source_store import list_sources

router = APIRouter()


def normalize_language_code(language_code: str | None) -> str:
    if not language_code:
        return "en"
    clean = str(language_code).strip().lower().replace("_", "-")
    if clean.startswith("hi"):
        return "hi"
    if clean.startswith("en"):
        return "en"
    return "en"


def get_rejection_message(status: str, language_code: str) -> str:
    hi = {
        "invalid": "इस सवाल का जवाब connected data में नहीं मिला।",
        "partial": "इस सवाल का पूरा जवाब connected data से नहीं मिल पा रहा।",
    }
    en = {
        "invalid": "I could not find relevant fields for this question in connected data.",
        "partial": "I found related fields, but this dataset cannot fully answer the question.",
    }
    mapping = hi if language_code == "hi" else en
    return mapping.get(status, "")


@router.post("/api/voice/transcribe")
async def voice_transcribe(
    audio: UploadFile | None = File(None),
    file: UploadFile | None = File(None),
    session_id: str = Form(""),  # noqa: ARG001
):
    # Browser STT is used now; keep endpoint for compatibility.
    if audio is None and file is None:
        return JSONResponse(status_code=400, content={"error": "Audio file is required."})
    return JSONResponse(
        status_code=400,
        content={"error": "Server-side transcription is disabled. Use browser STT."},
    )


@router.post("/api/voice/validate")
async def voice_validate(
    transcript: str = Form(...),
    language_code: str = Form(...),
    session_id: str = Form(...),
    question_english: str = Form(""),
):
    try:
        language_code = normalize_language_code(language_code)
        sources = list_sources(session_id)
        if not sources:
            return {
                "status": "no_sources",
                "rejection_message": "No database connected.",
                "question_english": transcript,
            }

        merged_schema: dict = {"tables": {}}
        for s in sources:
            merged_schema["tables"].update(s.schema.get("tables", {}))

        translated_question = normalize_question_to_english(transcript, language_code)
        question_to_validate = (question_english or translated_question or transcript).strip()
        validation = validate_question_against_schema(question_to_validate, merged_schema)

        rejection_message = None
        if validation["status"] != VALID:
            rejection_message = get_rejection_message(validation["status"], language_code)

        return {
            "status": validation["status"],
            "matched_columns": validation["matched_columns"],
            "unmatched_concepts": validation["unmatched_concepts"],
            "rejection_message": rejection_message,
            "question_english": question_to_validate,
        }
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@router.post("/api/voice/thinking")
async def voice_thinking(language_code: str = Form(...)):
    language_code = normalize_language_code(language_code)
    text = "ठीक है, मैं डेटा देख रहा हूँ।" if language_code == "hi" else "Okay, I am analyzing your data."
    return {"text": text, "audio_base64": None, "language_code": language_code}


@router.post("/api/voice/speak")
async def voice_speak(
    insight: str = Form(...),
    language_code: str = Form(...),
    has_chart: bool = Form(False),  # noqa: ARG001
    chart_type: str = Form(""),  # noqa: ARG001
    chart_title: str = Form(""),  # noqa: ARG001
    result_columns: str = Form(""),  # noqa: ARG001
):
    language_code = normalize_language_code(language_code)
    spoken_text = " ".join((insight or "").split())
    return {
        "spoken_text": spoken_text,
        "audio_base64": None,
        "language_code": language_code,
    }
