// ARAZVERA public buyer proof: source-free SYNTHETIC algorithms.
// NOT the private product engines, an API endpoint or certification.
const finding=(code,message,detail='')=>({code,message,detail});
const report=(findings,details={})=>({decision:findings.length?'REVIEW':'PASS',findings,...details,scope:'public synthetic illustration only'});
const asRows=v=>Array.isArray(v)?v:[];
const str=v=>typeof v==='string'?v.trim():'';
const keyOf=r=>str(r?.tenant)+'::'+str(r?.id);
const canonical=v=>{
  if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
  if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
  return JSON.stringify(v);
};

export function analyzeWebhook(data){
  const f=[],seen=new Map(),queue=[];let accepted=0,replayed=0,conflicts=0,invalid=0;
  asRows(data?.events).forEach((e,index)=>{
    const tenant=str(e?.tenant),id=str(e?.id);
    if(!tenant||!id||!e||typeof e.payload!=='object'||e.payload===null){
      invalid++;f.push(finding('INVALID_EVENT','Missing tenant, event ID or object payload','item '+(index+1)));return;
    }
    const key=tenant+'::'+id,digest=canonical(e.payload);
    if(seen.has(key)){
      if(seen.get(key)===digest){replayed++;return;}
      conflicts++;f.push(finding('KEY_CONFLICT','Same tenant/event ID with a different payload',key));return;
    }
    seen.set(key,digest);accepted++;queue.push({tenant,id});
  });
  if(!Array.isArray(data?.events))f.push(finding('INVALID_BATCH','events must be an array'));
  return report(f,{received:asRows(data?.events).length,accepted,replayed,conflicts,invalid,queue});
}
export function analyzeReconciliation(data){
  const f=[],source=asRows(data?.source),target=asRows(data?.target);
  const makeMap=(rows,side)=>{
    const m=new Map();
    rows.forEach((r,i)=>{
      const key=keyOf(r),amount=Number(r?.amount);
      if(!str(r?.tenant)||!str(r?.id)||!Number.isFinite(amount)){
        f.push(finding('INVALID_ROW','Invalid tenant, ID or amount',side+' row '+(i+1)));return;
      }
      if(m.has(key))f.push(finding('DUPLICATE_KEY','Duplicate tenant-scoped key',side+': '+key));
      else m.set(key,amount);
    });
    return m;
  };
  const a=makeMap(source,'source'),b=makeMap(target,'target');
  for(const [k,v] of a){if(!b.has(k))f.push(finding('MISSING_IN_TARGET','Source row is missing in target',k));
    else if(b.get(k)!==v)f.push(finding('AMOUNT_MISMATCH','Values differ between source and target',k));}
  for(const k of b.keys())if(!a.has(k))f.push(finding('ORPHAN_IN_TARGET','Target has no matching source row',k));
  if(!Array.isArray(data?.source)||!Array.isArray(data?.target))f.push(finding('INVALID_DATA','source and target must be arrays'));
  return report(f,{sourceRows:source.length,targetRows:target.length,matched:[...a.keys()].filter(k=>b.has(k)&&a.get(k)===b.get(k)).length});
}
export function analyzeAgent(data){
  const allow={reviewer:['read-report'],auditor:['view-audit','read-report'],operator:['read-report','view-audit','queue-retry']};
  const tool=str(data?.tool),role=str(data?.role);
  const found=(allow[role]||[]).includes(tool);
  const required=tool==='queue-retry';
  const approved=data?.approved===true;
  const allowed=found&&(!required||approved);
  const f=allowed?[]:[finding(!found?'DENY_BY_DEFAULT':'REVIEW_REQUIRED',!found?'Tool is not permitted for this role':'Explicit human approval required')];
  return report(f,{role,tool,approved,allowed,decision:allowed?'PASS':'REVIEW'});
}
export function analyzeRelease(data){
  const f=[],m=data?.metrics,l=data?.limits;
  for(const k of ['errorRate','p95Ms','queueLag']){
    const value=m?.[k],bound=l?.[k];
    if(typeof value!=='number'||typeof bound!=='number'||!Number.isFinite(value)||!Number.isFinite(bound)||value<0||bound<0){
      f.push(finding('INVALID_METRIC','Missing or invalid numeric metric/threshold',k));continue;
    }
    if(value>bound)f.push(finding('SLO_EXCEEDED','Synthetic release threshold exceeded',k+' '+value+' > '+bound));
  }
  return report(f,{metrics:m??null,limits:l??null,gate:f.length?'HOLD':'ADVANCE',decision:f.length?'HOLD':'PASS'});
}
export function analyzeSupplier(data){
  const f=[],packs=asRows(data?.packs),docs=asRows(data?.documents);
  const refSet=new Set(docs.map(x=>str(x?.ref)).filter(Boolean)),seen=new Set();
  packs.forEach((p,i)=>{
    const id=str(p?.packId),supp=str(p?.supplier),doc=str(p?.documentRef),row='pack '+(i+1);
    if(!id)f.push(finding('MISSING_PACK_ID','Pack identifier required',row));
    else if(seen.has(id))f.push(finding('DUPLICATE_PACK','Duplicate supplier pack ID',id));
    else seen.add(id);
    if(!supp)f.push(finding('MISSING_SUPPLIER','Supplier is required',row));
    if(!doc)f.push(finding('MISSING_EVIDENCE','Document reference missing',row));
    else if(!refSet.has(doc))f.push(finding('UNKNOWN_DOCUMENT','Reference not in supplied evidence index',doc));
  });
  if(!Array.isArray(data?.packs)||!Array.isArray(data?.documents))f.push(finding('INVALID_INPUT','packs/documents must be arrays'));
  return report(f,{checkedPacks:packs.length,knownEvidence:refSet.size});
}
export function analyzeRecovery(data){
  const f=[],snap=asRows(data?.snapshots),restore=asRows(data?.restored);
  const map=new Map();
  for(const row of restore){const key=keyOf({tenant:row?.tenant,id:row?.name});
    if(map.has(key))f.push(finding('DUPLICATE_RESTORE','Duplicate restored dataset',key));
    else map.set(key,str(row?.digest));
  }
  for(const row of snap){
    const key=keyOf({tenant:row?.tenant,id:row?.name}),digest=str(row?.digest);
    if(!str(row?.tenant)||!str(row?.name)||!digest){f.push(finding('INVALID_SNAPSHOT','Snapshot metadata incomplete',key));continue;}
    if(!map.has(key))f.push(finding('RESTORE_MISSING','No corresponding restored dataset',key));
    else if(map.get(key)!==digest)f.push(finding('DIGEST_MISMATCH','Snapshot and restore digest differ',key));
  }
  const inputKeys=new Set(snap.map(r=>keyOf({tenant:r?.tenant,id:r?.name})));
  for(const k of map.keys())if(!inputKeys.has(k))f.push(finding('UNEXPECTED_RESTORE','Restored dataset not in snapshot list',k));
  if(!Array.isArray(data?.snapshots)||!Array.isArray(data?.restored))f.push(finding('INVALID_INPUT','snapshots/restored must be arrays'));
  return report(f,{snapshots:snap.length,restored:restore.length});
}
export function analyzeWorkflow(data){
  const f=[],steps=asRows(data?.steps),seen=new Set();
  steps.forEach((s,i)=>{
    const name=str(s?.id)||'step '+(i+1),retry=Number(s?.retry),timeout=Number(s?.timeoutMs);
    if(seen.has(name))f.push(finding('DUPLICATE_STEP','Step ID is not unique',name));else seen.add(name);
    if(!Number.isFinite(retry)||retry<0)f.push(finding('INVALID_RETRY','Retry count must be nonnegative',name));
    else if(retry>0&&s?.idempotent!==true)f.push(finding('UNSAFE_RETRY','Retries require a demonstrated idempotent step',name));
    if(s?.credentialInline===true)f.push(finding('INLINE_SECRET','Synthetic workflow embeds an inline credential',name));
    if(!Number.isFinite(timeout)||timeout<=0)f.push(finding('NO_TIMEOUT','A positive timeout is required',name));
  });
  if(!Array.isArray(data?.steps))f.push(finding('INVALID_INPUT','steps must be an array'));
  return report(f,{checkedSteps:steps.length});
}
export const EXAMPLES={
  webhook:{
    pass:{events:[{tenant:'alpha',id:'invoice-101',payload:{amount:90}},{tenant:'alpha',id:'invoice-101',payload:{amount:90}},{tenant:'beta',id:'invoice-101',payload:{amount:12}}]},
    issues:{events:[{tenant:'alpha',id:'invoice-101',payload:{amount:90}},{tenant:'alpha',id:'invoice-101',payload:{amount:99}},{tenant:'',id:'broken',payload:{}}]}
  },
  reconcile:{
    pass:{source:[{tenant:'alpha',id:'001',amount:12},{tenant:'beta',id:'001',amount:7}],target:[{tenant:'alpha',id:'001',amount:12},{tenant:'beta',id:'001',amount:7}]},
    issues:{source:[{tenant:'alpha',id:'001',amount:12},{tenant:'alpha',id:'002',amount:15}],target:[{tenant:'alpha',id:'001',amount:11},{tenant:'alpha',id:'003',amount:8}]}
  },
  agent:{
    pass:{role:'operator',tool:'queue-retry',approved:true},
    issues:{role:'guest',tool:'delete-database',approved:true}
  },
  release:{
    pass:{metrics:{errorRate:0.004,p95Ms:140,queueLag:8},limits:{errorRate:0.02,p95Ms:450,queueLag:100}},
    issues:{metrics:{errorRate:0.033,p95Ms:490,queueLag:8},limits:{errorRate:0.02,p95Ms:450,queueLag:100}}
  },
  supplier:{
    pass:{packs:[{packId:'PACK-001',supplier:'Vendor A',documentRef:'DOC-10'}],documents:[{ref:'DOC-10'}]},
    issues:{packs:[{packId:'PACK-001',supplier:'Vendor A',documentRef:'DOC-10'},{packId:'PACK-001',supplier:'',documentRef:'DOC-404'}],documents:[{ref:'DOC-10'}]}
  },
  recovery:{
    pass:{snapshots:[{tenant:'alpha',name:'orders',digest:'hash-123'}],restored:[{tenant:'alpha',name:'orders',digest:'hash-123'}]},
    issues:{snapshots:[{tenant:'alpha',name:'orders',digest:'hash-123'}],restored:[{tenant:'alpha',name:'orders',digest:'hash-999'}]}
  },
  workflow:{
    pass:{steps:[{id:'notification',retry:3,idempotent:true,credentialInline:false,timeoutMs:1200}]},
    issues:{steps:[{id:'notification',retry:3,idempotent:false,credentialInline:true,timeoutMs:0}]}
  }
};
const RUNNERS={webhook:analyzeWebhook,reconcile:analyzeReconciliation,agent:analyzeAgent,release:analyzeRelease,supplier:analyzeSupplier,recovery:analyzeRecovery,workflow:analyzeWorkflow};
export function runAnalysis(kind,input){
  if(!Object.prototype.hasOwnProperty.call(RUNNERS,kind))throw Error('Unsupported demo: '+kind);
  return RUNNERS[kind](input);
}
