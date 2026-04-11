# DataWhisperer — Architecture

## Overview

DataWhisperer is a federated analytics chatbot. Users connect data sources (PostgreSQL, MySQL, SQLite, CSV, Excel), ask questions in plain English, and receive structured AI-generated insights with full reasoning transparency.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Next.js 14)                     │
│  /auth → /sources → /chat → /history                           │
│  useAuth hook    useChat hook    Recharts                       │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP REST (Bearer token)
┌────────────────────────────▼────────────────────────────────────┐
│                    FastAPI Backend (Python)                      │
│                                                                 │
│  POST /api/auth/login       POST /api/sources/connect           │
│  POST /api/sources/upload   GET  /api/sources                   │
│  POST /api/chat             GET  /api/chat/history              │
│  GET  /api/export/...                                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                LangGraph Agent Pipeline                  │    │
│  │                                                         │    │
│  │  ┌──────────┐   ┌──────────┐   ┌──────────────────┐    │    │
│  │  │ Semantic │──▶│  Audit   │──▶│  Coder Agent     │    │    │
│  │  │  Agent   │   │ (Precise)│   │  (DuckDB SQL)    │    │    │
│  │  └──────────┘   └──────────┘   └────────┬─────────┘    │    │
│  │                                          │              │    │
│  │                                    ┌─────▼──────┐       │    │
│  │                                    │  Executor  │       │    │
│  │                                    └─────┬──────┘       │    │
│  │                               error │    │ ok           │    │
│  │                          ┌──────────┘    │              │    │
│  │                     ┌────▼─────┐    ┌───▼──────┐       │    │
│  │                     │  Self-   │    │  Critic  │       │    │
│  │                     │ Correct  │    │  Agent   │       │    │
│  │                     └──────────┘    └───┬──────┘       │    │
│  │                                         │              │    │
│  │                              ┌──────────▼──────────┐   │    │
│  │                              │  Confidence Scorer  │   │    │
│  │                              │    (Precise only)   │   │    │
│  │                              └──────────┬──────────┘   │    │
│  │                                         │              │    │
│  │                              ┌──────────▼──────────┐   │    │
│  │                              │   Narrator Agent    │   │    │
│  │                              └──────────┬──────────┘   │    │
│  │                                         │              │    │
│  │                     ┌───────────────────┤              │    │
│  │                ┌────▼────┐         ┌────▼────┐         │    │
│  │                │  Viz    │         │ Followup│         │    │
│  │                │ Node    │         │  Agent  │         │    │
│  │                └─────────┘         └─────────┘         │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                 │
│  ┌───────────────┐  ┌───────────────┐  ┌──────────────────┐    │
│  │  Source Store │  │ Session Store │  │   Groq Client    │    │
│  │  (in-memory)  │  │  (in-memory)  │  │ llama-3.3-70b    │    │
│  └──────┬────────┘  └───────────────┘  └──────────────────┘    │
│         │                                                       │
│  ┌──────▼──────────────────────────────────────────────────┐    │
│  │                   DB Connector Layer                     │    │
│  │  PostgreSQL    MySQL    SQLite    CSV/Excel + DuckDB     │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                             │
               ┌─────────────┼─────────────┐
         ┌─────▼────┐  ┌────▼────┐  ┌─────▼─────┐
         │ PostgreSQL│  │  MySQL  │  │CSV/Excel  │
         │(external) │  │(external│  │(in-memory)│
         └──────────┘  └─────────┘  └───────────┘
```

---

## Analysis Modes

| Mode | Pipeline | Confidence Score | Narrator Length |
|------|----------|-----------------|-----------------|
| Quick ⚡ | semantic → coder → executor → critic → narrator | No | 1 sentence |
| Deep 🧠 | + viz + followup | No | 2–3 sentences |
| Precise 🔬 | + assumptions audit + confidence scorer | Yes (0–100) | 4–5 sentences with caveats |

## DB Modes

| Mode | SQL Strategy |
|------|--------------|
| Explore | SELECT with LIMIT 100, stats |
| Report | GROUP BY + aggregates + percentage share |
| Compare | CTEs with period/group delta + pct_change |

---

## Agent Responsibilities

| Agent | Color | Role |
|-------|-------|------|
| Semantic Agent | Indigo | Intent resolution, source routing, metric mapping |
| Assumptions Auditor | Amber | Deep risk audit (Precise mode only) |
| Coder Agent | Green | DuckDB SQL generation with self-correction (up to 2 retries) |
| Critic Agent | Amber | Result quality verification |
| Confidence Scorer | Amber | 0–100 score with deduction breakdown |
| Narrator Agent | Pink | Plain-English business insight |
| Followup Agent | — | 3 contextual follow-up question suggestions |

---

## Data Flow — Chat Request

1. `POST /api/chat` receives: `{message, session_id, analysis_mode, db_mode}`
2. `session_store` retrieves conversation history (last 5 turns)
3. `source_store` retrieves connected sources for the session
4. LangGraph pipeline executes with the initial state
5. Each agent appends to `trust_trace` for full transparency
6. Execution result → viz recommendation → followup generation
7. History appended → response returned with all fields

---

## Key Design Decisions

- **DuckDB as unified query layer**: CSV and Excel files are registered as DuckDB views. SQL DBs can be cross-joined by pulling into pandas DataFrames temporarily.
- **In-memory stores**: `source_store` and `session_store` are simple dicts for hackathon simplicity. Replace with Redis + proper DB for production.
- **No Monaco editor**: Using a styled `<textarea>` — keeps the bundle small and keeps the UX non-developer-focused.
- **Schema panel on RIGHT**: Opposite of MindsDB which has left sidebar — deliberate differentiation.
- **Amber accent**: Opposite of MindsDB's teal/blue — warm, editorial, Bloomberg-inspired aesthetic.
- **Self-correction loop**: Coder agent retries up to 2 times on SQL execution failure, passing the error back to Groq for a fix.

---

## Security Notes

- Auth is stateless UUID tokens (demo-grade). Replace with JWT + session validation for production.
- DB passwords are masked in logs via `utils/masker.py`.
- No secrets committed to repo — use `.env` locally, secrets manager in production.
- CORS is open (`*`) for hackathon. Restrict to frontend origin in production.
