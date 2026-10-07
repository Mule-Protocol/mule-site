import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMissionId, missionId } from '../src/data/mission.mjs';
import { missionPage, missingMission } from '../src/server/mission-page.mjs';

test('all six allowlisted outcomes and templates, leap dates and bounds',()=>{
  for(const status of ['s','r']) for(const template of ['inv','con','adr']) for(const number of ['0000','0042','9999']) assert.ok(parseMissionId(`${number}-${status}-${template}-20240229`));
  assert.equal(missionId(42,true,'invoice',new Date('2026-10-07')), '0042-s-inv-20261007');
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
  const production=missionPage(new Request('https://muleprotocol.com/m/0042-s-inv-20261007'),'0042-s-inv-20261007');assert.equal(production.headers.get('X-Robots-Tag'),null);
});
test('404 is constant and secure; never reflects rejected path or query',async()=>{
  const request=new Request('https://preview.mule-site.pages.dev/m/bad');
  for(const response of [missionPage(request,'<script>bad</script>'),missingMission(request)]){assert.equal(response.status,404);assert.equal(await response.text(),'Mission not found.');assert.equal(response.headers.get('Cache-Control'),'no-store');assert.equal(response.headers.get('X-Frame-Options'),'DENY');}
});
