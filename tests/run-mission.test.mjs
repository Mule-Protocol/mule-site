import test from 'node:test';
import assert from 'node:assert/strict';
import { runMission } from '../src/lib/run-mission.ts';
test('all three templates settle honest deliveries and refund dishonest deliveries without networking',async()=>{
  for(const template of ['invoice','contract','address'])for(const behavior of ['honest','dishonest']){
    const steps=await Array.fromAsync(runMission(template,behavior));
    assert.deepEqual(steps.map(s=>s.station),[1,2,3,4,5]);
    assert.equal(steps[4].outcome,behavior==='honest'?'settled':'returned');
    assert.equal(steps[3].failed,behavior==='dishonest');
    assert.match(steps[0].text,/FAKE_TX/);assert.match(steps[2].text,/FAKE_HASH/);assert.ok(!steps.some(s=>s.text.includes('https://')));
  }
});
