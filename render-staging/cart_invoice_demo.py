"""Read-only, fictional cart invoice preview. No wallet address or payment instruction."""
import html
from urllib.parse import parse_qs
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

def invoice_page(raw):
    try:
        q=quote_cart(raw)
        items="".join("<li>"+html.escape(s)+"</li>" for s in q["skus"])
        body=("<h2>Fictional cart estimate</h2><ul>"+items+"</ul><p>Demo total: $"+html.escape(q["usd"])+" USD</p><p>Estimated amount: "+html.escape(q["estimated_amount"])+" "+html.escape(q["asset"])+"</p><p>Network: "+html.escape(q["network"])+"</p><p>Source: "+html.escape(q["source"])+"</p><p>Rate timestamp (UTC Unix seconds): "+str(int(q["last_updated_at"]))+"</p><p>Indicative rate only, not locked. Reload for an updated estimate.</p>")
        status="200 OK"
    except ValueError:
        status,body="400 Bad Request","<p>Invalid cart or network selection.</p>"
    except LookupError:
        status,body="503 Service Unavailable","<p>No current rate. Please retry later.</p>"
    page='<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>ARAZVERA | Demo invoice</title><body><main><h1>ARAZVERA TECHNOLOGIES</h1><p><strong>DEMO ONLY — NO LIVE PAYMENT. Do not send funds.</strong></p>'+body+'<p>No wallet address, payment request, actual order or downloadable product has been issued. Prices are fictional.</p><p><a href="https://arazvera-technologies.github.io/buyer-lab/store-demo/">Back to store</a></p></main></body></html>'
    return status,page.encode(),"text/html; charset=utf-8"
