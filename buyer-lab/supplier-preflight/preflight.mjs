/** Browser-only fictional sample, independent from proprietary ARAZVERA Python source. */
export const EXAMPLES = Object.freeze({
 clean: [{partId:'DEMO-P-101', weightKg:12.5, approved:true},{partId:'DEMO-P-102',weightKg:8,approved:false}],
 problems: [{partId:'DEMO-P-101',weightKg:12},{partId:'DEMO-P-101',weightKg:110},{partId:'DEMO-P-103'},{partId:'DEMO-P-104',weightKg:'unknown'}]
});
const TYPES = {weightKg:'number',partId:'string',approved:'boolean'};
const COUNTS = ['REQUIRED_MISSING','DUPLICATE_IN_BATCH','TYPE_MISMATCH','OUT_OF_RANGE'];
export function inspect(rows,maxIssues=30){
 if(!Array.isArray(rows)||rows.length<1||rows.length>100)throw new Error('Input must be an array of 1 to 100 fictional records.');
 if(!Number.isInteger(maxIssues)||maxIssues<1||maxIssues>100)throw new Error('Invalid issue limit.');
 if(rows.some(r=>r===null||typeof r!=='object'||Array.isArray(r)))throw new Error('Every record must be a JSON object.');
 const seen=new Set();let rejected=0,issuesTotal=0;const findings=[],counts={};
 function mark(row,field,code){counts[code]=(counts[code]||0)+1;issuesTotal++;if(findings.length<maxIssues)findings.push({row,field,code});}
 rows.forEach((record,i)=>{
  let bad=false;const row=i+1;
  for(const field of ['partId','weightKg']){
   const v=record[field];
   if(v===undefined||v===null||(typeof v==='string'&&v.trim()==='')){mark(row,field,'REQUIRED_MISSING');bad=true;continue;}
   if(TYPES[field]==='string'&&typeof v!=='string'||TYPES[field]==='number'&&(typeof v!=='number'||!Number.isFinite(v))){mark(row,field,'TYPE_MISMATCH');bad=true;continue;}
   if(field==='weightKg'&&(v<0||v>100)){mark(row,field,'OUT_OF_RANGE');bad=true;}
   if(field==='partId'&&v.length>128){mark(row,field,'OUT_OF_RANGE');bad=true;}
  }
  const key=record.partId;
  if(typeof key==='string'&&key.trim()){
   const normalized=key.trim();if(seen.has(normalized)){mark(row,'partId','DUPLICATE_IN_BATCH');bad=true;}seen.add(normalized);
  }
  const approval=record.approved;
  if(approval!==undefined&&approval!==null&&typeof approval!=='boolean'){mark(row,'approved','TYPE_MISMATCH');bad=true;}
  if(bad)rejected++;
 });
 return {total:rows.length,accepted:rows.length-rejected,rejected,counts:Object.fromEntries(COUNTS.filter(k=>counts[k]).map(k=>[k,counts[k]])),findings,omitted:issuesTotal-findings.length,scenario:'Fictional browser-only validation; not the private backend',databaseChecked:false};
}