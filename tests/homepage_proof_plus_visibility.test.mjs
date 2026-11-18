import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,resolve} from 'node:path';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const html=readFileSync(resolve(root,'index.html'),'utf8');
test('Company home proof area offers a direct path to the already-published Proof Plus lab',()=>{
  assert.match(html,/<section id="proof"[^>]*>[\s\S]*?href="\/buyer-lab\/proof-plus\/"[\s\S]*?<\/section>/);
  assert.match(html,/Interactive Engineering Proof Plus/);
  assert.ok(existsSync(resolve(root,'buyer-lab','proof-plus','index.html')));
});
test('Original company links and brand logo stay present when Proof Plus is surfaced',()=>{
  assert.match(html,/href="\/lab\/"/);
  assert.match(html,/src="assets\/logo\.png"/);
  assert.match(html,/href="\/verification\/"/);
  assert.match(html,/https:\/\/arazvera-technologies\.github\.io\/arazvera-workflow-studio\//);
});
