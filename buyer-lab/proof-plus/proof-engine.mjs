/**
 * ARAZVERA public proof annex: fully deterministic browser-only test benches.
 * No backend calls; no claims of production crypto, live integrations, or client outcomes.
 */
export const SCENARIOS = Object.freeze(['webhooks','reconciliation','authorization','releases']);

function obj(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function ensure(condition, message) {
  if (!condition) throw new Error(message);
}
function own(o,k){return Object.prototype.hasOwnProperty.call(o,k);}
function nonEmpty(v) { return typeof v==='string' && v.trim().length>0; }
function safeText(s){return String(s ?? '').slice(0,100)}
const frozen = value => JSON.parse(JSON.stringify(value));

export function webhookBench(input) {
  ensure(obj(input) && Array.isArray(input.events),'Input must contain events array.');
  ensure(input.events.length<=100,'Maximum 100 fictional events.');
  if(input.events.length===0) return {outcome:'HOLD',metrics:[['accepted',0],['bounded retries',0],['duplicates',0],['rejected',0]],findings:['No event evidence supplied; fail closed'],rows:[],scope:'No actual signature verification or request processing performed. An empty fixture cannot establish correctness.'};
  const seen = new Set(), rows=[]; let accepted=0,blocked=0,retried=0,deduplicated=0;
  for (let idx=0; idx<input.events.length; idx++) {
    const e=input.events[idx];
    ensure(obj(e),`events[${idx}] must be an object.`);
    const tenant=nonEmpty(e.tenantId)?e.tenantId.trim():'';
    const id=nonEmpty(e.eventId)?e.eventId.trim():'';
    const code=e.httpStatus;
    let decision,reason;
    if (!tenant||!id){ decision='REJECT';reason='Missing tenant or event identifier';blocked++;}
    else if (e.signatureVerified !== true){decision='REJECT';reason='Signed-request verification not confirmed by fictional fixture';blocked++;}
    else if (!Number.isInteger(code) || code<100 || code>599){decision='REJECT';reason='Invalid HTTP status';blocked++;}
    else {
      const key=JSON.stringify([tenant,id]);
      if (seen.has(key)){decision='DUPLICATE';reason='Tenant-scoped idempotency key already observed';deduplicated++;}
      else {
        seen.add(key);
        if (code>=200&&code<300){decision='ACCEPT';reason='Successful upstream response';accepted++;}
        else if ((code===408||code===429||code>=500)&&Number.isInteger(e.attempt)&&e.attempt>=0&&e.attempt<3){decision='RETRY';reason='Transient response; bounded retry';retried++;}
        else {decision='REJECT';reason='Non-retryable status or retry budget exhausted';blocked++;}
      }
    }
    rows.push({line:idx+1,tenant:safeText(tenant),event:safeText(id),decision,reason});
  }
  const issues=rows.filter(r=>r.decision!=='ACCEPT').map(r=>`#${r.line}: ${r.decision} — ${r.reason}`);
  return {outcome:blocked?'REVIEW':retried||deduplicated?'ATTENTION':'PASS',
    metrics:[['accepted',accepted],['bounded retries',retried],['duplicates',deduplicated],['rejected',blocked]],
    findings:issues,rows,scope:'Rule-based replay analysis. signatureVerified is fixture input, NOT a real cryptographic check.'};
}

export function reconciliationBench(input) {
  ensure(obj(input) && Array.isArray(input.source) && Array.isArray(input.target),'Input must contain source and target arrays.');
  ensure(input.source.length<=100 && input.target.length<=100,'Maximum 100 rows per side.');
  if(input.source.length===0 && input.target.length===0) return {outcome:'HOLD',metrics:[['matched',0],['missing',0],['mismatch',0],['unexpected',0],['duplicate keys',0]],findings:['No reconciliation rows supplied; fail closed'],rows:[],scope:'No actual database query or financial transaction performed. Empty data does not demonstrate integrity.'};
  function validate(rows,name){
    const map=new Map(), duplicate=new Set();
    for(let i=0;i<rows.length;i++){
      const r=rows[i];ensure(obj(r),`${name}[${i}] must be an object.`);
      ensure(nonEmpty(r.id) && nonEmpty(r.tenantId),`${name}[${i}] requires id and tenantId.`);
      ensure(Number.isSafeInteger(r.cents) && r.cents>=0,`${name}[${i}].cents must be a nonnegative safe integer.`);
      const key=JSON.stringify([r.tenantId.trim(),r.id.trim()]);
      if(map.has(key))duplicate.add(key);else map.set(key,r.cents);
    }
    return {map,duplicate};
  }
  const a=validate(input.source,'source'),b=validate(input.target,'target');
  let matched=0,missing=0,mismatched=0,unexpected=0;const rows=[];
  for(const [key,v] of a.map){
    const [tenant,id]=JSON.parse(key);const dup=a.duplicate.has(key)||b.duplicate.has(key);
    let decision,reason;
    if(dup){decision='HOLD';reason='Duplicate source or target key';}
    else if(!b.map.has(key)){decision='MISSING';reason='No target row';missing++;}
    else if(v!==b.map.get(key)){decision='MISMATCH';reason=`Amount mismatch ${v} / ${b.map.get(key)} cents`;mismatched++;}
    else{decision='MATCH';reason='Tenant, ID and amount match';matched++;}
    rows.push({line:rows.length+1,tenant,event:id,decision,reason});
  }
  for(const [key] of b.map){if(!a.map.has(key)){
    const [tenant,id]=JSON.parse(key);unexpected++;
    rows.push({line:rows.length+1,tenant,event:id,decision:'UNEXPECTED',reason:'Unmatched target row'});
  }}
  const duplicateCount=new Set([...a.duplicate,...b.duplicate]).size;
  const findings=rows.filter(r=>r.decision!=='MATCH').map(r=>`${r.tenant}/${r.event}: ${r.reason}`);
  return {outcome:findings.length||duplicateCount?'HOLD':'PASS',
    metrics:[['matched',matched],['missing',missing],['mismatch',mismatched],['unexpected',unexpected],['duplicate keys',duplicateCount]],
    findings,rows,scope:'Pure in-browser integer-cent reconciliation; no actual database or financial transfer.'};
}

export function authorizationBench(input) {
  ensure(obj(input)&&obj(input.expected)&&obj(input.claims),'Provide expected and claims objects.');
  const e=input.expected,c=input.claims;
  const checks=[
    ['algorithm',c.alg==='RS256' && e.alg==='RS256'],
    ['key selection',nonEmpty(c.kid) && Array.isArray(e.allowedKids) && e.allowedKids.includes(c.kid)],
    ['issuer',nonEmpty(e.iss) && c.iss===e.iss],
    ['audience',nonEmpty(e.aud) && c.aud===e.aud],
    ['tenant',nonEmpty(e.tenantId) && c.tenantId===e.tenantId],
    ['scope',nonEmpty(e.requiredScope) && Array.isArray(c.scopes) && c.scopes.includes(e.requiredScope)],
    ['timestamp',Number.isFinite(input.now) && Number.isFinite(c.exp) && c.exp>input.now && (!own(c,'nbf')||(Number.isFinite(c.nbf)&&c.nbf<=input.now))]
  ];
  const rows=checks.map(([reason,pass],i)=>({line:i+1,tenant:'JWT',event:reason,decision:pass?'PASS':'DENY',reason:pass?'Fixture claim matches policy':'Policy mismatch / expired or invalid fixture'}));
  return {outcome:checks.every(x=>x[1])?'PASS':'DENY',metrics:[['checks passed',checks.filter(x=>x[1]).length],['checks denied',checks.filter(x=>!x[1]).length]],
    findings:rows.filter(r=>r.decision==='DENY').map(r=>r.event+' failed'),rows,
    scope:'Claim-policy simulator only. No JWT signature, public-key, token parsing or crypto verification is performed.'};
}

export function releaseBench(input) {
  ensure(obj(input)&&obj(input.stable)&&obj(input.candidate)&&obj(input.policy),'Provide stable, candidate and policy.');
  const a=input.stable,b=input.candidate,p=input.policy;
  const errors=[];
  for(const [name,objt] of [['stable',a],['candidate',b]]){
    ensure(Number.isInteger(objt.samples)&&objt.samples>=0&&objt.samples<=100000,`${name}.samples invalid`);
    ensure(typeof objt.errorRate==='number'&&objt.errorRate>=0&&objt.errorRate<=1,`${name}.errorRate invalid`);
    ensure(typeof objt.p95Ms==='number'&&objt.p95Ms>=0&&Number.isFinite(objt.p95Ms),`${name}.p95Ms invalid`);
  }
  ensure(Number.isInteger(p.minSamples)&&p.minSamples>=30,'policy.minSamples must be >= 30.');
  ensure(typeof p.maxErrorRate==='number'&&p.maxErrorRate>=0&&p.maxErrorRate<=1,'Invalid error-rate limit.');
  ensure(typeof p.maxP95RegressionPct==='number'&&p.maxP95RegressionPct>=0,'Invalid latency threshold.');
  if(a.samples<p.minSamples || b.samples<p.minSamples)errors.push('Insufficient sample size: fail closed');
  if(b.errorRate>p.maxErrorRate)errors.push('Candidate error rate exceeds policy');
  const diff=a.p95Ms===0 ? (b.p95Ms===0 ? 0 : Infinity) : ((b.p95Ms-a.p95Ms)/a.p95Ms)*100;
  if(diff>p.maxP95RegressionPct)errors.push('Candidate p95 latency regression');
  if(b.errorRate>a.errorRate && b.errorRate>0)errors.push('Candidate has more errors than stable baseline');
  if(input.operatorApproval!==true)errors.push('Explicit human lab approval missing');
  const rows=[
    {line:1,tenant:'LAB',event:'sample floor',decision:a.samples>=p.minSamples&&b.samples>=p.minSamples?'PASS':'HOLD',reason:'Minimum observations'},
    {line:2,tenant:'LAB',event:'candidate errors',decision:b.errorRate<=p.maxErrorRate&&b.errorRate<=a.errorRate?'PASS':'HOLD',reason:'Absolute and baseline error budgets'},
    {line:3,tenant:'LAB',event:'p95 latency',decision:diff<=p.maxP95RegressionPct?'PASS':'HOLD',reason:'Bounded p95 regression'},
    {line:4,tenant:'LAB',event:'operator approval',decision:input.operatorApproval===true?'PASS':'HOLD',reason:'Manual lab-only approval'}];
  return {outcome:errors.length?'HOLD':'LAB_PASS',metrics:[['stable samples',a.samples],['candidate samples',b.samples],['p95 regression %',Number.isFinite(diff)?Math.round(diff*10)/10:'∞'],['candidate error %',Math.round(b.errorRate*10000)/100]],
    findings:errors,rows,scope:'Synthetic math-only canary gate; does NOT deploy code, change a route, execute a rollback or approve production.'};
}

export function runScenario(type,input){
  const safe=frozen(input); // eliminate accidental caller mutations
  switch(type){
    case 'webhooks':return webhookBench(safe);
    case 'reconciliation':return reconciliationBench(safe);
    case 'authorization':return authorizationBench(safe);
    case 'releases':return releaseBench(safe);
    default:throw new Error('Unknown proof scenario');
  }
}

/**
 * Human-reviewable paired lab fixture audit. This deliberately compares fixed
 * fictional fixtures; it is NOT a security or production acceptance audit.
 */
export function compareScenario(type) {
  if (!SCENARIOS.includes(type)) throw new Error('Unknown proof scenario');
  const specimen = FIXTURES[type];
  const summarize = kind => {
    const fixture=frozen(specimen[kind]);
    const result=runScenario(type,fixture);
    return {
      fixture, outcome:result.outcome,
      isGreen:['PASS','LAB_PASS'].includes(result.outcome),
      metrics:result.metrics,trace:result.rows,
      findings:result.findings,scope:result.scope
    };
  };
  const safe=summarize('safe'),unsafe=summarize('risk');
  return {
    scenario:type,version:'proof-plus-1.1',
    review:safe.isGreen&&!unsafe.isGreen ? 'BOUNDARY_DEMONSTRATED' : 'REVIEW_REQUIRED',
    safe,unsafe,customerProductionApproved:false,cryptographicProof:false,
    scope:'Two fixed fictional, synthetic input scenarios executed in this browser; not real access controls, provider signatures or customer production acceptance.'
  };
}

export const FIXTURES = Object.freeze({
  webhooks: {
    safe:{events:[{tenantId:'tenant-demo-a',eventId:'evt-001',signatureVerified:true,httpStatus:201,attempt:0},{tenantId:'tenant-demo-b',eventId:'evt-001',signatureVerified:true,httpStatus:204,attempt:0}]},
    risk:{events:[{tenantId:'tenant-demo-a',eventId:'evt-001',signatureVerified:true,httpStatus:200,attempt:0},{tenantId:'tenant-demo-a',eventId:'evt-001',signatureVerified:true,httpStatus:200,attempt:1},{tenantId:'tenant-demo-a',eventId:'evt-002',signatureVerified:true,httpStatus:503,attempt:2},{tenantId:'tenant-demo-b',eventId:'evt-003',signatureVerified:false,httpStatus:200,attempt:0}]}
  },
  reconciliation:{safe:{source:[{tenantId:'tenant-a',id:'INV-001',cents:125000},{tenantId:'tenant-b',id:'INV-001',cents:5500}],target:[{tenantId:'tenant-a',id:'INV-001',cents:125000},{tenantId:'tenant-b',id:'INV-001',cents:5500}]},
    risk:{source:[{tenantId:'tenant-a',id:'INV-001',cents:125000},{tenantId:'tenant-a',id:'INV-001',cents:125000},{tenantId:'tenant-b',id:'INV-002',cents:4000}],target:[{tenantId:'tenant-a',id:'INV-001',cents:125100},{tenantId:'tenant-b',id:'INV-003',cents:4000}]}}
  ,authorization:{safe:{now:1700000000,expected:{alg:'RS256',allowedKids:['k-lab-1'],iss:'https://issuer.example',aud:'lab-api',tenantId:'tenant-a',requiredScope:'read:reports'},claims:{alg:'RS256',kid:'k-lab-1',iss:'https://issuer.example',aud:'lab-api',tenantId:'tenant-a',scopes:['read:reports'],nbf:1699999900,exp:1700001000}},
    risk:{now:1700000000,expected:{alg:'RS256',allowedKids:['k-lab-1'],iss:'https://issuer.example',aud:'lab-api',tenantId:'tenant-a',requiredScope:'read:reports'},claims:{alg:'none',kid:'unknown',iss:'https://issuer.example',aud:'other-api',tenantId:'tenant-b',scopes:['admin:all'],nbf:1700000900,exp:1699999900}}},
  releases:{safe:{stable:{samples:300,errorRate:0,p95Ms:100},candidate:{samples:300,errorRate:0,p95Ms:105},policy:{minSamples:100,maxErrorRate:0.01,maxP95RegressionPct:12},operatorApproval:true},
    risk:{stable:{samples:300,errorRate:0,p95Ms:100},candidate:{samples:20,errorRate:0.05,p95Ms:150},policy:{minSamples:100,maxErrorRate:0.01,maxP95RegressionPct:12},operatorApproval:false}}
});
