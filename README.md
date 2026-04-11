<!--
  ╔══════════════════════════════════════════════════════════╗
  ║          BANNER IMAGE — replace the placeholder below    ║
  ║  Recommended: 1280×640px dark glassmorphism banner       ║
  ║  Text on banner: "DataWhisperer · Ask anything.          ║
  ║   Trust everything." in white on deep-indigo background  ║
  ╚══════════════════════════════════════════════════════════╝
-->

<div align="center">

<!-- 📸 IMAGE SLOT 1 — HERO BANNER
     Upload a wide banner image (1280×640px) to docs/images/banner.png
     It should show the DataWhisperer logo + tagline on a dark glassmorphism background.
     Replace the placeholder src below with: docs/images/banner.png -->

<img src="docs/images/banner.png" alt="DataWhisperer — Ask anything. Trust everything." width="100%"/>

<br/><br/>

# DataWhisperer
### Ask anything. Trust everything.

**An AI-powered, multi-agent analytics platform that lets business users query any database in plain English — and trust every answer with a full reasoning trail.**

<br/>

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-purple.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11%2B-blue.svg)](https://python.org)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org)
[![LangGraph](https://img.shields.io/badge/LangGraph-1.1%2B-orange.svg)](https://langchain-ai.github.io/langgraph/)
[![Groq](https://img.shields.io/badge/LLM-Groq%20%7C%20Llama%203.3%2070B-yellow.svg)](https://console.groq.com)
[![Live Demo](https://img.shields.io/badge/Live%20Demo-datawhisperer--natwest.vercel.app-brightgreen.svg)](https://datawhisperer-natwest.vercel.app)
[![NatWest Hackathon](https://img.shields.io/badge/NatWest-Code%20for%20Purpose%202025-purple.svg)](https://natwestgroup.com)

<br/>

[🌐 Live Demo](https://datawhisperer-natwest.vercel.app) · [📖 Architecture Docs](docs/architecture.md) · [🐛 Report Issue](#) · [🚀 Quick Start](#-quick-start)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Live Demo](#-live-demo)
- [Key Features](#-key-features)
- [Architecture](#-architecture)
- [Agent Pipeline — Deep Dive](#-agent-pipeline--deep-dive)
- [Self-Correcting Engine](#-self-correcting-engine)
- [Analysis Modes](#-analysis-modes)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Configuration](#-configuration)
- [Usage Examples](#-usage-examples)
- [API Reference](#-api-reference)
- [Sample Data](#-sample-data)
- [Deployment](#-deployment)
- [What Goes to GitHub](#-what-goes-to-github)
- [Tests](#-tests)
- [Limitations & Future Work](#-limitations--future-work)
- [DCO & License](#-dco--license)

---

## 🔍 Overview

Many people struggle to get quick, accurate, and trustworthy answers from data. They face too many steps, unclear terminology, and a lack of confidence in the results. **DataWhisperer** removes all of that friction.

Type a question in plain English. Receive a clear, confident business narrative — backed by a complete **Trust Trace** that shows exactly how the AI arrived at its answer, including every SQL query generated, every assumption made, and a 0–100% confidence score.

**Who it is for:** Business analysts, team leads, product managers, and anyone who needs fast, credible insights from databases — without writing SQL.

> Built for the **NatWest Group — Code for Purpose India Hackathon 2025**
> Theme: *Talk to Data — Seamless Self-Service Intelligence*

---

## 🌐 Live Demo

**Hosted at:** [https://datawhisperer-natwest.vercel.app](https://datawhisperer-natwest.vercel.app)

<!-- 📸 IMAGE SLOT 2 — DEMO GIF or SCREENSHOT
     Upload an animated GIF or PNG of the main chat interface to: docs/images/demo.gif
     It should show a user typing a question and the Trust Trace expanding.
     Recommended: 900×560px, record with LICEcap or Kap on macOS.
     Replace src below once uploaded. -->

<div align="center">
<img src="docs/images/demo.gif" alt="DataWhisperer Demo — typing a query and seeing the Trust Trace" width="85%"/>
</div>

**Demo credentials (no sign-up needed):**
- Username: `demo` (any username works)
- Password: `demo` (any password works — demo auth)

**Try these queries on the built-in banking dataset:**
```
"What are the top 5 spending categories by total amount?"
"Compare Q1 vs Q2 revenue growth this year"
"How many fraud alerts were triggered last month?"
"Show me the loan portfolio breakdown by status"
"Which customer accounts have the highest balance?"
```

---

## ✨ Key Features

| # | Feature | Description |
|---|---|---|
| 1 | **Natural Language → SQL** | Ask in plain English; get structured data back. Powered by Groq (Llama 3.3 70B). |
| 2 | **Self-Correcting Queries** | Failed SQL is automatically diagnosed and rewritten — up to 2 retry cycles — without any user intervention. |
| 3 | **Multi-Agent Trust Trace** | Every answer includes a collapsible timeline showing all 9 agents' decisions — visible in the UI. |
| 4 | **Confidence Scoring** | 0–100% trust score with itemised deductions for risky assumptions, retries, and low data coverage. |
| 5 | **Three Analysis Modes** | Quick (speed), Deep (rigour + charts + follow-ups), Compare (period/group deltas). |
| 6 | **Semantic Layer** | A built-in metric dictionary ensures "revenue", "sales", "churn" always map to consistent SQL expressions. |
| 7 | **Multi-Source Analysis** | Connect and query across multiple databases or CSV files in a single conversation. |
| 8 | **Auto Visualisation** | Smart chart-type selection (bar, line, pie, scatter) based on query shape and result structure. |
| 9 | **Follow-up Suggestions** | Three contextual next questions generated after every answer to guide exploration. |
| 10 | **API Key Rotation** | Pool of Groq API keys with automatic failover — keeps the service running when free-tier limits are hit. |
| 11 | **Data Masking** | Connection strings are masked before being stored or displayed; no credentials are ever exposed in responses. |
| 12 | **Export** | Download query results as CSV directly from the chat interface. |

---

## 🏗 Architecture

```
╔══════════════════════════╗           ╔══════════════════════════════════════════════════════════╗
║                          ║           ║                    FastAPI Backend                       ║
║   Next.js 14 Frontend    ║  REST/    ║                                                          ║
║   (Vercel — SSR)         ║◄─────────►║  ┌────────────────────────────────────────────────────┐  ║
║                          ║  JSON     ║  │             LangGraph Agent Pipeline               │  ║
║  ┌──────────────────┐    ║           ║  │                                                    │  ║
║  │  Chat Interface  │    ║           ║  │  ┌──────────┐   ┌─────────┐   ┌──────────────┐    │  ║
║  │  Trust Trace UI  │    ║           ║  │  │ Semantic │──►│  Audit  │──►│    Coder     │    │  ║
║  │  Confidence Bar  │    ║           ║  │  │  Agent   │   │ (Deep)  │   │    Agent     │    │  ║
║  │  Chart Renderer  │    ║           ║  │  └──────────┘   └─────────┘   └──────┬───────┘    │  ║
║  │  Source Wizard   │    ║           ║  │                                       │            │  ║
║  └──────────────────┘    ║           ║  │                                  ┌────▼─────┐      │  ║
╚══════════════════════════╝           ║  │                                  │ Executor │      │  ║
                                       ║  │                    ┌─────────────┤          │      │  ║
                                       ║  │                    │  Error?     └────┬─────┘      │  ║
                                       ║  │                    │                  │            │  ║
                                       ║  │         ┌──────────▼──────┐      ┌───▼──────┐     │  ║
                                       ║  │         │  Self-Corrector  │      │  Critic  │     │  ║
                                       ║  │         │  (up to 2 retry) │      │  Agent   │     │  ║
                                       ║  │         └──────────┬───────┘      └───┬──────┘     │  ║
                                       ║  │                    │ rewrite           │            │  ║
                                       ║  │                    └──────────►──────  │            │  ║
                                       ║  │                              Verified? │            │  ║
                                       ║  │                                   ┌────▼──────────┐ │  ║
                                       ║  │                                   │  Confidence   │ │  ║
                                       ║  │                                   │   Scorer      │ │  ║
                                       ║  │                                   └────┬──────────┘ │  ║
                                       ║  │                                        │            │  ║
                                       ║  │         ┌──────────┐   ┌──────────┐  ┌▼──────────┐ │  ║
                                       ║  │         │ Follow-up│◄──│   Viz    │◄─│ Narrator  │ │  ║
                                       ║  │         │  Agent   │   │Recomm.   │  │  Agent    │ │  ║
                                       ║  │         └──────────┘   └──────────┘  └───────────┘ │  ║
                                       ║  └────────────────────────────────────────────────────┘  ║
                                       ║                                                          ║
                                       ║  ┌─────────────────┐   ┌──────────────────────────────┐  ║
                                       ║  │  Groq LLM API   │   │   Data Engine                │  ║
                                       ║  │  Key Pool +      │   │   SQLAlchemy (PG/MySQL/SQLite)│  ║
                                       ║  │  Auto-Rotation  │   │   DuckDB (CSV/Excel)         │  ║
                                       ║  └─────────────────┘   └──────────────────────────────┘  ║
                                       ╚══════════════════════════════════════════════════════════╝
```

<!-- 📸 IMAGE SLOT 3 — ARCHITECTURE DIAGRAM IMAGE
     Upload a visual architecture diagram to: docs/images/architecture.png
     Can be created in Excalidraw, Miro, or Figma. Should show the same flow as the ASCII above
     but with color-coded boxes: purple for agents, blue for services, green for frontend.
     Recommended: 1200×700px -->

<div align="center">
<img src="docs/images/architecture.png" alt="DataWhisperer System Architecture" width="90%"/>
<br/><i>System Architecture — Multi-agent pipeline with self-correction loop</i>
</div>

---

## 🤖 Agent Pipeline — Deep Dive

DataWhisperer uses a **LangGraph directed acyclic graph (DAG)** to orchestrate 9 specialised agents. Each agent is a focused, single-responsibility unit that verifies the previous agent's work — creating a chain of accountability that makes every answer trustworthy.

The pipeline adapts its depth based on the selected analysis mode:

```
Quick:   Semantic ──► Coder ──► Executor ──► Critic ──► Narrator ──► END

Deep:    Semantic ──► Audit ──► Coder ──► Executor ──► Critic ──► Confidence ──► Narrator ──► Viz ──► Followup ──► END
                                               ▲                      │
                                               └──────── Self-Correct ─┘
                                                       (up to 2 retries)

Compare: Same as Deep, with comparison-specific prompts at each stage
```

### Agent 1 — Semantic Agent
**File:** `backend/agents/semantic_agent.py`

The **first node in the pipeline**. Before any SQL is written, this agent resolves *what the user actually means*.

- Reads the user's question and infers the analytical intent (`lookup`, `aggregation`, `ranking`, `comparison`, `trend`).
- Scans all connected data sources and selects the most relevant ones based on schema matching.
- Maps business jargon to precise SQL expressions using the **Metric Dictionary** (e.g., "revenue" → `SUM(amount)`, "churn" → `COUNT WHERE status = 'churned'`).
- Rewrites the question as a precise analytical statement for downstream agents.
- Flags SAFE / RISKY / UNKNOWN **assumptions** (e.g., "Assuming 'last month' means the previous calendar month").
- Adds a `trust_trace` entry visible in the UI showing sources selected, intent type, and metric mappings.

> **Why it matters:** Most NL-to-SQL failures happen because the system misunderstands the intent. This agent spends a dedicated LLM call to get the interpretation right before touching any database.

---

### Agent 2 — Assumptions Auditor
**File:** `backend/agents/assumptions_auditor.py`
**Active in:** Deep and Compare modes only.

Takes the assumptions surfaced by the Semantic Agent and performs a **deeper risk audit**.

- Categorises each assumption as `SAFE`, `RISKY`, or `UNKNOWN`.
- Provides a mitigation strategy for each risky assumption.
- Computes an overall risk rating (`LOW`, `MEDIUM`, `HIGH`).
- The risk rating directly feeds the Confidence Scorer's deduction calculations.

> **Why it matters:** Business questions often contain hidden ambiguity ("this year", "our top products", "active users"). Explicitly surfacing and rating these before querying prevents silently wrong answers.

---

### Agent 3 — Coder Agent
**File:** `backend/agents/coder_agent.py`

Generates **dialect-aware SQL** for the resolved question.

- Supports four SQL dialects: **PostgreSQL**, **MySQL**, **SQLite**, and **DuckDB** (for CSV/Excel sources).
- Each dialect has specific rules (e.g., `DATE_TRUNC` for PostgreSQL, `DATE_FORMAT` for MySQL, `strftime` for SQLite, `TRY_CAST` for DuckDB).
- Mode-specific SQL strategy: Quick uses direct `LIMIT`, Deep adds helper metrics like `percentage_share`, Compare uses CTEs with `delta_percentage`.
- Handles cross-source queries by using consistent table-naming conventions that match the Data Engine's runtime registration.
- Uses `MODEL_ACCURACY` (Llama 3.3 70B) for maximum SQL correctness.

---

### Agent 4 — Executor *(built into graph.py)*
**File:** `backend/agents/graph.py` → `_execute_node`

Runs the generated SQL against the connected database.

- Routes to **SQLAlchemy** for relational databases (PostgreSQL, MySQL, SQLite/Turso).
- Routes to **DuckDB** for in-memory CSV/Excel files.
- Returns structured results: `columns`, `rows`, `row_count`, and an `error` field if the query failed.
- Result is capped at **500 rows** for performance.
- Feeds the `execution_error` back into state for the Self-Corrector to use.

---

### Agent 5 — Self-Corrector *(re-entry into Coder Agent)*
**File:** `backend/agents/coder_agent.py` → `run_correction()`
**Trigger:** Execution error OR semantic verification failure.

This is the **self-healing core** of DataWhisperer. See [Self-Correcting Engine](#-self-correcting-engine) for a deep dive.

---

### Agent 6 — Critic Agent
**File:** `backend/agents/critic_agent.py`

Performs **two layers of verification** on the execution result:

**Layer 1 — Structural Checks (rule-based, no LLM):**
- Did the query execute without error?
- Are there null values in the result columns?
- Did the query return any rows at all?

**Layer 2 — Semantic Verification (LLM-powered):**
- Does the result *actually answer* the question asked?
- Are the returned values in a plausible numerical range?
- Is the result shape correct (e.g., single value for "highest X", multiple rows for rankings)?

If semantic verification fails in Deep/Compare mode, the pipeline **routes back to the Self-Corrector** with the verification note as additional context — enabling semantic self-correction, not just syntax correction.

> **Why it matters:** A query can execute without error but still return the wrong answer (e.g., returning all-time total instead of last month's total). The Critic catches semantic mistakes, not just syntax errors.

---

### Agent 7 — Confidence Scorer
**File:** `backend/agents/confidence_scorer.py`
**Active in:** Deep and Compare modes only.

Computes a **0–100% confidence score** with a transparent deduction ledger:

| Deduction Trigger | Points Lost |
|---|---|
| Each RISKY assumption | −15 |
| Each UNKNOWN assumption | −10 |
| Self-correction retry occurred | −10 |
| Result has fewer than 5 rows | −5 |

The score and each deduction are shown in the Trust Trace UI and in the response header. A score below 70% triggers a visual warning.

<!-- 📸 IMAGE SLOT 4 — CONFIDENCE SCORE & TRUST TRACE SCREENSHOT
     Upload a screenshot of the Trust Trace panel expanded in the UI to: docs/images/trust_trace.png
     Should show the agent timeline on the right, the confidence score badge, and the narrative.
     Recommended: 1100×700px -->

<div align="center">
<img src="docs/images/trust_trace.png" alt="Trust Trace Panel showing agent reasoning steps and confidence score" width="85%"/>
<br/><i>Trust Trace — Full agent reasoning timeline + Confidence Score badge</i>
</div>

---

### Agent 8 — Narrator Agent
**File:** `backend/agents/narrator_agent.py`

Converts raw query results into a **confident, jargon-free business narrative**.

- **Quick mode:** One direct sentence — like a Bloomberg terminal headline.
- **Deep mode:** 3–4 sentences with key figures, trends, and context.
- **Compare mode:** 2–4 sentences focused on growth rates, deltas, and the primary drivers of change.
- Gracefully handles failures with an honest error message that tells the user what to try next.
- Strict output rules: no mentions of SQL, tables, rows, or any technical terms. The user should feel like they asked a colleague, not a database.

---

### Agent 9 — Viz Recommender *(built into graph.py)*
**File:** `backend/services/viz_recommender.py`
**Active in:** Deep and Compare modes only.

Selects the best chart type for the result:

| Result Pattern | Recommended Chart |
|---|---|
| Time series (date column + metric) | Line chart |
| Category + metric (top N) | Bar chart |
| Part-to-whole (percentages, shares) | Pie chart |
| Two continuous metrics | Scatter plot |
| Single value / KPI | Text card |

<!-- 📸 IMAGE SLOT 5 — VISUALISATION SCREENSHOT
     Upload a screenshot showing a chart rendered in the chat to: docs/images/chart_demo.png
     Should show a bar or line chart rendered by Recharts below the narrative answer.
     Recommended: 900×500px -->

<div align="center">
<img src="docs/images/chart_demo.png" alt="Auto-generated bar chart showing top spending categories" width="80%"/>
<br/><i>Auto Visualisation — chart type selected by the Viz Recommender agent</i>
</div>

---

### Agent 10 — Follow-up Agent
**File:** `backend/agents/followup_agent.py`
**Active in:** Deep and Compare modes only.

Generates **three contextual next questions** based on the data just shown. Displayed as clickable chips below every answer.

- Each suggestion is under 10 words, specific to the result just seen.
- Enables iterative data exploration without the user needing to think of what to ask next.
- Uses higher temperature (0.6) to ensure variety across suggestions.

---

## 🔁 Self-Correcting Engine

> **This is the most technically distinctive feature of DataWhisperer.**

Standard NL-to-SQL systems fail silently when the generated SQL returns an error — leaving the user with a cryptic error message. DataWhisperer's **Self-Correcting Engine** automatically diagnoses and fixes failures before the user ever sees them.

### How It Works

```
User asks a question
       │
       ▼
Coder Agent generates SQL  ──────────────────────────────────────┐
       │                                                          │
       ▼                                                          │
Executor runs SQL                                                 │
       │                                                          │
  ┌────┴──────────────────┐                                       │
  │                        │                                      │
  ▼                        ▼                                      │
No error              Error detected                              │
  │                        │                                      │
  ▼                        └──► retry_count < 2?                  │
Critic Agent                         │                            │
  │                              Yes │                            │
  ▼                                  ▼                            │
Semantic check ──► FAIL  Self-Corrector runs ────────────────────►┘
  │                (Deep/Compare)                (new SQL with error
  │                                               context injected)
  ▼
Pass → Confidence → Narrator
```

### What the Self-Corrector Does

When triggered, `coder_agent.run_correction()` receives:

1. **The failed SQL** — exactly what broke
2. **The error message** — the database's precise complaint (e.g., `column "amount" does not exist`, `syntax error near "PIVOT"`)
3. **The full schema** — all available tables and columns
4. **The mode rules** — dialect-specific SQL constraints

It injects all of this into the prompt:
```
PREVIOUS SQL FAILED — fix it:
Failed SQL: SELECT amount FROM sales GROUP BY month
Error message: column "amount" does not exist
Rewrite the SQL to avoid this error.
```

The corrected SQL is then re-executed. The retry counter is incremented in `AgentState` and deducted from the Confidence Score.

### Two Types of Self-Correction

| Trigger | Source | Handled By |
|---|---|---|
| **Syntax / execution error** | Database rejects the SQL | `execution_error` field → Self-Corrector |
| **Semantic verification failure** | Critic says result doesn't answer the question | `verification_note` field → Self-Corrector |

**Maximum retries:** 2 (configurable in `graph.py` routing conditions). After 2 failures, the Narrator produces an honest failure message explaining what was attempted.

<!-- 📸 IMAGE SLOT 6 — SELF-CORRECTION FLOW GIF or SCREENSHOT
     Upload a screenshot showing a Trust Trace with a retry visible to: docs/images/self_correction.png
     Should show the Coder Agent appearing twice in the timeline — once initial, once as "(retry 1)".
     Recommended: 800×400px -->

<div align="center">
<img src="docs/images/self_correction.png" alt="Trust Trace showing a self-correction retry cycle" width="80%"/>
<br/><i>Self-Correction in action — Coder Agent rewriting SQL after a failed execution</i>
</div>

---

## ⚙️ Analysis Modes

| Mode | Pipeline Depth | LLM Calls | Use Case |
|---|---|---|---|
| **Quick** | 5 agents (no audit, no viz, no followup) | ~3 | Fast single-sentence answers; keyword lookups |
| **Deep** | All 9 agents | ~7–8 | Full rigour: confidence score, charts, follow-ups |
| **Compare** | All 9 agents + comparison-specific prompts | ~7–8 | Period-over-period or group-vs-group analysis |

Switch modes using the toggle in the chat input bar. Default is **Deep**.

---

## 🛠 Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **LLM** | Groq — Llama 3.3 70B Versatile | SQL generation, narration |
| **LLM (support agents)** | Groq — Llama 3.1 8B Instant | Confidence scoring, assumptions audit, follow-ups |
| **Agent Framework** | LangGraph 1.1+ | DAG pipeline orchestration |
| **Backend API** | FastAPI | REST API, session management |
| **Query Engine (files)** | DuckDB | In-memory CSV/Excel analytics |
| **Query Engine (DBs)** | SQLAlchemy 2.0 | PostgreSQL, MySQL, SQLite |
| **Frontend** | Next.js 14 (App Router) | SSR, routing |
| **Styling** | Vanilla CSS | Glassmorphism dark theme |
| **Charts** | Recharts | Data visualisation |
| **Deployment (frontend)** | Vercel | Edge CDN, CI/CD |
| **Deployment (backend)** | Render / Railway | Python server |
| **License** | Apache 2.0 | Open source |

---

## 📁 Project Structure

```
datawhisperer/
│
├── backend/                         # FastAPI application
│   ├── agents/                      # LangGraph agent nodes
│   │   ├── graph.py                 # Pipeline DAG definition & routing logic
│   │   ├── agent_state.py           # Shared state schema (TypedDict)
│   │   ├── semantic_agent.py        # Intent resolution & source selection
│   │   ├── assumptions_auditor.py   # Deep risk audit (Deep/Compare only)
│   │   ├── coder_agent.py           # SQL generation + self-correction entry
│   │   ├── critic_agent.py          # Structural + semantic verification
│   │   ├── confidence_scorer.py     # 0–100% trust score computation
│   │   ├── narrator_agent.py        # Business narrative generation
│   │   └── followup_agent.py        # Contextual follow-up suggestions
│   │
│   ├── routers/                     # FastAPI route handlers
│   │   ├── auth.py                  # Login / session endpoints
│   │   ├── chat.py                  # /chat/query — main pipeline trigger
│   │   ├── sources.py               # Data source connect/disconnect/list
│   │   └── export.py                # CSV export endpoint
│   │
│   ├── services/                    # Core service layer
│   │   ├── groq_client.py           # LLM client + key rotation pool
│   │   ├── data_engine.py           # Query execution + cross-DB joins
│   │   ├── db_connector.py          # Database connection & schema extraction
│   │   ├── schema_extractor.py      # Table/column metadata utilities
│   │   ├── metric_dictionary.py     # Business term → SQL mapping
│   │   ├── viz_recommender.py       # Chart type selection logic
│   │   ├── session_store.py         # In-memory session management
│   │   ├── source_store.py          # Connected source registry
│   │   ├── error_reporter.py        # Email error reporting
│   │   └── masker.py                # Connection string masking
│   │
│   ├── models/
│   │   └── schemas.py               # Pydantic request/response models
│   │
│   ├── middleware/
│   │   └── auth.py                  # Session token validation
│   │
│   ├── utils/
│   │   ├── logger.py                # Structured logging setup
│   │   └── masker.py                # Credential masking utilities
│   │
│   ├── tests/                       # Backend test suite
│   │   ├── test_agents.py           # Agent pipeline unit tests
│   │   ├── test_data_engine.py      # Query execution tests
│   │   └── test_sources.py          # Source connection tests
│   │
│   ├── scripts/
│   │   └── init_demo_db.py          # SQLite demo database initializer
│   │
│   ├── main.py                      # FastAPI app entry point
│   ├── run.py                       # Dev runner
│   ├── requirements.txt             # Python dependencies
│   ├── Dockerfile                   # Backend container
│   └── .env.example                 # Environment variable template
│
├── frontend/                        # Next.js 14 application
│   ├── app/                         # App Router pages
│   │   ├── page.tsx                 # Landing / redirect
│   │   ├── auth/page.tsx            # Login page
│   │   ├── chat/page.tsx            # Main chat interface
│   │   ├── sources/page.tsx         # Data source management
│   │   └── history/page.tsx         # Query history
│   │
│   ├── components/
│   │   ├── AddSourceWizard.tsx      # Multi-step source connection UI
│   │   └── OnboardingGuide.tsx      # First-time user walkthrough
│   │
│   ├── hooks/
│   │   ├── useChat.ts               # Chat state management
│   │   ├── useAuth.ts               # Authentication state
│   │   └── useOnboarding.tsx        # Onboarding flow state
│   │
│   ├── lib/
│   │   ├── api.ts                   # Typed API client
│   │   └── types.ts                 # TypeScript type definitions
│   │
│   ├── public/sample/               # Sample CSV files for demo
│   │   ├── employees.csv
│   │   └── sales_data.csv
│   │
│   ├── package.json
│   ├── next.config.mjs
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── .env.example
│
├── sample_data/                     # Banking demo datasets (CSV)
│   ├── bank_transactions.csv        # Transaction records
│   ├── customer_accounts.csv        # Account balances
│   ├── fraud_alerts.csv             # Fraud detection logs
│   ├── loan_portfolio.csv           # Loan status breakdown
│   └── monthly_revenue.csv          # Revenue time series
│
├── docs/                            # Additional documentation
│   ├── architecture.md              # Detailed architecture notes
│   └── images/                      # README images (upload here)
│
├── docker-compose.yml               # Full stack orchestration
├── Dockerfile                       # Root Dockerfile (backend)
├── .env.example                     # Root environment template
├── .gitignore
├── LICENSE                          # Apache 2.0
└── README.md                        ← you are here
```

---

## 🚀 Quick Start

### Prerequisites

- **Python 3.11+**
- **Node.js 20+**
- **One or more free Groq API keys** — get them at [console.groq.com](https://console.groq.com) (no credit card needed)

---

### Option A — Local Development (Recommended for first run)

#### 1. Clone the repository

```bash
git clone https://github.com/Abhay-BITS/datawhisperer-natwest.git
cd datawhisperer-natwest
```

#### 2. Backend setup

```bash
cd backend

# Create a virtual environment
python -m venv .venv
source .venv/bin/activate          # macOS/Linux
# .venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
```

Open `.env` and set your Groq key(s):
```env
GROQ_API_KEYS=gsk_your_key_1_here,gsk_your_key_2_here
```

Start the backend:
```bash
uvicorn main:app --reload --port 8000
```

API will be live at `http://localhost:8000`
Interactive docs at `http://localhost:8000/docs`

#### 3. Frontend setup

```bash
# Open a new terminal
cd frontend

# Install dependencies
npm install

# Configure API URL (optional — defaults to localhost:8000)
cp .env.example .env.local

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

<!-- 📸 IMAGE SLOT 7 — DATA SOURCE CONNECTION SCREENSHOT
     Upload a screenshot of the Add Source wizard to: docs/images/add_source.png
     Should show the step-by-step wizard for connecting a database or uploading a CSV.
     Recommended: 800×500px -->

<div align="center">
<img src="docs/images/add_source.png" alt="Add Data Source wizard — connect PostgreSQL, MySQL, SQLite, or upload CSV" width="75%"/>
<br/><i>Add Data Source wizard — connect any database or upload CSV/Excel in 3 steps</i>
</div>

---

### Option B — Docker (both services in one command)

```bash
# From project root
cp .env.example .env
# Edit .env and add your Groq key(s)

docker-compose up --build
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |

---

## 🔧 Configuration

All configuration is via environment variables. **Never commit your `.env` file.**

### Backend (`backend/.env`)

```env
# ── Required ─────────────────────────────────────────────────────────
# Comma-separated pool of Groq API keys.
# The system auto-rotates to the next key when one hits its rate limit.
GROQ_API_KEYS=gsk_key1_here,gsk_key2_here,gsk_key3_here

# ── Optional: Error Reporting ─────────────────────────────────────────
# If configured, runtime errors are emailed to this address.
FEEDBACK_EMAIL=your_email@example.com
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# ── Optional: Cloud Database Demo Mode ────────────────────────────────
# For the hosted demo, these pre-connect banking datasets at startup.
SUPABASE_HOST=your-project.supabase.co
SUPABASE_USER=postgres
SUPABASE_PASSWORD=your_password
SUPABASE_DATABASE=postgres

TIDB_HOST=your-cluster.tidbcloud.com
TIDB_USER=your_user
TIDB_PASSWORD=your_password
TIDB_DATABASE=your_database

TURSO_HOST=your-db.turso.io
TURSO_AUTH_TOKEN=your_token
```

### Frontend (`frontend/.env.local`)

```env
# Point to your deployed backend or leave as localhost for development
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### API Key Rotation — How It Works

The `GroqKeyPool` class in `backend/services/groq_client.py` manages a thread-safe pool of keys:

```
Request comes in
      │
      ▼
Use current key ──► Success ──► Return result
      │
      ▼ RateLimitError (HTTP 429)
Rotate to next key in pool
      │
      ▼
Retry immediately
      │
All keys exhausted? ──► Wait 3s ──► One final retry cycle
```

Add multiple keys to `GROQ_API_KEYS` to extend the free-tier capacity. Each key has ~14,800 tokens/minute on Groq's free tier.

---

## 💬 Usage Examples

### Example 1 — Aggregation Query (Deep Mode)

**User asks:** `"What are the top 5 spending categories by total transaction amount?"`

**What DataWhisperer does:**
1. Semantic Agent maps "spending categories" to the `category` column and "total amount" to `SUM(amount)`.
2. Coder Agent generates: `SELECT category, SUM(amount) AS total_spend FROM bank_transactions GROUP BY category ORDER BY total_spend DESC LIMIT 5`
3. Executor runs it — succeeds.
4. Critic verifies: 5 rows returned, values are plausible, shape matches a ranking query.
5. Confidence Scorer: 95/100 (no assumptions, no retries).
6. Narrator: *"Food & Groceries leads all spending at £42,150, followed by Transport (£31,200) and Utilities (£28,900). The top 5 categories account for 78% of total transaction volume."*
7. Viz Recommender: Bar chart (categorical + metric → bar).

---

### Example 2 — Self-Correction in Action

**User asks:** `"Show month-over-month revenue growth"`

**Attempt 1:** Coder generates SQL using `PIVOT` → MySQL rejects it (`PIVOT not supported`).

**Self-Correction triggered:**
- Error injected: `"PIVOT" not recognized`
- Coder rewrites using a CTE approach instead:
  ```sql
  WITH monthly AS (
    SELECT DATE_FORMAT(date, '%Y-%m') AS month, SUM(amount) AS revenue
    FROM bank_transactions
    GROUP BY month
    ORDER BY month
  )
  SELECT 
    m1.month, m1.revenue,
    ROUND(100.0 * (m1.revenue - m2.revenue) / m2.revenue, 1) AS delta_pct
  FROM monthly m1
  LEFT JOIN monthly m2 ON m1.month = DATE_ADD(m2.month, INTERVAL 1 MONTH)
  ```

**Result:** Clean month-over-month table with delta percentages. Confidence: 88/100 (−10 for retry).

---

### Example 3 — Compare Mode

**User asks:** `"Compare Q1 vs Q2 fraud alerts"`

```
Semantic Agent: Identifies two time periods (Q1 = Jan–Mar, Q2 = Apr–Jun)
Coder Agent:    Generates CTE with separate Q1 and Q2 counts + delta_percentage
Narrator:       "Q2 saw 23 fraud alerts, a 15% increase from Q1's 20 alerts.
                 Card-not-present fraud was the primary driver, growing 40% QoQ."
```

---

### Example API Call

```bash
curl -X POST http://localhost:8000/chat/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-session-token>" \
  -d '{
    "question": "What is the average loan amount by status?",
    "session_id": "abc123",
    "mode": "deep"
  }'
```

**Response:**
```json
{
  "narrative": "Active loans average £24,500, significantly higher than defaulted loans at £31,200.",
  "confidence_score": 92,
  "trust_trace": [
    {"agent": "Semantic Agent", "action": "Intent Resolution", ...},
    {"agent": "Coder Agent", "action": "SQL Generation", ...},
    {"agent": "Critic Agent", "action": "Result Verification", ...},
    {"agent": "Confidence Scorer", "action": "Confidence Assessment: 92%", ...},
    {"agent": "Narrator Agent", "action": "Business Insight", ...}
  ],
  "visualization": {"type": "bar", "x": "status", "y": "avg_amount"},
  "suggested_followups": [
    "Which loan type has the highest default rate?",
    "Show total loan exposure by region",
    "How many loans are overdue by more than 90 days?"
  ]
}
```

---

## 📡 API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/auth/login` | Create a session (demo auth) |
| `POST` | `/auth/logout` | Destroy the session |
| `POST` | `/sources/connect` | Connect a new data source |
| `POST` | `/sources/upload` | Upload a CSV or Excel file |
| `GET` | `/sources/list` | List connected sources for a session |
| `DELETE` | `/sources/{source_id}` | Disconnect a source |
| `POST` | `/chat/query` | Run a natural language query (main pipeline) |
| `GET` | `/chat/history` | Retrieve conversation history |
| `GET` | `/export/csv` | Download last result as CSV |
| `GET` | `/health` | Health check |
| `GET` | `/docs` | Interactive Swagger UI |

---

## 📊 Sample Data

The `sample_data/` directory contains five synthetic banking datasets designed for demo and testing:

| File | Rows | Description | Key Columns |
|---|---|---|---|
| `bank_transactions.csv` | 1,000 | Individual transaction records | `date`, `amount`, `category`, `merchant`, `account_id` |
| `customer_accounts.csv` | 250 | Customer account summaries | `account_id`, `customer_name`, `balance`, `account_type`, `status` |
| `fraud_alerts.csv` | 180 | Fraud detection events | `alert_date`, `alert_type`, `amount`, `status`, `account_id` |
| `loan_portfolio.csv` | 400 | Loan portfolio records | `loan_id`, `amount`, `loan_type`, `status`, `issue_date`, `region` |
| `monthly_revenue.csv` | 36 | 3-year monthly revenue series | `month`, `revenue`, `channel`, `region` |

All data is **synthetically generated** — no real customer data. Safe for demo and public repositories.

---

## 🚢 Deployment

### Frontend (Vercel)

The Next.js frontend deploys to Vercel in one click:

1. Push the repository to GitHub (keep private during hackathon).
2. Go to [vercel.com](https://vercel.com) → New Project → Import the repo.
3. Set **Root Directory** to `frontend`.
4. Add environment variable: `NEXT_PUBLIC_API_URL=https://your-backend-url.com`
5. Deploy.

The live demo runs at: [https://datawhisperer-natwest.vercel.app](https://datawhisperer-natwest.vercel.app)

### Backend (Render)

1. Create a new **Web Service** on [render.com](https://render.com).
2. Connect the GitHub repo.
3. Set **Root Directory** to `backend`.
4. Set **Start Command** to: `uvicorn main:app --host 0.0.0.0 --port 8000`
5. Add all environment variables from `backend/.env.example`.

### Backend (Railway)

```bash
railway init
railway add
railway up
railway variables set GROQ_API_KEYS=gsk_your_key_1,gsk_your_key_2
```

### Backend (Docker)

```bash
# From backend/
docker build -t datawhisperer-backend .
docker run -p 8000:8000 \
  -e GROQ_API_KEYS=gsk_your_key_1,gsk_your_key_2 \
  datawhisperer-backend
```

---

## 📦 What Goes to GitHub

### ✅ Committed to the repository

```
backend/agents/          All agent source files
backend/routers/         API route handlers
backend/services/        Core service layer
backend/models/          Pydantic schemas
backend/middleware/       Auth middleware
backend/utils/           Logger, masker
backend/tests/           Test suite
backend/scripts/         Database init scripts
backend/main.py          App entry point
backend/requirements.txt Python dependencies
backend/.env.example     Environment template (no real keys)
backend/Dockerfile       Container definition

frontend/app/            Next.js pages
frontend/components/     React components
frontend/hooks/          Custom hooks
frontend/lib/            API client, types
frontend/public/sample/  Sample CSV files
frontend/package.json    Node dependencies
frontend/.env.example    Frontend env template

sample_data/             Synthetic banking CSVs
docs/                    Architecture docs + images

docker-compose.yml
.env.example             Root env template
.gitignore
LICENSE
README.md
```

### ❌ NOT committed (gitignored)

```
backend/.env             ← Real API keys — NEVER commit
backend/demo.db          ← Runtime SQLite database
backend/errors.log       ← Runtime error log
backend/__pycache__/     ← Python bytecode
backend/scratch/         ← Debug scripts
backend/.venv/           ← Virtual environment

frontend/.env.local      ← Local env overrides
frontend/node_modules/   ← Node packages
frontend/.next/          ← Build output
frontend/dev.log         ← Dev server log

scratch/                 ← Root-level debug scripts
uploads/                 ← Uploaded files at runtime
*.sqlite                 ← Any SQLite files
```

> **Security note:** The project uses environment variables exclusively for all credentials. No API keys, passwords, or tokens appear anywhere in the committed code. The `GroqKeyPool`, `DBConnector`, and all service classes read exclusively from `os.getenv()`.

---

## 🧪 Tests

Tests are in `backend/tests/` and use **pytest**.

```bash
cd backend
source .venv/bin/activate
pytest tests/ -v
```

| Test File | What It Tests |
|---|---|
| `test_agents.py` | Agent pipeline: semantic resolution, SQL generation, confidence scoring |
| `test_data_engine.py` | Query execution: DuckDB CSV queries, SQLAlchemy connections |
| `test_sources.py` | Source connection, schema extraction, disconnection |

Run with coverage:
```bash
pytest tests/ --cov=. --cov-report=term-missing
```

---

## ⚠️ Limitations & Future Work

### Current Limitations

- **Demo authentication only:** The login system accepts any username/password. A real deployment would need proper auth (JWT, OAuth).
- **Session state is in-memory:** Restarting the backend clears all sessions and connected sources.
- **No persistent conversation history:** History lives in the browser session only.
- **Cross-database joins are limited** to sources registered in the same DuckDB in-memory context. True cross-RDBMS joins are not supported.
- **No schema change detection:** If a connected database's schema changes, the source must be re-connected.
- **Free-tier rate limits:** The system depends on Groq's free tier. Under heavy load, even with key rotation, responses may slow down.

### Future Improvements

- Persistent user accounts and conversation history (PostgreSQL + Redis).
- WebSocket streaming for real-time Trust Trace updates as each agent completes.
- Scheduled queries and email/Slack delivery of results.
- Fine-tuned SQL generation model on internal schema patterns.
- RBAC — restrict certain tables or columns per user role.
- Pluggable LLM backends (OpenAI, Anthropic, local Ollama).
- Voice input via Web Speech API.

---

## 📄 DCO & License

### License

This project is licensed under the **Apache License 2.0** — see [LICENSE](LICENSE) for the full text.

[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-purple.svg)](LICENSE)

### Developer Certificate of Origin (DCO)

All commits in this repository are signed off in compliance with the **Developer Certificate of Origin** as required by the NatWest Code for Purpose Hackathon rules.

Commits use the `-s` flag:
```bash
git commit -s -m "feat: add confidence scoring agent"
```

Which appends:
```
Signed-off-by: Your Name <your@email.com>
```

All contributions are made in a **personal capacity**, not as official company work.

### Third-Party Licenses

| Library | License |
|---|---|
| FastAPI | MIT |
| LangGraph / LangChain | MIT |
| Groq Python SDK | Apache 2.0 |
| DuckDB | MIT |
| SQLAlchemy | MIT |
| Next.js | MIT |
| Recharts | MIT |
| pandas | BSD |

---

<div align="center">

**Built for NatWest Group — Code for Purpose India Hackathon 2025**

*Talk to Data — Seamless Self-Service Intelligence*

<br/>

[![Live Demo](https://img.shields.io/badge/Live%20Demo-datawhisperer--natwest.vercel.app-brightgreen.svg)](https://datawhisperer-natwest.vercel.app)
[![License: Apache 2.0](https://img.shields.io/badge/License-Apache%202.0-purple.svg)](LICENSE)

</div>
