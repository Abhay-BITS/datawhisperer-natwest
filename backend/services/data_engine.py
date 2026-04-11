"""
Data Engine — Query Execution & Result Handling.

Central execution hub for running generated code (SQL/DuckDB) against 
connected data sources. Handles session routing, cross-source joins,
and result formatting (columns, rows, error handling).
"""
from services.source_store import get_source, list_sources
import duckdb
import pandas as pd


def execute_query(session_id, code, code_type, source_ids, cross_db):  # noqa: code_type reserved for future pandas path
    if not source_ids:
        return {"columns": [], "rows": [], "row_count": 0, "truncated": False,
                "error": "No sources selected"}

    if cross_db and len(source_ids) > 1:
        return _cross_db_execute(source_ids, code)

    # Try primary source first, fall back to first available in session
    source = None
    for sid in source_ids:
        try:
            source = get_source(sid)
            break
        except KeyError:
            continue

    if source is None:
        # Last resort: use any source in the session
        all_sources = list_sources(session_id)
        if all_sources:
            source = all_sources[0]
        else:
            return {"columns": [], "rows": [], "row_count": 0, "truncated": False,
                    "error": "Source not found — please reconnect your data source."}

    from services.db_connector import DBConnector
    conn = DBConnector()
    return conn.execute_on_source(source, code)


def _cross_db_execute(source_ids, sql):
    tmp = duckdb.connect()
    try:
        for sid in source_ids:
            try:
                source = get_source(sid)
            except KeyError:
                continue
            if source.dataframe is not None:
                tmp.register(source.safe_name, source.dataframe)
            elif source.engine is not None:
                with source.engine.connect() as conn:
                    for tname in source.schema.get("tables", {}).keys():
                        try:
                            df = pd.read_sql(f'SELECT * FROM "{tname}"', conn)
                            tmp.register(f"{source.safe_name}_{tname}", df)
                        except Exception:
                            pass
        result = tmp.execute(sql)
        cols = [d[0] for d in result.description]
        rows = result.fetchmany(500)
        return {"columns": cols, "rows": [list(r) for r in rows],
                "row_count": len(rows), "truncated": False, "error": None}
    except Exception as e:
        return {"columns": [], "rows": [], "row_count": 0, "truncated": False, "error": str(e)}
    finally:
        tmp.close()


def get_result_summary(result: dict) -> str:
    if not result:
        return "No result returned."
    if result.get("error"):
        return f"Query failed: {result['error']}"
    cols = result.get("columns", [])
    rows = result.get("rows", [])
    count = result.get("row_count", 0)
    if not rows:
        return "Query returned 0 rows."

    # Build a richer summary with actual values for the narrator
    summary_lines = [f"{count} row(s) returned. Columns: {', '.join(cols)}."]
    for i, row in enumerate(rows[:5]):
        row_str = ", ".join(f"{col}={val}" for col, val in zip(cols, row))
        summary_lines.append(f"  Row {i+1}: {row_str}")
    if count > 5:
        summary_lines.append(f"  ... and {count - 5} more rows.")
    if result.get("truncated"):
        summary_lines.append("  (Result was truncated at 500 rows.)")
    return "\n".join(summary_lines)
