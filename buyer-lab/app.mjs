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
  card.append(top,el('h3','',p.title),el('div','sku',p.id));
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
