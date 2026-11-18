import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=(p)=>readFileSync(new URL(p,import.meta.url),'utf8');
test('new database addendum revises totals without overwriting historic 714 snapshot',()=>{
 const l=JSON.parse(read('../buyer-lab/evidence_ledger_44.json'));
 assert.equal(l.summary.fresh_selected_passing_cases,714);
 const a=l.postgres_docker_20261118;
 assert.equal(a.registered_skus,44);
 assert.equal(a.latest_passing_executions,818);
 assert.equal(a.new_passing_executions,104);
 assert.equal(a.new_green_suites,8);
 assert.equal(a.total_selected_green_suites,44);
 assert.equal(a.partially_covered_suites,4);
 assert.equal(a.environment_blocked_suites,0);
 assert.equal(a.production_approved,0);
 assert.equal(a.commercial_license_approved,0);
 assert.equal(a.customer_accepted,0);
 assert.equal(a.source_archive_shared,false);
});
test('eight local disposable database suites total 104 real passes with no skips',()=>{
 const a=JSON.parse(read('../buyer-lab/evidence_ledger_44.json')).postgres_docker_20261118;
 assert.equal(a.suites.length,8);
 assert.equal(new Set(a.suites.map(x=>x.sku)).size,8);
 assert.equal(a.suites.reduce((n,x)=>n+x.passed,0),104);
 assert.ok(a.suites.every(x=>x.status==='PASS' && x.sha_verified && x.failed===0 && x.errors===0 && x.skipped===0));
});
test('public evidence never reveals private repository, paths or synthetic connection strings',()=>{
 const ledger=read('../buyer-lab/evidence_ledger_44.json');
 const md=read('../buyer-lab/evidence_addendum_20261118.md');
 for(const s of ['private-44','D:\\','repo_path','postgresql://','PGPASSWORD','ghp_'])
   assert.ok(!ledger.includes(s) && !md.includes(s),'restricted text: '+s);
 assert.match(read('../buyer-lab/index.html'),/828 selected test executions/);
 assert.match(md,/NOT production-ready/);
});
test('OIDC full database rerun increases latest tally by ten, retains prior proofs and caveats',()=>{
 const l=JSON.parse(read('../buyer-lab/evidence_ledger_44.json'));
 const a=l.oidc_20261118;
 assert.equal(l.summary.fresh_selected_passing_cases,714);
 assert.equal(l.postgres_docker_20261118.latest_passing_executions,818);
 assert.equal(a.sku,'ARAZVERA-L2-OIDC-JWKS-BOUNDARY-001');
 assert.equal(a.full_suite_passes,49);
 assert.equal(a.extra_passing_executions,10);
 assert.equal(a.current_passing_executions,828);
 assert.equal(a.total_selected_green_suites,44);
 assert.equal(a.total_partial_suites,3);
 assert.equal(a.failed,0);assert.equal(a.skipped,0);
 assert.equal(a.commercial_licenses_approved,0);
 assert.equal(a.production_approvals,0);
 assert.equal(a.customer_acceptances,0);
 const md=read('../buyer-lab/evidence_oidc_addendum_20261118.md');
 assert.match(md,/828/);
 assert.match(md,/not production certification/i);
});
