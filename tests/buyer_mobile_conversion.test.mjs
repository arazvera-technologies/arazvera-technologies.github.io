import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'buyer-lab/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'buyer-lab/styles.css'),'utf8');

test('mobile header prioritizes paid pilot while preserving GitHub proof',()=>{
  const nav=html.match(/<nav aria-label="Primary">([\s\S]*?)<\/nav>/)?.[1];
  assert.ok(nav,'Buyer Lab has a primary navigation element');
  const links=[...nav.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/g)];
  assert.ok(links.some(m=>m[1].includes('arazvera-engineering-portfolio')),'GitHub portfolio retained');
  assert.equal(links.at(-1)?.[1],'supplier-preflight/pilot/','mobile-visible final link should lead to paid pilot');
  assert.match(links.at(-1)?.[2],/paid pilot|quote/i);
  assert.match(css,/@media\(max-width:650px\)\{[^}]*\}/);
  assert.match(css,/nav a:last-child\{[^}]*display:inline-flex[^}]*min-height:44px/);
  assert.ok(fs.existsSync(path.join(root,'buyer-lab/supplier-preflight/pilot/index.html')));
});
