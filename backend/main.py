from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import auth, sources, chat, export
import os

@asynccontextmanager
async def lifespan(app: FastAPI):
    # startup
    yield
    # shutdown: cleanup sessions
    from services.session_store import cleanup_expired
    cleanup_expired()

app = FastAPI(
    title="DataWhisperer API",
    description="Ask anything. Trust everything.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(sources.router)
app.include_router(chat.router)
app.include_router(export.router)

@app.get("/health")
async def health():
    return {"status": "ok", "service": "DataWhisperer API"}

@app.get("/")
async def root():
    return {
        "message": "DataWhisperer API is running!",
        "documentation": "/docs",
        "health": "/health"
    }
