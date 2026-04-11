from dataclasses import dataclass, field
from enum import Enum
import sqlalchemy as sa
from sqlalchemy import inspect as sa_inspect
import pandas as pd
import duckdb, uuid, re
from datetime import datetime

class DBType(Enum):
    POSTGRESQL = "postgresql"
    MYSQL = "mysql"
    SQLITE = "sqlite"
    CSV = "csv"
    EXCEL = "excel"

@dataclass
class DataSource:
    source_id: str
    name: str
    safe_name: str
    db_type: DBType
    masked_conn: str
    engine: any
    duckdb_conn: any
    dataframe: any
    schema: dict
    is_connected: bool
    connected_at: str
    table_count: int
    session_id: str
    config: dict  # raw connection config — used for session cloning

class DBConnector:

    def _safe_name(self, name: str) -> str:
        return re.sub(r'[^a-zA-Z0-9_]', '_', name).lower()

    def _build_conn_str(self, db_type: DBType, cfg: dict) -> str:
        if db_type == DBType.POSTGRESQL:
            # Add sslmode=require for cloud DBs like Supabase
            return f"postgresql+psycopg2://{cfg['username']}:{cfg['password']}@{cfg['host']}:{cfg.get('port',5432)}/{cfg['database']}?sslmode=require"
        elif db_type == DBType.MYSQL:
            # Pymysql uses ssl=true or similar via connect_args usually, 
            # but we can try basic string for some drivers.
            return f"mysql+pymysql://{cfg['username']}:{cfg['password']}@{cfg['host']}:{cfg.get('port',3306)}/{cfg['database']}"
        elif db_type == DBType.SQLITE:
            host = cfg.get('host', '')
            if 'turso.io' in host:
                # Strip libsql:// if present
                clean_host = host.replace('libsql://', '')
                # Format: sqlite+libsql://hostname/?secure=true
                return f"sqlite+libsql://{clean_host}/?secure=true"
            return f"sqlite:///{cfg['file_path']}"
        return ""

    def test_connection(self, db_type: DBType, cfg: dict) -> dict:
        try:
            if db_type in (DBType.CSV, DBType.EXCEL):
                tname = cfg.get("file_path", "data.csv").split("/")[-1]
                return {"success": True, "error": None, "table_count": 1, "tables": [tname]}
            conn_str = self._build_conn_str(db_type, cfg)
            
            # Add SSL/Auth for Cloud DBs
            connect_args = {}
            if db_type == DBType.POSTGRESQL or db_type == DBType.MYSQL:
                connect_args["connect_timeout"] = 10
                
            if db_type == DBType.MYSQL:
                connect_args["ssl"] = {"verify_identity": True}
            elif db_type == DBType.SQLITE and 'turso.io' in cfg.get('host', ''):
                connect_args["auth_token"] = cfg.get('password') or cfg.get('token')
                
            engine = sa.create_engine(conn_str, connect_args=connect_args)
            with engine.connect() as conn:
                inspector = sa_inspect(engine)
                tables = inspector.get_table_names()
            engine.dispose()
            return {"success": True, "error": None, "table_count": len(tables), "tables": tables}
        except Exception as e:
            return {"success": False, "error": str(e), "table_count": 0}

    def connect(self, db_type: DBType, cfg: dict, name: str, session_id: str, selected_tables: list = None) -> DataSource:
        source_id = str(uuid.uuid4())
        safe_name = self._safe_name(name)

        if db_type == DBType.CSV:
            df = pd.read_csv(cfg["file_path"], encoding="utf-8-sig")
            conn = duckdb.connect()
            conn.register(safe_name, df)
            schema = self._schema_from_df(df, safe_name)
            return DataSource(source_id, name, safe_name, db_type, f"csv://{name}",
                              None, conn, df, schema, True,
                              datetime.utcnow().isoformat(), 1, session_id, cfg)

        elif db_type == DBType.EXCEL:
            df = pd.read_excel(cfg["file_path"])
            conn = duckdb.connect()
            conn.register(safe_name, df)
            schema = self._schema_from_df(df, safe_name)
            return DataSource(source_id, name, safe_name, db_type, f"excel://{name}",
                              None, conn, df, schema, True,
                              datetime.utcnow().isoformat(), 1, session_id, cfg)

        else:
            conn_str = self._build_conn_str(db_type, cfg)
            masked = conn_str.replace(cfg.get("password", "NOPASS"), "****")
            
            # Add SSL/Auth for Cloud DBs
            connect_args = {}
            if db_type == DBType.MYSQL:
                connect_args["ssl"] = {"verify_identity": True}
            elif db_type == DBType.SQLITE and 'turso.io' in cfg.get('host', ''):
                connect_args["auth_token"] = cfg.get('password') or cfg.get('token')
                
            engine = sa.create_engine(conn_str, connect_args=connect_args, pool_pre_ping=True)
            schema = self._schema_from_engine(engine, selected_tables)
            return DataSource(source_id, name, safe_name, db_type, masked,
                              engine, None, None, schema, True,
                              datetime.utcnow().isoformat(), len(schema["tables"]), session_id, cfg)

    def _schema_from_df(self, df: pd.DataFrame, table_name: str) -> dict:
        type_map = {"int64": "INTEGER", "float64": "FLOAT", "object": "STRING",
                    "bool": "BOOLEAN", "datetime64[ns]": "TIMESTAMP"}
        cols = [{"name": c, "type": type_map.get(str(df[c].dtype), "STRING"),
                 "pk": False, "fk": None, "nullable": bool(df[c].isna().any())}
                for c in df.columns]
        return {"tables": {table_name: {"row_count": len(df), "columns": cols}}}

    def _schema_from_engine(self, engine, selected_tables: list = None) -> dict:
        inspector = sa_inspect(engine)
        tables = {}
        all_tables = inspector.get_table_names()
        target_tables = [t for t in all_tables if t in selected_tables] if selected_tables else all_tables
        
        for tname in target_tables:
            pk_cols = set(inspector.get_pk_constraint(tname).get("constrained_columns", []))
            fk_map = {}
            for fk in inspector.get_foreign_keys(tname):
                if fk.get("constrained_columns"):
                    fk_map[fk["constrained_columns"][0]] = f"{fk['referred_table']}.{fk['referred_columns'][0]}"
            cols = [{"name": c["name"], "type": str(c["type"]),
                     "pk": c["name"] in pk_cols,
                     "fk": fk_map.get(c["name"]),
                     "nullable": c.get("nullable", True)}
                    for c in inspector.get_columns(tname)]
            try:
                with engine.connect() as con:
                    if str(engine.url).startswith("mysql"):
                        con.execute(sa.text("SET SESSION sql_mode=(SELECT CONCAT(@@sql_mode, ',ANSI_QUOTES'))"))
                    count = con.execute(sa.text(f"SELECT COUNT(*) FROM \"{tname}\"")).scalar()
            except Exception:
                count = -1
            tables[tname] = {"row_count": count, "columns": cols}
        return {"tables": tables}

    def execute_on_source(self, source: DataSource, sql: str) -> dict:
        try:
            if source.duckdb_conn:
                result = source.duckdb_conn.execute(sql)
                cols = [d[0] for d in result.description]
                rows = result.fetchmany(500)
                try:
                    total = source.duckdb_conn.execute(f"SELECT COUNT(*) FROM ({sql}) __t__").fetchone()[0]
                except Exception:
                    total = len(rows)
                return {"columns": cols, "rows": [list(r) for r in rows],
                        "row_count": total, "truncated": total > 500, "error": None}
            else:
                with source.engine.connect() as conn:
                    if str(source.engine.url).startswith("mysql"):
                        conn.execute(sa.text("SET SESSION sql_mode=(SELECT CONCAT(@@sql_mode, ',ANSI_QUOTES'))"))
                    res = conn.execute(sa.text(sql))
                    cols = list(res.keys())
                    rows = res.fetchmany(500)
                    return {"columns": cols, "rows": [list(r) for r in rows],
                            "row_count": len(rows), "truncated": False, "error": None}
        except Exception as e:
            return {"columns": [], "rows": [], "row_count": 0, "truncated": False, "error": str(e)}
