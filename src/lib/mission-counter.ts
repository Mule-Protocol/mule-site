export const SIMULATED_COUNTER_START = Date.parse('2026-10-07T23:23:00Z');
export const COUNTER_INTERVAL_MS = 60_000;

export function simulatedMissionCount(now = Date.now()): number {
  return Math.max(0, Math.floor((now - SIMULATED_COUNTER_START) / COUNTER_INTERVAL_MS));
}

export function nextCounterDelay(now = Date.now()): number {
  const nextIncrement = SIMULATED_COUNTER_START + (simulatedMissionCount(now) + 1) * COUNTER_INTERVAL_MS;
  return nextIncrement - now;
}
