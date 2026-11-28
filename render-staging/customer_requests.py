"""Isolated test intake, never accepts payment or grants order access."""
import os
import json
import uuid
from urllib.parse import urlparse
from functools import lru_cache

import jwt
import psycopg
from psycopg.rows import dict_row

ORIGIN = "https://arazvera-store.onrender.com"
AUTH_BASE = "https://ep-orange-art-bcq396ri.neonauth.c-16.us-east-1.aws.neon.tech/neondb/auth"
ISSUER = "https://ep-orange-art-bcq396ri.neonauth.c-16.us-east-1.aws.neon.tech"
MAX_BODY = 12000
LIMIT = 10

@lru_cache(maxsize=1)
def jwks():
    return jwt.PyJWKClient(AUTH_BASE + "/.well-known/jwks.json", timeout=5)

def identity(environ):
    token = environ.get("HTTP_AUTHORIZATION", "")
    if not token.startswith("Bearer ") or len(token) > 16000:
        raise ValueError("Missing or invalid authorization")
    token = token[7:]
    if jwt.get_unverified_header(token).get("alg") != "EdDSA":
        raise ValueError("Unsupported algorithm")
    key = jwks().get_signing_key_from_jwt(token).key
    claims = jwt.decode(token, key, algorithms=["EdDSA"], issuer=ISSUER,
                        audience=ISSUER, options={"require":["exp","iat","sub","iss","aud"]})
    sub = claims["sub"]
    if claims.get("emailVerified") is not True or claims.get("banned") is True or not isinstance(sub,str) or not 1 <= len(sub) <= 128:
        raise ValueError("Verified identity required")
    return sub

def read_payload(environ):
    if environ.get("CONTENT_TYPE", "").split(";")[0] != "application/json":
        raise ValueError("JSON required")
    size = int(environ.get("CONTENT_LENGTH", "0"))
    if not 1 <= size <= MAX_BODY:
        raise ValueError("Invalid size")
    data = json.loads(environ["wsgi.input"].read(size))
    if not isinstance(data, dict) or set(data) != {"kind","subject","description","request_key"}:
        raise ValueError("Invalid fields")
    if not all(isinstance(data[k],str) for k in data):
        raise ValueError("Invalid fields")
    kind = data["kind"]
    subject, description = data["subject"].strip(),data["description"].strip()
    if kind not in ("ticket","freelance") or not 3 <= len(subject) <= 120 or not 10 <= len(description) <= 2000:
        raise ValueError("Invalid request")
    if "\x00" in subject or "\x00" in description:
        raise ValueError("Invalid text")
    return kind,subject,description,uuid.UUID(data["request_key"])

def response(status, data):
    return status, json.dumps(data, default=str).encode(), "application/json; charset=utf-8"

def db_connect():
    return psycopg.connect(os.environ["CUSTOMER_DEMO_DATABASE_URL"],connect_timeout=5,
                          sslmode="require",row_factory=dict_row)

def handle(environ):
    if os.getenv("CUSTOMER_REQUESTS_DEMO_ENABLED") != "1" or not os.getenv("CUSTOMER_DEMO_DATABASE_URL"):
        return response("503 Service Unavailable",{"error":"Test intake is disabled"})
    try:
        owner = identity(environ)
    except (ValueError, jwt.PyJWTError):
        return response("401 Unauthorized",{"error":"Verified account required"})
    except Exception:
        return response("503 Service Unavailable",{"error":"Identity service unavailable"})
    method = environ.get("REQUEST_METHOD","GET")
    if method not in ("GET","POST"):
        return response("405 Method Not Allowed",{"error":"Unsupported method"})
    if method == "POST":
        if environ.get("HTTP_ORIGIN") != ORIGIN:
            return response("403 Forbidden",{"error":"Invalid origin"})
        try:
            kind,subject,description,request_key=read_payload(environ)
        except (ValueError,TypeError,KeyError,UnicodeError):
            return response("400 Bad Request",{"error":"Invalid test request"})
    try:
        with db_connect() as conn, conn.cursor() as cur:
            fields="id,kind,subject,description,status,created_at"
            if method == "GET":
                cur.execute("SELECT "+fields+" FROM customer_demo.requests WHERE owner_id=%s ORDER BY created_at DESC LIMIT 100",(owner,))
                return response("200 OK",{"mode":"test","requests":cur.fetchall()})
            # Serialize creates per verified account, including duplicate handling.
            cur.execute("SELECT pg_advisory_xact_lock(hashtextextended(%s,0))",(owner,))
            cur.execute("SELECT "+fields+" FROM customer_demo.requests WHERE owner_id=%s AND request_key=%s",(owner,request_key))
            existing=cur.fetchone()
            if existing:
                if (existing["kind"],existing["subject"],existing["description"]) != (kind,subject,description):
                    return response("409 Conflict",{"error":"Request key already used"})
                return response("200 OK",{"mode":"test","request":existing})
            cur.execute("SELECT count(*) AS n FROM customer_demo.requests WHERE owner_id=%s AND created_at>now()-interval '1 hour'",(owner,))
            if cur.fetchone()["n"] >= LIMIT:
                return response("429 Too Many Requests",{"error":"Test request limit reached"})
            cur.execute("INSERT INTO customer_demo.requests (id,owner_id,request_key,kind,subject,description) VALUES (%s,%s,%s,%s,%s,%s) RETURNING "+fields,(uuid.uuid4(),owner,request_key,kind,subject,description))
            return response("201 Created",{"mode":"test","request":cur.fetchone()})
    except Exception:
        return response("503 Service Unavailable",{"error":"Test storage unavailable"})
