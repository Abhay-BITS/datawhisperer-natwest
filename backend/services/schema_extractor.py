from services.source_store import list_sources

def get_combined_schema(session_id: str) -> dict:
    """Return a combined schema dict for all sources in the session."""
    sources = list_sources(session_id)
    combined = {}
    for s in sources:
        combined[s.name] = {
            "source_id": s.source_id,
            "safe_name": s.safe_name,
            "db_type": s.db_type.value,
            "tables": s.schema.get("tables", {})
        }
    return combined

def get_schema_for_source(source_id: str) -> dict:
    from services.source_store import get_source
    source = get_source(source_id)
    return source.schema
