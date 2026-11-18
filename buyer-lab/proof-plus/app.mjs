import {FIXTURES,runScenario,compareScenario} from './proof-engine.mjs';
const $ = id => document.getElementById(id);
const scenarios=[
  {key:'webhooks',title:'Webhook safety',tip:'Tenant-scoped duplicate detection, bounded retries, and fixture-based signature status.'},
  {key:'reconciliation',title:'Data integrity',tip:'Reconcile fictional invoices using tenant-scoped keys and integer minor-unit amounts.'},
  {key:'authorization',title:'Access boundary',tip:'Check synthetic JWT claim policies. This cannot validate cryptographic signatures.'},
  {key:'releases',title:'Release HOLD',tip:'Evaluate sample counts, relative latency, errors and operator lab approval. No deployment.'}
];
let active=scenarios[0].key,last=null,lastComparison=null,serial=0;
const tabs=$('tabs');
scenarios.forEach(s=>{
  const b=document.createElement('button');b.type='button';b.role='tab';b.id=`tab-${s.key}`;
  b.textContent=s.title;b.setAttribute('aria-controls','fixture');
  b.addEventListener('click',()=>selectScenario(s.key));
  tabs.append(b);
});
function clearResult(){
 last=null;$('status').textContent='AWAITING INPUT';$('status').className='result-status';
 $('run-time').textContent='NOT RUN';$('result-intro').textContent='Run this fixture to inspect the decision and evidence.';
 $('metrics').replaceChildren();$('trace').replaceChildren();
 const p=document.createElement('p');p.textContent='No results yet.';$('trace').append(p);
 $('scope').textContent='No scenario has been run.';
 $('download').disabled=true;$('test-tag').textContent='No execution recorded';
}
function clearComparison(){
  lastComparison=null;
  $('download-comparison').disabled=true;
  const r=$('comparison');r.replaceChildren();
  const p=document.createElement('p');p.textContent='No paired run yet.';r.append(p);
}
function loadFixture(kind){
  const f=FIXTURES[active][kind];$('fixture').value=JSON.stringify(f,null,2);updateCount();clearResult();
}
function updateCount(){const s=$('fixture').value;$('byte-count').textContent=s.length+' characters';}
function selectScenario(key){
  active=key;const chosen=scenarios.find(x=>x.key===key);
  for(const b of tabs.children){const selected=b.id===`tab-${key}`;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;}
  $('scenario-help').textContent=chosen.tip;$('fixture').setAttribute('aria-labelledby',`tab-${key}`);
  loadFixture('safe');clearComparison();
}
function addCell(row,content,className){const c=document.createElement('td');c.textContent=String(content);if(className)c.className=className;row.append(c);}
function render(result){
  const green=result.outcome==='PASS'||result.outcome==='LAB_PASS';
  $('status').textContent=result.outcome;$('status').className='result-status '+(green?'pass':'fail');
  $('run-time').textContent=`RUN #${serial}`;
  $('result-intro').textContent=green?'The fixture satisfied the selected synthetic checks. Edit inputs to challenge that result.':
    `${result.findings.length} decision finding(s). Inspect evidence below; unsafe cases should not be green.`;
  const metrics=$('metrics');metrics.replaceChildren();
  for(const [k,v] of result.metrics){const tile=document.createElement('div');tile.className='metric';const strong=document.createElement('strong');strong.textContent=String(v);const label=document.createElement('span');label.textContent=k;tile.append(strong,label);metrics.append(tile);}
  const trace=$('trace');trace.replaceChildren();
  const table=document.createElement('table');table.setAttribute('aria-label','Decision trace');
  const head=document.createElement('thead'),hr=document.createElement('tr');
  for (const s of ['#','Record','Decision','Reason']){const h=document.createElement('th');h.scope='col';h.textContent=s;hr.append(h)}
  head.append(hr);table.append(head);const body=document.createElement('tbody');
  for(const r of result.rows){const tr=document.createElement('tr');addCell(tr,r.line);addCell(tr,r.event);addCell(tr,r.decision,'decision '+(['PASS','MATCH','ACCEPT'].includes(r.decision)?'ok':'bad'));addCell(tr,r.reason);body.append(tr);}
  table.append(body);trace.append(table);
  $('scope').textContent=result.scope;
  $('test-tag').textContent=`Fixture interpreted · ${result.rows.length} trace rows`;
  $('download').disabled=false;
}
$('run').addEventListener('click',()=>{
  try{
    if($('fixture').value.length>90000)throw new Error('Fixture is too large (90,000-character limit).');
    const parsed=JSON.parse($('fixture').value);const result=runScenario(active,parsed);
    serial++;last={scenario:active,fixture:parsed,result,generatedAt:new Date().toISOString(),scope:'Client-safe synthetic browser lab; not production evidence'};
    render(result);
  }catch(e){
    serial++;last=null;$('status').textContent='INPUT ERROR';$('status').className='result-status fail';
    $('result-intro').textContent=e instanceof Error?e.message:'Invalid fixture';
    $('metrics').replaceChildren();$('trace').replaceChildren();$('scope').textContent='Fail closed: malformed input was not processed.';
    $('download').disabled=true;$('run-time').textContent=`RUN #${serial}`;$('test-tag').textContent='Invalid fixture rejected';
  }
});
$('compare').addEventListener('click',()=>{
  const outcome=compareScenario(active);
  lastComparison={...outcome,generatedAt:new Date().toISOString()};
  const container=$('comparison');container.replaceChildren();
  for(const [key,label] of [['safe','EXPECTED TO PASS'],['unsafe','EXPECTED TO HOLD']]){
    const x=outcome[key],panel=document.createElement('section');panel.className='compare-result';
    const heading=document.createElement('h3');heading.textContent=label;
    const verdict=document.createElement('strong');verdict.className=x.isGreen?'compare-verdict good':'compare-verdict guarded';
    verdict.textContent=x.outcome;
    const text=document.createElement('p');text.textContent=`${x.trace.length} trace rows · ${x.findings.length} finding(s). ${x.findings[0]||'No unexpected issues in fictional fixture.'}`;
    panel.append(heading,verdict,text);container.append(panel);
  }
  const note=document.createElement('p');note.className='compare-note';
  note.textContent=outcome.review==='BOUNDARY_DEMONSTRATED' ? 'Paired synthetic boundary demonstrated. Not a customer security certification.' : 'Review required: paired fictional fixtures did not establish a boundary.';
  container.append(note);
  $('download-comparison').disabled=false;
});
$('download-comparison').addEventListener('click',()=>{
  if(!lastComparison)return;
  const blob=new Blob([JSON.stringify(lastComparison,null,2)+'\n'],{type:'application/json'});
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`ARAZVERA_${active}_comparison_fictional_proof.json`;
  document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
});
$('safe-button').addEventListener('click',()=>loadFixture('safe'));
$('risk-button').addEventListener('click',()=>loadFixture('risk'));
$('fixture').addEventListener('input',()=>{updateCount();if(last){last=null;$('download').disabled=true;$('test-tag').textContent='Input changed; rerun to export accurate result';}});
$('download').addEventListener('click',()=>{
 if(!last)return;
 const blob=new Blob([JSON.stringify(last,null,2)+'\n'],{type:'application/json'});
 const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`ARAZVERA_${active}_fictional_proof.json`;
 document.body.append(a);a.click();a.remove();URL.revokeObjectURL(url);
});
tabs.addEventListener('keydown',e=>{
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;
 e.preventDefault();const idx=scenarios.findIndex(x=>x.key===active);
 const next=e.key==='Home'?0:e.key==='End'?scenarios.length-1:(idx+(e.key==='ArrowRight'?1:-1)+scenarios.length)%scenarios.length;
 selectScenario(scenarios[next].key);$('tab-'+scenarios[next].key).focus();
});
selectScenario(active);
