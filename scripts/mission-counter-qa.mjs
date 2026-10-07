import {chromium, expect} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {SIMULATED_COUNTER_START} from '../src/lib/mission-counter.ts';
const base=process.env.QA_BASE_URL||'http://127.0.0.1:8788';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw Error('This write test only targets a local D1 database.');
const out=process.env.QA_OUTPUT||'artifacts/mission-counter/browser';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch({headless:true});
const report={base,checks:[],note:'Real local Pages Function and D1. Browser response serverTime is fixed for deterministic timer and clock-skew tests.'};
let serverTime=SIMULATED_COUNTER_START+59_000;
let loseNextPost=false;
const postedIds=[];
const errors=[];
async function makePage(clientTime){
 const context=await browser.newContext({viewport:{width:375,height:900},reducedMotion:'reduce'});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
 await page.clock.install({time:new Date(clientTime)});
 await page.clock.pauseAt(new Date(clientTime));
 await page.route('**/api/mission-counter',async route=>{
  const isPost=route.request().method()==='POST';
  if(isPost)postedIds.push(route.request().postDataJSON().id);
  const response=await route.fetch();
  if(isPost&&loseNextPost){loseNextPost=false;await route.abort('failed');return;}
  const data=await response.json();
  if(response.ok())data.serverTime=serverTime;
  await route.fulfill({response,json:data});
 });
 await page.goto(base,{waitUntil:'load'});
 await expect(page.locator('#missionControls')).toBeEnabled();
 return page;
}
const text=n=>String(n).padStart(4,'0');
try{
 const a=await makePage('2027-01-01T00:00:00Z');
 const initial=await (await a.request.get(`${base}/api/mission-counter`)).json();
 const manual=initial.manualTotal;
 const b=await makePage('2040-07-01T00:00:00Z');
 await expect(a.locator('#teleRuns')).toHaveText(text(manual));
 await expect(b.locator('#teleRuns')).toHaveText(text(manual));
 report.checks.push('Two fresh visitors share the same total despite different client clocks');
 serverTime+=999;await a.clock.runFor(999);
 await expect(a.locator('#teleRuns')).toHaveText(text(manual));
 serverTime++;await a.clock.runFor(1);await b.clock.runFor(1000);
 await expect(a.locator('#teleRuns')).toHaveText(text(manual+1));
 await expect(b.locator('#teleRuns')).toHaveText(text(manual+1));
 report.checks.push('+1 at the exact minute boundary, not before');
 await a.locator('#launch').click();
 await expect(a.locator('#patch')).toBeVisible();
 await expect(a.locator('#teleRuns')).toHaveText(text(manual+2));
 await expect(a.locator('#runs')).toHaveText('1 mission run on this page');
 assert.match(await a.locator('#patchPage').getAttribute('href'),/\/m\/0001-s-inv-/);
 await b.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
 await expect(b.locator('#teleRuns')).toHaveText(text(manual+2));
 report.checks.push('Visitor A completion is persisted and visible to visitor B; manual badge remains MSN-0001');
 await b.locator('#behBad').press('Space');await b.locator('#launch').click();
 await expect(b.locator('#patch')).toBeVisible();
 await expect(b.locator('#teleRuns')).toHaveText(text(manual+3));
 assert.match(await b.locator('#patchPage').getAttribute('href'),/\/m\/0001-r-inv-/);
 await a.reload({waitUntil:'load'});
 await expect(a.locator('#teleRuns')).toHaveText(text(manual+3));
 report.checks.push('Returned missions also add one; reload retains the shared total');
 await a.evaluate(()=>dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
 serverTime+=600_000;await a.clock.setSystemTime(new Date('2027-01-01T00:10:01Z'));
 await a.evaluate(()=>dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
 await expect(a.locator('#teleRuns')).toHaveText(text(manual+13));
 report.checks.push('Resume catches up ten unvisited minutes from server time');
 loseNextPost=true;
 const failedPost=a.waitForEvent('requestfailed',{predicate:req=>req.url().endsWith('/api/mission-counter')&&req.method()==='POST'});
 await a.locator('#launch').click();await expect(a.locator('#patch')).toBeVisible();
 await expect.poll(async()=> (await (await a.request.get(`${base}/api/mission-counter`)).json()).manualTotal).toBe(manual+3);
 await failedPost;
 assert.equal(await a.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('mule:pending-mission:')).length),1);
 await a.reload({waitUntil:'load'});
 await expect(a.locator('#teleRuns')).toHaveText(text(manual+14));
 await expect.poll(()=>a.evaluate(()=>Object.keys(localStorage).filter(key=>key.startsWith('mule:pending-mission:')).length)).toBe(0);
 assert.equal(postedIds.at(-1),postedIds.at(-2));
 assert.equal((await (await a.request.get(`${base}/api/mission-counter`)).json()).manualTotal,manual+3);
 report.checks.push('Lost POST response survives reload and retries the same receipt without counting twice');
 await a.evaluate(()=>window.scrollTo(0,0));
 for(const width of [375,1440]){
  await a.setViewportSize({width,height:900});
  assert.equal(await a.evaluate(()=>document.documentElement.scrollWidth),width);
  const clip=await a.locator('#telemetry').evaluate(el=>{const r=el.getBoundingClientRect();return{x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height};});
  await a.screenshot({path:`${out}/telemetry-${width}.png`,fullPage:true,clip,animations:'disabled'});
 }
 assert.deepEqual(errors,[]);
 report.checks.push('No browser errors or horizontal overflow at 375 and 1440px');
 console.log(JSON.stringify(report,null,2));
}finally{
 await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2));
 await browser.close();
}
