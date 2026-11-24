import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, 'index.html'), 'utf8');
const code = fs.readFileSync(path.join(here, 'store.mjs'), 'utf8');
const css = fs.readFileSync(path.join(here, 'store.css'), 'utf8');
const originalCatalog = JSON.parse(fs.readFileSync(path.join(here, '../catalog.json'), 'utf8'));
const official = originalCatalog.products.filter(item => item.bank === 'historical-44');

async function session(catalog = originalCatalog) {
  const dom = new JSDOM(html, {
    url: 'https://arazvera-technologies.github.io/buyer-lab/store-demo/',
    runScripts: 'outside-only',
    pretendToBeVisual: true,
  });
  const { window: w } = dom;
  const calls = [];
  w.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  w.HTMLDialogElement.prototype.close = function () { this.open = false; };
  w.fetch = async url => {
    calls.push(url);
    if (url !== '../catalog.json') throw new Error('Unexpected fetch: ' + url);
    return { ok: true, json: async () => catalog };
  };
  const blobs = [];
  w.URL.createObjectURL = blob => { blobs.push(blob); return 'blob:arazvera-local-demo'; };
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { this.dataset.testDownloadClicked = 'yes'; };
  w.eval(code);
  await new Promise(resolve => setTimeout(resolve, 20));
  return { dom, document: w.document, window: w, calls, blobs };
}

function click(document, id) {
  const el = document.getElementById(id);
  assert.ok(el, 'missing control ' + id);
  el.click();
  return el;
}

test('exactly 44 unique official SKU metadata items, with no private release details', () => {
  assert.equal(official.length, 44);
  assert.equal(new Set(official.map(item => item.id)).size, 44);
  assert.ok(official.every(item => item.readiness.includes('not production or sale cleared')));
  for (const text of [html, code, css]) {
    assert.doesNotMatch(text, /av-delivery-l2-|arazvera-source-bank-private-44|RELEASE_MANIFEST_PRIVATE|Trezor|walletAddress|privateKey|BEGIN PRIVATE KEY/i);
  }
  assert.match(html, /NO LIVE PAYMENT/);
  assert.match(html, /NO PRIVATE SOURCE ACCESS/);
  assert.match(html, /name="viewport"/);
});

test('public catalog renders 44 cards; levels and search filter properly', async () => {
  const { document: d, calls, dom } = await session();
  assert.deepEqual(calls, ['../catalog.json']);
  assert.equal(d.getElementById('grid').children.length, 44);
  assert.equal(d.getElementById('count').textContent, '44');
  assert.equal(d.getElementById('checkout').disabled, true);
  const levelCounts = { L2: 25, L3: 8, L4: 6, BUNDLE: 5 };
  for (const [level, count] of Object.entries(levelCounts)) {
    const select = d.getElementById('level');
    select.value = level;
    select.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
    assert.equal(d.getElementById('grid').children.length, count, level);
  }
  const level = d.getElementById('level');
  level.value = 'all';
  level.dispatchEvent(new dom.window.Event('change'));
  const query = d.getElementById('query');
  query.value = 'reconciliation';
  query.dispatchEvent(new dom.window.Event('input'));
  assert.ok(d.getElementById('grid').children.length > 0);
  assert.ok(d.getElementById('grid').children.length < 44);
  query.value = 'absolutely-not-a-sku';
  query.dispatchEvent(new dom.window.Event('input'));
  assert.equal(d.getElementById('grid').children.length, 0);
  dom.window.close();
});

test('cart, consent, simulated checkout and unlocked text demo flow', async () => {
  const { document: d, dom, blobs } = await session();
  const add = d.querySelector('.buy');
  assert.ok(add);
  add.click();
  assert.equal(d.getElementById('cartCount').textContent, '1');
  assert.equal(d.getElementById('checkout').disabled, false);
  click(d, 'openCart');
  assert.equal(d.getElementById('drawer').getAttribute('aria-hidden'), 'false');
  assert.equal(d.getElementById('cartItems').querySelectorAll('.cartLine').length, 1);
  click(d, 'checkout');
  assert.equal(d.getElementById('drawer').getAttribute('aria-hidden'), 'true');
  assert.equal(d.getElementById('pay').open, true);
  assert.equal(d.getElementById('approve').disabled, true);
  click(d, 'agree');
  assert.equal(d.getElementById('approve').disabled, false);
  click(d, 'approve');
  assert.equal(d.getElementById('payForm').hidden, true);
  assert.equal(d.getElementById('success').hidden, false);
  assert.match(d.getElementById('orderId').textContent, /^DEMO-\d+$/);
  assert.equal(d.getElementById('cartCount').textContent, '0');
  click(d, 'getSample');
  assert.equal(blobs.length, 1);
  assert.equal(blobs[0].type, 'text/plain;charset=utf-8');
  assert.equal(d.getElementById('checkout').disabled, true);
  dom.window.close();
});

test('detail modal provides only public proof; malicious titles are rendered as plain text', async () => {
  const hostile = JSON.parse(JSON.stringify(originalCatalog));
  const item = hostile.products.find(p => p.bank === 'historical-44');
  item.title = '<img src=x onerror=alert(1)>';
  const { document: d, dom } = await session(hostile);
  assert.ok(d.querySelector('.item h3').textContent.length > 0);
  assert.equal(d.querySelector('.item img[onerror]'), null);
  const button = Array.from(d.querySelectorAll('.detailLink')).find(n => !!n);
  button.click();
  assert.equal(d.getElementById('detail').open, true);
  assert.ok(d.getElementById('dId').textContent.startsWith('ARAZVERA-'));
  assert.ok(/^https:\/\/(github\.com\/arazvera-technologies\/|arazvera-technologies\.github\.io\/)/.test(d.getElementById('dProof').href));
  click(d, 'hideDetail');
  assert.equal(d.getElementById('detail').open, false);
  dom.window.close();
});

test('unavailable public catalog fails closed without exposing products or enabling checkout', async () => {
  const { document: d, dom } = await session({ products: [] });
  assert.equal(d.getElementById('grid').children.length, 0);
  assert.equal(d.getElementById('checkout').disabled, true);
  assert.match(d.getElementById('message').textContent, /temporarily unavailable/i);
  dom.window.close();
});

test('eight approved artworks appear only on the corresponding SKU cards', async () => {
  const { document: d, dom } = await session();
  const expected = {"ARAZVERA-L2-DOCUMENT-REPORTING-001":"images/document-reporting.jpg","ARAZVERA-L2-NOTIFICATION-OUTBOX-001":"images/notification-outbox.jpg","ARAZVERA-L2-RESILIENT-WEBHOOK-PIPELINE-001":"images/resilient-webhook-pipeline.jpg","ARAZVERA-L2-DATA-RECONCILIATION-LAB-001":"images/data-reconciliation-lab.jpg","ARAZVERA-L2-N8N-WORKFLOW-AUDIT-001":"images/level2-artwork-02.png","ARAZVERA-L2-AI-EVALUATION-001":"images/level2-artwork-02.png","ARAZVERA-L2-API-INTEGRATION-STARTER-001":"images/level2-artwork-02.png","ARAZVERA-L2-BACKEND-HARDENING-001":"images/level2-artwork-02.png"};
  const quadrants = {"ARAZVERA-L2-N8N-WORKFLOW-AUDIT-001":"tl","ARAZVERA-L2-AI-EVALUATION-001":"tr","ARAZVERA-L2-API-INTEGRATION-STARTER-001":"bl","ARAZVERA-L2-BACKEND-HARDENING-001":"br"};
  const cards = [...d.querySelectorAll('.item')];
  assert.equal(cards.length, 44);
  assert.equal(d.querySelectorAll('.productArtwork').length, 8);
  for (const card of cards) {
    const id = card.querySelector('.sku').textContent;
    const artwork = card.querySelector('.productArtwork');
    if (expected[id]) {
      assert.equal(artwork?.getAttribute('src'), expected[id]);
      assert.ok(artwork?.alt);
      if (quadrants[id]) assert.ok(artwork.parentElement.classList.contains('artwork-' + quadrants[id]));
      assert.ok(fs.existsSync(path.join(here, expected[id])));
    } else assert.equal(artwork, null);
  }
  dom.window.close();
});
