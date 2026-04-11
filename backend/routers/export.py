from fastapi import APIRouter
from fastapi.responses import StreamingResponse, JSONResponse
from services.session_store import get_history
import csv, io, json

router = APIRouter()

@router.get("/api/export/history/csv")
async def export_history_csv(session_id: str):
    history = get_history(session_id)
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["timestamp", "role", "content"])
    writer.writeheader()
    for item in history:
        writer.writerow({
            "timestamp": item.get("timestamp", ""),
            "role": item.get("role", ""),
            "content": item.get("content", "")[:500]
        })
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=datawhisperer_history_{session_id[:8]}.csv"}
    )

@router.get("/api/export/history/json")
async def export_history_json(session_id: str):
    history = get_history(session_id)
    return {"session_id": session_id, "history": history}

@router.post("/api/export/result/csv")
async def export_result_csv(body: dict):
    result = body.get("result", {})
    columns = result.get("columns", [])
    rows = result.get("rows", [])
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(columns)
    writer.writerows(rows)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=datawhisperer_result.csv"}
    )
