import test from 'node:test';
import assert from 'node:assert/strict';
import {recommendStarters, buildBuyerBrief, classifyNeed} from '../buyer-lab/matcher.mjs';
import {readFileSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('../buyer-lab/catalog.json',import.meta.url),'utf8')).products;

test('catalog is source-safe and contains every internal tier',()=>{
 assert.equal(catalog.length,68);
 assert.deepEqual([...new Set(catalog.map(p=>p.level))].sort(),['BUNDLE','L1','L2','L3','L4','L5','L6','L7'].sort());
 assert.ok(catalog.every(p=>!Object.keys(p).some(k=>/privatePath|zipPath|secret|token|repoAccess/i.test(k))));
});
test('webhook error workflow prefers relevant L2/L3, with truthful gap',()=>{
 const r=recommendStarters({request:'Python FastAPI webhook retries idempotency and duplicate event protection',level:'all'},catalog);
 assert.ok(r.matches.length>0);
 assert.equal(r.family,'webhook');
 assert.ok(r.matches.every(p=>p.family==='webhook' && p.why.length && p.remainingWork.length));
 assert.ok(r.matches.some(p=>p.sku.includes('WEBHOOK')||p.sku.includes('API')));
});
test('PostgreSQL migration is directed to data engineering candidates',()=>{
 const r=recommendStarters({request:'PostgreSQL zero downtime database migration, reconciliation, tenant RLS',level:'all'},catalog);
 assert.equal(r.family,'reconcile');
 assert.ok(r.matches.some(x=>/POSTGRES|MIGRATION|DATA/.test(x.sku)));
});
test('strict level filter produces no candidates outside tier',()=>{
 const r=recommendStarters({request:'Agent authorization tools approval',level:'L5'},catalog);
 assert.ok(r.matches.length>0);
 assert.ok(r.matches.every(p=>p.level==='L5'));
});
test('without concrete specs no invented matches or confident percentage',()=>{
 const r=recommendStarters({request:'Hello!',level:'all'},catalog);
 assert.equal(r.matches.length,0);
 assert.equal(r.family,null);
 assert.equal(r.needsClarification,true);
});
test('unsupported request cannot masquerade as ready-made product',()=>{
 const r=recommendStarters({request:'Build full video game in Unity with real-time physics',level:'all'},catalog);
 assert.equal(r.matches.length,0);
});
test('user input too long or private-looking is not added to generated evidence',()=>{
 const x='a'.repeat(6000);
 assert.throws(()=>recommendStarters({request:x},catalog),/limit/i);
 const r=recommendStarters({request:'Webhook reliability',level:'all'},catalog);
 const m=buildBuyerBrief({request:'Webhook reliability',stack:'FastAPI',scope:'Pilot with test data'},r);
 assert.ok(m.includes('PUBLIC SYNTHETIC'));
 assert.ok(m.includes('OPEN QUESTIONS'));
 assert.ok(!m.includes('100% ready'));
 assert.ok(!m.includes('github.com/arazvera-technologies/arazvera-source-bank-private-44'));
});
test('brief escapes markup and avoids executable HTML',()=>{
 const r=recommendStarters({request:'API webhook testing',level:'all'},catalog);
 const text=buildBuyerBrief({request:'<script>alert(1)</script> webhook',stack:'Python',scope:'unit test'},r);
 assert.ok(!text.includes('<script>'));
});
test('specialist domains identify engineering gaps',()=>{
 assert.equal(classifyNeed('DORA supplier audit reports').family,'supplier');
 assert.equal(classifyNeed('restore disaster recovery snapshot').family,'recovery');
 assert.equal(classifyNeed('n8n and Make retry workflows').family,'workflow');
 assert.equal(classifyNeed('unknown problem').family,null);
});
