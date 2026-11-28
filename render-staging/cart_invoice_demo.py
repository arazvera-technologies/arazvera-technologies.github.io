"""Read-only, fictional cart invoice preview. No wallet address or payment instruction."""
import html
import base64
import hashlib
import hmac
import json
import secrets
import time
from urllib.parse import parse_qs, urlencode
from price_preview import demo_quote, rates_snapshot

TIER = {"L2":299,"L3":1299,"L4":2999,"BUNDLE":1999}
SKU_LEVEL = {"ARAZVERA-L2-AI-EVALUATION-001":"L2","ARAZVERA-L2-API-INTEGRATION-STARTER-001":"L2","ARAZVERA-L2-BACKEND-HARDENING-001":"L2","ARAZVERA-L2-CONSENT-LEAD-ROUTING-001":"L2","ARAZVERA-L2-CRM-ERP-CONNECTORS-001":"L2","ARAZVERA-L2-DATA-RECONCILIATION-LAB-001":"L2","ARAZVERA-L2-DOCKER-DELIVERY-TOOLKIT-001":"L2","ARAZVERA-L2-DOCUMENT-REPORTING-001":"L2","ARAZVERA-L2-INCIDENT-RECOVERY-001":"L2","ARAZVERA-L2-INTERNAL-REPORTING-001":"L2","ARAZVERA-L2-IOT-EVENT-GATEWAY-001":"L2","ARAZVERA-L2-MULTI-TENANT-API-PLATFORM-001":"L2","ARAZVERA-L2-N8N-WORKFLOW-AUDIT-001":"L2","ARAZVERA-L2-NOTIFICATION-OUTBOX-001":"L2","ARAZVERA-L2-OIDC-JWKS-BOUNDARY-001":"L2","ARAZVERA-L2-OPERATIONS-MONITORING-001":"L2","ARAZVERA-L2-OPERATOR-REVIEW-001":"L2","ARAZVERA-L2-POSTGRESQL-TENANT-BACKEND-001":"L2","ARAZVERA-L2-PRIVATE-RETRIEVAL-LAB-001":"L2","ARAZVERA-L2-PROVIDER-NEUTRAL-AI-001":"L2","ARAZVERA-L2-RELIABLE-LEAD-AUTOMATION-001":"L2","ARAZVERA-L2-RESILIENT-WEBHOOK-PIPELINE-001":"L2","ARAZVERA-L2-SCAFFOLD-VERIFIER-001":"L2","ARAZVERA-L2-SCHEDULED-ETL-001":"L2","ARAZVERA-L2-SECURE-AI-INTAKE-ASSISTANT-001":"L2","ARAZVERA-L3-B2B-INTEGRATION-HUB-001":"L3","ARAZVERA-L3-DATA-QUALITY-ETL-001":"L3","ARAZVERA-L3-OUTBOX-RECOVERY-001":"L3","ARAZVERA-L3-POSTGRES-CDC-RECON-001":"L3","ARAZVERA-L3-RELEASE-SLO-001":"L3","ARAZVERA-L3-SAGA-COMPENSATION-001":"L3","ARAZVERA-L3-TENANT-RECOVERY-001":"L3","ARAZVERA-L3-ZERO-DOWNTIME-MIGRATION-001":"L3","ARAZVERA-L4-DEVELOPER-PLATFORM-001":"L4","ARAZVERA-L4-K8S-GITOPS-001":"L4","ARAZVERA-L4-OTEL-SLO-OPERATIONS-001":"L4","ARAZVERA-L4-POSTGRES-PITR-DR-001":"L4","ARAZVERA-L4-RESILIENCE-LAB-001":"L4","ARAZVERA-L4-SOFTWARE-SUPPLY-CHAIN-001":"L4","ARAZVERA-BUNDLE-OFFLINE-OPS-001":"BUNDLE","ARAZVERA-BUNDLE-TENANT-RLS-001":"BUNDLE","ARAZVERA-BUNDLE-WEBHOOK-API-001":"BUNDLE","ARAZVERA-BUNDLE-WEBHOOK-APPROVAL-RECOVERY-001":"BUNDLE","ARAZVERA-BUNDLE-WEBHOOK-REVIEW-001":"BUNDLE"}
NETWORKS = {"BTC":("Bitcoin",),"ETH":("Ethereum",),"USDT":("Tron","Ethereum"),"USDC":("Ethereum",),"TRX":("Tron",)}

def quote_cart(raw):
    if len(raw)>6000:
        raise ValueError("Invalid request")
    p=parse_qs(raw,strict_parsing=True,max_num_fields=46)
    if set(p)!={"sku","asset","network"} or len(p["asset"])!=1 or len(p["network"])!=1:
        raise ValueError("Invalid fields")
    ids=p["sku"]
    asset,network=p["asset"][0],p["network"][0]
    if not 1<=len(ids)<=44 or len(set(ids))!=len(ids) or any(s not in SKU_LEVEL for s in ids):
        raise ValueError("Invalid products")
    if network not in NETWORKS.get(asset,()):
        raise ValueError("Invalid asset/network")
    total=sum(TIER[SKU_LEVEL[s]] for s in ids)
    quote=demo_quote(str(total),asset,rates_snapshot())
    return dict(quote,skus=ids,network=network)

# Ephemeral key for synthetic samples only, never for real purchase entitlements.
_DEMO_KEY = secrets.token_bytes(32)
ORIGIN = "https://arazvera-store.onrender.com"

def _sign(kind, data, expires):
    payload = base64.urlsafe_b64encode(json.dumps({"kind":kind,"data":data,"expires":expires},separators=(",",":")).encode()).decode().rstrip("=")
    return payload+"."+hmac.new(_DEMO_KEY,payload.encode(),hashlib.sha256).hexdigest()

def _verify(token,kind):
    if not isinstance(token,str) or len(token)>10000:
        raise ValueError("Invalid preview")
    payload,sig=token.split(".",1)
    if not hmac.compare_digest(sig,hmac.new(_DEMO_KEY,payload.encode(),hashlib.sha256).hexdigest()):
        raise ValueError("Invalid preview")
    value=json.loads(base64.urlsafe_b64decode(payload+"="*(-len(payload)%4)))
    if value["kind"]!=kind or value["expires"]<=time.time():
        raise ValueError("Expired preview")
    return value["data"]

def _page(title,body):
    return ('<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>ARAZVERA | '+html.escape(title)+'</title><style>body{background:#0b1117;color:#eaf1f6;font:17px system-ui;margin:0;padding:24px}main{max-width:640px;margin:auto;background:#131e28;padding:24px;border:1px solid #304554;border-radius:16px;overflow-wrap:anywhere}button,.action{display:inline-block;background:#a5e5e9;color:#10242e;font:inherit;font-weight:bold;padding:12px;border:0;border-radius:8px;margin:12px 0;text-decoration:none}a{color:#a5e5e9}label{display:block;line-height:1.6}li{margin:8px 0}strong{color:#b4e9ec}</style><body><main><p>ARAZVERA TECHNOLOGIES</p><h1>'+html.escape(title)+'</h1><p><strong>DEMO ONLY — NO LIVE PAYMENT. Do not send funds.</strong></p>'+body+'<p><a href="https://arazvera-technologies.github.io/buyer-lab/store-demo/">Back to store</a> · <a href="https://arazvera-store.onrender.com/customer-preview/">My account (test)</a></p></main></body></html>').encode()

def invoice_page(raw):
    try:
        q=quote_cart(raw)
        items="".join("<li>"+html.escape(s)+"</li>" for s in q["skus"])
        body=("<h2>Fictional cart estimate</h2><ul>"+items+"</ul><p>Demo total: $"+html.escape(q["usd"])+" USD</p><p>Estimated amount: "+html.escape(q["estimated_amount"])+" "+html.escape(q["asset"])+"</p><p>Network: "+html.escape(q["network"])+"</p><p>Source: "+html.escape(q["source"])+"</p><p>Rate timestamp (UTC Unix seconds): "+str(int(q["last_updated_at"]))+"</p><p>Indicative rate only, not locked. Reload for an updated estimate.</p>")
        token=_sign("quote",q,min(time.time()+180,q["last_updated_at"]+180))
        body+='<form method="post" action="/demo/cart-confirm"><input type="hidden" name="quote" value="'+html.escape(token)+'"><label><input type="checkbox" name="consent" value="yes" required> I understand that this is a simulation, no money is transferred and only a harmless text sample is provided.</label><button type="submit">Simulate payment</button></form>'
        status="200 OK"
    except ValueError:
        status,body="400 Bad Request","<p>Invalid cart or network selection.</p>"
    except LookupError:
        status,body="503 Service Unavailable","<p>No current rate. Please retry later.</p>"
    return status,_page("Crypto payment preview",body+"<p>No wallet address, actual order or licensed download has been issued. Prices are fictional.</p>"),"text/html; charset=utf-8"

def confirm_page(environ):
    try:
        if environ.get("HTTP_ORIGIN")!=ORIGIN:
            return "403 Forbidden",_page("Demo confirmation rejected","<p>Invalid origin.</p>"),"text/html; charset=utf-8"
        if environ.get("CONTENT_TYPE","").split(";")[0]!="application/x-www-form-urlencoded":
            raise ValueError("Invalid form")
        size=int(environ.get("CONTENT_LENGTH","0"))
        if not 1<=size<=16000:
            raise ValueError("Invalid form")
        fields=parse_qs(environ["wsgi.input"].read(size).decode("utf-8"),strict_parsing=True,max_num_fields=2)
        if set(fields)!={"quote","consent"} or fields["consent"]!=["yes"] or len(fields["quote"])!=1:
            raise ValueError("Consent required")
        quote=_verify(fields["quote"][0],"quote")
        ticket=_sign("sample",quote,time.time()+900)
        url="/demo/cart-download?"+urlencode({"ticket":ticket})
        body='<p>Simulated payment completed. No funds received. No product license was issued.</p><p>Fictional total: $'+html.escape(quote["usd"])+' USD.</p><a class="action" href="'+html.escape(url,quote=True)+'">Download demo text sample (.txt)</a><p>The sample is not a purchased product. Link expires in 15 minutes or upon a server restart.</p>'
        return "200 OK",_page("Simulation complete",body),"text/html; charset=utf-8"
    except (ValueError,TypeError,KeyError,UnicodeError):
        return "400 Bad Request",_page("Demo confirmation rejected","<p>Invalid or expired estimate. Return to the cart and open a fresh estimate.</p>"),"text/html; charset=utf-8"

def sample_download(raw):
    try:
        if len(raw)>12000: raise ValueError("Invalid link")
        fields=parse_qs(raw,strict_parsing=True,max_num_fields=1)
        if set(fields)!={"ticket"} or len(fields["ticket"])!=1: raise ValueError("Invalid link")
        quote=_verify(fields["ticket"][0],"sample")
        body=("\n".join(["ARAZVERA — DEMO SAMPLE","NO PAYMENT, LICENSE OR PRIVATE PRODUCT WAS PROVIDED","Fictional total: $"+quote["usd"],"Simulated SKUs:"]+quote["skus"])+"\n").encode()
        return "200 OK",body,"text/plain; charset=utf-8"
    except (ValueError,TypeError,KeyError,UnicodeError):
        return "400 Bad Request",b"Invalid or expired demo download.","text/plain; charset=utf-8"
