import {EXAMPLES,runAnalysis} from './engine.mjs';
import {initMatcher} from './matcher-ui.mjs';
const $=id=>document.getElementById(id);
const BENCHES={
 webhook:{title:'Webhook idempotency',desc:'Tenant-scoped retries, payload conflicts and invalid event boundaries.'},
 reconcile:{title:'Data reconciliation',desc:'Detect missing rows, amount drift and cross-tenant key mismatches.'},
 workflow:{title:'Workflow safety audit',desc:'Flag unsafe retries, inline credentials and missing timeouts in fictional steps.'},
 agent:{title:'Agent tool decision',desc:'Deny by default, enforce roles and explicit human approval.'},
 release:{title:'Release decision gate',desc:'Use synthetic SLO metrics to hold or advance a deployment rehearsal.'},
 supplier:{title:'Supplier evidence check',desc:'Inspect duplicate pack IDs, supplier attribution and evidence references.'},
 recovery:{title:'Recovery evidence check',desc:'Compare fictional snapshot manifests with restored dataset digests.'}
};
const productArtwork=Object.freeze({"ARAZVERA-L2-DOCUMENT-REPORTING-001":"images/document-reporting.jpg","ARAZVERA-L2-NOTIFICATION-OUTBOX-001":"images/notification-outbox.jpg","ARAZVERA-L2-RESILIENT-WEBHOOK-PIPELINE-001":"images/resilient-webhook-pipeline.jpg","ARAZVERA-L2-DATA-RECONCILIATION-LAB-001":"images/data-reconciliation-lab.jpg","ARAZVERA-L2-N8N-WORKFLOW-AUDIT-001":"images/level2-artwork-02.png","ARAZVERA-L2-AI-EVALUATION-001":"images/level2-artwork-02.png","ARAZVERA-L2-API-INTEGRATION-STARTER-001":"images/level2-artwork-02.png","ARAZVERA-L2-BACKEND-HARDENING-001":"images/level2-artwork-02.png","ARAZVERA-L2-CONSENT-LEAD-ROUTING-001":"images/arazvera-l2-consent-lead-routing-001.svg","ARAZVERA-L2-CRM-ERP-CONNECTORS-001":"images/arazvera-l2-crm-erp-connectors-001.svg","ARAZVERA-L2-DOCKER-DELIVERY-TOOLKIT-001":"images/arazvera-l2-docker-delivery-toolkit-001.svg","ARAZVERA-L2-INCIDENT-RECOVERY-001":"images/arazvera-l2-incident-recovery-001.svg","ARAZVERA-L2-INTERNAL-REPORTING-001":"images/arazvera-l2-internal-reporting-001.svg","ARAZVERA-L2-IOT-EVENT-GATEWAY-001":"images/arazvera-l2-iot-event-gateway-001.svg","ARAZVERA-L2-MULTI-TENANT-API-PLATFORM-001":"images/arazvera-l2-multi-tenant-api-platform-001.svg","ARAZVERA-L2-OIDC-JWKS-BOUNDARY-001":"images/arazvera-l2-oidc-jwks-boundary-001.svg","ARAZVERA-L2-OPERATIONS-MONITORING-001":"images/arazvera-l2-operations-monitoring-001.svg","ARAZVERA-L2-OPERATOR-REVIEW-001":"images/arazvera-l2-operator-review-001.svg","ARAZVERA-L2-POSTGRESQL-TENANT-BACKEND-001":"images/arazvera-l2-postgresql-tenant-backend-001.svg","ARAZVERA-L2-PRIVATE-RETRIEVAL-LAB-001":"images/arazvera-l2-private-retrieval-lab-001.svg","ARAZVERA-L2-PROVIDER-NEUTRAL-AI-001":"images/arazvera-l2-provider-neutral-ai-001.svg","ARAZVERA-L2-RELIABLE-LEAD-AUTOMATION-001":"images/arazvera-l2-reliable-lead-automation-001.svg","ARAZVERA-L2-SCAFFOLD-VERIFIER-001":"images/arazvera-l2-scaffold-verifier-001.svg","ARAZVERA-L2-SCHEDULED-ETL-001":"images/arazvera-l2-scheduled-etl-001.svg","ARAZVERA-L2-SECURE-AI-INTAKE-ASSISTANT-001":"images/arazvera-l2-secure-ai-intake-assistant-001.svg","ARAZVERA-L3-B2B-INTEGRATION-HUB-001":"images/arazvera-l3-b2b-integration-hub-001.svg","ARAZVERA-L3-DATA-QUALITY-ETL-001":"images/arazvera-l3-data-quality-etl-001.svg","ARAZVERA-L3-OUTBOX-RECOVERY-001":"images/arazvera-l3-outbox-recovery-001.svg","ARAZVERA-L3-POSTGRES-CDC-RECON-001":"images/arazvera-l3-postgres-cdc-recon-001.svg","ARAZVERA-L3-RELEASE-SLO-001":"images/arazvera-l3-release-slo-001.svg","ARAZVERA-L3-SAGA-COMPENSATION-001":"images/arazvera-l3-saga-compensation-001.svg","ARAZVERA-L3-TENANT-RECOVERY-001":"images/arazvera-l3-tenant-recovery-001.svg","ARAZVERA-L3-ZERO-DOWNTIME-MIGRATION-001":"images/arazvera-l3-zero-downtime-migration-001.svg","ARAZVERA-L4-DEVELOPER-PLATFORM-001":"images/arazvera-l4-developer-platform-001.svg","ARAZVERA-L4-K8S-GITOPS-001":"images/arazvera-l4-k8s-gitops-001.svg","ARAZVERA-L4-OTEL-SLO-OPERATIONS-001":"images/arazvera-l4-otel-slo-operations-001.svg","ARAZVERA-L4-POSTGRES-PITR-DR-001":"images/arazvera-l4-postgres-pitr-dr-001.svg","ARAZVERA-L4-RESILIENCE-LAB-001":"images/arazvera-l4-resilience-lab-001.svg","ARAZVERA-L4-SOFTWARE-SUPPLY-CHAIN-001":"images/arazvera-l4-software-supply-chain-001.svg","ARAZVERA-BUNDLE-OFFLINE-OPS-001":"images/arazvera-bundle-offline-ops-001.svg","ARAZVERA-BUNDLE-TENANT-RLS-001":"images/arazvera-bundle-tenant-rls-001.svg","ARAZVERA-BUNDLE-WEBHOOK-API-001":"images/arazvera-bundle-webhook-api-001.svg","ARAZVERA-BUNDLE-WEBHOOK-APPROVAL-RECOVERY-001":"images/arazvera-bundle-webhook-approval-recovery-001.svg","ARAZVERA-BUNDLE-WEBHOOK-REVIEW-001":"images/arazvera-bundle-webhook-review-001.svg","ARAZVERA-L1-FASTAPI-KIT":"images/arazvera-l1-fastapi-kit.svg","ARAZVERA-L1-N8N-KIT":"images/arazvera-l1-n8n-kit.svg","ARAZVERA-L1-TEXT-ASSISTANT-KIT":"images/arazvera-l1-text-assistant-kit.svg","ARAZVERA-L1-KIT-MANAGER":"images/arazvera-l1-kit-manager.svg","ARAZVERA-L5-001":"images/arazvera-l5-001.svg","ARAZVERA-L5-002":"images/arazvera-l5-002.svg","ARAZVERA-L5-003":"images/arazvera-l5-003.svg","ARAZVERA-L5-004":"images/arazvera-l5-004.svg","ARAZVERA-L5-005":"images/arazvera-l5-005.svg","ARAZVERA-L5-006":"images/arazvera-l5-006.svg","ARAZVERA-L5-007":"images/arazvera-l5-007.svg","ARAZVERA-L5-008":"images/arazvera-l5-008.svg","ARAZVERA-L5-009":"images/arazvera-l5-009.svg","ARAZVERA-L5-010":"images/arazvera-l5-010.svg","ARAZVERA-L5-011":"images/arazvera-l5-011.svg","ARAZVERA-L5-012":"images/arazvera-l5-012.svg","ARAZVERA-L5-013":"images/arazvera-l5-013.svg","L6-BESS-001":"images/l6-bess-001.svg","L6-CRA-001":"images/l6-cra-001.svg","L6-DORA-001":"images/l6-dora-001.svg","L6-RENEW-001":"images/l6-renew-001.svg","L7-SUPPLIER-EVIDENCE-NETWORK-001":"images/l7-supplier-evidence-network-001.svg","L7-AGENT-SECURITY-CONTROL-001":"images/l7-agent-security-control-001.svg","L7-RECOVERY-ORCHESTRATOR-001":"images/l7-recovery-orchestrator-001.svg"});
const artworkQuadrants=Object.freeze({"ARAZVERA-L2-N8N-WORKFLOW-AUDIT-001":"tl","ARAZVERA-L2-AI-EVALUATION-001":"tr","ARAZVERA-L2-API-INTEGRATION-STARTER-001":"bl","ARAZVERA-L2-BACKEND-HARDENING-001":"br"});
let catalog=null,selectedLevel='all',selectedFamily='all',selectedBench='webhook',scenario='pass',lastReport=null,iterations=0;
const el=(tag,cls,text)=>{const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;};
function renderMenu(){
 const menu=$('lab-menu'); menu.replaceChildren();
 for(const [id,m] of Object.entries(BENCHES)){
  const b=el('button','',m.title),small=el('small','',id.toUpperCase()+' / SYNTHETIC');
  b.type='button';b.setAttribute('aria-pressed',String(id===selectedBench));b.append(small);
  b.addEventListener('click',()=>selectBench(id));menu.append(b);
 }
}
function selectBench(id){
 selectedBench=id;scenario='pass';renderMenu();
 $('bench-title').textContent=BENCHES[id].title;
 $('bench-description').textContent=BENCHES[id].desc;
 for(const btn of document.querySelectorAll('[data-scenario]'))btn.setAttribute('aria-pressed',String(btn.dataset.scenario===scenario));
 loadFixture();
}
function loadFixture(){
 $('fixture-input').value=JSON.stringify(EXAMPLES[selectedBench][scenario],null,2);
 $('report-json').textContent='Input ready. Press Execute analysis to produce a new, local report.';
 $('decision').textContent='READY';$('decision').dataset.status='idle';
 $('download-result').disabled=true;lastReport=null;
}
function run(){
 const status=$('decision');
 try{
  const raw=$('fixture-input').value;
  if(raw.length>25000)throw new Error('Sample too large: maximum 25,000 characters.');
  const input=JSON.parse(raw);
  const r=runAnalysis(selectedBench,input);
  lastReport={demo:selectedBench,scenario,ranIn:'local browser only',evidence:r};
  status.textContent=r.decision;status.dataset.status=r.decision;
  $('report-json').textContent=JSON.stringify(lastReport,null,2);
  $('download-result').disabled=false;
 }catch(err){
  lastReport=null;
  status.textContent='ERROR';status.dataset.status='ERROR';
  $('download-result').disabled=true;
  $('report-json').textContent='Input rejected: '+(err instanceof Error?err.message:'Unknown error');
 }
 iterations++;$('run-count').textContent='RUNS: '+iterations;
}
function renderProducts(){
 if(!catalog)return;
 const query=$('product-search').value.trim().toLowerCase();
 const products=catalog.products.filter(p=>
  (selectedLevel==='all'||p.level===selectedLevel)&&
  (selectedFamily==='all'||p.demo===selectedFamily)&&
  (!query||[p.id,p.title,p.level,p.demo].join(' ').toLowerCase().includes(query)));
 $('result-count').textContent=products.length+' of '+catalog.products.length+' technical entries';
 const root=$('product-grid');root.replaceChildren();
 if(!products.length){root.append(el('p','empty','No matching starter. Try another level or technology.'));return;}
 const chunk=document.createDocumentFragment();
 for(const p of products){
  const card=el('article','product');
  const top=el('div','product-top');
  top.append(el('span','level-pill',p.level),el('span','product-family',BENCHES[p.demo]?.title??'Engineering'));
  card.append(top);
  if(Object.hasOwn(productArtwork,p.id)){const img=el('img','catalog-art');img.src='./store-demo/'+productArtwork[p.id];img.alt=p.title+' — product illustration';img.width=800;img.height=800;img.loading='lazy';img.decoding='async';if(Object.hasOwn(artworkQuadrants,p.id)){const frame=el('div','catalog-art-tile catalog-art-'+artworkQuadrants[p.id]);frame.append(img);card.append(frame)}else card.append(img)}
  card.append(el('h3','',p.title),el('div','sku',p.id));
  card.append(el('p','',p.evidence));
  const a=el('a','','Related public proof ↗');
  a.href=p.proofUrl;a.target='_blank';a.rel='noopener noreferrer';
  a.title='Representative demonstration only; this is not the private product';
  const demo=el('a','try-demo','Run related synthetic test ↗');
  demo.href='?bench='+encodeURIComponent(p.demo)+'#playground';
  demo.title='Browser-side illustration only, not execution of this private SKU';
  card.append(a,demo);chunk.append(card);
 }
 root.append(chunk);
}
function downloadReport(){
 if(!lastReport)return;
 const blob=new Blob([JSON.stringify(lastReport,null,2)+'\n'],{type:'application/json'});
 const url=URL.createObjectURL(blob);
 const link=document.createElement('a');link.href=url;link.download='ARAZVERA_'+selectedBench+'_synthetic_report.json';
 link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
async function init(){
 renderMenu(); const params=new URLSearchParams(window.location.search); const initialBench=params.get('bench'); selectBench(Object.hasOwn(BENCHES,initialBench)?initialBench:'webhook');
 for(const b of document.querySelectorAll('[data-scenario]'))b.addEventListener('click',()=>{
  scenario=b.dataset.scenario;
  for(const item of document.querySelectorAll('[data-scenario]'))item.setAttribute('aria-pressed',String(item===b));
  loadFixture();
 });
 $('run-check').addEventListener('click',run);
 $('download-result').addEventListener('click',downloadReport);
 $('product-search').addEventListener('input',renderProducts);
 $('family-filter').addEventListener('change',event=>{selectedFamily=event.target.value;renderProducts()});
 for(const b of document.querySelectorAll('[data-level]'))b.addEventListener('click',()=>{
  selectedLevel=b.dataset.level;
  for(const item of document.querySelectorAll('[data-level]')){
   const active=item===b;item.classList.toggle('is-active',active);item.setAttribute('aria-pressed',String(active));
  }
  renderProducts();
 });
 try{
  const r=await fetch('./catalog.json',{cache:'no-store'});
  if(!r.ok)throw new Error('catalog HTTP '+r.status);
  const data=await r.json();
  if(!data||!Array.isArray(data.products)||data.products.length!==68)throw new Error('Invalid catalog schema/count');
  if(new Set(data.products.map(p=>p.id)).size!==68)throw new Error('Duplicate product IDs');
  catalog=data;
  $('total-entries').textContent=String(data.products.length);
  for(const fam of data.families){
   const option=document.createElement('option');option.value=fam.id;option.textContent=fam.label;
   $('family-filter').append(option);
  }
  renderProducts();
  initMatcher(data.products);
  document.documentElement.dataset.catalogLoaded='true';
 }catch(err){
  $('result-count').textContent='Catalog unavailable. Use the GitHub source-safe index link above.';
  $('product-grid').append(el('p','empty','Unable to load metadata: '+(err?.message||'Unknown error')));
 }
}
document.addEventListener('DOMContentLoaded',init);
