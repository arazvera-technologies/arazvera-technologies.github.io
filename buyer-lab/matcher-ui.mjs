import {recommendStarters, buildBuyerBrief} from './matcher.mjs';

const $=id=>document.getElementById(id);
const make=(tag,text,cls)=>{
  const node=document.createElement(tag);
  if(text!==undefined)node.textContent=text;
  if(cls)node.className=cls;
  return node;
};
const PRESETS={
 webhook:{request:'FastAPI webhook deliveries may repeat; ensure tenant-scoped idempotency, conflict detection and reproducible retry tests.',stack:'Python, FastAPI, webhook provider',scope:'Synthetic demonstration and pytest reliability checks'},
 postgres:{request:'PostgreSQL database migration with tenant RLS, data reconciliation and rollback evidence.',stack:'PostgreSQL 16 and Python',scope:'Dry-run migration and staged acceptance checks'},
 agent:{request:'Agent tool authorization, allowlist policy and explicit human approval for destructive operations.',stack:'Python, MCP tool gateway',scope:'Documented permission test pack'},
 supplier:{request:'DORA supplier evidence audit, missing documents and duplicate vendor packs.',stack:'Python, CSV, PostgreSQL',scope:'Offline records preflight using fictional evidence'}
};
let lastBrief='';
function downloadBrief(){
  if(!lastBrief)return;
  const blob=new Blob([lastBrief],{type:'text/markdown;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;a.download='ARAZVERA_preliminary_fit_report.md';
  document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
}
function showResult(recommendation,inputs){
 const out=$('match-output'),status=$('match-count'),button=$('brief-download');
 out.replaceChildren();
 const candidates=recommendation.matches||[];
 status.textContent=candidates.length+' candidate'+(candidates.length===1?'':'s');
 const summary=make('p',
   recommendation.family?'Likely technical family: '+recommendation.family+'. '+recommendation.reason:
    'No documented match can be asserted. Please clarify the technical requirement.','match-result-intro');
 out.append(summary);
 if(!candidates.length)out.append(make('p','No verified ready-made starter for these words and level. Do not claim delivery readiness.','match-placeholder'));
 for(const m of candidates){
  const card=make('article',undefined,'match-candidate');
  card.append(make('div',m.level+' / '+m.sku,'match-id'),make('h3',m.title));
  card.append(make('p','Why selected: '+m.why),make('p','Still required: '+m.remainingWork),
              make('p','Evidence: '+m.evidence+'; '+m.readiness));
  const a=make('a','Try related synthetic test ↗');a.href=m.demoUrl;a.target='_blank';a.rel='noopener noreferrer';
  const b=make('a','Related public proof ↗');b.href=m.proofUrl;b.target='_blank';b.rel='noopener noreferrer';
  card.append(a,b);out.append(card);
 }
 lastBrief=buildBuyerBrief(inputs,recommendation);
 button.disabled=false;
}
export function initMatcher(products){
  if(!$('matcher')||!Array.isArray(products))return;
  const submit=$('match-submit'),download=$('brief-download');
  function run(){
    const inputs={request:$('requirement-input').value.trim(),stack:$('stack-input').value.trim(),
       scope:$('scope-input').value.trim(),level:$('level-constraint').value};
    try{showResult(recommendStarters(inputs,products),inputs);}
    catch(err){
      $('match-count').textContent='CHECK INPUT';
      $('match-output').replaceChildren(make('p',err instanceof Error?err.message:'Invalid input','match-placeholder'));
      download.disabled=true;lastBrief='';
    }
  }
  submit.addEventListener('click',run);
  download.addEventListener('click',downloadBrief);
  for(const b of document.querySelectorAll('#match-presets button[data-example]')){
    b.addEventListener('click',()=>{
      const p=PRESETS[b.dataset.example];
      if(!p)return;
      $('requirement-input').value=p.request;
      $('stack-input').value=p.stack;
      $('scope-input').value=p.scope;
      $('level-constraint').value='all';
      run();
    });
  }
}
