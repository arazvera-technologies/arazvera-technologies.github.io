import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const html = readFileSync(resolve(root, 'buyer-lab/store-demo/index.html'), 'utf8');
const js = readFileSync(resolve(root, 'buyer-lab/store-demo/store.mjs'), 'utf8');
const css = readFileSync(resolve(root, 'buyer-lab/store-demo/store.css'), 'utf8');
const index = readFileSync(resolve(root, 'buyer-lab/index.html'), 'utf8');
const catalog = JSON.parse(readFileSync(resolve(root, 'buyer-lab/catalog.json'), 'utf8'));

test('Storefront references exactly the historical 44 public-only metadata SKUs', () => {
  const historical = catalog.products.filter(p => p.bank === 'historical-44');
  assert.equal(historical.length, 44);
  assert.equal(new Set(historical.map(p => p.id)).size, 44);
  for (const p of historical) {
    assert.match(p.id, /^ARAZVERA-(L2|L3|L4|BUNDLE)-[A-Z0-9-]+$/);
    assert.equal(typeof p.title, 'string');
    assert.equal(typeof p.evidence, 'string');
  }
  assert.match(js, /fetch\(["']\.\.\/catalog\.json["']/);
  assert.match(js, /products\.length\s*!==\s*44/);
});

test('Every sandbox checkout entry point is clearly labeled and contains no real card fields', () => {
  assert.match(html, /INTERACTIVE STORE SANDBOX/);
  assert.match(html, /NO LIVE PAYMENT/);
  assert.match(html, /NO PRIVATE SOURCE ACCESS/);
  assert.match(html, /id="pay"/);
  assert.match(html, /Simulate successful card payment/);
  assert.match(html, /NO CARD FIELDS/);
  assert.match(html, /all prices are fictitious/i);
  assert.doesNotMatch(html, /<input[^>]+(?:name|id)=["'](?:card|cvv|cvc|pan|expiry|expiration)/i);
  assert.doesNotMatch(html, /<iframe\b/i);
});

test('Private delivery archives and seller financial credentials stay entirely out of the public demo', () => {
  const text = html + js + css;
  for (const forbidden of [
    'av-delivery-l2-', 'arazvera-source-bank-private-44',
    'SOURCE_ARAZVERA-', 'PRIVATE_KEY', 'STRIPE_SECRET_KEY',
    'walletconnect', 'payment_intent', '/api/charge'
  ]) assert.equal(text.includes(forbidden), false, 'Forbidden public content: ' + forbidden);
  assert.doesNotMatch(text, /https:\/\/github\.com\/arazvera-technologies\/av-delivery-/);
  assert.doesNotMatch(text, /fetch\(["']https:\/\/(?:api\.)?(?:stripe|paypal|moonpay)/i);
});

test('Simulated checkout uses explicit consent and unlocks ONLY a harmless text demo', () => {
  assert.match(js, /if\s*\(!\$\("agree"\)\.checked\s*\|\|\s*!cart\.size\)\s*return/);
  assert.match(js, /const data=new Blob\(\[lines\.join\("\\n"\)\],\{type:"text\/plain;charset=utf-8"\}\)/);
  assert.match(js, /a\.download="ARAZVERA_DEMO_UNLOCK\.txt"/);
  assert.match(js, /NO SOURCE CODE, LICENSE, OR PURCHASE WAS PROVIDED/);
  assert.match(js, /cart\.clear\(\)/);
  assert.doesNotMatch(js, /\.innerHTML\s*=/);
  assert.doesNotMatch(js, /eval\s*\(/);
});

test('Storefront is linked inside public Buyer Lab without modifying original sales endpoints', () => {
  assert.match(index, /href="store-demo\/"/);
  assert.match(html, /href="\.\.\/"/);
  assert.match(html, /mailto:contact\.arazvera@gmail\.com/);
});
