import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { parseMissionId, missionId } from '../src/data/mission.mjs';
import { missionPage, missingMission } from '../src/server/mission-page.mjs';

test('all six allowlisted outcomes and templates, leap dates and bounds',()=>{
  for(const status of ['s','r']) for(const template of ['inv','con','adr']) for(const number of ['0000','0042','9999']) assert.ok(parseMissionId(`${number}-${status}-${template}-20280229`));
  assert.equal(missionId(42,true,'invoice',new Date('2026-10-07')), '0042-s-inv-20261007');
});
test('only years 2026–2099 are accepted, including both boundary dates',()=>{
  for(const date of ['00000101','99991231','20251231','21000101']) assert.equal(parseMissionId(`0000-s-inv-${date}`),null);
  assert.equal(parseMissionId('9999-r-con-99991231'),null);
  for(const date of ['20260101','20991231']) assert.ok(parseMissionId(`9999-r-con-${date}`));
});
test('browser IDs use the visitor local date around midnight, not UTC',()=>{
  const moduleUrl = new URL('../src/data/mission.mjs', import.meta.url).href;
  for(const [tz,instant,date] of [['Europe/Paris','2026-10-06T22:30:00Z','20261007'],['America/Los_Angeles','2026-10-07T06:30:00Z','20261006']]){
    const code=`import { missionId } from ${JSON.stringify(moduleUrl)};console.log(missionId(42,true,'invoice',new Date(${JSON.stringify(instant)})));`;
    const actual=execFileSync(process.execPath,['--input-type=module','-e',code],{env:{...process.env,TZ:tz},encoding:'utf8'}).trim();
    assert.equal(actual,`0042-s-inv-${date}`,tz);
  }
});
test('reject malformed identifiers, real calendar errors, Unicode and injection attempts',()=>{
  for(const id of [null,42,[],{},'', '42-s-inv-20261007','00042-s-inv-20261007','0042-S-inv-20261007','0042-s-other-20261007','0042-s-inv-2026107','0042-s-inv-20260229','0042-s-inv-20261301','0042-s-inv-20260001','0042-s-inv-20260100','0042-s-inv-20260431','００４２-s-inv-20261007','0042-s-inv-20261007\n','0042-s-inv-20261007<script>','<script>alert(1)</script>','../../etc/passwd','0042-s-inv-20261007?title=evil','0042-s-inv-20261007%00','0042-s-inv-20261007" onload="alert(1)']) assert.equal(parseMissionId(id),null,`${id}`);
});
test('HTML route ignores query input, has exact metadata, no inline styles/scripts, preview noindex',async()=>{
  const request=new Request('https://preview.mule-site.pages.dev/m/0042-s-inv-20261007?title=EVIL<script>');
  const response=missionPage(request,'0042-s-inv-20261007');const html=await response.text();
  assert.equal(response.status,200);assert.equal(response.headers.get('X-Robots-Tag'),'noindex, nofollow');assert.ok(response.headers.get('Content-Security-Policy').includes("style-src 'self'"));
  assert.ok(html.includes('https://preview.mule-site.pages.dev/m/0042-s-inv-20261007/og.png'));assert.ok(html.includes('https://muleprotocol.com/m/0042-s-inv-20261007'));
  assert.ok(!/EVIL|<script|\sstyle=/.test(html));
  const production=missionPage(new Request('https://muleprotocol.com/m/0042-s-inv-20261007'),'0042-s-inv-20261007');assert.equal(production.headers.get('X-Robots-Tag'),'noindex, nofollow');
  const productionHtml=await production.text();assert.ok(productionHtml.includes('<meta name="robots" content="noindex, nofollow">'));assert.ok(productionHtml.includes('property="og:image"'));assert.ok(productionHtml.includes('name="twitter:image"'));
});
test('404 is constant and secure; never reflects rejected path or query',async()=>{
  const request=new Request('https://preview.mule-site.pages.dev/m/bad');
  for(const response of [missionPage(request,'<script>bad</script>'),missingMission(request)]){assert.equal(response.status,404);assert.equal(await response.text(),'Mission not found.');assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('X-Frame-Options'),'DENY');}
});
