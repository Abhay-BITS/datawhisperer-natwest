# DataWhisperer - Architecture

## Overview

DataWhisperer is a federated analytics chatbot. Users connect data sources (PostgreSQL, MySQL, SQLite, CSV, Excel - and seeded cloud DBs like Aiven, Supabase, TiDB, and Turso), ask questions in plain English *or by voice*, and receive structured AI-generated insights with full reasoning transparency.

All HTTP routes are served under the `/api` prefix. Interactive Swagger docs are at `/docs`.

---

## System Architecture

<div align="center">
<img src="images/DataWhisperer%20(1).png" alt="DataWhisperer System Architecture" width="90%"/>
<br/><i>System Architecture - Multi-agent pipeline with self-correction loop</i>
</div>

---

## Analysis Modes

The pipeline runs as a 10-stage LangGraph DAG whose depth adapts to the selected mode.

| Mode | Pipeline | Confidence Score | Narrator Length | SQL Strategy |
|------|----------|------------------|-----------------|--------------|
| **Quick** ⚡ | semantic → coder → executor → self-corrector → critic → narrator | No | 1 sentence | Direct `SELECT` with `LIMIT` |
| **Deep** 🧠 | + assumptions audit + confidence scorer + viz + followup | Yes (0–100) | 3–4 sentences with caveats | `GROUP BY` + aggregates + helper metrics like `percentage_share` |
| **Compare** 🔬 | Full Deep pipeline with comparison-specific prompts | Yes (0–100) | 2–4 sentences focused on deltas | CTEs with `delta_percentage` / `pct_change` across periods or groups |

Switch modes using the toggle in the chat input bar. Default is **Deep**.

---

## Agent Responsibilities

| # | Stage | Color | Role |
|---|-------|-------|------|
| 1 | Semantic Agent | Indigo | Intent resolution, source routing, metric mapping, assumption surfacing |
| 2 | Assumptions Auditor | Amber | Deep risk audit - SAFE / RISKY / UNKNOWN classification (Deep + Compare only) |
| 3 | Coder Agent | Green | Dialect-aware SQL generation (PostgreSQL / MySQL / SQLite / DuckDB) |
| 4 | Executor | - | SQL execution via SQLAlchemy (DBs) or DuckDB (files); 500-row cap |
| 5 | Self-Corrector | Green | Re-entry into Coder; rewrites SQL on execution error or semantic verification failure (up to 2 retries) |
| 6 | Critic Agent | Amber | Two-layer verification - structural checks + LLM-powered semantic verification |
| 7 | Confidence Scorer | Amber | 0–100 score with itemised deduction ledger (Deep + Compare only) |
| 8 | Narrator Agent | Pink | Plain-English business insight, jargon-free |
| 9 | Viz Recommender | - | Chart-type selection based on result shape (Deep + Compare only) |
| 10 | Followup Agent | - | 3 contextual follow-up question suggestions (Deep + Compare only) |

---

## Data Flow - Chat Request

1. `POST /api/chat/query` receives: `{question, session_id, mode}`
2. `session_store` retrieves conversation history (last 5 turns)
3. `source_store` retrieves connected sources for the session
4. LangGraph pipeline executes with the initial state
5. Each agent appends to `trust_trace` for full transparency
6. Execution result → (optional) confidence scoring → viz recommendation → followup generation
7. History appended → response returned with `narrative`, `confidence_score`, `trust_trace`, `visualization`, and `suggested_followups`

---

## Voice Flow

DataWhisperer supports a fully **browser-native voice loop**. No audio ever leaves the user's device.

- **Speech → Text (STT):** the Web Speech API (`SpeechRecognition` / `webkitSpeechRecognition`) transcribes the user's voice in real time. The final transcript is submitted to `POST /api/chat/query` exactly as if typed.
- **Text → Speech (TTS):** `window.speechSynthesis` reads the Narrator's response back aloud.
- **Confirmation Gate:** voice-transcribed queries pass through `ConfirmationGate.tsx` before hitting the pipeline, so the user can approve or edit the transcript before a query runs.
- **Backend support:** `backend/routers/voice.py` exposes optional voice-session endpoints under `/api/voice/*` for anything the client can't do locally (e.g., session metadata, server-side voice preferences).

Frontend pieces:
- `components/TalkButton.tsx` - mic button
- `components/VoiceStatusBar.tsx` - live transcript and playback status
- `hooks/useWebSpeech.ts` - thin wrapper around the Web Speech APIs
- `hooks/useVoice.ts` - session orchestration (STT → confirmation → query → TTS)

---

## Key Design Decisions

- **DuckDB as the file query layer.** CSV and Excel files are registered as DuckDB views for fast in-memory analytics. Relational DBs (PostgreSQL, MySQL, SQLite / Turso) are queried natively through SQLAlchemy.
- **No cross-database joins in a single query (current limitation).** Multiple sources can be used in one conversation, but a single SQL statement cannot join tables from different databases. A future iteration could use DuckDB as a federation layer via pandas intermediaries.
- **In-memory stores.** `source_store` and `session_store` are simple dicts for hackathon simplicity. State is lost on backend restart. Replace with Redis + a persistent DB for production.
- **No Monaco editor.** A styled `<textarea>` keeps the bundle small and the UX non-developer-focused.
- **Schema panel on RIGHT.** Deliberate differentiation from MindsDB's left-sidebar convention.
- **Amber accent.** Warm, editorial, Bloomberg-inspired aesthetic - deliberately opposite to MindsDB's teal/blue.
- **Self-correction loop.** The Coder agent retries up to 2 times: syntax / execution errors feed back through `execution_error`, and semantic mistakes caught by the Critic feed back through `verification_note`. Each retry deducts points from the confidence score.
- **Browser-native voice.** Zero external STT/TTS services means no extra API keys, no audio leaving the user's device, and no additional free-tier budget to manage.
- **Groq API key pool.** `GroqKeyPool` rotates across a comma-separated list of keys on rate-limit hits, keeping the free tier usable under load.

---

## Security Notes

- Auth is stateless UUID tokens (demo-grade). Replace with JWT + proper session validation for production.
- DB passwords and connection strings are masked in logs via `utils/masker.py` before they are written anywhere.
- No secrets are committed to the repo - use `.env` locally, a secrets manager (or HF Spaces / Vercel env vars) in production.
- CORS is open (`*`) for the hackathon. Restrict to the frontend origin in production.
- No audio is transmitted to the backend: all voice capture and playback happens in the user's browser via the Web Speech API.
