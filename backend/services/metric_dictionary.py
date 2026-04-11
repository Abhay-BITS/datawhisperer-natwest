METRICS = {
    "revenue": "SUM of columns named: total, amount, revenue, sales, sale_amount, price, value",
    "headcount": "COUNT(*) of rows in employee/person/staff tables",
    "churn": "COUNT of rows where status IN ('churned','inactive','left','terminated')",
    "avg order value": "AVG of columns named: amount, total, order_value",
    "growth": "Percentage change: (current - previous) / previous * 100",
    "top": "ORDER BY the primary metric DESC LIMIT N",
    "trend": "GROUP BY date/month/year, ORDER BY date ASC",
    "complaints": "COUNT of rows in complaint/ticket/issue tables",
    "conversion rate": "COUNT(converted) / COUNT(*) * 100",
    "profit": "SUM of columns named: profit, net_income, margin",
    "active users": "COUNT of rows where status = 'active' or last_login recent",
    "retention": "Percentage of users returning from prior period",
    "sales": "SUM of columns named: sales, revenue, amount, total_sales",
    "orders": "COUNT of rows in orders/transactions/purchases tables",
    "cac": "Marketing spend / new customers acquired",
    "ltv": "Average revenue per customer over their lifetime",
}

def get_metric_dict_prompt() -> str:
    return "\n".join([f"- {k}: {v}" for k, v in METRICS.items()])

def get_all_metrics() -> dict:
    return METRICS
