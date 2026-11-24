import os
import json
from functools import lru_cache

def check_database(url, connect=None):
    if not url:
        return 503, {"database": "not_configured", "mode": "staging"}
    try:
        if connect is None:
            import psycopg
            connect = psycopg.connect
        with connect(url, connect_timeout=5, sslmode="require") as conn:
            if conn.execute("SELECT 1").fetchone() != (1,):
                raise RuntimeError("Unexpected response")
        return 200, {"database": "connected", "mode": "staging"}
    except Exception:
        return 503, {"database": "unavailable", "mode": "staging"}

@lru_cache(maxsize=1)
def startup_database_status():
    code, result = check_database(os.getenv("DATABASE_URL"))
    return code, json.dumps(result).encode("utf-8")
