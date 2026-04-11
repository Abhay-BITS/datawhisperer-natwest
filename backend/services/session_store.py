"""
Session Store — In-memory User Session Management.

Tracks query history, created timestamps, and session-specific metadata.
Uses UUID-based tracking to isolate data and state between different users.
"""
import uuid
from datetime import datetime, timedelta

def create_session() -> str:
    sid = str(uuid.uuid4())
    _sessions[sid] = {"history": [], "created_at": datetime.utcnow()}
    return sid

def get_session(sid: str) -> dict:
    if sid not in _sessions:
        # Auto-create if missing (for stateless clients)
        _sessions[sid] = {"history": [], "created_at": datetime.utcnow()}
    return _sessions[sid]

def append_history(sid: str, role: str, content: str):
    _sessions.setdefault(sid, {"history": [], "created_at": datetime.utcnow()})
    _sessions[sid]["history"].append({
        "role": role,
        "content": content,
        "timestamp": datetime.utcnow().isoformat()
    })

def get_history(sid: str) -> list:
    return _sessions.get(sid, {}).get("history", [])

def cleanup_expired():
    cutoff = datetime.utcnow() - timedelta(hours=3)
    expired = [k for k, v in _sessions.items() if v["created_at"] < cutoff]
    for k in expired:
        del _sessions[k]
