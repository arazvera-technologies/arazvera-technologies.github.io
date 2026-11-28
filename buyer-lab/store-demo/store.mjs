const $ = id => document.getElementById(id);
const featuredIds = [
 "ARAZVERA-L2-DATA-RECONCILIATION-LAB-001",
 "ARAZVERA-L2-RESILIENT-WEBHOOK-PIPELINE-001",
 "ARAZVERA-L2-NOTIFICATION-OUTBOX-001",
 "ARAZVERA-L2-N8N-WORKFLOW-AUDIT-001",
 "ARAZVERA-L2-DOCUMENT-REPORTING-001"
];
const productArtwork = Object.freeze({
 "ARAZVERA-L2-AI-EVALUATION-001":"images/level2-artwork-02.png",
 "ARAZVERA-L2-API-INTEGRATION-STARTER-001":"images/level2-artwork-02.png",
 "ARAZVERA-L2-BACKEND-HARDENING-001":"images/level2-artwork-02.png",
 "ARAZVERA-L2-CONSENT-LEAD-ROUTING-001":"images/arazvera-l2-consent-lead-routing-001.svg",
 "ARAZVERA-L2-CRM-ERP-CONNECTORS-001":"images/arazvera-l2-crm-erp-connectors-001.svg",
 "ARAZVERA-L2-DATA-RECONCILIATION-LAB-001":"images/data-reconciliation-lab.jpg",
 "ARAZVERA-L2-DOCKER-DELIVERY-TOOLKIT-001":"images/arazvera-l2-docker-delivery-toolkit-001.svg",
 "ARAZVERA-L2-DOCUMENT-REPORTING-001":"images/document-reporting.jpg",
 "ARAZVERA-L2-INCIDENT-RECOVERY-001":"images/arazvera-l2-incident-recovery-001.svg",
 "ARAZVERA-L2-INTERNAL-REPORTING-001":"images/arazvera-l2-internal-reporting-001.svg",
 "ARAZVERA-L2-IOT-EVENT-GATEWAY-001":"images/arazvera-l2-iot-event-gateway-001.svg",
 "ARAZVERA-L2-MULTI-TENANT-API-PLATFORM-001":"images/arazvera-l2-multi-tenant-api-platform-001.svg",
 "ARAZVERA-L2-N8N-WORKFLOW-AUDIT-001":"images/level2-artwork-02.png",
 "ARAZVERA-L2-NOTIFICATION-OUTBOX-001":"images/notification-outbox.jpg",
 "ARAZVERA-L2-OIDC-JWKS-BOUNDARY-001":"images/arazvera-l2-oidc-jwks-boundary-001.svg",
 "ARAZVERA-L2-OPERATIONS-MONITORING-001":"images/arazvera-l2-operations-monitoring-001.svg",
 "ARAZVERA-L2-OPERATOR-REVIEW-001":"images/arazvera-l2-operator-review-001.svg",
 "ARAZVERA-L2-POSTGRESQL-TENANT-BACKEND-001":"images/arazvera-l2-postgresql-tenant-backend-001.svg",
 "ARAZVERA-L2-PRIVATE-RETRIEVAL-LAB-001":"images/arazvera-l2-private-retrieval-lab-001.svg",
 "ARAZVERA-L2-PROVIDER-NEUTRAL-AI-001":"images/arazvera-l2-provider-neutral-ai-001.svg",
 "ARAZVERA-L2-RELIABLE-LEAD-AUTOMATION-001":"images/arazvera-l2-reliable-lead-automation-001.svg",
 "ARAZVERA-L2-RESILIENT-WEBHOOK-PIPELINE-001":"images/resilient-webhook-pipeline.jpg",
 "ARAZVERA-L2-SCAFFOLD-VERIFIER-001":"images/arazvera-l2-scaffold-verifier-001.svg",
 "ARAZVERA-L2-SCHEDULED-ETL-001":"images/arazvera-l2-scheduled-etl-001.svg",
 "ARAZVERA-L2-SECURE-AI-INTAKE-ASSISTANT-001":"images/arazvera-l2-secure-ai-intake-assistant-001.svg",
 "ARAZVERA-L3-B2B-INTEGRATION-HUB-001":"images/arazvera-l3-b2b-integration-hub-001.svg",
 "ARAZVERA-L3-DATA-QUALITY-ETL-001":"images/arazvera-l3-data-quality-etl-001.svg",
 "ARAZVERA-L3-OUTBOX-RECOVERY-001":"images/arazvera-l3-outbox-recovery-001.svg",
 "ARAZVERA-L3-POSTGRES-CDC-RECON-001":"images/arazvera-l3-postgres-cdc-recon-001.svg",
 "ARAZVERA-L3-RELEASE-SLO-001":"images/arazvera-l3-release-slo-001.svg",
 "ARAZVERA-L3-SAGA-COMPENSATION-001":"images/arazvera-l3-saga-compensation-001.svg",
 "ARAZVERA-L3-TENANT-RECOVERY-001":"images/arazvera-l3-tenant-recovery-001.svg",
 "ARAZVERA-L3-ZERO-DOWNTIME-MIGRATION-001":"images/arazvera-l3-zero-downtime-migration-001.svg",
 "ARAZVERA-L4-DEVELOPER-PLATFORM-001":"images/arazvera-l4-developer-platform-001.svg",
 "ARAZVERA-L4-K8S-GITOPS-001":"images/arazvera-l4-k8s-gitops-001.svg",
 "ARAZVERA-L4-OTEL-SLO-OPERATIONS-001":"images/arazvera-l4-otel-slo-operations-001.svg",
 "ARAZVERA-L4-POSTGRES-PITR-DR-001":"images/arazvera-l4-postgres-pitr-dr-001.svg",
 "ARAZVERA-L4-RESILIENCE-LAB-001":"images/arazvera-l4-resilience-lab-001.svg",
 "ARAZVERA-L4-SOFTWARE-SUPPLY-CHAIN-001":"images/arazvera-l4-software-supply-chain-001.svg",
 "ARAZVERA-BUNDLE-OFFLINE-OPS-001":"images/arazvera-bundle-offline-ops-001.svg",
 "ARAZVERA-BUNDLE-TENANT-RLS-001":"images/arazvera-bundle-tenant-rls-001.svg",
 "ARAZVERA-BUNDLE-WEBHOOK-API-001":"images/arazvera-bundle-webhook-api-001.svg",
 "ARAZVERA-BUNDLE-WEBHOOK-APPROVAL-RECOVERY-001":"images/arazvera-bundle-webhook-approval-recovery-001.svg",
 "ARAZVERA-BUNDLE-WEBHOOK-REVIEW-001":"images/arazvera-bundle-webhook-review-001.svg"
});
const artworkQuadrants = Object.freeze({
 "ARAZVERA-L2-N8N-WORKFLOW-AUDIT-001":"tl",
 "ARAZVERA-L2-AI-EVALUATION-001":"tr",
 "ARAZVERA-L2-API-INTEGRATION-STARTER-001":"bl",
 "ARAZVERA-L2-BACKEND-HARDENING-001":"br"
});
let products=[],selected=new Map(),detailId="";
function el(tag,cls,txt){
 const node=document.createElement(tag);
 if(cls)node.className=cls;
 if(txt!==undefined)node.textContent=txt;
 return node;
}
function clean(product){
 return product && product.bank==="historical-44" &&
  /^ARAZVERA-(L2|L3|L4|BUNDLE)-[A-Z0-9-]+$/.test(product.id) &&
  typeof product.title==="string" && typeof product.evidence==="string";
}
function quoteHref(items){
 const subject=items.length===1
  ? "ARAZVERA written quotation — "+items[0].title
  : "ARAZVERA written quotation — "+items.length+" selected foundations";
 const body=[
  "Hello ARAZVERA,","",
  "Please send a written proposal and USD quotation for:",
  ...items.map(product=>"- "+product.id+" / "+product.title),
  "","Business problem / intended use:",
  "Required deliverables:","Preferred timeframe:",
  "Budget range (optional):","",
  "Please confirm scope, availability, licensing, payment and delivery terms in writing.",
  "I understand this is an enquiry only, not an order or payment."
 ].join("\r\n");
 return "mailto:contact.arazvera@gmail.com?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
}
function quoteLink(items,label){
 const link=el("a","quoteLink",label||"Request written quote ↗");
 link.href=quoteHref(items);
 return link;
}
function setState(message){$("message").textContent=message;}
function draw(){
 const term=$("query").value.toLowerCase().trim();
 const level=$("level").value;
 const sort=$("sort").value;
 const visible=products.filter(product=>
  (level==="all"||product.level===level) &&
  (!term||(product.title+" "+product.id+" "+product.evidence+" "+(product.readiness||"")).toLowerCase().includes(term))
 );
 visible.sort((a,b)=>sort==="alpha"
  ? a.title.localeCompare(b.title)
  : (featuredIds.indexOf(a.id)===-1?99:featuredIds.indexOf(a.id))-
    (featuredIds.indexOf(b.id)===-1?99:featuredIds.indexOf(b.id))||a.title.localeCompare(b.title));
 $("count").textContent=String(visible.length);
 setState(visible.length
  ? visible.length+" of "+products.length+" catalogue entries · request a written quote for scope and pricing."
  : "No matching foundations. Try a different search.");
 const grid=$("grid");
 grid.replaceChildren();
 for(const product of visible){
  const item=el("article","item");
  const top=el("div","itemTop");
  top.append(el("span","tag",product.level==="BUNDLE"?"BUNDLE":product.level));
  top.append(el("span","featured",featuredIds.includes(product.id)?"FEATURED LAB":"SCOPE REVIEW REQUIRED"));
  item.append(top);
  if(Object.hasOwn(productArtwork,product.id)){
   const image=el("img","productArtwork");
   image.src=productArtwork[product.id];
   image.alt=product.title+" — product illustration";
   image.width=1248;image.height=1248;image.loading="lazy";image.decoding="async";
   if(Object.hasOwn(artworkQuadrants,product.id)){
    const frame=el("div","artworkTile artwork-"+artworkQuadrants[product.id]);
    frame.append(image);item.append(frame);
   }else item.append(image);
  }
  item.append(el("h3","",product.title));
  item.append(el("p","sku",product.id));
  item.append(el("p","evidence",product.evidence));
  item.append(el("p","readiness",product.readiness||"Readiness and sale eligibility must be confirmed in writing."));
  const bottom=el("div","itemBottom");
  const quote=el("div","price");
  quote.append(el("strong","","Quote required"));
  quote.append(el("small","","Final USD price confirmed in writing"));
  const add=el("button","buy"+(selected.has(product.id)?" active":""),selected.has(product.id)?"Added ✓":"+ Add to quote list");
  add.type="button";add.addEventListener("click",()=>toggle(product.id));
  bottom.append(quote,add);item.append(bottom);
  const more=el("button","detailLink","View scope & evidence ↗");
  more.type="button";more.addEventListener("click",()=>details(product.id));
  const proof=el("a","detailLink","Open related public proof ↗");
  proof.href="../product-demo.html?sku="+encodeURIComponent(product.id);
  proof.title="Related synthetic checks; not the private product";
  item.append(more,proof,quoteLink([product],"Request written quote ↗"));
  grid.append(item);
 }
}
function toggle(id){
 if(selected.has(id))selected.delete(id);
 else{
  const product=products.find(item=>item.id===id);
  if(product)selected.set(id,product);
 }
 draw();drawQuoteList();
}
function drawQuoteList(){
 $("cartCount").textContent=String(selected.size);
 const root=$("cartItems");
 root.replaceChildren();
 if(!selected.size){
  root.append(el("p","micro","Your quote list is empty. Add a foundation from the catalogue to prepare a written enquiry."));
  return;
 }
 for(const product of selected.values()){
  const line=el("div","cartLine");
  const left=el("div","");
  left.append(el("b","",product.title));
  left.append(el("small","",product.level+" · "+product.id));
  const remove=el("button","remove","Remove");
  remove.type="button";remove.addEventListener("click",()=>toggle(product.id));
  line.append(left,remove);root.append(line);
 }
 root.append(quoteLink([...selected.values()],"Request a quote for selected items ↗"));
}
function openQuoteList(){
 $("veil").hidden=false;
 $("drawer").classList.add("open");
 $("drawer").setAttribute("aria-hidden","false");
 document.body.style.overflow="hidden";
 $("closeCart").focus();
}
function closeQuoteList(){
 $("drawer").classList.remove("open");
 $("drawer").setAttribute("aria-hidden","true");
 $("veil").hidden=true;
 document.body.style.overflow="";
}
function details(id){
 const product=products.find(item=>item.id===id);
 if(!product)return;
 detailId=id;
 $("dLevel").textContent=product.level;
 $("dTitle").textContent=product.title;
 $("dId").textContent=product.id;
 $("dEvidence").textContent=product.evidence;
 $("dReadiness").textContent=product.readiness||"Readiness and sale eligibility must be confirmed in writing.";
 const url=typeof product.proofUrl==="string"?product.proofUrl:"";
 const safe=/^https:\/\/(github\.com\/arazvera-technologies\/|arazvera-technologies\.github\.io\/)/.test(url);
 $("dProof").hidden=!safe;
 if(safe)$("dProof").href=url;
 $("dQuote").href=quoteHref([product]);
 $("dAdd").textContent=selected.has(id)?"Remove from quote list":"Add to quote list";
 $("detail").showModal();
}
$("openCart").addEventListener("click",openQuoteList);
$("closeCart").addEventListener("click",closeQuoteList);
$("veil").addEventListener("click",closeQuoteList);
$("clear").addEventListener("click",()=>{selected.clear();drawQuoteList();draw();});
$("query").addEventListener("input",draw);
$("level").addEventListener("change",draw);
$("sort").addEventListener("change",draw);
$("hideDetail").addEventListener("click",()=>$("detail").close());
$("dAdd").addEventListener("click",()=>{toggle(detailId);$("detail").close();});
window.addEventListener("keydown",event=>{
 if(event.key==="Escape"&&$("drawer").classList.contains("open"))closeQuoteList();
});
(async()=>{
 try{
  const response=await fetch("../catalog.json",{cache:"no-store"});
  if(!response.ok)throw new Error("Catalog HTTP "+response.status);
  const data=await response.json();
  if(!Array.isArray(data.products))throw new Error("Invalid public catalogue");
  products=data.products.filter(clean);
  if(products.length!==44)throw new Error("Expected 44 public metadata entries; got "+products.length);
  draw();drawQuoteList();
 }catch(error){
  setState("Catalogue temporarily unavailable. Please contact contact.arazvera@gmail.com.");
  $("count").textContent="0";
  console.error("Public catalogue unavailable:",error);
 }
})();
