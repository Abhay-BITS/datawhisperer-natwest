"""
Visualisation Recommender — Smart Chart Selection.

Analyzes the user question and the query result shape to recommend the 
best chart type (bar, line, pie, scatter) for rendering in the frontend. 
Ensures data is presented in the most intuitive visual format.
"""
from services.groq_client import call_groq

def recommend_viz(question: str, result: dict) -> dict:
    if not result or result.get("error") or not result.get("rows"):
        return {"chart_type": "none", "x_axis": "", "y_axis": "", "title": ""}

    system = """You pick the best chart type for a data result.
Rules:
- Compare categories → bar
- Trend over time → line
- Part-of-whole (max 6 slices) → pie
- Two numeric columns → scatter
- Single number → none
- Multi-column mixed → table

Return ONLY valid JSON:
{"chart_type":"bar|line|pie|scatter|table|none","x_axis":"col","y_axis":"col","title":"..."}"""

    user = f"""Question: {question}
Columns: {result.get('columns',[])}
Row count: {result.get('row_count',0)}
Sample rows: {result.get('rows',[])[:3]}"""

    try:
        return call_groq(system, user, temperature=0.1, max_tokens=150)
    except Exception:
        return {"chart_type": "table", "x_axis": "", "y_axis": "", "title": "Results"}
