// Browser-only demonstrations. No network, production data or proprietary backend.
function checkBatteryRecords(records) {
  if (!Array.isArray(records)) return [{code:'INVALID_INPUT',message:'Expected an array of synthetic records.'}];
  if (records.length === 0) return [{code:'EMPTY_INPUT',message:'No records supplied.'}];
  const issues=[]; const seen=new Set();
  records.forEach((row,index)=>{
    const id=String(row?.packId??'').trim();
    if (!id) issues.push({code:'MISSING_PACK_ID',row:index+1,message:'Pack ID is missing.'});
    else if (seen.has(id)) issues.push({code:'DUPLICATE_PACK_ID',row:index+1,message:`Duplicate pack ID: ${id}`});
    else seen.add(id);
    if (!String(row?.documentRef??'').trim()) issues.push({code:'MISSING_DOCUMENT',row:index+1,message:'Evidence document reference is missing.'});
    if (!String(row?.supplier??'').trim()) issues.push({code:'MISSING_SUPPLIER',row:index+1,message:'Supplier is missing.'});
  });
  return issues;
}

function simulateWebhook(events) {
  const unique=new Set(); let duplicates=0;
  (Array.isArray(events)?events:[]).forEach(event=>{
    const id=String(event??'').trim();
    if (unique.has(id)) duplicates++; else unique.add(id);
  });
  return {received:Array.isArray(events)?events.length:0,accepted:unique.size,duplicates,queued:[...unique]};
}

function checkAgentAccess(action,role) {
  const allow={reviewer:['read-report','view-audit'],operator:['read-report','view-audit','queue-retry']};
  const allowed=(allow[role]||[]).includes(action);
  return {allowed,reason:allowed?'Allowed by the example role policy.':'Denied: no explicit permission in this example policy.'};
}

const cases={
  valid:[{packId:'PACK-001',supplier:'Supplier A',documentRef:'DOC-101'},{packId:'PACK-002',supplier:'Supplier B',documentRef:'DOC-102'}],
  errors:[{packId:'PACK-001',supplier:'Supplier A',documentRef:'DOC-101'},{packId:'PACK-001',supplier:'Supplier B',documentRef:''}]
};
function text(el,s){if(el)el.textContent=s;}
function renderBattery(name){
  const rows=cases[name]||cases.valid; const issues=checkBatteryRecords(rows);
  text(document.getElementById('battery-input'),JSON.stringify(rows,null,2));
  const el=document.getElementById('battery-output'); if(!el)return;
  el.replaceChildren();
  if(issues.length===0){let p=document.createElement('p');p.className='result-pass';p.textContent='PASS · No issues found in this simplified example.';el.append(p);return;}
  issues.forEach(issue=>{const p=document.createElement('p');p.className='result-fail';p.textContent=`${issue.code} · Row ${issue.row??'—'} · ${issue.message}`;el.append(p)});
}
function renderWebhook(events){
  const output=simulateWebhook(events);
  text(document.getElementById('webhook-input'),JSON.stringify(events,null,2));
  text(document.getElementById('webhook-output'),JSON.stringify(output,null,2));
}
function renderAgent(action,role){
  const result=checkAgentAccess(action,role); const el=document.getElementById('agent-output');
  if(el){el.className=result.allowed?'agent-status ok':'agent-status no';el.textContent=(result.allowed?'ALLOW':'DENY')+' · '+result.reason;}
}
if(typeof document !== 'undefined'){
  document.addEventListener('DOMContentLoaded',()=>{
    renderBattery('errors');renderWebhook(['evt-100','evt-100','evt-101']);renderAgent('read-report','reviewer');
    document.querySelectorAll('[data-battery]').forEach(btn=>btn.addEventListener('click',()=>{
      document.querySelectorAll('[data-battery]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
      renderBattery(btn.dataset.battery);
    }));
    document.querySelectorAll('[data-webhook]').forEach(btn=>btn.addEventListener('click',()=>{
      document.querySelectorAll('[data-webhook]').forEach(b=>b.setAttribute('aria-pressed',String(b===btn)));
      renderWebhook(btn.dataset.webhook==='duplicate'?['evt-100','evt-100','evt-101']:['evt-100','evt-101','evt-102']);
    }));
    const action=document.getElementById('agent-action'),role=document.getElementById('agent-role');
    [action,role].forEach(el=>el?.addEventListener('change',()=>renderAgent(action.value,role.value)));
    document.getElementById('year').textContent=String(new Date().getFullYear());
  });
}

export {checkBatteryRecords,simulateWebhook,checkAgentAccess};
