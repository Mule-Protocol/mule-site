import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';

const base=(process.env.QA_BASE_URL||'http://127.0.0.1:4321').replace(/\/$/,'');
const out=process.env.QA_OUTPUT||'artifacts/pass-2-corrections/browser';
await fs.mkdir(out,{recursive:true});
const report={base,measuredAt:new Date().toISOString(),arrivals:[],patches:[],errors:[]};
const browser=await chromium.launch({headless:true});
async function settled(page){await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(350);}
async function geometry(page){return page.evaluate(()=>{
  const rect=s=>document.querySelector(s).getBoundingClientRect();
  const rail=rect('#lcRail'),pin=rect('.lc-pin'),label=rect('#console .sec-label');
  return {scrollY,railBottom:rail.bottom,pinBottom:pin.bottom,consoleLabelTop:label.top,gap:label.top-rail.bottom,overlap:Math.max(0,pin.bottom-label.top),overflow:document.documentElement.scrollWidth>innerWidth,step:document.querySelector('#stage').dataset.step};
});}
try {
  for(const [width,height] of [[360,740],[375,812],[768,960],[1440,960]]){
    const page=await browser.newPage({viewport:{width,height}});
    page.on('pageerror',e=>report.errors.push(e.message));
    await page.goto(base);await page.waitForFunction(()=>document.documentElement.classList.contains('motion-ready'));await settled(page);
    await page.getByRole('link',{name:'Run a mission →',exact:true}).click();await settled(page);
    const hero=await geometry(page);assert.equal(hero.overlap,0,`Hero arrival ${width}: ${JSON.stringify(hero)}`);assert.equal(hero.overflow,false);
    if(width<768){assert.ok(hero.gap>=0&&hero.gap<=80,`Mobile gap: ${hero.gap}`);await page.screenshot({path:`${out}/console-hero-${width}.png`});}
    let menu=null;
    if(width<768){
      await page.goto(base);await settled(page);await page.getByRole('button',{name:'Open navigation menu'}).click();await page.getByRole('link',{name:'Protocol →',exact:true}).click();await settled(page);
      menu=await geometry(page);assert.equal(menu.overlap,0);assert.ok(menu.gap<=80);await page.screenshot({path:`${out}/console-menu-${width}.png`});
    }
    // Sweep in 8px increments through the sticky release and console entry, not just the anchor endpoint.
    await page.goto(base);await settled(page);
    const start=await page.locator('#lifecycle').evaluate(el=>el.offsetTop+el.offsetHeight-innerHeight-100);
    let samples=0,captured=false,maxOverlap=0;
    for(let y=start;y<start+height+150;y+=8){
      await page.evaluate(y=>scrollTo(0,y),y);await page.evaluate(()=>new Promise(requestAnimationFrame));
      const g=await geometry(page);maxOverlap=Math.max(maxOverlap,g.overlap);assert.equal(g.overlap,0,`Continuous ${width}: ${JSON.stringify(g)}`);samples++;
      if(width<768&&!captured&&g.consoleLabelTop<height-105){await page.waitForFunction(()=>document.querySelector('#console [data-flip]').textContent==='04');await page.screenshot({path:`${out}/console-scroll-${width}.png`});captured=true;}
    }
    report.arrivals.push({width,height,hero,menu,continuous:{samples,maxOverlap}});
    await page.close();console.log(`Arrivals PASS ${width}x${height}`);
  }
  const context=await browser.newContext({viewport:{width:375,height:812},reducedMotion:'reduce',acceptDownloads:true,timezoneId:'Europe/Paris'});
  // Observe actual canvas glyph bounds with its loaded fonts; no production test hooks.
  await context.addInitScript(()=>{
    window.patchText=[];
    const original=CanvasRenderingContext2D.prototype.fillText;
    const clear=CanvasRenderingContext2D.prototype.clearRect;
    CanvasRenderingContext2D.prototype.clearRect=function(...args){if(this.canvas.id==='patchCanvas')window.patchText=[];return clear.apply(this,args);};
    CanvasRenderingContext2D.prototype.fillText=function(text,x,y,...args){
      if(this.canvas.id==='patchCanvas'){
        const m=this.measureText(text);
        window.patchText.push({text,font:this.font,left:x-m.actualBoundingBoxLeft,right:x+m.actualBoundingBoxRight,top:y-m.actualBoundingBoxAscent,bottom:y+m.actualBoundingBoxDescent});
      }
      return original.call(this,text,x,y,...args);
    };
  });
  const page=await context.newPage();page.on('pageerror',e=>report.errors.push(e.message));await page.goto(base);
  await page.waitForFunction(()=>!document.getElementById('missionControls').disabled);await settled(page);
  const hex=[[100,22],[178,66],[178,154],[100,198],[22,154],[22,66]];
  for(const template of ['invoice','contract','address'])for(const behavior of ['honest','dishonest']){
    await page.locator('#tpl').selectOption(template);await page.locator(`#${behavior==='honest'?'behHonest':'behBad'}`).press('Space');await page.locator('#launch').press('Enter');await page.waitForFunction(()=>!document.getElementById('patch').hidden);
    const text=await page.evaluate(()=>window.patchText);
    const margins=text.map(box=>({text:box.text,...box,margin:Math.min(...hex.flatMap(([ax,ay],i)=>{
      const [bx,by]=hex[(i+1)%6];const dx=bx-ax,dy=by-ay;
      return [[box.left,box.top],[box.right,box.top],[box.right,box.bottom],[box.left,box.bottom]].map(([x,y])=>(dx*(y-ay)-dy*(x-ax))/Math.hypot(dx,dy)-.75);
    }))}));
    const downloadPromise=page.waitForEvent('download');await page.locator('#downloadPatch').press('Enter');const download=await downloadPromise;
    const file=`patch-${template}-${behavior}.png`;await download.saveAs(`${out}/${file}`);
    const meta=await sharp(`${out}/${file}`).metadata();assert.equal(meta.width,600);assert.equal(meta.height,660);assert.equal(margins.length,5);
    report.patches.push({template,behavior,file,width:meta.width,height:meta.height,margins});
    for(const row of margins)assert.ok(row.margin>=6,`${template}/${behavior} ${row.text}: ${row.margin.toFixed(2)} units clearance`);
  }
  await page.goto(`${base}/dossier/`);assert.equal(await page.locator('.d-bar').count(),0);assert.match(await page.locator('.d-specs').innerText(),/STATUS\s+DRAFT/);
  await page.screenshot({path:`${out}/dossier-header-375.png`});
  await context.close();assert.deepEqual(report.errors,[]);
} finally {await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report,null,2));
