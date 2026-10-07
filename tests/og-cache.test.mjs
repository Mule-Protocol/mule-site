import test from 'node:test';
import assert from 'node:assert/strict';
import { cachedMissionImage } from '../src/server/og-cache.mjs';
import { parseMissionId } from '../src/data/mission.mjs';
import { missionHeaders } from '../src/server/mission-page.mjs';

function memoryCache() {
  const entries=new Map();
  return {
    entries,
    async match(key) { return entries.get(key.url)?.clone(); },
    async put(key,response) { assert.equal(key.method,'GET'); entries.set(key.url,response); },
  };
}
test('OG cache renders once across HEAD/GET and query variants; retains image and security headers',async()=>{
  const cache=memoryCache();let renders=0;
  const mission=parseMissionId('0042-s-inv-20261007');
  const url=`https://muleprotocol.com/m/${mission.id}/og.png`;
  const render=async()=>{renders++;return new Response('png bytes',{headers:missionHeaders(new Request(url),{'Content-Type':'image/png','Cache-Control':'public, max-age=86400, s-maxage=604800'})});};
  const first=await cachedMissionImage(new Request(`${url}?test=one`,{method:'HEAD'}),mission,cache,render);
  assert.equal(first.headers.get('X-MULE-OG-Cache'),'MISS');assert.equal(await first.text(),'');
  const second=await cachedMissionImage(new Request(`${url}?test=two`),mission,cache,render);
  assert.equal(second.headers.get('X-MULE-OG-Cache'),'HIT');assert.equal(await second.text(),'png bytes');
  assert.equal(second.headers.get('Content-Type'),'image/png');assert.equal(second.headers.get('X-Robots-Tag'),'noindex, nofollow');assert.equal(second.headers.get('X-Frame-Options'),'DENY');
  assert.equal(renders,1);assert.deepEqual([...cache.entries.keys()],[url]);
});
test('different missions and hosts cannot share an OG cache entry; errors are never cached',async()=>{
  const cache=memoryCache();let renders=0;
  for(const [host,id] of [['muleprotocol.com','0042-s-inv-20261007'],['muleprotocol.com','0042-r-inv-20261007'],['preview.pages.dev','0042-s-inv-20261007']]){
    const response=await cachedMissionImage(new Request(`https://${host}/m/${id}/og.png`),parseMissionId(id),cache,async()=>{renders++;return new Response(id);});
    assert.equal(response.headers.get('X-MULE-OG-Cache'),'MISS');assert.equal(await response.text(),id);
  }
  assert.equal(renders,3);
  const mission=parseMissionId('9999-s-adr-20991231');const request=new Request(`https://muleprotocol.com/m/${mission.id}/og.png`);
  for(let i=0;i<2;i++)assert.equal((await cachedMissionImage(request,mission,cache,async()=>new Response('Error',{status:500}))).status,500);
  assert.equal(cache.entries.size,3);
});
