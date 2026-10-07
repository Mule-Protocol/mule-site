import test from 'node:test';
import assert from 'node:assert/strict';
import { runMission } from '../src/lib/run-mission.ts';
import { runMission as coreRunMission } from '../src/vendor/mule-console-core/console-core.mjs';

const messages = {
  invoice: { honest: '6/6 FIELDS VALID', dishonest: '5/6 · MISSING: total_amount' },
  contract: { honest: '5/5 FIELDS VALID', dishonest: '4/5 · MISSING: governing_law' },
  address: { honest: '12/12 ROWS VALID', dishonest: '11/12 · INVALID POSTCODE, ROW 7' },
};

test('the thin adapter preserves all six real validator outcomes, hashes and reports without networking', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', () => { throw new Error('Mission must not fetch'); });
  for (const template of ['invoice', 'contract', 'address']) for (const behavior of ['honest', 'dishonest']) {
    const steps = await Array.fromAsync(runMission(template, behavior));
    assert.deepEqual(steps, await Array.fromAsync(coreRunMission(template, behavior)), 'Adapter must preserve the upstream steps exactly');
    assert.deepEqual(steps.map(step => step.station), [1, 2, 3, 4, 5]);
    assert.equal(steps[3].text, 'INSPECTION · ' + messages[template][behavior]);
    assert.equal(steps[3].failed, behavior === 'dishonest');
    assert.equal(steps[4].outcome, behavior === 'honest' ? 'settled' : 'returned');
    assert.equal(steps[4].failed, behavior === 'dishonest');
    assert.match(steps[0].text, /^ESCROW LOCKED · 5\.00 dUSDC · SIM-TX-LOCK-[a-f0-9]{8}$/);
    assert.match(steps[2].text, /^DELIVERY SUBMITTED · sha256:[a-f0-9]{4}…[a-f0-9]{4}$/);
    assert.match(steps[4].text, / · SIM-TX-CLOSE-[a-f0-9]{8}$/);
    assert.ok(!steps.some(step => /FAKE_|https?:\/\/|[1-9A-HJ-NP-Za-km-z]{32,88}/.test(step.text)));
    const { report, hashes } = steps[4];
    assert.equal(report.schema, template + '.v1');
    assert.equal(report.message, messages[template][behavior]);
    assert.equal(report.pass, behavior === 'honest');
    assert.equal(report.criteria_hash, hashes.criteria);
    assert.equal(report.delivery_hash, hashes.delivery);
    assert.deepEqual(Object.keys(hashes).sort(), ['criteria', 'delivery', 'report']);
    for (const hash of Object.values(hashes)) assert.match(hash, /^[a-f0-9]{64}$/);
    assert.deepEqual(steps[3].report, report);
    assert.deepEqual(steps[3].hashes, hashes);
  }
  assert.equal(fetch.mock.callCount(), 0);
});

test('unknown templates and behaviors are rejected without yielding a simulated result', async () => {
  for (const [template, behavior] of [['unknown', 'honest'], ['constructor', 'honest'], ['invoice', 'unknown']]) {
    await assert.rejects(Array.fromAsync(runMission(template, behavior)), { name: 'TypeError', message: 'Unknown mission configuration' });
  }
});
