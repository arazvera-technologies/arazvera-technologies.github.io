import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const pilotPages=['buyer-lab/supplier-preflight/pilot/index.html','buyer-lab/battery-data-pilot/index.html'];
test('both paid-pilot pages provide a copyable address and manual email fallback',()=>{
 for(const page of pilotPages){
  const html=fs.readFileSync(path.join(root,page),'utf8');
  assert.match(html,/<button type="button" data-copy-email/,'copy button must exist');
  assert.match(html,/<code>contact\.arazvera@gmail\.com<\/code>/,'show email directly');
  assert.match(html,/aria-live="polite"/,'announce copy success and failure');
  assert.match(html,/href="\/assets\/sales-contact\.css"/);
  assert.match(html,/src="\/assets\/sales-contact\.mjs"/);
  assert.match(html,/mailto:contact\.arazvera@gmail\.com/,'retain existing email clients');
 }
});
test('copy helper writes only public email and returns a success signal',async()=>{
 const {copyPublicEmail,SALES_EMAIL}=await import('../assets/sales-contact.mjs');
 const writes=[];
 assert.equal(SALES_EMAIL,'contact.arazvera@gmail.com');
 assert.equal(await copyPublicEmail({writeText:async v=>{writes.push(v)}}),true);
 assert.deepEqual(writes,['contact.arazvera@gmail.com']);
});
test('copy helper degrades safely without clipboard permission',async()=>{
 const {copyPublicEmail}=await import('../assets/sales-contact.mjs');
 assert.equal(await copyPublicEmail(null),false);
 assert.equal(await copyPublicEmail({writeText:async()=>{throw new Error('blocked')}}),false);
});
