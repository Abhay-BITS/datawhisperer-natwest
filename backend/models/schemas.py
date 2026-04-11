from pydantic import BaseModel
from typing import Optional, List, Dict, Any

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    token: str
    session_id: str
    username: str

class SourceTestRequest(BaseModel):
    db_type: str
    config: Dict[str, Any]

class SourceConnectRequest(BaseModel):
    db_type: str
    config: Dict[str, Any]
    name: str
    session_id: str

class ChatRequest(BaseModel):
    message: str
    session_id: str
    mode: str = "deep"
    source_ids: Optional[List[str]] = None

class ExportResultRequest(BaseModel):
    result: Dict[str, Any]
    filename: Optional[str] = "result"
