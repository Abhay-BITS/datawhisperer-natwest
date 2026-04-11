import pytest

def test_source_store_add_get():
    from backend.services.source_store import add_source, get_source
    from unittest.mock import MagicMock
    source = MagicMock()
    source.source_id = "test-id-123"
    source.session_id = "sess-1"
    add_source(source)
    retrieved = get_source("test-id-123")
    assert retrieved.source_id == "test-id-123"

def test_source_store_not_found():
    from backend.services.source_store import get_source
    with pytest.raises(KeyError):
        get_source("nonexistent-id")
