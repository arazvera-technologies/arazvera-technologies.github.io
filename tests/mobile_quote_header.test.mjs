import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'assets/styles.css'),'utf8');
test('English mobile header keeps a short accessible written quote link',()=>{
 assert.match(html,/<a class="nav-contact" href="\/buyer-lab\/supplier-preflight\/pilot\/" aria-label="Request a written quote">/);
 assert.match(html,/<span class="quote-long">Request a quote<\/span>/);
 assert.match(html,/<span class="quote-short" aria-hidden="true">Quote<\/span>/);
 assert.match(css,/\.nav-contact \.quote-short\{display:none/);
 assert.match(css,/@media\(max-width:760px\)\{html\[lang="en"\] \.nav-contact \.quote-long\{display:none\}/);
 assert.match(css,/html\[lang="en"\] \.nav-contact \.quote-short\{display:inline/);
});
