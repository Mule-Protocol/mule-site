import fs from 'node:fs/promises';
import sharp from 'sharp';
import assert from 'node:assert/strict';
const [before,after,out]=process.argv.slice(2);
const a=JSON.parse(await fs.readFile(`${before}/visual.json`,'utf8')), b=JSON.parse(await fs.readFile(`${after}/visual.json`,'utf8'));
const result={before:a.base,after:b.base,pages:[]};
for(let i=0;i<a.pages.length;i++){
  const old=a.pages[i],current=b.pages[i];
  assert.deepEqual(current.titles,old.titles,'Title geometry or typography changed');
  assert.deepEqual(current.text,old.text,'Page copy changed');
  assert.deepEqual(current.scripts,old.scripts,'Scripts or script order changed');
  const images=[];
  for(const name of [`${old.name}-${old.width}`,...old.titles.map((_,index)=>`${old.name}-${old.width}-title-${index}`)]){
    const x=await sharp(`${before}/${name}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const y=await sharp(`${after}/${name}.png`).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.deepEqual(y.info,x.info,'Image dimensions changed');
    let changedPixels=0,visiblePixels=0,maxDelta=0;
    for(let n=0;n<x.data.length;n+=4){const delta=Math.max(...[0,1,2,3].map(c=>Math.abs(x.data[n+c]-y.data[n+c])));if(delta>0)changedPixels++;if(delta>16)visiblePixels++;maxDelta=Math.max(maxDelta,delta);}
    images.push({name,changedPixels,visiblePixels,maxDelta,pixels:x.info.width*x.info.height});
  }
  result.pages.push({name:old.name,width:old.width,identicalTitleGeometry:true,identicalText:true,identicalScriptsAndOrder:true,images});
}
await fs.writeFile(out,JSON.stringify(result,null,2));
console.log(JSON.stringify(result.pages.map(p=>({name:p.name,width:p.width,changed:p.images.filter(i=>i.changedPixels)})),null,2));