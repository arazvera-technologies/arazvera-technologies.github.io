// Public, deterministic and client-only request triage. Not an AI promise engine.
// NEVER access private repositories, API keys or uploaded customer records.
const TERMS={
  webhook:[[/\bwebhooks?\b/i,10],[/idempoten/i,9],[/duplicate event/i,9],[/\bretr(?:y|ies)\b/i,2],[/\bfastapi\b/i,2],[/\bapi\b/i,1]],
  reconcile:[[/reconcil/i,11],[/\bpostgres(?:ql)?\b/i,7],[/migration/i,9],[/\betl\b/i,8],[/\bcdc\b/i,8],[/\brls\b/i,7],[/\bdata(?:base)?\b/i,3],[/\btenant\b/i,1],[/\bcsv\b/i,6]],
  workflow:[[/\bn8n\b/i,12],[/\bmake\b/i,7],[/\bworkflow\b/i,11],[/automation/i,6],[/\bairtable\b/i,9],[/\bslack\b/i,6]],
  agent:[[/\bagents?\b/i,10],[/\bmcp\b/i,11],[/tool.{0,12}approv/i,11],[/authorization/i,5],[/\bllm\b/i,7],[/\bai\b/i,2]],
  release:[[/\brelease\b/i,11],[/\bslo\b/i,9],[/\brollback\b/i,10],[/\bp95\b/i,6],[/\bk8s\b/i,5],[/deployment/i,5],[/\bgitops\b/i,10]],
  supplier:[[/\bsupplier\b/i,12],[/\bdora\b/i,13],[/\bcra\b/i,10],[/\bbess\b/i,13],[/regulator/i,6],[/\bbattery\b/i,9],[/renewable/i,9]],
  recovery:[[/recover/i,12],[/\brestore\b/i,12],[/\bsnapshot\b/i,10],[/\bbackup\b/i,10],[/\bdisaster\b/i,9],[/\bpitr\b/i,9]]
};
const STOP=new Set(['and','the','with','from','have','for','into','all','api','python','project','build','test','service','system','need','please','our','your','new','fixed','source','code','data','make']);
const FAMILY_DESC={
 webhook:{name:'Webhook reliability',why:'Existing event, retry and duplicate-safety laboratory family',gap:'Actual webhook contract, provider authentication, vendor access, deployment, failure scenarios and user acceptance'},
 reconcile:{name:'Data reconciliation',why:'Existing SQL and row-matching engineering laboratory family',gap:'Production schemas, real database permissions, tenant rules, migration recovery, throughput and acceptance'},
 workflow:{name:'Workflow audit',why:'Existing n8n and integration audit technical starter family',gap:'Authorized third-party connections, secure credentials, exact workflow actions, scheduling and monitoring'},
 agent:{name:'Agent governance',why:'Existing agent tool-boundary and policy-review engineering lab',gap:'Model/provider integration, production identity, real tool permissions, independent safety review and operator sign-off'},
 release:{name:'Release and SLO control',why:'Existing resilience and release-gate technical laboratory family',gap:'Real monitoring, cloud environment, tested rollback, on-call response and customer SLO acceptance'},
 supplier:{name:'Supplier evidence',why:'Existing regulated-data evidence rehearsal laboratory family',gap:'Regulator-specific mapping, legal/compliance expertise, actual vendor evidence, independent validation and accepted filings'},
 recovery:{name:'Recovery evidence',why:'Existing backup and restore rehearsal laboratory family',gap:'Authorized infrastructure, true backup integrity, RPO/RTO exercise, permissions and documented restore acceptance'}
};
const escapeText=s=>String(s).replace(/<[^>]*>/g,'').replace(/[\u0000-\u001f\u007f]/g,' ').slice(0,1200).trim();
export function classifyNeed(description){
  const text=escapeText(description);
  if(!text)return {family:null,scores:{}};
  const scores={};
  for(const [k,rules] of Object.entries(TERMS)){
    scores[k]=rules.reduce((total,[expr,w])=>total+(expr.test(text)?w:0),0);
  }
  const ordered=Object.keys(scores).sort((a,b)=>scores[b]-scores[a]);
  return {family:scores[ordered[0]]>=4?ordered[0]:null,scores};
}
export function recommendStarters(input,catalog){
  const raw=String(input?.request??'');
  if(raw.length>1500)throw new Error('Description exceeds 1,500-character limit; do not paste private records.');
  const level=String(input?.level??'all');
  if(level!=='all'&&!/^L[1-7]$/.test(level)&&level!=='BUNDLE')throw new Error('Unsupported level filter');
  if(!Array.isArray(catalog))throw new Error('Catalog unavailable');
  const {family,scores}=classifyNeed(raw);
  if(!family)return {family:null,matches:[],needsClarification:true,reason:'Specify an actual technical problem and the supported stack; no fit asserted.'};
  const terms=new Set(escapeText(raw).toLowerCase().split(/[^a-z0-9]+/).filter(x=>x.length>=3&&!STOP.has(x)));
  const possible=catalog.filter(p=>p?.demo===family&&(level==='all'||p.level===level));
  const scored=possible.map(p=>{
    const id=String(p.id??'').toLowerCase(),title=String(p.title??'').toLowerCase();
    const text=(id+' '+title).split(/[^a-z0-9]+/).filter(Boolean);
    let overlap=0;
    for(const term of terms){if(text.some(t=>t===term||t.startsWith(term)||term.startsWith(t)))overlap++;}
    const hasSpecific=overlap>0;
    return {p,overlap,priority:overlap*3+(p.level==='L2'?1:0),hasSpecific};
  }).sort((a,b)=>b.priority-a.priority||a.p.id.localeCompare(b.p.id));
  const top=scored.filter(x=>x.hasSpecific).slice(0,3);
  // A family can be identified without an exact SKU match; do not imply a perfect SKU fit.
  if(top.length===0&&scored.length)top.push(scored[0]);
  const meta=FAMILY_DESC[family];
  return {family,needsClarification:top.length===0,
    reason:top.length?'Potential engineering starting points only; buyer-specific gaps and permissions must be agreed.':'No documented starter found at the selected tier.',
    matches:top.map(({p,overlap})=>({
      sku:p.id,title:p.title,level:p.level,family,proofUrl:p.proofUrl,
      demoUrl:'https://arazvera-technologies.github.io/buyer-lab/?bench='+encodeURIComponent(family)+'#playground',
      why:meta.why+(overlap?' — keywords also occur in this catalog record':' — generic family starting point; requirements are not yet mapped to this specific module'),
      remainingWork:meta.gap,readiness:p.readiness,evidence:p.evidence
    }))};
}
export function buildBuyerBrief(input,recommendation){
  if(!recommendation||typeof recommendation!=='object')throw Error('A match report is required');
  const request=escapeText(input?.request);
  const stack=escapeText(input?.stack??'');
  const scope=escapeText(input?.scope??'');
  const out=[
    '# ARAZVERA — preliminary, non-binding technical fit report',
    '',
    '**PUBLIC SYNTHETIC evidence only — no private source or live customer system is used.**',
    'Date: 18 November 2026 | Generated locally in the browser | No automatic submission.',
    '',
    '## Client-described problem',
    request||'(not supplied)',
    '',
    '## Stated stack / constraints',
    stack||'(to be defined)',
    '',
    '## Proposed deliverable or deadline',
    scope||'(to be defined)',
    '',
    '## Candidate private engineering foundations (metadata only)'
  ];
  if(recommendation.matches?.length){
    for(const m of recommendation.matches){
      out.push('','### '+m.sku+' — '+m.title,
        '- Internal engineering tier: '+m.level,
        '- Why reviewed: '+m.why,
        '- Related public synthetic test: '+m.demoUrl,
        '- Related public reference: '+m.proofUrl,
        '- Existing engineering evidence: '+m.evidence,
        '- Required custom integration / acceptance: '+m.remainingWork,
        '- Readiness: '+m.readiness);
    }
  }else out.push('No verified relevant base found for the information supplied. Do not claim a ready-made delivery.');
  out.push('','## OPEN QUESTIONS / buyer acceptance',
    '- Which exact versioned API, data schema, language, infrastructure and environment are required?',
    '- Which functional and negative-path tests define acceptance?',
    '- Can the buyer supply authorization, staged synthetic data, necessary accounts and approvals?',
    '- What engineering work is genuinely new, and which source rights and third-party licences apply?',
    '- Are engagement, payment and any software export lawful for a developer resident in Iran?',
    '- What are the agreed delivery format, milestones, security review and support boundaries?',
    '',
    '## Proof links',
    '- Interactive synthetic lab: https://arazvera-technologies.github.io/buyer-lab/',
    '- Public engineering GitHub: https://github.com/arazvera-technologies/arazvera-engineering-portfolio',
    '- Seven-level proof résumé: https://github.com/arazvera-technologies/arazvera-engineering-portfolio/blob/main/resumes/ARAZVERA_Buyer_Proof_Resume_20261118.pdf',
    '',
    '**Caution:** These are deterministic keyword-based shortlist suggestions, not technical acceptance, pricing, a contract, or proof of customer production readiness. Nothing is sent without the founder’s approval.');
  return out.join('\n')+'\n';
}
