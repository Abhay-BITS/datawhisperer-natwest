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
    import uuid
    from services.db_connector import DBConnector
    sources_to_clone = list_sources(from_session_id)
    connector = DBConnector()
    
    for s in sources_to_clone:
        # Instead of sharing the engine, establish a FRESH connection for the new session
        # This prevents 'stream not found' errors in Turso and ensures total isolation.
        new_source = connector.connect(
            db_type=s.db_type,
            cfg=s.config,
            name=s.name,
            session_id=to_session_id
        )
        # Preserve the original source ID's safe name mapping if needed, 
        # but connector.connect() generates a new source_id which is what we want for isolation.
        _sources[new_source.source_id] = new_source

def remove_source(source_id: str):
    if source_id in _sources:
        # We NO LONGER explicitly dispose() the engine or close() the connection here.
        # This is because cloned sources share the same underlying connection/engine object.
        # Disposing it would break all other chat threads using this source.
        # Python's GC will handle cleanup when the last reference (cloned DataSource) is removed.
        del _sources[source_id]
