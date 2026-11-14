/* Interactive in-browser simulation, intentionally no fetch, cookies, storage or real data. */
(function(){
'use strict';
const E=window.WorkshopDemoEngine;
if(!E) throw Error('Demo engine unavailable.');
const $=s=>document.querySelector(s);
let leads=E.fixtures();
let currentId=leads[0].id;
let activeTab='overview';
let currentSearch='';
const statusLabel={'created':'CREATED','review':'REVIEW','duplicate':'DUPLICATE','invalid':'INVALID','backend-fault':'BACKEND FAULT'};
const evidenceLabels={'none':'No evidence link','planned':'Planned (manual)','passed-claimed':'Passed (claimed)','failed':'Failed (manual)','blocked':'Blocked (manual)'};
const statusOptions=['created','review','duplicate','invalid','backend-fault'];
const evidenceOptions=['none','planned','passed-claimed','failed','blocked'];
const escape=E.escapeHtml;
const lead=()=>leads.find(x=>x.id===currentId);
function update(next){leads=leads.map(x=>x.id===next.id?next:x);render();}
function toast(message,error=false){const el=$('#toast');el.textContent=message;el.className='toast show'+(error?' error':'');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.className='toast',5000);}
function handleError(error){toast(error?.message||'This action could not be completed.',true);}
function attrStatus(status){return 'status-'+String(status).replace(/[^a-z-]/g,'');}
function queueCard(x){return `<button class="queue-item" type="button" data-lead="${escape(x.id)}" aria-current="${x.id===currentId?'true':'false'}"><span class="queue-item-top"><strong>${escape(x.title)}</strong><span class="status-badge ${attrStatus(x.status)}">${escape(statusLabel[x.status])}</span></span><small>${escape(x.id)} · ${escape(x.company)}</small><small>${escape(x.domain)} · Fictional example</small></button>`;}
function renderQueue(){
 const lower=currentSearch.toLowerCase();
 const listed=leads.filter(x=>(x.title+' '+x.company+' '+x.domain+' '+x.id).toLowerCase().includes(lower));
 $('#lead-list').innerHTML=listed.length?listed.map(queueCard).join(''):'<div class="field-helper">No fictional opportunities match this search.</div>';
}
function overview(x){return `<div class="data-grid">
 <div class="data-field wide"><span>PROBLEM</span><p>${escape(x.problem)}</p></div>
 <div class="data-field"><span>TECHNICAL DOMAIN</span><p>${escape(x.domain)}</p></div>
 <div class="data-field"><span>SOURCE / CLASSIFICATION</span><p>${escape(x.source)} · ${escape(x.status)}</p></div>
 <div class="data-field wide"><span>PLANNING SCOPE & BOUNDARIES</span><p>${escape(x.scope)}</p></div>
 <div class="data-field wide"><span>QUALIFICATION RATIONALE</span><p>${escape(x.qualification)}</p></div>
 </div>
 <div class="tab-toolbar spaced"><h3>Operator qualification</h3><span class="field-helper">A rationale is required before changing status.</span></div>
 <div class="form-row"><label for="qualification-status">Classification</label><select id="qualification-status">${statusOptions.map(s=>`<option value="${s}"${x.status===s?' selected':''}>${escape(statusLabel[s])}</option>`).join('')}</select></div>
 <div class="form-row"><label for="qualification-reason">Decision rationale</label><textarea id="qualification-reason" placeholder="Explain why this fictional opportunity qualifies…" maxlength="400"></textarea></div>
 <div class="tab-footer"><button type="button" class="button button-primary button-small" data-action="qualify">Record demo decision</button><span class="field-helper">Other approvals are reset after a classification change.</span></div>`;}
function scenarios(x){
 const c=E.scenarioComparison(x);
 const priceNote=c.comparable?`Comparable in ${escape(c.currency)} · Lowest: <strong>${escape(E.formatMoney(c.cheapest.amount,c.currency))}</strong> · Shortest: ${escape(c.fastest.name)} (${c.fastest.days} days).`:'Structured amounts cannot be compared across currencies or missing figures.';
 return `<div class="scenario-explainer">These manually entered numbers are <strong>fictional illustrative estimates</strong>, not a quote. Selecting another option resets internal demo approval.</div>
 <div class="scenario-cards">${x.scenarios.map(s=>`<article class="scenario-card ${x.selectedScenario===s.id?'selected':''}"><div>
 <div class="scenario-top"><h3>${escape(s.name)}</h3><span class="scenario-tag">${escape(s.risk)} risk</span></div>
 <span class="scenario-price">${escape(E.formatMoney(s.amount,s.currency))}</span>
 <div class="scenario-meta"><span>◷ ${s.days} planned days</span><span>• Illustrative planning only</span></div>
 <p>${escape(s.scope)}</p><p><strong>Assumption:</strong> ${escape(s.assumptions)}</p><p><strong>Excluded:</strong> ${escape(s.exclusions)}</p>
 </div><button type="button" class="button button-secondary button-small" data-scenario="${escape(s.id)}" ${x.selectedScenario===s.id?'disabled':''}>${x.selectedScenario===s.id?'✓ Selected':'Choose option'}</button></article>`).join('')}</div><p class="comparison-note">${priceNote}</p>`;
}
function evidence(x){
 const state=E.readiness(x), pct=Math.round((state.linked/Math.max(1,state.totalCriteria))*100);
 return `<div class="tab-toolbar"><h3>Acceptance-to-evidence mapping</h3><span class="count-pill">${state.linked}/${state.totalCriteria} linked · ${pct}%</span></div>
 <div class="scenario-explainer">An operator-marked “passed” result does <strong>not</strong> prove that a test ran. This is a simulated documentation workflow, not an automated validation system.</div>
 <div class="coverage-track" aria-hidden="true"><div id="coverage-fill"></div></div>
 ${x.criteria.map(c=>`<div class="criterion-row"><div><b>${escape(c.label)}</b><small>${escape(evidenceLabels[c.status])} · No external test performed</small></div>
 <label><span class="sr-only">Evidence for ${escape(c.label)}</span><select data-criterion="${escape(c.id)}">${evidenceOptions.map(z=>`<option value="${z}" ${c.status===z?'selected':''}>${escape(evidenceLabels[z])}</option>`).join('')}</select></label></div>`).join('')}
 <p class="coverage-note">${state.totalCriteria-state.linked} unmapped criteria · session-only records · 0 independently verified.</p>`;
}
function approval(x){const state=E.readiness(x);return `<div class="approval-info"><div class="tab-toolbar"><h3>Internal preparation decision</h3><span class="status-badge ${x.approval.status==='approved'?'status-created':'status-review'}">${escape(x.approval.status.toUpperCase())}</span></div>
 <p>Internal approval means the fictional planning draft has required documentation. It does <strong>not</strong> authorize an offer, contract, customer contact or deployment.</p>
 <p><strong>Current rationale:</strong> ${escape(x.approval.reason||'Not recorded')}</p></div>
 <div class="tab-toolbar spaced"><h3>Requirements to approve</h3><small>${state.passed}/${state.total} documented</small></div>
 <ul class="validation-list">${state.checks.filter(c=>c.id!=='approval').map(c=>`<li>${c.passed?'✓':'○'} ${escape(c.label)}</li>`).join('')}</ul>
 <div class="form-row"><label for="approval-reason">Operator rationale</label><textarea id="approval-reason" placeholder="Explain internal draft approval (12+ characters)…" maxlength="450"></textarea></div>
 <div class="tab-footer"><button class="button button-primary button-small" type="button" data-action="approve" ${state.eligibleForInternalApproval?'':'disabled'}>Approve internal demo draft</button><span class="field-helper">${state.eligibleForInternalApproval?'All prerequisites documented.':'Complete the missing prerequisites in other tabs.'}</span></div>`;}
function renderTab(){const x=lead();$('#tab-content').innerHTML=({overview,scenarios,evidence,approval})[activeTab](x);$('#tab-content').setAttribute('aria-labelledby','tab-'+activeTab);
 if(activeTab==='evidence'){const pct=Math.round(E.readiness(x).linked/Math.max(1,x.criteria.length)*100);$('#coverage-fill').style.width=pct+'%';}
 document.querySelectorAll('[data-tab]').forEach(b=>{const yes=b.dataset.tab===activeTab;b.setAttribute('aria-selected',yes?'true':'false');b.setAttribute('tabindex',yes?'0':'-1');});
}
function renderReadiness(x){const st=E.readiness(x);$('#readiness-indicator').textContent=st.passed+' / '+st.total;
 $('#readiness-body').innerHTML=`<div class="readiness-summary"><strong>${st.passed} / ${st.total}</strong> ${st.ready?'Documentation-ready for fictional internal draft':'Internal preparation incomplete'}<div class="coverage-track"><div id="readiness-fill"></div></div><span>Planning evidence only · independent verification: NO</span></div>`+
 st.checks.map(c=>`<div class="gate-entry ${c.passed?'passed':''}"><i>${c.passed?'✓':'○'}</i><span>${escape(c.label)}</span></div>`).join('');$('#readiness-fill').style.width=Math.round(st.passed/st.total*100)+'%';
}
function renderActivity(x){const recent=x.history.slice().reverse();$('#activity-body').innerHTML=recent.map(h=>`<div class="event-line"><span>${escape(h.type.toUpperCase())} / DEMO</span>${escape(h.message)}</div>`).join('');}
function render(){const x=lead(),st=E.readiness(x);renderQueue();$('#selected-id').textContent=x.id+' / SYNTHETIC RECORD';$('#dossier-title').textContent=x.title;$('#selected-meta').textContent=x.company+' · '+x.domain;const badge=$('#selected-status');badge.textContent=statusLabel[x.status];badge.className='status-badge '+attrStatus(x.status);
 $('#kpi-strip').innerHTML=`<div><span>FICTIONAL LEADS</span><strong>03</strong><small>Session-only examples</small></div><div><span>QUALIFICATION</span><strong>${x.status==='created'?'CLEARED':'OPEN'}</strong><small>${escape(statusLabel[x.status])}</small></div><div><span>SELECTED APPROACH</span><strong>${x.selectedScenario?'01':'—'}</strong><small>${x.selectedScenario?'Planning option selected':'No option selected'}</small></div><div><span>DOCUMENTED CHECKS</span><strong>${st.passed}/${st.total}</strong><small>${st.ready?'Internal draft complete':'Further review required'}</small></div>`;
 renderTab();renderReadiness(x);renderActivity(x);}
function changeTab(value){if(!['overview','scenarios','evidence','approval'].includes(value))return;activeTab=value;renderTab();}
function reset(){leads=E.fixtures();currentId=leads[0].id;activeTab='overview';currentSearch='';$('#lead-search').value='';render();toast('All fictional examples reset. No changes were saved.');}
function download(){const data=E.exportPackage(lead());const file=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});const uri=URL.createObjectURL(file);try{const a=document.createElement('a');a.href=uri;a.download='ARAZVERA_'+data.reference+'_FICTIONAL_DEMO_ONLY.json';document.body.append(a);a.click();a.remove();toast('Fictional draft JSON exported locally. No data sent.');}finally{setTimeout(()=>URL.revokeObjectURL(uri),1000);}}
$('#lead-search').addEventListener('input',e=>{currentSearch=e.target.value;renderQueue();});
$('#reset-demo').addEventListener('click',reset);
$('#export-button').addEventListener('click',download);
document.addEventListener('click',e=>{
 const source=e.target.closest('[data-lead],[data-tab],[data-scenario],[data-action]');if(!source)return;
 try{
  if(source.dataset.lead){currentId=source.dataset.lead;activeTab='overview';render();return;}
  if(source.dataset.tab){changeTab(source.dataset.tab);return;}
  if(source.dataset.scenario){update(E.chooseScenario(lead(),source.dataset.scenario));toast('Fictional option selected; previous approval reset.');return;}
  if(source.dataset.action==='qualify'){const status=$('#qualification-status').value,reason=$('#qualification-reason').value;update(E.applyQualification(lead(),status,reason));toast('Example qualification decision recorded for this session.');return;}
  if(source.dataset.action==='approve'){const reason=$('#approval-reason').value;update(E.approveInternal(lead(),reason));toast('Fictional internal draft approved. No external action.');}
 }catch(err){handleError(err);}
});
document.addEventListener('keydown',e=>{
 const tab=e.target.closest('[data-tab]');
 if(!tab||!['ArrowRight','ArrowLeft','Home','End'].includes(e.key))return;
 e.preventDefault();const tabs=[...document.querySelectorAll('[data-tab]')],index=tabs.indexOf(tab);
 const next=e.key==='Home'?0:e.key==='End'?tabs.length-1:e.key==='ArrowRight'?(index+1)%tabs.length:(index-1+tabs.length)%tabs.length;
 changeTab(tabs[next].dataset.tab);tabs[next].focus();
});
document.addEventListener('change',e=>{const el=e.target.closest('select[data-criterion]');if(!el)return;try{update(E.setEvidence(lead(),el.dataset.criterion,el.value));toast('Manual evidence planning updated (fictional).');}catch(err){handleError(err);}});
render();
})();
