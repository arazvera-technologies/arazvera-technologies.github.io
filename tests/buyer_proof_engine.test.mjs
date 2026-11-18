import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeWebhook, analyzeReconciliation, analyzeAgent, analyzeRelease, analyzeSupplier, analyzeRecovery, analyzeWorkflow, runAnalysis, EXAMPLES} from '../buyer-lab/engine.mjs';

test('webhook exact retry does not add a second queue item', () => {
  const r=analyzeWebhook({events:[{tenant:'A',id:'evt1',payload:{sum:2}},{tenant:'A',id:'evt1',payload:{sum:2}}]});
  assert.deepEqual([r.accepted,r.replayed,r.conflicts,r.invalid],[1,1,0,0]);assert.equal(r.queue.length,1);
});
test('webhook reused key with changed payload is a conflict', () => {
  const r=analyzeWebhook({events:[{tenant:'A',id:'evt1',payload:{sum:2}},{tenant:'A',id:'evt1',payload:{sum:3}}]});
  assert.equal(r.conflicts,1);assert.equal(r.queue.length,1);assert.equal(r.decision,'REVIEW');
});
test('webhook key is tenant-scoped and invalid events are rejected', () => {
  const r=analyzeWebhook({events:[{tenant:'A',id:'e',payload:{}},{tenant:'B',id:'e',payload:{}},{tenant:'',id:'bad',payload:{}}]});
  assert.equal(r.accepted,2);assert.equal(r.invalid,1);
});
test('reconciliation catches missing rows and amount drift', () => {
  const r=analyzeReconciliation({source:[{tenant:'A',id:'1',amount:100},{tenant:'A',id:'2',amount:90}],target:[{tenant:'A',id:'1',amount:99},{tenant:'A',id:'3',amount:5}]});
  assert.equal(r.findings.filter(x=>x.code==='AMOUNT_MISMATCH').length,1);
  assert.equal(r.findings.filter(x=>x.code==='MISSING_IN_TARGET').length,1);
  assert.equal(r.findings.filter(x=>x.code==='ORPHAN_IN_TARGET').length,1);
});
test('reconciliation preserves tenant boundaries in keys', () => {
  const r=analyzeReconciliation({source:[{tenant:'A',id:'1',amount:100}],target:[{tenant:'B',id:'1',amount:100}]});
  assert.equal(r.decision,'REVIEW');assert.equal(r.findings.length,2);
});
test('agent denies unlisted actions and requires operator approval', () => {
  assert.equal(analyzeAgent({role:'operator',tool:'delete-database',approved:true}).allowed,false);
  assert.equal(analyzeAgent({role:'operator',tool:'queue-retry',approved:false}).allowed,false);
  assert.equal(analyzeAgent({role:'operator',tool:'queue-retry',approved:true}).allowed,true);
});
test('release gates hold on violated thresholds', () => {
  const r=analyzeRelease({metrics:{errorRate:0.04,p95Ms:520,queueLag:10},limits:{errorRate:0.02,p95Ms:450,queueLag:100}});
  assert.equal(r.decision,'HOLD');assert.equal(r.findings.length,2);
});
test('release gates permit synthetic advance inside all limits', () => {
  const r=analyzeRelease({metrics:{errorRate:0.001,p95Ms:120,queueLag:0},limits:{errorRate:0.02,p95Ms:450,queueLag:100}});
  assert.equal(r.decision,'PASS');assert.equal(r.findings.length,0);
});
test('supplier review rejects duplicate packs and missing evidence', () => {
  const r=analyzeSupplier({packs:[{packId:'P1',supplier:'X',documentRef:'D1'},{packId:'P1',supplier:'X',documentRef:'missing'}],documents:[{ref:'D1'}]});
  assert.ok(r.findings.some(x=>x.code==='DUPLICATE_PACK'));
  assert.ok(r.findings.some(x=>x.code==='UNKNOWN_DOCUMENT'));
});
test('recovery report refuses an altered synthetic digest', () => {
  const r=analyzeRecovery({snapshots:[{tenant:'A',name:'store',digest:'abc'}],restored:[{tenant:'A',name:'store',digest:'corrupted'}]});
  assert.equal(r.decision,'REVIEW');assert.ok(r.findings.some(x=>x.code==='DIGEST_MISMATCH'));
});
test('workflow audit flags retry without idempotency and exposed credential', () => {
  const r=analyzeWorkflow({steps:[{id:'send',retry:3,idempotent:false,credentialInline:true,timeoutMs:0}]});
  assert.ok(r.findings.some(x=>x.code==='UNSAFE_RETRY'));
  assert.ok(r.findings.some(x=>x.code==='INLINE_SECRET'));
  assert.ok(r.findings.some(x=>x.code==='NO_TIMEOUT'));
});
test('all seven demo types have safe and unsafe fixtures', () => {
  for(const n of ['webhook','reconcile','agent','release','supplier','recovery','workflow']){
    assert.ok(EXAMPLES[n]?.pass && EXAMPLES[n]?.issues,n);
    assert.equal(runAnalysis(n,EXAMPLES[n].pass).decision,'PASS',n+' pass');
    assert.notEqual(runAnalysis(n,EXAMPLES[n].issues).decision,'PASS',n+' issues');
  }
});
test('unknown analysis fails closed', () => {
  assert.throws(()=>runAnalysis('unknown',{}),/Unsupported demo/);
});
