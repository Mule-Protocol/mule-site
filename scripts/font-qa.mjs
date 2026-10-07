import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const [base,out,accentMode]=process.argv.slice(2);
if(!base||!out)throw Error('Usage: node scripts/font-qa.mjs URL OUTPUT_DIRECTORY [require-accents]');
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const report={base,measuredAt:new Date().toISOString(),pages:[],accentTests:[]};
try {
 for(const width of [375,1440])for(const [name,path] of [['home','/'],['dossier','/dossier/'],['legal','/legal/'],['privacy','/privacy/'],['risks','/risks/']]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
  await page.goto(new URL(path,base).href,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  const details=await page.evaluate(()=>{
   const box=r=>({x:r.x,y:r.y,width:r.width,height:r.height});
   const elements=[...document.querySelectorAll('*')].filter(el=>el.getClientRects().length&&el.checkVisibility()&&getComputedStyle(el).fontFamily.includes('Archivo'));
   return {
    elements:elements.map(el=>{
     const css=getComputedStyle(el),walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT),lineBoxes=[];let textNode;
     while((textNode=walker.nextNode()))if(textNode.textContent.trim()){
      const range=document.createRange();range.selectNodeContents(textNode);lineBoxes.push(...[...range.getClientRects()].filter(r=>r.width&&r.height).map(box));
     }
     return {tag:el.tagName,id:el.id,classes:el.getAttribute('class'),text:el.textContent,box:box(el.getBoundingClientRect()),lineCount:new Set(lineBoxes.map(r=>r.y)).size,lineBoxes,fontFamily:css.fontFamily,fontWeight:css.fontWeight,fontSize:css.fontSize,fontStretch:css.getPropertyValue('font-stretch'),lineHeight:css.lineHeight,letterSpacing:css.letterSpacing};
    }),
    text:document.body.innerText,
    scripts:[...document.scripts].map(el=>({src:new URL(el.src||location.href).pathname,type:el.type,async:el.async,defer:el.defer,inline:el.textContent})),
    preloads:[...document.querySelectorAll('link[rel="preload"][as="font"]')].map(el=>new URL(el.href).pathname),
    faces:[...document.styleSheets].flatMap(sheet=>[...sheet.cssRules]).filter(rule=>rule instanceof CSSFontFaceRule&&rule.style.fontFamily.includes('Archivo')).map(rule=>({family:rule.style.fontFamily,src:rule.style.getPropertyValue('src')})),
    overflow:document.documentElement.scrollWidth>innerWidth,
   };
  });
  for(const script of details.scripts)if(script.src){const response=await page.request.get(new URL(script.src,base).href);script.sha256=createHash('sha256').update(await response.body()).digest('hex');}
  assert.deepEqual(errors,[]);assert.equal(details.overflow,false);
  const fontRequests=requests.filter(url=>/archivo.*\.woff2/.test(url));assert.equal(fontRequests.length,1,'Archivo fetched more than once');
  const fontURL=new URL(fontRequests[0]);assert.ok(details.preloads.includes(fontURL.pathname),'Preload differs from fetched font');
  assert.equal(details.faces.length,1);assert.ok(details.faces[0].src.includes(fontURL.pathname.split('/').at(-1)),'Font face differs from preload');
  await page.screenshot({path:`${out}/${name}-${width}.png`});
  report.pages.push({name,width,...details,fontRequests:fontRequests.map(url=>new URL(url).pathname),errors});
  if(name==='home'){
   await page.evaluate(()=>{const probe=document.createElement('div');probe.id='qa-accent-probe';probe.className='display';probe.textContent='MENTIONS LÉGALES · ÉCHÉANCE ÇA ŒUVRE €';document.body.append(probe);});
   await page.evaluate(()=>document.fonts.ready);
   const cdp=await page.context().newCDPSession(page);await cdp.send('DOM.enable');await cdp.send('CSS.enable');
   const {root}=await cdp.send('DOM.getDocument');const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#qa-accent-probe'});
   const {fonts}=await cdp.send('CSS.getPlatformFontsForNode',{nodeId});
   report.accentTests.push({width,text:'MENTIONS LÉGALES · ÉCHÉANCE ÇA ŒUVRE €',fonts});
   if(accentMode==='require-accents'){assert.equal(fonts.length,1);assert.equal(fonts[0].isCustomFont,true);assert.match(fonts[0].familyName,/Archivo/);}
   await page.locator('#qa-accent-probe').screenshot({path:`${out}/accent-probe-${width}.png`});
   await page.evaluate(()=>document.getElementById('qa-accent-probe').remove());await cdp.detach();
  }
  console.log(`${name} ${width}: ${details.elements.length} Archivo elements, one font request`);await page.close();
 }
} finally {await fs.writeFile(`${out}/geometry.json`,JSON.stringify(report,null,2));await browser.close();}