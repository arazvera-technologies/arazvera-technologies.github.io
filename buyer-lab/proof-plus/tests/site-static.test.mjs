import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const js=readFileSync(new URL('../app.mjs',import.meta.url),'utf8');
const engine=readFileSync(new URL('../proof-engine.mjs',import.meta.url),'utf8');
test('Site uses local JavaScript and CSS with no third-party runtime CDN',()=>{
 assert.match(html,/<script type="module" src="app.mjs"><\/script>/);
 assert.match(html,/<link rel="stylesheet" href="styles.css">/);
 assert.doesNotMatch(html,/<script[^>]+src="https?:\/\//);
});
test('Site IDs used by the application exist and are unique',()=>{
 const ids=[...html.matchAll(/\sid="([a-z0-9-]+)"/g)].map(x=>x[1]);
 assert.equal(new Set(ids).size,ids.length);
 for(const id of ['tabs','fixture','run','safe-button','risk-button','download','status','metrics','trace','scope','byte-count','scenario-help']) assert.ok(ids.includes(id),id);
});
test('Site provides clear simulation and qualification language',()=>{
 for(const phrase of ['synthetic','not customer','not production','no account','No secret infrastructure']) assert.ok(html.toLowerCase().includes(phrase.toLowerCase()),phrase);
});
test('Site exports fictional scenario evidence with explicit scope',()=>{
 assert.match(js,/new Blob/);assert.match(js,/fictional_proof\.json/);assert.match(js,/result,generatedAt/);
});
test('Site writes untrusted fixture fields through textContent, not innerHTML',()=>{
 assert.match(js,/textContent=String\(content\)/);
 assert.doesNotMatch(js,/innerHTML/);
});
test('Site never makes HTTP calls to a backend',()=>{
 assert.doesNotMatch(js+engine,/\bfetch\(/);
 assert.doesNotMatch(js+engine,/\bXMLHttpRequest\b/);
});
test('Site has a one-click safe-vs-risk compare action and evidence export',()=>{
 assert.match(html,/id="compare"/);
 assert.match(html,/id="comparison"/);
 assert.match(html,/id="download-comparison"/);
 assert.match(js,/compareScenario\(active\)/);
 assert.match(js,/comparison_fictional_proof\.json/);
});
test('Comparison UI outputs only safe text nodes',()=>{
 assert.doesNotMatch(js,/innerHTML/);
 assert.match(js,/compareScenario/);
});
test('Compare button does not render with default unreadable browser background',()=>{
 const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 assert.match(css,/\.paired-actions\s+\.secondary\s*\{[^}]*background\s*:\s*transparent/s);
});
test('Header uses company wordmark without invented logo stand-in',()=>{
 assert.doesNotMatch(html,/<span class="monogram"[^>]*>A<\/span>/);
 assert.match(html,/>ARAZVERA\s*<small>TECHNOLOGIES<\/small>/);
});


test('Brand artwork is the user-approved existing image, visible with a truthful alt and never replaces the interactive lab',()=>{
 const logo=readFileSync(new URL('../assets/arazvera_approved_gold_brand.png',import.meta.url));
 assert.ok(logo.length>500000,'Brand source image must exist in packaged site');
 assert.match(html,/<img[^>]+src="assets\/arazvera_approved_gold_brand\.png"[^>]+alt="ARAZVERA TECHNOLOGIES gold circuit-tree emblem and wordmark"/);
 assert.match(html,/<section[^>]*class="hero"/);
 assert.match(html,/id="lab"/);
 const css=readFileSync(new URL('../styles.css',import.meta.url),'utf8');
 assert.match(css,/\.approved-brand-art\s*\{/);
});


test('Approved company brand is also the social share preview without changing the existing site identity',()=>{
 assert.match(html,/<meta property="og:image" content="https:\/\/arazvera-technologies\.github\.io\/buyer-lab\/proof-plus\/assets\/arazvera_approved_gold_brand\.png">/);
 assert.match(html,/<meta property="og:title" content="ARAZVERA TECHNOLOGIES \| Engineering Proof Plus">/);
});


test('Proof Plus declares the existing company favicon to avoid broken default favicon lookups',()=>{
 assert.match(html,/<link rel="icon" type="image\/png" href="\.\.\/\.\.\/assets\/logo\.png">/);
});


test('Commercial handoff separates bespoke freelance projects from adapting a tested starter',()=>{
 assert.match(html,/Freelance engineering for new projects/);
 assert.match(html,/Customize an existing tested starter/);
 assert.match(html,/Buyer-specific API and data integrations/);
 assert.match(html,/New builds, bug fixes and regression tests/);
});
test('Product adaptation offer retains the verified rights and contracting caveats',()=>{
 assert.match(html,/44 source-backed lab packages/);
 assert.match(html,/No pre-approved resale rights for private source/);
 assert.match(html,/buyer acceptance and lawful contracting/);
 assert.match(html,/mailto:contact\.arazvera@gmail\.com\?subject=Written%20engineering%20pilot%20request/);
});
