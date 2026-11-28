"""Isolated OAuth smoke test, no persistent customer account or payment."""
import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from http.cookies import SimpleCookie
from urllib.parse import urlencode, parse_qs

import requests
from google.oauth2 import id_token
from google.auth.transport.requests import Request

CALLBACK = "https://arazvera-store.onrender.com/api/auth/google/callback"
COOKIE = "__Host-arazvera_oauth_demo"
KEY = secrets.token_bytes(32)
TTL = 300

def b64(value):
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")

def configuration():
    return (os.getenv("GOOGLE_CLIENT_ID", "").strip(),
            os.getenv("GOOGLE_CLIENT_SECRET", "").strip())

def enabled():
    return os.getenv("GOOGLE_DEMO_ENABLED") == "1" and all(configuration())

def seal(data):
    payload = b64(json.dumps(data, separators=(",", ":")).encode())
    return payload + "." + b64(hmac.digest(KEY, payload.encode(), "sha256"))

def unseal(value):
    if len(value) > 2048:
        raise ValueError("Invalid cookie")
    payload, signature = value.split(".", 1)
    if not hmac.compare_digest(signature, b64(hmac.digest(KEY, payload.encode(), "sha256"))):
        raise ValueError("Invalid signature")
    data = json.loads(base64.urlsafe_b64decode(payload + "=" * (-len(payload) % 4)))
    if not 0 <= time.time() - data["issued"] <= TTL:
        raise ValueError("Expired")
    return data

def cookie(value, age):
    return f"{COOKIE}={value}; Path=/; Max-Age={age}; Secure; HttpOnly; SameSite=Lax"

def result(status, body, headers=None):
    return status, body.encode(), "text/plain; charset=utf-8", headers or []

def oauth(environ):
    path = environ.get("PATH_INFO")
    if not enabled():
        return result("503 Service Unavailable", "Google sign-in demo is not enabled. No customer accounts or payments.")
    if environ.get("REQUEST_METHOD", "GET") != "GET":
        return result("405 Method Not Allowed", "GET only")
    client_id, secret = configuration()
    if path == "/api/auth/google":
        data = {"state": secrets.token_urlsafe(32), "nonce": secrets.token_urlsafe(32),
                "verifier": secrets.token_urlsafe(48), "issued": time.time()}
        url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode({
            "client_id": client_id, "redirect_uri": CALLBACK, "response_type": "code",
            "scope": "openid email", "state": data["state"], "nonce": data["nonce"],
            "code_challenge": b64(hashlib.sha256(data["verifier"].encode()).digest()),
            "code_challenge_method": "S256", "access_type": "online",
            "prompt": "select_account"})
        return result("302 Found", "", [("Location", url), ("Set-Cookie", cookie(seal(data), TTL))])
    clear = [("Set-Cookie", cookie("", 0))]
    if path != "/api/auth/google/callback":
        return result("404 Not Found", "Not found")
    try:
        raw = environ.get("QUERY_STRING", "")
        if len(raw) > 8192:
            raise ValueError("Query too long")
        params = parse_qs(raw, max_num_fields=16)
        jar = SimpleCookie()
        jar.load(environ.get("HTTP_COOKIE", ""))
        data = unseal(jar[COOKIE].value)
        if len(params.get("state", [])) != 1 or not hmac.compare_digest(params["state"][0], data["state"]):
            raise ValueError("Invalid state")
        if "error" in params or len(params.get("code", [])) != 1:
            raise ValueError("No authorization code")
    except (ValueError, KeyError, TypeError, UnicodeError):
        return result("400 Bad Request", "Sign-in cancelled or expired. Restart the demo.", clear)
    try:
        response = requests.post("https://oauth2.googleapis.com/token", data={
            "client_id": client_id, "client_secret": secret, "code": params["code"][0],
            "code_verifier": data["verifier"], "redirect_uri": CALLBACK,
            "grant_type": "authorization_code"}, timeout=10, allow_redirects=False)
        response.raise_for_status()
        token = response.json()["id_token"]
        claims = id_token.verify_oauth2_token(token, Request(), client_id)
        if not hmac.compare_digest(str(claims.get("nonce", "")), data["nonce"]):
            raise ValueError("Invalid nonce")
        if not claims.get("sub") or claims.get("email_verified") is not True:
            raise ValueError("Unverified identity")
    except Exception:
        return result("502 Bad Gateway", "Google sign-in verification failed. No account was created.", clear)
    # No identity, tokens, or personal data persisted. No session or order access granted.
    return result("303 See Other", "", clear + [("Location", "/google-demo-success")])
