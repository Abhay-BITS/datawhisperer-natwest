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
                "host": os.environ.get("SUPABASE_HOST"),
                "port": os.environ.get("SUPABASE_PORT", "5432"),
                "database": os.environ.get("SUPABASE_DATABASE", "postgres"),
                "username": os.environ.get("SUPABASE_USER"),
                "password": os.environ.get("SUPABASE_PASSWORD")
            }
        elif db_type == "mysql":
            return {
                "source_name": "TiDB Loan Sample",
                "host": os.environ.get("TIDB_HOST"),
                "port": os.environ.get("TIDB_PORT", "4000"),
                "database": os.environ.get("TIDB_DATABASE", "fortune500"),
                "username": os.environ.get("TIDB_USER"),
                "password": os.environ.get("TIDB_PASSWORD")
            }
        elif db_type == "sqlite":
            turso_host = os.environ.get("TURSO_HOST")
            if turso_host:
                return {
                    "source_name": "Turso Fraud Sample",
                    "host": turso_host,
                    "password": os.environ.get("TURSO_AUTH_TOKEN")
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
    try:
        session_id = body.get("session_id")
        source_id = body.get("source_id") # Optional: if provided, focus only on this source
        
        sources = list_sources(session_id)
        if source_id:
            sources = [s for s in sources if s.source_id == source_id]
            
        if not sources:
            return {"questions": ["What can I ask about my data?", "How do I get started?", "What tables are available?"]}

        # Build schema context for LLM
        schema_ctx = []
        for s in sources:
            source_info = f"Source: {s.name} ({s.db_type.value})\n"
            for tname, tinfo in s.schema.get("tables", {}).items():
                cols = [c["name"] for c in tinfo.get("columns", [])]
                source_info += f"  Table: {tname} | Columns: {', '.join(cols)}\n"
            schema_ctx.append(source_info)
        
        ctx_str = "\n".join(schema_ctx)
        
        system = """You are a Data Analyst. Based on the provided database schema, suggest 3-5 high-value business analytical questions.
Each question should be concise and directly queryable using the columns provided.
Target a mix of ranking, trend analysis, and descriptive statistics.
Return ONLY a JSON array of strings."""

        user_input = f"Schema Context:\n{ctx_str}"
        
        questions = call_groq(system, user_input, temperature=0.7, max_tokens=300)
        if not isinstance(questions, list):
            # Fallback if LLM didn't return a list
            questions = ["What are the top trends in this data?", "Summarize the key metrics", "Which categories have the most impact?"]
            
        return {"questions": questions}
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning("Error generating suggestions: %s", e)
        return {"questions": ["What is the overall trend?", "List the top items by value", "Compare performance over time"]}

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
