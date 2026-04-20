"""
Sources Router — Data Source Management.

Handles connecting, listing, testing, and removing data sources (databases,
CSV uploads, Excel files). Also provides a demo data endpoint that seeds
a pre-built SQLite banking dataset for immediate exploration.
"""
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import JSONResponse
from services.db_connector import DBConnector, DBType
from services.source_store import add_source, get_source, list_sources, remove_source
import tempfile, os, shutil, pandas as pd, sqlalchemy as sa, json
from datetime import datetime
from services.groq_client import call_groq

router = APIRouter()
connector = DBConnector()

@router.post("/api/sources/test")
async def test_source(body: dict):
    try:
        db_type = DBType(body["db_type"])
        return connector.test_connection(db_type, body.get("config", {}))
    except Exception as e:
        return {"success": False, "error": str(e), "table_count": 0}

@router.post("/api/sources/connect")
async def connect_source(body: dict):
    try:
        db_type = DBType(body["db_type"])
        selected_tables = body.get("selected_tables")
        source = connector.connect(db_type, body.get("config", {}), body["name"], body["session_id"], selected_tables)
        add_source(source)
        return {
            "source_id": source.source_id,
            "name": source.name,
            "safe_name": source.safe_name,
            "db_type": source.db_type.value,
            "table_count": source.table_count,
            "schema": source.schema,
            "connected_at": source.connected_at,
            "is_connected": source.is_connected
        }
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

@router.post("/api/sources/upload")
async def upload_file(
    file: UploadFile = File(...),
    session_id: str = Form(...),
    name: str = Form(None)
):
    try:
        suffix = os.path.splitext(file.filename)[1].lower()
        if suffix not in (".csv", ".xlsx", ".xls"):
            return JSONResponse(status_code=400, content={"error": "Only CSV and Excel files are supported"})

        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            shutil.copyfileobj(file.file, tmp)
            tmp_path = tmp.name

        db_type = DBType.CSV if suffix == ".csv" else DBType.EXCEL
        source_name = name or file.filename
        source = connector.connect(db_type, {"file_path": tmp_path}, source_name, session_id)
        add_source(source)

        return {
            "source_id": source.source_id,
            "name": source.name,
            "safe_name": source.safe_name,
            "db_type": source.db_type.value,
            "table_count": source.table_count,
            "schema": source.schema,
            "connected_at": source.connected_at,
            "is_connected": source.is_connected
        }
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

@router.get("/api/sources")
async def get_sources(session_id: str):
    sources = list_sources(session_id)
    return [{"source_id": s.source_id, "name": s.name, "safe_name": s.safe_name,
             "db_type": s.db_type.value, "table_count": s.table_count,
             "is_connected": s.is_connected, "connected_at": s.connected_at}
            for s in sources]

@router.get("/api/sources/{source_id}/schema")
async def get_schema(source_id: str):
    try:
        source = get_source(source_id)
        return source.schema
    except KeyError:
        return JSONResponse(status_code=404, content={"error": "Source not found"})


@router.get("/api/sources/sample-creds/{db_type}")
async def get_sample_creds(db_type: str):
    try:
        if db_type == "postgresql":
            return {
                "source_name": "Supabase Bank Sample",
                "host": os.environ.get("SUPABASE_HOST") or "aws-1-ap-northeast-1.pooler.supabase.com",
                "port": os.environ.get("SUPABASE_PORT", "5432"),
                "database": os.environ.get("SUPABASE_DATABASE", "postgres"),
                "username": os.environ.get("SUPABASE_USER") or "postgres.vxtwzsbilfhesjjfmyfn",
                "password": os.environ.get("SUPABASE_PASSWORD") or ",qVcG5wy!cuv8%e"
            }
        elif db_type == "mysql":
            return {
                "source_name": "TiDB Loan Sample",
                "host": os.environ.get("TIDB_HOST") or "gateway01.ap-northeast-1.prod.aws.tidbcloud.com",
                "port": os.environ.get("TIDB_PORT", "4000"),
                "database": os.environ.get("TIDB_DATABASE", "fortune500"),
                "username": os.environ.get("TIDB_USER") or "4EAk1F2wqVEz2MM.root",
                "password": os.environ.get("TIDB_PASSWORD") or "CnzovqaSn1FkaZHx"
            }
        elif db_type == "sqlite":
            turso_host = os.environ.get("TURSO_HOST") or "datawhisperer-abhay070.aws-ap-northeast-1.turso.io"
            if turso_host:
                return {
                    "source_name": "Turso Fraud Sample",
                    "host": turso_host,
                    "password": os.environ.get("TURSO_AUTH_TOKEN") or "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzU4MjE1NjQsImlkIjoiMDE5ZDc3MzYtNTYwMS03OGQwLWI5Y2UtNDZiZjUwYmQzMTUwIiwicmlkIjoiYWYyYjI4MGUtMjFkNy00MGZmLWI5YjAtYThiYWU4MmVlYTExIn0.R-62ruHgZcx5uYR6YlzQi6MmTqEWnwM904EBaNENlUwbegU8GOjH-9ciFYncVyHEfosE-l9GO3_2i6gXxVXKBA"
                }
        return JSONResponse(status_code=404, content={"error": "Sample not configured for this type"})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})

@router.post("/api/sources/demo")
async def connect_demo(body: dict):
    try:
        session_id = body["session_id"]
        requested_type = body.get("db_type", "sqlite")
        
        # Paths
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        sample_dir = os.path.join(os.path.dirname(base_dir), "sample_data")
        db_path = os.path.join(base_dir, "demo.db")
        
        if requested_type == "csv":
            csv_path = os.path.join(sample_dir, "monthly_revenue.csv")
            source = connector.connect(DBType.CSV, {"file_path": csv_path}, "Monthly Revenue Data", session_id)
        elif requested_type == "postgresql":
            # Supabase (Bank Accounts)
            cfg = {
                "username": os.environ.get("SUPABASE_USER"),
                "password": os.environ.get("SUPABASE_PASSWORD"),
                "host": os.environ.get("SUPABASE_HOST"),
                "port": int(os.environ.get("SUPABASE_PORT", 5432)),
                "database": os.environ.get("SUPABASE_DATABASE") or "postgres"
            }
            source = connector.connect(DBType.POSTGRESQL, cfg, "Supabase Bank Sample", session_id)
        elif requested_type == "mysql":
            # TiDB (Loan Portfolio)
            cfg = {
                "username": os.environ.get("TIDB_USER"),
                "password": os.environ.get("TIDB_PASSWORD"),
                "host": os.environ.get("TIDB_HOST"),
                "port": int(os.environ.get("TIDB_PORT", 4000)),
                "database": os.environ.get("TIDB_DATABASE") or "fortune500"
            }
            source = connector.connect(DBType.MYSQL, cfg, "TiDB Loan Sample", session_id)
        elif requested_type == "sqlite":
            turso_host = os.environ.get("TURSO_HOST")
            if turso_host:
                # Turso (Fraud Alerts)
                cfg = {
                    "host": turso_host,
                    "password": os.environ.get("TURSO_AUTH_TOKEN")
                }
                source = connector.connect(DBType.SQLITE, cfg, "Turso Fraud Sample", session_id)
            else:
                # Initialize local DB fallback
                engine = sa.create_engine(f"sqlite:///{db_path}")
                with engine.connect() as conn:
                    conn.execute(sa.text("DROP TABLE IF EXISTS employees"))
                    conn.execute(sa.text("DROP TABLE IF EXISTS sales_data"))
                    conn.commit()

                files = {"monthly_revenue": os.path.join(sample_dir, "monthly_revenue.csv")}
                for table_name, file_path in files.items():
                    if os.path.exists(file_path):
                        df = pd.read_csv(file_path)
                        df.columns = [c.strip().replace(' ', '_').lower() for c in df.columns]
                        df.to_sql(table_name, engine, if_exists='replace', index=False)
                source = connector.connect(DBType.SQLITE, {"file_path": db_path}, "Analysis Database", session_id)
        else:
            # Fallback to local SQLite initialization
            engine = sa.create_engine(f"sqlite:///{db_path}")
            source = connector.connect(DBType.SQLITE, {"file_path": db_path}, "Analysis Database", session_id)
            
        add_source(source)
        
        return {
            "source_id": source.source_id,
            "name": source.name,
            "safe_name": source.safe_name,
            "db_type": source.db_type.value,
            "table_count": source.table_count,
            "schema": source.schema,
            "connected_at": source.connected_at,
            "is_connected": source.is_connected
        }
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

@router.post("/api/sources/suggest-questions")
async def suggest_questions(body: dict):
    import logging, re
    log = logging.getLogger(__name__)
    try:
        session_id = body.get("session_id")
        source_id = body.get("source_id")

        sources = list_sources(session_id)
        if source_id:
            sources = [s for s in sources if s.source_id == source_id]

        if not sources:
            return {"questions": []}

        # Build schema context + collect every real column name (and human-readable alias)
        schema_lines = []
        # col_vocab: all words that are valid to reference (raw names + space-separated forms)
        col_vocab: set[str] = set()
        dimension_cols: list[str] = []   # categorical / string columns good for GROUP BY
        metric_cols: list[str] = []      # numeric columns good for aggregation
        date_cols: list[str] = []        # temporal columns good for trends

        for s in sources:
            for tname, tinfo in s.schema.get("tables", {}).items():
                cols = tinfo.get("columns", [])
                col_desc = ", ".join(f"{c['name']} ({c.get('type','?')})" for c in cols)
                row_count = tinfo.get("row_count", "?")
                schema_lines.append(f'Table "{tname}" ({row_count} rows): {col_desc}')

                for c in cols:
                    raw = c["name"].lower()
                    col_vocab.add(raw)
                    # also add space-separated form so "net_profit" → "net profit" is valid
                    col_vocab.add(raw.replace("_", " "))
                    # also add individual tokens
                    col_vocab.update(raw.replace("_", " ").split())

                    ctype = str(c.get("type", "")).lower()
                    if any(t in ctype for t in ("int", "float", "double", "decimal", "numeric", "real", "money", "number")):
                        metric_cols.append(raw.replace("_", " "))
                    elif any(t in ctype for t in ("date", "time", "timestamp", "year", "month")):
                        date_cols.append(raw.replace("_", " "))
                    else:
                        dimension_cols.append(raw.replace("_", " "))

        if not schema_lines:
            return {"questions": []}

        schema_str = "\n".join(schema_lines)

        # Give the LLM only the real column vocabulary so it cannot invent columns
        dim_hint  = ", ".join(dimension_cols[:12]) or "none"
        metric_hint = ", ".join(metric_cols[:12]) or "none"
        date_hint = ", ".join(date_cols[:8]) or "none"

        system = f"""You are a senior data analyst. Suggest exactly 3 business questions a user can ask about the data below.

RULES — read every rule carefully:
1. ONLY use concepts from these column lists. Do NOT invent or assume any other column exists:
   - Dimension columns (for grouping/breakdown): {dim_hint}
   - Metric columns (for aggregation):           {metric_hint}
   - Date/time columns (for trends):             {date_hint}
2. Every question MUST return multiple rows so it can be plotted as a chart.
   Required pattern: one metric grouped by one dimension (e.g. "revenue by region").
   FORBIDDEN: single-value questions ("total X", "average X", "what is X").
3. Write natural English — no underscores, no technical column names.
   Convert column names: "total_revenue" → "revenue", "net_profit" → "net profit".
4. One question must be a ranking: "Which [dimension] has the highest [metric]?"
5. One question must be a breakdown/trend: "[metric] by [dimension or date]"
6. One question must compare groups: "How does [metric] compare across [dimension]?"
7. Maximum 12 words per question.

SCHEMA (for reference):
{schema_str}

Return ONLY valid JSON: {{"questions": ["q1", "q2", "q3"]}}"""

        result = call_groq(system, "Generate 3 chart-ready questions.", temperature=0.35, max_tokens=250)

        if isinstance(result, dict):
            raw_questions = result.get("questions", [])
        elif isinstance(result, list):
            raw_questions = result
        else:
            raw_questions = []

        # Post-generation validation: reject questions that contain words not in col_vocab
        # (catch hallucinated dimensions like "city", "country", "product" when they don't exist)
        def _question_is_valid(q: str) -> bool:
            words = re.sub(r"[^a-z0-9 ]", "", q.lower()).split()
            # Stop words that are always fine
            stopwords = {
                "which", "what", "how", "does", "the", "a", "an", "by", "of", "in",
                "is", "are", "was", "for", "to", "do", "top", "each", "across",
                "between", "and", "or", "vs", "per", "over", "from", "compare",
                "show", "give", "me", "us", "with", "has", "have", "highest",
                "lowest", "most", "least", "best", "worst", "total", "average",
                "trend", "breakdown", "distribution", "number", "count",
            }
            # Any word not in stopwords must appear in col_vocab
            suspicious = [w for w in words if w not in stopwords and len(w) > 3 and w not in col_vocab]
            # Allow up to 1 word not in vocab (model rephrasing is fine)
            return len(suspicious) <= 1

        validated = [
            str(q).strip() for q in raw_questions
            if q and str(q).strip() and _question_is_valid(str(q))
        ][:3]

        return {"questions": validated}

    except Exception as e:
        log.warning("Error generating suggestions: %s", e)
        return {"questions": []}

@router.post("/api/sources/clone")
async def clone_session_sources(body: dict):
    from services.source_store import clone_sources
    try:
        from_id = body["from_session_id"]
        to_id = body["to_session_id"]
        clone_sources(from_id, to_id)
        return {"success": True}
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})

@router.delete("/api/sources/{source_id}")
async def disconnect(source_id: str):
    try:
        remove_source(source_id)
        return {"success": True}
    except KeyError:
        return JSONResponse(status_code=404, content={"error": "Source not found"})
