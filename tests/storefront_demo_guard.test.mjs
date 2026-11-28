import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve,dirname} from 'node:path';

const here=dirname(fileURLToPath(import.meta.url)),root=resolve(here,'..');
const read=p=>readFileSync(resolve(root,p),'utf8');
const html=read('buyer-lab/store-demo/index.html');
const js=read('buyer-lab/store-demo/store.mjs');
const css=read('buyer-lab/store-demo/store.css');
const buyer=read('buyer-lab/index.html');
const home=read('index.html');
const freelance=read('buyer-lab/freelance.html');
const sitemap=read('sitemap.xml');
const catalog=JSON.parse(read('buyer-lab/catalog.json'));

test('44 public catalogue records are unique and not represented as production-cleared',()=>{
 const rows=catalog.products.filter(p=>p.bank==='historical-44');
 assert.equal(rows.length,44);assert.equal(new Set(rows.map(p=>p.id)).size,44);
 assert.ok(rows.every(p=>/not production or sale cleared/.test(p.readiness)));
 assert.match(js,/fetch\(["']\.\.\/catalog\.json["']/);
 assert.match(js,/products\.length\s*!==\s*44/);
});

test('public catalogue is indexable, canonical and quote-led',()=>{
 assert.match(html,/name="robots" content="index,follow/);
 assert.match(html,/rel="canonical"/);
 assert.match(html,/PUBLIC ENGINEERING CATALOGUE/);
 assert.match(html,/NO ONLINE CHECKOUT/);
 assert.match(html,/Request written quote/);
 assert.match(html,/Final USD pricing is provided after scope review/);
 assert.match(html,/Do not send funds before receiving and accepting a written proposal/);
 assert.doesNotMatch(html,/noindex|customer-preview|Simulate demo purchase|id="pay"/i);
 assert.doesNotMatch(html,/<input[^>]+(?:name|id)=["'](?:card|cvv|cvc|pan|expiry|expiration)/i);
 assert.doesNotMatch(html,/<iframe\b/i);
 assert.match(html,/href="\.\.\/supplier-preflight\/pilot\//);
});

test('quote list only prepares an email enquiry and cannot create an order or payment',()=>{
 assert.match(js,/mailto:contact\.arazvera@gmail\.com/);
 assert.match(js,/Request a quote for selected items/);
 assert.match(js,/not an order or payment/);
 assert.match(html,/id="openCart"/);assert.match(html,/id="cartItems"/);
 assert.doesNotMatch(js,/startCheckout|cryptoInvoice|cart-invoice|payment_intent|api\/charge/i);
 assert.doesNotMatch(js,/\.innerHTML\s*=|eval\s*\(/);
});

test('private source and seller credentials stay out of public catalogue',()=>{
 const text=html+js+css;
 for(const forbidden of ['av-delivery-l2-','arazvera-source-bank-private-44','SOURCE_ARAZVERA-','PRIVATE_KEY','STRIPE_SECRET_KEY','walletconnect','payment_intent','/api/charge'])assert.equal(text.includes(forbidden),false,'Forbidden: '+forbidden);
 assert.doesNotMatch(text,/https:\/\/github\.com\/arazvera-technologies\/av-delivery-/);
});

test('public home and freelance pages do not promote test customer accounts',()=>{
 assert.doesNotMatch(home+html+freelance,/customer-preview/i);
 assert.match(buyer,/Engineering catalogue &amp; quotes/);
 assert.match(buyer,/supplier-preflight\/pilot/);
 assert.match(freelance,/No customer account is required to enquire/);
 assert.match(sitemap,/buyer-lab\/store-demo\//);
 assert.match(sitemap,/buyer-lab\/freelance\.html/);
});
