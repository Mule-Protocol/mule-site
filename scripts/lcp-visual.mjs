import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
const [base,out]=process.argv.slice(2);
if(!base||!out)throw Error('Usage: node scripts/lcp-visual.mjs URL OUTPUT_DIRECTORY');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const report={base,measuredAt:new Date().toISOString(),pages:[]};
try {
  for(const width of [375,1440])for(const [name,path] of [['home','/'],['dossier','/dossier/']]){
    const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.goto(new URL(path,base).href,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:`${out}/${name}-${width}.png`});
    const details=await page.evaluate(()=>{
      const elements=[...document.querySelectorAll('h1,h2,h3')].filter(el=>el.getClientRects().length>0&&getComputedStyle(el).fontFamily.includes('Archivo'));
      return {
        titleText:elements.map(el=>el.textContent),
        titles:elements.map(el=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return {text:el.textContent,x:r.x,y:r.y,width:r.width,height:r.height,fontFamily:s.fontFamily,fontSize:s.fontSize,fontWeight:s.fontWeight,fontStretch:s.getPropertyValue('font-stretch'),lineHeight:s.lineHeight,letterSpacing:s.letterSpacing};}),
        text:document.body.innerText,
        scripts:[...document.scripts].map(el=>({src:new URL(el.src||location.href).pathname,type:el.type,inline:el.textContent.trim().length>0})),
        stylesheets:[...document.querySelectorAll('link[rel="stylesheet"]')].map(el=>new URL(el.href).pathname),
        fontPreloads:[...document.querySelectorAll('link[rel="preload"][as="font"]')].map(el=>new URL(el.href).pathname),
        inlineStyles:document.querySelectorAll('[style],style').length,
        overflow:document.documentElement.scrollWidth>innerWidth,
        loadedFonts:[...document.fonts].filter(font=>font.status==='loaded').map(font=>({family:font.family,weight:font.weight,stretch:font.stretch})),
      };
    });
    const headings=page.locator('h1,h2,h3');let title=0;
    for(const heading of await headings.all())if(await heading.isVisible()&&(await heading.evaluate(el=>getComputedStyle(el).fontFamily)).includes('Archivo')){await heading.screenshot({path:`${out}/${name}-${width}-title-${title++}.png`});}
    assert.equal(details.overflow,false);assert.deepEqual(errors,[]);
    report.pages.push({name,width,...details,errors});await page.close();
    console.log(`Captured ${name} ${width}: ${title} Archivo titles`);
  }
} finally {await fs.writeFile(`${out}/visual.json`,JSON.stringify(report,null,2));await browser.close();}