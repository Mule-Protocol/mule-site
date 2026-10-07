import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:8788';
const out=process.env.QA_OUTPUT||'artifacts/pass-2/browser';await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});const report={base,measuredAt:new Date().toISOString(),widths:[],errors:[],checks:[]};
const source=await fs.readFile('reference/mule-dossier.html','utf8');
async function overflow(page){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`Overflow: ${page.url()}`);}
try{
  for(const width of [360,375,768,1440]){
    const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce',acceptDownloads:true});const page=await context.newPage();
    page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error' && !m.text().includes('404'))report.errors.push(m.text());});
    await page.goto(base);await page.locator('#missionControls').waitFor();await page.waitForFunction(()=>!document.getElementById('missionControls').disabled);await overflow(page);
    assert.equal(await page.locator('#motionToggle').getAttribute('aria-pressed'),'true');
    let count=0;
    for(const template of ['invoice','contract','address'])for(const behavior of ['honest','dishonest']){
      await page.locator('#tpl').selectOption(template);await page.locator(`#${behavior==='honest'?'behHonest':'behBad'}`).press('Space');
      await page.locator('#launch').click();await page.waitForFunction(()=>!document.getElementById('patch').hidden);count++;
      assert.equal(await page.locator('#log li').count(),5);assert.equal(await page.locator('#stamp').textContent(),behavior==='honest'?'SETTLED ✓':'RETURNED');
      assert.match(await page.locator('#log').innerText(),/FAKE_TX/);assert.equal(await page.locator('#log a').count(),0);assert.equal(await page.locator('#teleRuns').textContent(),String(count).padStart(4,'0'));
      const share=new URL(await page.locator('#shareX').getAttribute('href'));assert.equal(share.origin,'https://x.com');assert.match(share.searchParams.get('text'),/@mule_protocol/);assert.match(share.searchParams.get('text'),/\/m\/\d{4}-[sr]-(inv|con|adr)-\d{8}/);
      if([375,1440].includes(width)&&template==='invoice'){
        await page.locator('#console').scrollIntoViewIfNeeded();await page.locator('.console').screenshot({path:`${out}/console-${behavior}-${width}.png`});
        await page.locator('#patch').screenshot({path:`${out}/patch-${behavior}-${width}.png`});
      }
    }
    const downloadPromise=page.waitForEvent('download');await page.locator('#downloadPatch').click();const download=await downloadPromise;await download.saveAs(`${out}/download-${width}.png`);const meta=await sharp(`${out}/download-${width}.png`).metadata();assert.equal(meta.width,600);assert.equal(meta.height,660);
    const faq=page.getByText('Will this site ask me to connect a wallet?',{exact:true});await faq.focus();await page.keyboard.press('Enter');assert.equal(await faq.evaluate(el=>el.parentElement.open),true);assert.notEqual(await faq.evaluate(el=>getComputedStyle(el).outlineStyle),'none');
    await page.goto(`${base}/dossier`);await overflow(page);
    const equality=await page.evaluate(source=>{const original=new DOMParser().parseFromString(source.slice(source.indexOf('<header'),source.indexOf('<script>')),'text/html');const norm=s=>s.replace(/\s+/g,' ').trim();return norm(original.body.textContent)===norm(document.querySelector('.dossier-document').textContent);},source);assert.equal(equality,true,'Dossier copy differs');
    if(width<960){assert.equal(await page.locator('#toc-details').getAttribute('open'),null);await page.locator('#toc-details summary').focus();await page.keyboard.press('Enter');assert.ok(await page.locator('#toc-details').getAttribute('open')!==null);}
    else assert.equal(await page.locator('.d-toc').evaluate(el=>getComputedStyle(el).position),'sticky');
    if([375,1440].includes(width))await page.screenshot({path:`${out}/dossier-${width}.png`,fullPage:true});
    for(const route of ['legal','privacy','risks']){await page.goto(`${base}/${route}`);await overflow(page);assert.equal(await page.locator('meta[name="robots"]').getAttribute('content'),'noindex, nofollow');}
    await page.goto(`${base}/m/0042-s-inv-20261007`);await overflow(page);assert.equal(await page.locator('h1').textContent(),'MSN-0042');
    if([375,1440].includes(width))await page.screenshot({path:`${out}/mission-${width}.png`,fullPage:true});
    const response=await page.request.get(`${base}/m/0042-s-inv-20261007/og.png`);assert.equal(response.status(),200);assert.equal(response.headers()['content-type'],'image/png');const png=await response.body();const image=await sharp(png).metadata();assert.equal(image.width,1200);assert.equal(image.height,630);await fs.writeFile(`${out}/og-1200x630.png`,png);
    if([375,1440].includes(width)){await page.goto(`${base}/m/0042-s-inv-20261007/og.png`);await page.screenshot({path:`${out}/og-in-browser-${width}.png`,fullPage:true});}
    assert.equal((await page.request.get(`${base}/m/0042-s-inv-20260229`)).status(),404);assert.equal((await page.request.get(`${base}/m/invalid/og.png`)).status(),404);
    report.widths.push({width,sixConsoleRuns:true,download:true,faqKeyboard:true,dossierVerbatim:true,toc:true,legalNoindex:true,noOverflow:true,missionAndOG:true});await context.close();console.log(`PASS ${width}`);
  }
  const nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:375,height:900}});const page=await nojs.newPage();await page.goto(base);
  assert.equal(await page.locator('#launch').isDisabled(),true);assert.ok(await page.getByText('JavaScript is required to run this simulation. No wallet or funds are needed.',{exact:true}).isVisible());assert.equal(await page.locator('.lifecycle-static li').count(),5);await overflow(page);await page.goto(`${base}/dossier`);await overflow(page);await nojs.close();report.checks.push('No JavaScript: readable homepage/dossier, disabled console and explanation');
  const motion=await browser.newContext({viewport:{width:375,height:900}});const m=await motion.newPage();m.on('pageerror',e=>report.errors.push(e.message));await m.goto(base);await m.locator('#console').scrollIntoViewIfNeeded();await m.locator('#launch').click();await m.waitForFunction(()=>document.querySelectorAll('#log li').length>=2);assert.ok(await m.locator('#log li').count()<5);await m.locator('#motionToggle').click();await m.waitForFunction(()=>!document.getElementById('patch').hidden);assert.equal(await m.locator('#log li').count(),5);assert.equal(await m.locator('#stamp').evaluate(el=>getComputedStyle(el).animationName),'none');report.checks.push('Animated console writes incrementally; pause flushes waits and removes motion');await motion.close();
  assert.deepEqual(report.errors,[]);
}finally{await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));await browser.close();}
console.log(JSON.stringify(report,null,2));
