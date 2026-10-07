import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const [before,after,out]=process.argv.slice(2);
const a=JSON.parse(await fs.readFile(`${before}/geometry.json`,'utf8')),b=JSON.parse(await fs.readFile(`${after}/geometry.json`,'utf8'));
assert.equal(a.pages.length,10);assert.equal(b.pages.length,10);
const result={before:a.base,after:b.base,pages:[]};
for(let i=0;i<a.pages.length;i++){
 const x=a.pages[i],y=b.pages[i];assert.equal(x.name,y.name);assert.equal(x.width,y.width);
 assert.deepEqual(y.elements,x.elements,`Archivo geometry or line boxes changed: ${x.name} ${x.width}`);
 assert.equal(y.text,x.text,'Page text changed');assert.deepEqual(y.scripts,x.scripts,'Script bytes or order changed');
 result.pages.push({name:x.name,width:x.width,elements:x.elements.length,identicalGeometry:true,identicalLineBoxesAndCount:true,identicalText:true,identicalScriptBytesAndOrder:true});
}
await fs.writeFile(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result.pages,null,2));