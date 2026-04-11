import pytest
from unittest.mock import MagicMock, patch

def test_get_result_summary_empty():
    from backend.services.data_engine import get_result_summary
    result = {"columns": [], "rows": [], "row_count": 0, "error": None}
    summary = get_result_summary(result)
    assert "0 rows" in summary

def test_get_result_summary_with_data():
    from backend.services.data_engine import get_result_summary
    result = {"columns": ["name", "value"], "rows": [["Alice", 100]], "row_count": 1, "error": None}
    summary = get_result_summary(result)
    assert "name" in summary
    assert "1 rows" in summary

def test_get_result_summary_error():
    from backend.services.data_engine import get_result_summary
    result = {"error": "table not found"}
    summary = get_result_summary(result)
    assert "failed" in summary.lower()
