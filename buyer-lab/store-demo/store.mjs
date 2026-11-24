const $ = id => document.getElementById(id);
const money = amount => "$" + Math.round(amount).toLocaleString("en-US");
const tierPrice = {L2:299,L3:1299,L4:2999,BUNDLE:1999};
const featuredIds = ["ARAZVERA-L2-DATA-RECONCILIATION-LAB-001","ARAZVERA-L2-RESILIENT-WEBHOOK-PIPELINE-001","ARAZVERA-L2-NOTIFICATION-OUTBOX-001","ARAZVERA-L2-N8N-WORKFLOW-AUDIT-001","ARAZVERA-L2-DOCUMENT-REPORTING-001"];
const productArtwork = Object.freeze({"ARAZVERA-L2-DOCUMENT-REPORTING-001":"images/document-reporting.jpg","ARAZVERA-L2-NOTIFICATION-OUTBOX-001":"images/notification-outbox.jpg","ARAZVERA-L2-RESILIENT-WEBHOOK-PIPELINE-001":"images/resilient-webhook-pipeline.jpg","ARAZVERA-L2-DATA-RECONCILIATION-LAB-001":"images/data-reconciliation-lab.jpg"});
let products=[],cart=new Map(),detailId="",receipt=null;
function el(tag,cls,txt){const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=txt;return n}
function clean(p){return p && p.bank==="historical-44" && /^ARAZVERA-(L2|L3|L4|BUNDLE)-[A-Z0-9-]+$/.test(p.id) && typeof p.title==="string" && typeof p.evidence==="string"}

// Real enquiries are drafts only; no payment, price commitment, or source delivery.
function quoteLink(items){
  const link=el("a","detailLink",items.length===1?"Request USD quote by email ↗":"Request USD quote for selected items ↗");
  const subject="ARAZVERA USD quote request";
  const body=["Hello ARAZVERA,","", "Please provide a written USD quote and licensing terms for:",...items.map(p=>"- "+p.id+" / "+p.title),"","Project requirements: ","Delivery timeline: ","","I understand this is an enquiry only, not an order or payment."].join("\r\n");
  link.href="mailto:contact.arazvera@gmail.com?subject="+encodeURIComponent(subject)+"&body="+encodeURIComponent(body);
  return link;
}

function setState(msg){$("message").textContent=msg}
function draw(){const term=$("query").value.toLowerCase().trim(),lvl=$("level").value,sort=$("sort").value;
let arr=products.filter(p=>(lvl==="all"||p.level===lvl)&&(!term||(p.title+" "+p.id+" "+p.evidence).toLowerCase().includes(term)));
arr.sort((a,b)=>sort==="alpha"?a.title.localeCompare(b.title):sort==="price"?(tierPrice[a.level]-tierPrice[b.level]||a.title.localeCompare(b.title)):(featuredIds.indexOf(a.id)===-1?99:featuredIds.indexOf(a.id))-(featuredIds.indexOf(b.id)===-1?99:featuredIds.indexOf(b.id))||a.title.localeCompare(b.title));
$("count").textContent=String(arr.length);setState(arr.length===0?"No matching foundations. Try a different search.":arr.length+" of "+products.length+" catalog entries · prices are fictional.");
const grid=$("grid");grid.replaceChildren();
for(const p of arr){const item=el("article","item"),top=el("div","itemTop"),tag=el("span","tag",p.level==="BUNDLE"?"BUNDLE":p.level),ft=el("span","featured",featuredIds.includes(p.id)?"FEATURED LAB":"RELEASE GATED");top.append(tag,ft);
const title=el("h3","",p.title),id=el("p","sku",p.id),ev=el("p","evidence",p.evidence),bottom=el("div","itemBottom"),price=el("div","price"),pr=el("strong","",money(tierPrice[p.level])),lab=el("small","","FICTIONAL DEMO USD");price.append(pr,lab);
const btn=el("button","buy"+(cart.has(p.id)?" active":""),cart.has(p.id)?"Added ✓":"+ Add to demo cart");btn.type="button";btn.addEventListener("click",()=>toggle(p.id));
bottom.append(price,btn);const more=el("button","detailLink","View scope & evidence ↗");more.type="button";more.addEventListener("click",()=>details(p.id));item.append(top);if(Object.hasOwn(productArtwork,p.id)){const img=el("img","productArtwork");img.src=productArtwork[p.id];img.alt=p.title+" — product illustration";img.width=1248;img.height=1248;img.loading="lazy";img.decoding="async";item.append(img)}item.append(title,id,ev,bottom,more,quoteLink([p]));grid.append(item)}
}
function toggle(id){if(cart.has(id))cart.delete(id);else{const p=products.find(x=>x.id===id);if(p)cart.set(id,p)}draw();drawCart()}
function subtotal(){return [...cart.values()].reduce((a,p)=>a+tierPrice[p.level],0)}
function drawCart(){$("cartCount").textContent=cart.size;$("subtotal").textContent=money(subtotal());$("checkout").disabled=cart.size===0;const root=$("cartItems");root.replaceChildren();
if(!cart.size){root.append(el("p","micro","Your demo cart is empty. Select any foundation to try the flow."));return}
for(const p of cart.values()){const line=el("div","cartLine"),left=el("div"),title=el("b","",p.title),small=el("small","",p.level+" · "+money(tierPrice[p.level])+" example"),remove=el("button","remove","Remove");remove.type="button";remove.addEventListener("click",()=>toggle(p.id));left.append(title,small);line.append(left,remove);root.append(line)}root.append(quoteLink([...cart.values()]))}
function openCart(){$("veil").hidden=false;$("drawer").classList.add("open");$("drawer").setAttribute("aria-hidden","false");document.body.style.overflow="hidden";$("closeCart").focus()}
function closeCart(){$("drawer").classList.remove("open");$("drawer").setAttribute("aria-hidden","true");$("veil").hidden=true;document.body.style.overflow=""}
function details(id){const p=products.find(x=>x.id===id);if(!p)return;detailId=id;$("dLevel").textContent=p.level;$("dTitle").textContent=p.title;$("dId").textContent=p.id;$("dEvidence").textContent=p.evidence;$("dReadiness").textContent=p.readiness||"Engineering lab; not production or sale-cleared.";
const url=typeof p.proofUrl==="string"?p.proofUrl:"";const safe=/^https:\/\/(github\.com\/arazvera-technologies\/|arazvera-technologies\.github\.io\/)/.test(url);
$("dProof").hidden=!safe;if(safe)$("dProof").href=url;$("dAdd").textContent=cart.has(id)?"Remove from demo cart":"Add to demo cart";$("detail").showModal()}
function startCheckout(){if(!cart.size)return;closeCart();$("payForm").hidden=false;$("success").hidden=true;$("agree").checked=false;$("approve").disabled=true;$("payTotal").textContent=money(subtotal());$("pay").showModal()}
function download(){if(!receipt)return;const lines=["ARAZVERA | STOREFRONT SANDBOX","==========================","NOT A RECEIPT FOR PAYMENT","NO SOURCE CODE, LICENSE, OR PURCHASE WAS PROVIDED","","Demo order: "+receipt.id,"Fictional total: "+money(receipt.total),"Simulated SKUs:"] .concat(receipt.products.map(p=>"- "+p.id+" / "+p.title)).concat(["","This text document is a harmless preview of a delivery gate.","All prices and payment events are fictional.","For real engineering enquiries: contact.arazvera@gmail.com",""]);const data=new Blob([lines.join("\n")],{type:"text/plain;charset=utf-8"}),u=URL.createObjectURL(data),a=document.createElement("a");a.href=u;a.download="ARAZVERA_DEMO_UNLOCK.txt";document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)}
$("openCart").addEventListener("click",openCart);$("closeCart").addEventListener("click",closeCart);$("veil").addEventListener("click",closeCart);$("clear").addEventListener("click",()=>{cart.clear();drawCart();draw()});$("checkout").addEventListener("click",startCheckout);
$("query").addEventListener("input",draw);$("level").addEventListener("change",draw);$("sort").addEventListener("change",draw);
$("hideDetail").addEventListener("click",()=>$("detail").close());$("dAdd").addEventListener("click",()=>{toggle(detailId);$("detail").close()});
$("hidePay").addEventListener("click",()=>$("pay").close());$("agree").addEventListener("change",()=>{$("approve").disabled=!$("agree").checked});
$("approve").addEventListener("click",()=>{if(!$("agree").checked||!cart.size)return;receipt={id:"DEMO-"+String(Date.now()).slice(-9),total:subtotal(),products:[...cart.values()]};$("orderId").textContent=receipt.id;$("orderTotal").textContent=money(receipt.total);$("payForm").hidden=true;$("success").hidden=false;cart.clear();drawCart();draw()});
$("getSample").addEventListener("click",download);$("restart").addEventListener("click",()=>{$("pay").close();openCart()});
window.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("drawer").classList.contains("open"))closeCart()});
(async()=>{try{const response=await fetch("../catalog.json",{cache:"no-store"});if(!response.ok)throw new Error("Catalog HTTP "+response.status);const data=await response.json();if(!Array.isArray(data.products))throw new Error("Invalid public catalog");products=data.products.filter(clean);if(products.length!==44)throw new Error("Expected 44 public metadata SKUs; got "+products.length);draw();drawCart()}catch(err){setState("Catalog temporarily unavailable. Return to the Buyer Lab while this demo loads.");$("count").textContent="0";console.error("Store demo metadata unavailable:",err)}})();