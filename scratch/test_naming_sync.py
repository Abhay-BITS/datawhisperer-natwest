def build_table_guide_mock(schemas, is_cross_db):
    lines = []
    for schema in schemas:
        s_safe_name = schema["safe_name"]
        db_type = schema.get("db_type", "csv")
        for tname in schema.get("tables", {}).keys():
            if is_cross_db:
                if db_type in ("csv", "excel"):
                    final_name = s_safe_name
                else:
                    final_name = f"{s_safe_name}_{tname}"
            else:
                final_name = tname
            lines.append(final_name)
    return lines

# Test Case: Single Source
schema1 = {"safe_name": "source1", "db_type": "postgresql", "tables": {"users": {}}}
print("Single Source:", build_table_guide_mock([schema1], False))

# Test Case: Cross-DB (CSV + PostgreSQL)
schema2 = {"safe_name": "source2", "db_type": "csv", "tables": {"data": {}}}
print("Cross-DB:", build_table_guide_mock([schema1, schema2], True))

# Expected in DuckDB (from data_engine.py)
# source1_users (SQL)
# source2 (CSV)
