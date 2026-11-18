import {writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname,join} from 'node:path';
import {EXAMPLES,runAnalysis} from '../buyer-lab/engine.mjs';
const folder=join(dirname(fileURLToPath(import.meta.url)),'..','buyer-lab','sample-outputs');
mkdirSync(folder,{recursive:true});
let count=0;
for(const [demo,cases] of Object.entries(EXAMPLES)){
 for(const [kind,input] of Object.entries(cases)){
  const payload={demo,fixture:kind,generated:'2026-11-18',evidenceClass:'browser-side synthetic illustration (not proprietary production software)',input,result:runAnalysis(demo,input)};
  writeFileSync(join(folder,demo+'_'+kind+'.json'),JSON.stringify(payload,null,2)+'\n','utf8');count++;
 }
}
if(count!==14)throw Error('Expected 14 sample results');
console.log('WROTE_SAMPLES',count);
