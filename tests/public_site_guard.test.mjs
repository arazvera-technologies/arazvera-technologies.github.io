import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {auditSite,resolveLocalReference,SALES_PAGES} from '../tools/audit_public_site.mjs';

const base={
 'index.html':'<html lang="en"><head><title>Home</title></head><body><a href="/lab/">Lab</a></body></html>',
 'lab/index.html':'<html lang="en"><head><title>Lab</title></head><body><img src="../assets/logo.png"></body></html>',
 'assets/logo.png':'',
 'sitemap.xml':'<urlset><loc>https://arazvera-technologies.github.io/</loc><loc>https://arazvera-technologies.github.io/lab/</loc></urlset>'
};
function fixture(files,t){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'arazvera-public-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 for(const [name,content] of Object.entries(files)){
   const file=path.join(root,name);
   fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,content);
 }
 return root;
}
test('nested and root paths resolve while external links are ignored',()=>{
 assert.equal(resolveLocalReference('buyer-lab/pilot/index.html','../../assets/logo.png'),'assets/logo.png');
 assert.equal(resolveLocalReference('buyer-lab/pilot/index.html','/lab/'),'lab/index.html');
 assert.equal(resolveLocalReference('index.html','/'),'index.html');
 assert.equal(resolveLocalReference('index.html','mailto:hi@example.com'),null);
});
test('valid static fixture passes',t=>assert.deepEqual(auditSite(fixture(base,t),{requireSalesMetadata:false}).errors,[]));
test('broken download is rejected',t=>{
 const files={...base,'index.html':'<html lang="en"><head><title>Home</title></head><body><a href="/missing.pdf">Download</a></body></html>'};
 assert.match(auditSite(fixture(files,t),{requireSalesMetadata:false}).errors.join('\n'),/missing\.pdf/);
});
test('duplicate sitemap entries and missing pages fail',t=>{
 const files={...base,'sitemap.xml':'<urlset><loc>https://arazvera-technologies.github.io/missing/</loc><loc>https://arazvera-technologies.github.io/missing/</loc></urlset>'};
 const errors=auditSite(fixture(files,t),{requireSalesMetadata:false}).errors.join('\n');
 assert.match(errors,/duplicate sitemap URL/);assert.match(errors,/sitemap missing page/);
});
test('actual public checkout has valid links, sitemap and paid-pilot metadata',()=>{
 const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
 for(const p of SALES_PAGES)assert.ok(fs.existsSync(path.join(root,p)),p);
 assert.deepEqual(auditSite(root).errors,[]);
});
