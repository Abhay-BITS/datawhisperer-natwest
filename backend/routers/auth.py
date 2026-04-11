"""
Authentication Router — Demo Login & Logout.

Provides a lightweight, password-less authentication flow for the prototype.
Any username/password combination is accepted; a unique session ID is issued
for tracking connected data sources and conversation history.
"""
from fastapi import APIRouter
from services.session_store import create_session
import uuid

router = APIRouter()

@router.post("/api/auth/login")
async def login(body: dict):
    token = str(uuid.uuid4())
    session_id = create_session()
    return {
        "token": token,
        "session_id": session_id,
        "username": body.get("username", "user")
    }

@router.post("/api/auth/logout")
async def logout():
    return {"success": True}
