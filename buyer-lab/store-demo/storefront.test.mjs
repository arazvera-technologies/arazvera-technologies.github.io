import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const here=path.dirname(fileURLToPath(import.meta.url));
const html=fs.readFileSync(path.join(here,'index.html'),'utf8');
const code=fs.readFileSync(path.join(here,'store.mjs'),'utf8');
const css=fs.readFileSync(path.join(here,'store.css'),'utf8');
const catalog=JSON.parse(fs.readFileSync(path.join(here,'../catalog.json'),'utf8'));
const official=catalog.products.filter(p=>p.bank==='historical-44');

async function session(data=catalog){
 const dom=new JSDOM(html,{url:'https://arazvera-technologies.github.io/buyer-lab/store-demo/',runScripts:'outside-only',pretendToBeVisual:true});
 const w=dom.window,calls=[];
 w.HTMLDialogElement.prototype.showModal=function(){this.open=true};
 w.HTMLDialogElement.prototype.close=function(){this.open=false};
 w.fetch=async url=>{calls.push(url);if(url!=='../catalog.json')throw new Error('Unexpected fetch: '+url);return{ok:true,json:async()=>data}};
 w.eval(code);
 await new Promise(resolve=>setTimeout(resolve,20));
 return{dom,document:w.document,calls};
}
function click(d,id){const el=d.getElementById(id);assert.ok(el,'missing control '+id);el.click();return el}

test('44 unique public metadata items remain separate from sale-cleared products',()=>{
 assert.equal(official.length,44);
 assert.equal(new Set(official.map(p=>p.id)).size,44);
 assert.ok(official.every(p=>p.readiness.includes('not production or sale cleared')));
 for(const text of [html,code,css])assert.doesNotMatch(text,/av-delivery-l2-|arazvera-source-bank-private-44|RELEASE_MANIFEST_PRIVATE|Trezor|walletAddress|privateKey|BEGIN PRIVATE KEY/i);
 assert.match(html,/NO ONLINE CHECKOUT/);
 assert.match(html,/name="robots" content="index,follow/);
 assert.doesNotMatch(html,/customer-preview|Simulate demo purchase|id="pay"/i);
});

test('catalogue renders 44 cards and filters by level and search',async()=>{
 const{document:d,calls,dom}=await session();
 assert.deepEqual(calls,['../catalog.json']);
 assert.equal(d.getElementById('grid').children.length,44);
 assert.equal(d.getElementById('count').textContent,'44');
 const counts={L2:25,L3:8,L4:6,BUNDLE:5};
 for(const[level,count]of Object.entries(counts)){const s=d.getElementById('level');s.value=level;s.dispatchEvent(new dom.window.Event('change'));assert.equal(d.getElementById('grid').children.length,count)}
 const s=d.getElementById('level');s.value='all';s.dispatchEvent(new dom.window.Event('change'));
 const q=d.getElementById('query');q.value='reconciliation';q.dispatchEvent(new dom.window.Event('input'));assert.ok(d.getElementById('grid').children.length>0&&d.getElementById('grid').children.length<44);
 q.value='not-a-real-sku';q.dispatchEvent(new dom.window.Event('input'));assert.equal(d.getElementById('grid').children.length,0);
 dom.window.close();
});

test('quote list selects products and opens a product-specific email enquiry',async()=>{
 const{document:d,dom}=await session();
 d.querySelector('.buy').click();assert.equal(d.getElementById('cartCount').textContent,'1');
 click(d,'openCart');assert.equal(d.getElementById('drawer').getAttribute('aria-hidden'),'false');
 assert.equal(d.querySelectorAll('#cartItems .cartLine').length,1);
 const link=d.querySelector('#cartItems .quoteLink');assert.ok(link);
 assert.match(link.getAttribute('href'),/^mailto:contact\.arazvera@gmail\.com/);
 const sku=d.querySelector('#cartItems .cartLine small').textContent.split(' · ')[1];
 assert.ok(decodeURIComponent(link.getAttribute('href')).includes(sku));
 d.querySelector('#cartItems .remove').click();assert.equal(d.getElementById('cartCount').textContent,'0');
 d.querySelector('.buy').click();d.querySelector('.item:nth-child(2) .buy').click();assert.equal(d.getElementById('cartCount').textContent,'2');
 click(d,'clear');assert.equal(d.getElementById('cartCount').textContent,'0');
 assert.equal(d.getElementById('pay'),null);
 dom.window.close();
});

test('detail modal uses safe text and includes a written quote link',async()=>{
 const hostile=JSON.parse(JSON.stringify(catalog)),product=hostile.products.find(p=>p.bank==='historical-44');
 const id=product.id;product.title='<img src=x onerror=alert(1)>';
 const{document:d,dom}=await session(hostile);
 assert.equal(d.querySelector('.item img[onerror]'),null);
 d.querySelector('.item button.detailLink').click();
 assert.equal(d.getElementById('detail').open,true);
 assert.equal(d.getElementById('dTitle').textContent,product.title);
 assert.equal(d.getElementById('dId').textContent,id);
 assert.ok(/^https:\/\//.test(d.getElementById('dProof').href));
 assert.ok(decodeURIComponent(d.getElementById('dQuote').href).includes(id));
 click(d,'hideDetail');assert.equal(d.getElementById('detail').open,false);
 dom.window.close();
});

test('unavailable catalogue fails closed',async()=>{
 const{document:d,dom}=await session({products:[]});
 assert.equal(d.getElementById('grid').children.length,0);
 assert.equal(d.getElementById('count').textContent,'0');
 assert.match(d.getElementById('message').textContent,/temporarily unavailable/i);
 assert.equal(d.getElementById('pay'),null);
 dom.window.close();
});

test('all 44 product artworks remain present and local',async()=>{
 const{document:d,dom}=await session();
 const images=[...d.querySelectorAll('.productArtwork')];
 assert.equal(images.length,44);
 for(const img of images){assert.ok(img.alt);assert.ok(img.getAttribute('src').startsWith('images/'));assert.ok(fs.existsSync(path.join(here,img.getAttribute('src'))))}
 dom.window.close();
});
