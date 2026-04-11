import re

SENSITIVE_KEYS = {"password", "passwd", "secret", "api_key", "token", "key"}

def mask_dict(d: dict) -> dict:
    result = {}
    for k, v in d.items():
        if any(s in k.lower() for s in SENSITIVE_KEYS):
            result[k] = "****"
        elif isinstance(v, dict):
            result[k] = mask_dict(v)
        else:
            result[k] = v
    return result

def mask_conn_string(conn_str: str) -> str:
    return re.sub(r":([^@/]+)@", ":****@", conn_str)
