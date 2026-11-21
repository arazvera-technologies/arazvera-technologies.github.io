import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,statSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
test('mobile loads a static brand visualization without starting GPU rendering',()=>{
  const js=read('assets/scene.js'),css=read('assets/styles.css');
  const guard=js.indexOf("window.matchMedia('(max-width: 760px)').matches");
  const renderInit=js.indexOf("canvas.getContext('webgl'");
  assert.ok(guard>=0&&renderInit>guard,'mobile WebGL guard must run before creating its context');
  assert.match(css,/@media\(max-width:760px\)\{#scene\{display:none\}\.visual-fallback\{opacity:\.9\}\}/);
  assert.ok(js.includes("canvas.getContext('webgl'"),'desktop GPU animation remains available');
});
test('brand artwork has mobile sized lossless asset and favicon',()=>{
  const logo=resolve(root,'assets/logo-128.webp'),icon=resolve(root,'assets/favicon-64.png');
  assert.ok(existsSync(logo)&&statSync(logo).size<40000,'small original-logo derivative');
  assert.ok(existsSync(icon)&&statSync(icon).size<15000,'small favicon derivative');
  assert.ok(existsSync(resolve(root,'assets/logo.png')),'original source brand asset retained');
});
test('homepage uses the lightweight original-logo derivative and favicon',()=>{
  const html=read('index.html');
  assert.match(html,/rel="preload"[^>]*href="assets\/logo-128\.webp"/);
  assert.match(html,/src="assets\/logo-128\.webp"/);
  assert.match(html,/rel="icon"[^>]*href="assets\/favicon-64\.png"/);
});
test('Persian homepage and buyer pages retain branding using optimized assets',()=>{
  const fa=read('fa/index.html'),buyer=read('buyer-lab/index.html'),battery=read('buyer-lab/battery-data-pilot/index.html');
  assert.match(fa,/src="\/assets\/logo-128\.webp"/);
  assert.match(buyer,/src="\.\.\/assets\/logo-128\.webp"/);
  assert.match(battery,/rel="icon"[^>]*href="\/assets\/favicon-64\.png"/);
});
