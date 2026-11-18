import {test} from 'node:test';
import assert from 'node:assert/strict';
import {compareScenario,SCENARIOS} from '../proof-engine.mjs';

for(const scenario of SCENARIOS){
  test(`comparison ${scenario}: safe example passes and unsafe example does not`,()=>{
    const x=compareScenario(scenario);
    assert.equal(x.scenario,scenario);
    assert.equal(x.safe.isGreen,true);
    assert.equal(x.unsafe.isGreen,false);
    assert.equal(x.review,'BOUNDARY_DEMONSTRATED');
    assert.match(x.scope,/synthetic|fictional/i);
    assert.ok(Array.isArray(x.safe.trace));
    assert.ok(Array.isArray(x.unsafe.trace));
  });
}
test('unknown comparison fails closed',()=>assert.throws(()=>compareScenario('remote-payments'),/Unknown/));
test('comparison results have independent copies of fixtures',()=>{
  const a=compareScenario('webhooks');
  a.safe.fixture.events[0].tenantId='edited';
  const b=compareScenario('webhooks');
  assert.notEqual(b.safe.fixture.events[0].tenantId,'edited');
});
test('comparison does not claim real signature validation or production approval',()=>{
  for(const k of SCENARIOS){
    const c=compareScenario(k);
    assert.equal(c.customerProductionApproved,false);
    assert.equal(c.cryptographicProof,false);
  }
});
test('comparison is a readable standalone evidence object',()=>{
  const c=compareScenario('reconciliation');
  const parsed=JSON.parse(JSON.stringify(c));
  assert.equal(parsed.review,'BOUNDARY_DEMONSTRATED');
  assert.ok(parsed.safe.trace.length>=1);
  assert.ok(parsed.unsafe.trace.length>=1);
});
