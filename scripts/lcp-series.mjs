import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const [base,output]=process.argv.slice(2);
if(!/^https:\/\/[a-f0-9]{8}\.mule-site\.pages\.dev\/?$/.test(base||'')||!output) throw new Error('Usage: node scripts/lcp-series.mjs IMMUTABLE_PAGES_URL OUTPUT_DIRECTORY');
const results={base,measuredAt:new Date().toISOString(),pages:[]};
const median=values=>[...values].sort((a,b)=>a-b)[1];
await mkdir(output,{recursive:true});
for(const [name,path] of [['home','/'],['dossier','/dossier/']]){
  const runs=[];
  for(let run=1;run<=3;run++){
    const directory=`${output}/${name}-${run}`;
    await new Promise((resolve,reject)=>{
      const child=spawn(process.execPath,['scripts/lighthouse.mjs'],{env:{...process.env,QA_URL:new URL(path,base).href,QA_OUTPUT:directory},stdio:['ignore','ignore','inherit']});
      child.on('error',reject);child.on('exit',code=>code===0?resolve():reject(new Error(`Lighthouse exited ${code}`)));
    });
    const result=JSON.parse(await readFile(`${directory}/summary.json`,'utf8'));
    runs.push(result);console.log(`${name} ${run}/3: performance=${result.performance}, accessibility=${result.accessibility}, LCP=${result.lcpMs.toFixed(1)}ms`);
  }
  results.pages.push({name,url:new URL(path,base).href,runs,median:{lcpMs:median(runs.map(r=>r.lcpMs)),performance:median(runs.map(r=>r.performance)),accessibility:median(runs.map(r=>r.accessibility))}});
  await writeFile(`${output}/series.json`,JSON.stringify(results,null,2));
}
console.log(JSON.stringify(results.pages.map(({name,median})=>({name,...median})),null,2));