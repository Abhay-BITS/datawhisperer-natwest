# DataWhisperer

**Ask anything. Trust everything.**

DataWhisperer is an AI-powered analytics platform that lets business users query databases using natural language. It delivers structured insights with a full transparency trail — showing every step of its multi-agent reasoning process so you can trust the answers.

---

## What It Does

1. **Connect** — Link PostgreSQL, MySQL, SQLite databases, or upload CSV/Excel files.
2. **Ask** — Type questions in plain English. No SQL expertise needed.
3. **Trust** — Every answer includes a visible agent reasoning timeline (Trust Trace) showing how the system interpreted your question, generated SQL, verified results, and composed the narrative.
4. **Explore** — Results are presented as auto-chosen charts (bar, line, pie, scatter) alongside data tables, with AI-suggested follow-up questions.

---

## Key Features

| Feature | Description |
|---|---|
| Natural Language → SQL | Powered by Groq (Llama 3.3 70B) with dialect-aware generation |
| Semantic Search | Deep contextual understanding of schemas, not just keyword matching |
| Self-Correcting Queries | Failed SQL is automatically rewritten using the error as feedback (up to 2 retries) |
| Multi-Agent Trust Trace | Full reasoning timeline visible in the UI for every answer |
| Confidence Scoring | 0–100% score with itemised deductions (risky assumptions, retries, low data) |
| Three Analysis Modes | Quick (speed), Deep (rigour), Compare (deltas & growth) |
| Multi-Source Analysis | Combine data across multiple databases in a single conversation |
| Auto Visualisation | System recommends the best chart type based on the query and result shape |
| Follow-up Suggestions | Three contextual follow-up questions generated after every answer |
| API Key Rotation | Pool of Groq API keys with automatic failover on rate limits |

---

## Architecture

```
┌─────────────────┐         ┌──────────────────────────────────────────────────┐
│   Next.js 14    │  REST   │              FastAPI Backend                     │
│   Frontend      │◄───────►│                                                  │
│   (Vercel)      │         │  ┌──────────────────────────────────────────┐    │
└─────────────────┘         │  │         LangGraph Agent Pipeline         │    │
                            │  │                                          │    │
                            │  │  Semantic ──► Audit ──► Coder ──►        │    │
                            │  │  Executor ──► Critic ──► Confidence ──►  │    │
                            │  │  Narrator ──► Viz ──► Followup           │    │
                            │  │       ▲                │                  │    │
                            │  │       └── Self-Correct ┘                  │    │
                            │  └──────────────────────────────────────────┘    │
                            │                                                  │
                            │  Groq LLM API (with key rotation)               │
                            │  SQLAlchemy / DuckDB query engine                │
                            └──────────────────────────────────────────────────┘
```

### Agent Pipeline (per question)

| Agent | Role |
|---|---|
| **Semantic Agent** | Interprets intent, maps business terms to SQL, selects relevant sources |
| **Assumptions Auditor** | Deep audit of assumptions (Deep/Compare modes only) |
| **Coder Agent** | Generates dialect-aware SQL (PostgreSQL, MySQL, SQLite, DuckDB) |
| **Executor** | Runs the SQL against the connected database |
| **Self-Corrector** | Rewrites SQL on failure using the error message as context |
| **Critic Agent** | Structural checks (nulls, empty results) + LLM semantic verification |
| **Confidence Scorer** | Computes a 0–100% trust score with itemised deductions |
| **Narrator Agent** | Produces a confident, jargon-free business narrative |
| **Viz Recommender** | Selects the best chart type (bar, line, pie, scatter) |
| **Follow-up Agent** | Suggests three natural next questions |

### Why This Architecture?

Traditional NL-to-SQL tools generate a query and show the result. DataWhisperer adds **trust** through a multi-agent pipeline where each agent verifies the previous agent's work — similar to how a team of analysts would cross-check each other. The self-correction loop means that if the generated SQL fails or produces semantically incorrect results, the system automatically fixes itself without user intervention.

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- One or more Groq API keys (free at [console.groq.com](https://console.groq.com))

### 1. Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate       # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Configure API keys
cp .env.example .env
# Edit .env and add your Groq key(s):
#   GROQ_API_KEYS=gsk_key1,gsk_key2,gsk_key3

# Run
uvicorn main:app --reload --port 8000
```

### 2. Frontend

```bash
cd frontend
npm install

# Configure API URL (optional, defaults to http://localhost:8000)
cp .env.example .env.local

npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 3. Docker (both services)

```bash
# Create .env at project root with your key(s)
echo "GROQ_API_KEYS=gsk_key1,gsk_key2" > .env

docker-compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API docs: http://localhost:8000/docs

---

## Try It in 3 Steps

1. **Login** — Any username and password (demo authentication)
2. **Add a source** — Click "Use Sample Data" for the built-in banking dataset, or connect your own database
3. **Ask** — Try these questions:
   - "What are the top 5 categories by total revenue?"
   - "Compare Q1 vs Q2 sales growth"
   - "How many fraud alerts were triggered last month?"
   - "Show me the loan portfolio breakdown by status"

---

## Analysis Modes

| Mode | When to Use |
|---|---|
| **Quick** | Fast single-sentence answer, minimal LLM calls |
| **Deep** | Full pipeline with confidence scoring, charts, and follow-ups (default) |
| **Compare** | Period-over-period or group-vs-group analysis with delta percentages |

---

## Tech Stack

| Layer | Technology |
|---|---|
| LLM | Groq — Llama 3.3 70B Versatile |
| Agent Framework | LangGraph |
| Backend | FastAPI |
| Query Engine | DuckDB (CSV/Excel), SQLAlchemy (PostgreSQL/MySQL/SQLite) |
| Frontend | Next.js 14 (App Router) |
| Styling | Vanilla CSS (glassmorphism dark theme) |
| Charts | Recharts |
| License | Apache 2.0 |

---

## Project Structure

```
datawhisperer/
├── backend/
│   ├── agents/           # LangGraph agent nodes
│   │   ├── graph.py          # Pipeline DAG definition
│   │   ├── semantic_agent.py # Intent resolution
│   │   ├── coder_agent.py    # SQL generation & self-correction
│   │   ├── critic_agent.py   # Result verification
│   │   └── ...
│   ├── routers/          # FastAPI route handlers
│   ├── services/         # Core services (Groq client, DB connector, etc.)
│   ├── tests/            # Unit tests
│   ├── main.py           # FastAPI app entry point
│   └── requirements.txt
├── frontend/
│   ├── app/              # Next.js App Router pages
│   ├── components/       # React components
│   ├── hooks/            # Custom React hooks
│   ├── lib/              # API client & type definitions
│   └── package.json
├── sample_data/          # Demo banking CSV datasets
├── docs/                 # Architecture documentation
├── docker-compose.yml
├── .env.example          # Environment variable template
├── LICENSE               # Apache 2.0
└── README.md
```

---

## Deployment

### Frontend (Vercel)

The Next.js frontend deploys directly to Vercel:

1. Push the repo to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Set the **Root Directory** to `frontend`.
4. Add environment variable: `NEXT_PUBLIC_API_URL=https://your-backend-url.com`

### Backend (Render / Railway / VPS)

The FastAPI backend requires a persistent Python process:

1. Deploy to [Render](https://render.com), [Railway](https://railway.app), or any cloud VM.
2. Set environment variables: `GROQ_API_KEYS`, `FEEDBACK_EMAIL`, etc.
3. Start command: `uvicorn main:app --host 0.0.0.0 --port 8000`

---

## Error Reporting

When `FEEDBACK_EMAIL` and SMTP credentials are configured, runtime errors are automatically emailed to the developer. If SMTP is not available, errors are written to `backend/errors.log`.

---

## License

Apache 2.0 — see [LICENSE](LICENSE).
