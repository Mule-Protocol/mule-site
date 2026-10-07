import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
import sharp from 'sharp';
const [base,out]=process.argv.slice(2);if(!base||!out)throw Error('Usage: node scripts/mascot-captures.mjs URL OUT');await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const report={base,captures:[],texts:{}};
try {
 for(const width of [375,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});await page.goto(base);await page.evaluate(()=>document.fonts.ready);
  await page.locator('.hero').screenshot({path:`${out}/hero-${width}.png`,animations:'disabled'});
  const bounds=await page.locator('#lifecycle').evaluate(el=>({top:el.offsetTop,height:el.offsetHeight}));
  await page.evaluate(y=>scrollTo(0,y),bounds.top);await page.waitForFunction(()=>document.querySelector('#lifecycle').dataset.animated==='true');
  for(const step of [1,4]){
   await page.evaluate(({top,height,step})=>scrollTo(0,top-56+(height-innerHeight+56)*((step-1+.25)/5)),{...bounds,step});
   await page.waitForFunction(step=>document.querySelector('#stage').dataset.step===String(step),step);await page.waitForTimeout(350);
   await page.locator('.lc-pin').screenshot({path:`${out}/cycle-${step}-${width}.png`,animations:'disabled'});
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.locator('#tpl').selectOption('invoice');
  for(const behavior of ['honest','dishonest']){
   await page.locator(behavior==='honest'?'#behHonest':'#behBad').press('Space');await page.locator('#launch').click();await page.waitForFunction(()=>!document.getElementById('patch').hidden);
   await page.locator('#patch').screenshot({path:`${out}/patch-${behavior}-${width}.png`,animations:'disabled'});
  }
  await page.goto(`${base}/dossier/`);await page.evaluate(()=>document.fonts.ready);report.texts[`dossier-${width}`]=await page.locator('body').innerText();await page.screenshot({path:`${out}/dossier-${width}.png`});
  await page.goto(`${base}/m/0042-s-inv-20261007`);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:`${out}/mission-${width}.png`,fullPage:true});
  await page.goto(base);await page.evaluate(()=>document.fonts.ready);report.texts[`home-${width}`]=await page.locator('body').innerText();await page.close();report.captures.push({width,complete:true});console.log(`Captured ${width}`);
 }
 for(const [name,path] of [['mission-og','/m/0042-s-inv-20261007/og.png'],['favicon','/brand/icon-512.png'],['site-card','/images/site.png'],['dossier-card','/images/dossier.png']]){
  const response=await fetch(base+path);if(!response.ok)throw Error(`Fetch ${path}: ${response.status}`);const bytes=Buffer.from(await response.arrayBuffer());await fs.writeFile(`${out}/${name}.png`,bytes);const m=await sharp(bytes).metadata();report.captures.push({name,width:m.width,height:m.height});
 }
} finally {await browser.close();await fs.writeFile(`${out}/captures.json`,JSON.stringify(report,null,2));}