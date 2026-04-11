"""
Source Store — In-memory registry of connected data sources.

Sources are keyed by source_id and scoped to a session_id.
"""
import uuid
import duckdb
from dataclasses import replace

_sources: dict = {}


def add_source(source) -> str:
    _sources[source.source_id] = source
    return source.source_id


def get_source(source_id: str):
    if source_id not in _sources:
        raise KeyError(f"Source {source_id} not found")
    return _sources[source_id]


def list_sources(session_id: str) -> list:
    return [s for s in _sources.values() if s.session_id == session_id]


def clone_sources(from_session_id: str, to_session_id: str):
    """
    Clone all sources from one session into another.

    Strategy:
    - CSV/Excel (DuckDB): create a fresh DuckDB connection with the same in-memory
      DataFrame re-registered. This is necessary because DuckDB connections are not
      safely shareable across concurrent query threads.
    - SQL engines (PostgreSQL, MySQL, SQLite/Turso): share the existing SQLAlchemy
      engine directly. SQLAlchemy engines are thread-safe connection pools — there is
      no need to re-establish the underlying network connection or re-fetch the schema.

    This avoids the expensive (and on macOS crash-prone) re-connect path that was
    triggering the libsql/rustls cert panic on Turso sources.
    """
    sources_to_clone = list_sources(from_session_id)

    for s in sources_to_clone:
        new_id = str(uuid.uuid4())

        if s.duckdb_conn is not None and s.dataframe is not None:
            # CSV / Excel: spin up a fresh DuckDB connection, re-register the DataFrame
            new_conn = duckdb.connect()
            new_conn.register(s.safe_name, s.dataframe)
            new_source = replace(s, source_id=new_id, session_id=to_session_id,
                                 duckdb_conn=new_conn)
        else:
            # SQL: reuse the existing engine and schema — no network round-trip needed
            new_source = replace(s, source_id=new_id, session_id=to_session_id)

        _sources[new_id] = new_source


def remove_source(source_id: str):
    if source_id in _sources:
        # Do not dispose() the engine here — cloned sessions may share it.
        # Python GC handles cleanup when the last reference drops.
        del _sources[source_id]
