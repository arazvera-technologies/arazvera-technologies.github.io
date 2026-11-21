import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ORIGIN = 'https://arazvera-technologies.github.io';
export const SALES_PAGES = [
  'index.html', 'buyer-lab/index.html',
  'buyer-lab/battery-data-pilot/index.html',
  'buyer-lab/supplier-preflight/index.html',
  'buyer-lab/supplier-preflight/pilot/index.html',
  'buyer-lab/proof-plus/index.html'
];

function walk(root,dir=root,items=[]) {
  for (const e of fs.readdirSync(dir,{withFileTypes:true})) {
    if (['.git','node_modules'].includes(e.name)) continue;
    const f=path.join(dir,e.name);
    if(e.isDirectory()) walk(root,f,items);
    else if(e.isFile()) items.push(path.relative(root,f).replaceAll('\\','/'));
  }
  return items;
}
export function resolveLocalReference(source,reference) {
  if (/^(?:[a-z][\w+.-]*:|\/\/|#|\?)/i.test(reference)) return null;
  const clean=reference.split(/[?#]/,1)[0];
  if(!clean) return null;
  const basedir=source.slice(0,source.lastIndexOf('/')+1);
  const full=path.posix.resolve('/',clean.startsWith('/')?'':basedir,clean).replace(/^\/+/,'');
  if(!full) return 'index.html';
  return clean.endsWith('/') || !path.posix.basename(full).includes('.') ? full.replace(/\/+$/,'')+'/index.html' : full;
}
function hasTag(html,type,key,value) {
  const rx=new RegExp('<'+type+'\\b[^>]*>','gi');
  for(const match of html.matchAll(rx)) {
    const tag=match[0].toLowerCase();
    if(tag.includes((key+'="'+value+'"').toLowerCase()) || tag.includes((key+"='"+value+"'").toLowerCase())) return true;
  }
  return false;
}
export function auditSite(root,{requireSalesMetadata=true}={}) {
  const errors=[],files=walk(root),exists=new Set(files),htmlPages=files.filter(p=>p.endsWith('.html') && !/^google[a-z0-9]+\.html$/i.test(path.posix.basename(p)));
  for(const page of htmlPages) {
    const html=fs.readFileSync(path.join(root,page),'utf8');
    if(!/<title>\s*[^<\s][^<]*<\/title>/i.test(html))errors.push(page+': missing title');
    if(!/<html\b[^>]*\blang\s*=\s*["'][^"']+["']/i.test(html))errors.push(page+': missing html lang');
    for(const match of html.matchAll(/<(?:a|link|script|img|source)\b[^>]*?\b(?:href|src)\s*=\s*["']([^"']+)["']/gi)) {
      if(/^javascript:/i.test(match[1])){errors.push(page+': javascript URL');continue;}
      const target=resolveLocalReference(page,match[1]);
      if(target && !exists.has(target))errors.push(page+': missing target '+match[1]+' -> '+target);
    }
  }
  if(!exists.has('sitemap.xml')) errors.push('missing sitemap.xml');
  else {
    const xml=fs.readFileSync(path.join(root,'sitemap.xml'),'utf8');
    const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
    if(!urls.length)errors.push('empty sitemap');
    if(new Set(urls).size!==urls.length)errors.push('duplicate sitemap URL');
    for(const url of urls){
      if(!url.startsWith(ORIGIN+'/')){errors.push('off-domain sitemap entry '+url);continue;}
      const file=resolveLocalReference('index.html',url.slice(ORIGIN.length));
      if(file && !exists.has(file))errors.push('sitemap missing page '+url);
    }
  }
  if(requireSalesMetadata) {
    for(const page of SALES_PAGES){
      if(!exists.has(page)){errors.push('missing sales page '+page);continue;}
      const html=fs.readFileSync(path.join(root,page),'utf8');
      for(const [type,key,val] of [['meta','name','description'],['link','rel','canonical'],['meta','property','og:title'],['meta','property','og:image'],['meta','name','twitter:card']]){
        if(!hasTag(html,type,key,val))errors.push(page+': missing '+val);
      }
    }
    const fa=fs.readFileSync(path.join(root,'fa/index.html'),'utf8');
    if(!hasTag(fa,'meta','name','description')) errors.push('fa/index.html missing description');
    const home=fs.readFileSync(path.join(root,'index.html'),'utf8');
    const lab=fs.readFileSync(path.join(root,'buyer-lab/index.html'),'utf8');
    if(!home.includes('href="/buyer-lab/supplier-preflight/pilot/"')) errors.push('homepage missing pilot route');
    if(!lab.includes('href="supplier-preflight/pilot/"')) errors.push('buyer lab missing pilot route');
  }
  return {errors,files:files.length,pages:htmlPages.length};
}
if(process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
 const result=auditSite(path.resolve(process.argv[2]||'.'));
 console.log('Public audit: '+result.files+' files, '+result.pages+' HTML pages, '+result.errors.length+' errors');
 for(const e of result.errors)console.error('ERROR '+e);
 if(result.errors.length)process.exitCode=1;
}
