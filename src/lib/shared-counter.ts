import { COUNTER_INTERVAL_MS, nextCounterDelay, simulatedMissionCount } from './mission-counter';

type CounterSnapshot = { manualTotal: number; serverTime: number };

export function startSharedMissionCounter(element: HTMLElement) {
  let snapshot: CounterSnapshot | undefined;
  let receivedAt = 0;
  let tickTimer: ReturnType<typeof setTimeout> | undefined;
  let syncTimer: ReturnType<typeof setTimeout> | undefined;
  let syncing = false, suspended = false;
  const pending = new Set<string>();
  const pendingPrefix = 'mule:pending-mission:';
  const validReceiptId = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  try {
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key?.startsWith(pendingPrefix)) {
        const id = key.slice(pendingPrefix.length);
        if (validReceiptId.test(id)) pending.add(id);
      }
    }
  } catch {
    // Storage may be disabled; in-memory retries still work while this page stays open.
  }

  function render() {
    clearTimeout(tickTimer);
    if (!snapshot) { element.textContent = '—'; return; }
    // Use server time plus elapsed monotonic time, independent of the visitor's clock.
    const now = snapshot.serverTime + Math.max(0, performance.now() - receivedAt);
    element.textContent = String(snapshot.manualTotal + simulatedMissionCount(now)).padStart(4, '0');
    if (!suspended && !document.hidden) tickTimer = setTimeout(render, Math.max(1, Math.ceil(nextCounterDelay(now))));
  }

  async function request(id?: string) {
    const response = await fetch('/api/mission-counter', {
      method: id ? 'POST' : 'GET', cache: 'no-store', keepalive: true,
      signal: AbortSignal.timeout(8000),
      ...(id ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) } : {}),
    });
    if (!response.ok) throw new Error('Counter unavailable');
    const value = await response.json() as CounterSnapshot;
    if (!Number.isSafeInteger(value.manualTotal) || value.manualTotal < 0 || !Number.isSafeInteger(value.serverTime)) {
      throw new Error('Invalid counter response');
    }
    snapshot = value;
    receivedAt = performance.now();
    render();
  }

  async function sync() {
    if (syncing || suspended || (document.hidden && pending.size === 0)) return;
    clearTimeout(syncTimer);
    syncing = true;
    let success = false;
    try {
      // Reuse the same receipt on retry so an interrupted response cannot double-count a mission.
      for (const id of pending) {
        await request(id);
        pending.delete(id);
        try { localStorage.removeItem(pendingPrefix + id); } catch { /* A later retry remains idempotent. */ }
      }
      await request();
      success = true;
    } catch {
      // Keep the last shared snapshot; the console remains usable during a network outage.
    } finally {
      syncing = false;
      render();
      if (!suspended && !document.hidden) syncTimer = setTimeout(sync, success && pending.size ? 0 : COUNTER_INTERVAL_MS);
    }
  }

  function resume() {
    suspended = false;
    render();
    if (document.hidden) clearTimeout(syncTimer);
    else void sync();
  }
  document.addEventListener('visibilitychange', resume);
  window.addEventListener('pageshow', resume);
  window.addEventListener('pagehide', () => {
    suspended = true;
    clearTimeout(tickTimer);
    clearTimeout(syncTimer);
  });
  render();
  void sync();

  return {
    recordMission() {
      const id = crypto.randomUUID();
      pending.add(id);
      try { localStorage.setItem(pendingPrefix + id, '1'); } catch { /* Keep the receipt in memory. */ }
      void sync();
    },
  };
}
