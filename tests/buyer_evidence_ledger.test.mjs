import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const load=(path)=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));
test('public technical evidence ledger corresponds to each private archived SKU, no omitted or invented IDs',()=>{
  const b=load('../buyer-lab/catalog.json').products.filter(x=>x.bank==='historical-44');
  const ledger=load('../buyer-lab/evidence_ledger_44.json');
  assert.equal(b.length,44);assert.equal(ledger.products.length,44);
  assert.deepEqual(new Set(ledger.products.map(x=>x.sku)),new Set(b.map(x=>x.id)));
  assert.equal(ledger.summary.static_syntax_scanned,44);
  assert.equal(ledger.summary.commercial_license_approved,0);
  assert.equal(ledger.summary.production_approved,0);
  assert.ok(ledger.products.every(x=>x.integrity_checked&&x.python_syntax_checked&&!x.production_approved));
});
test('public ledger must never contain local private paths, source or private GitHub URLs',()=>{
  const raw=readFileSync(new URL('../buyer-lab/evidence_ledger_44.json',import.meta.url),'utf8');
  for(const sensitive of ['D:\\','private-44','releases/','repo_path','source_files','api_key','github_pat_'])
    assert.ok(!raw.includes(sensitive),'private field leaked: '+sensitive);
});

test('fresh real source reruns are attributed to exactly 19 L2 SKUs and 203 assertions/tests',()=>{
  const ledger=load('../buyer-lab/evidence_ledger_44.json');
  const reruns=ledger.products.filter(x=>x.fresh_unit_test_recheck);
  assert.equal(reruns.length,19);
  assert.equal(reruns.reduce((s,x)=>s+x.fresh_unit_test_recheck.passed_tests,0),203);
  assert.ok(reruns.every(x=>x.level==='L2' && x.fresh_unit_test_recheck.status==='PASS' && x.fresh_unit_test_recheck.archive_sha_verified));
  assert.equal(ledger.summary.fresh_rerun_l2_skus,19);
  assert.equal(ledger.summary.fresh_rerun_l2_tests,203);
  assert.ok(ledger.products.filter(x=>!x.fresh_unit_test_recheck).length===25);
});
