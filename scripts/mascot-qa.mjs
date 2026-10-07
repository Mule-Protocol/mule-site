import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import assert from 'node:assert/strict';
const [base='http://127.0.0.1:8788',out='artifacts/mascot/integration']=process.argv.slice(2);
await fs.mkdir(out,{recursive:true});const browser=await chromium.launch({headless:true});const result={base,poses:[],pages:[],bounds:[],animations:[]};
try{
 const css=await fs.readFile('src/assets/mascot/poses.css','utf8');
 const p=await browser.newPage({viewport:{width:600,height:480},deviceScaleFactor:1});
 for(const pose of ['neutral','walk','load','locked','scan','refuse','delivered','idle']){
  const images=[];
  for(const folder of ['reference/mascot','src/assets/mascot']){
   const svg=(await fs.readFile(`${folder}/unit-m1-pose-${pose}.svg`,'utf8')).replace('width="300" height="240"','width="600" height="480"');
   await p.setContent(`<style>body{margin:0}${folder.startsWith('src')?css:''}</style>${svg}`);
   images.push(await p.screenshot());
  }
  const a=await sharp(images[0]).raw().toBuffer(),b=await sharp(images[1]).raw().toBuffer();let differentChannels=0;for(let i=0;i<a.length;i++)if(a[i]!==b[i])differentChannels++;
  await fs.writeFile(`${out}/pose-${pose}.png`,images[1]);result.poses.push({pose,differentChannels});assert.equal(differentChannels,0,`${pose}: exact rendering of the approved geometry`);
 }
 await p.close();
 for(const width of [360,375,768,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  for(const path of ['/','/dossier/','/legal/','/privacy/','/risks/','/m/0042-s-inv-20261007','/m/0042-r-adr-20261007']){
   const response=await page.goto(base+path);const html=await response.text();assert.doesNotMatch(html,/<style\b|\sstyle=|<script(?![^>]*\bsrc=)[^>]*>/);await page.evaluate(()=>document.fonts.ready);
   const facts=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,inline:document.querySelectorAll('.m1-art [style],style,script:not([src])').length,duplicateIDs:[...document.querySelectorAll('[id]')].map(el=>el.id).filter((id,i,a)=>a.indexOf(id)!==i)}));
   result.pages.push({width,path,...facts});assert.equal(facts.overflow,false);assert.equal(facts.inline,0);assert.deepEqual(facts.duplicateIDs,[]);
  }
  await page.goto(base);await page.waitForFunction(()=>document.documentElement.classList.contains('motion-ready'));
  const animations=await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').map(a=>({name:a.animationName,easing:a.effect.getTiming().easing,keyframeEasings:[...new Set(a.effect.getKeyframes().map(k=>k.easing))]})));
  for(const a of animations)assert.ok(a.easing.startsWith('steps(')||a.easing==='step-start'||a.easing==='step-end'||a.keyframeEasings.every(v=>v.startsWith('steps(')),JSON.stringify(a));
  result.animations.push({width,animations});
  const bounds=await page.locator('#lifecycle').evaluate(el=>({top:el.offsetTop,height:el.offsetHeight}));
  for(let step=1;step<=5;step++){
   await page.evaluate(({top,height,step})=>scrollTo(0,top-56+(height-innerHeight+56)*((step-1+.25)/5)),{...bounds,step});await page.waitForFunction(step=>document.querySelector('#stage').dataset.step===String(step),step);await page.waitForTimeout(700);
   for(let phase=0;phase<4;phase++){
    const g=await page.evaluate(step=>{const frame=document.querySelector('#stage').getBoundingClientRect(),art=document.querySelector(`#stage .m1-scene-${step}`).getBoundingClientRect();return {left:art.left-frame.left,right:frame.right-art.right,top:art.top-frame.top,bottom:frame.bottom-art.bottom};},step);
    result.bounds.push({width,step,phase,...g});assert.ok(Object.values(g).every(v=>v>=-1),`cropped mascot ${JSON.stringify(result.bounds.at(-1))}`);await page.waitForTimeout(230);
   }
  }
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.evaluate(()=>document.getAnimations().filter(a=>a.playState==='running').length),0);await page.close();
 }
}finally{await browser.close();await fs.writeFile(`${out}/integration.json`,JSON.stringify(result,null,2));}
console.log('PASS: eight pixel-identical poses, page CSP/overflow/IDs, stepped animations and all lifecycle bounds.');
