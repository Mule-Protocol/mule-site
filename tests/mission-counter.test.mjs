import test from 'node:test';
import assert from 'node:assert/strict';
import { SIMULATED_COUNTER_START, COUNTER_INTERVAL_MS, simulatedMissionCount, nextCounterDelay } from '../src/lib/mission-counter.ts';

const start = Date.parse('2026-10-07T23:23:00Z');

test('the shared count advances only after each complete minute from the fixed UTC origin', () => {
  assert.equal(SIMULATED_COUNTER_START, start);
  assert.equal(COUNTER_INTERVAL_MS, 60_000);
  for (const [elapsed, expected] of [[0, 0], [59_999, 0], [60_000, 1], [119_999, 1], [120_000, 2]]) {
    assert.equal(simulatedMissionCount(start + elapsed), expected, `${elapsed} ms`);
  }
});

test('a fresh read recovers elapsed time without previous ticks or stored state', () => {
  assert.equal(simulatedMissionCount(start + 43_200_000), 720);
  assert.equal(simulatedMissionCount(start + 60_000), 1);
  assert.equal(simulatedMissionCount(start + 43_200_000), 720);
});

test('before the origin the count is zero and the next increment is at origin plus one minute', () => {
  for (const [beforeStart, delay] of [[1, 60_001], [60_001, 120_001], [86_400_000, 86_460_000]]) {
    assert.equal(simulatedMissionCount(start - beforeStart), 0);
    assert.equal(nextCounterDelay(start - beforeStart), delay);
  }
});

test('the shared count continues beyond the manual mission identifier limit', () => {
  assert.equal(simulatedMissionCount(start + 8 * 86_400_000), 11_520);
  assert.equal(simulatedMissionCount(start + 30 * 86_400_000 + 59_999), 43_200);
});

test('the next delay stays aligned to the shared origin after late updates', () => {
  for (const [elapsed, delay] of [[0, 60_000], [59_999, 1], [60_000, 60_000], [60_001, 59_999], [119_999, 1], [120_000, 60_000], [691_212_345, 47_655]]) {
    assert.equal(nextCounterDelay(start + elapsed), delay, `${elapsed} ms`);
  }
});

test('both calculations default to the current time', t => {
  t.mock.method(Date, 'now', () => start + 120_001);
  assert.equal(simulatedMissionCount(), 2);
  assert.equal(nextCounterDelay(), 59_999);
});
