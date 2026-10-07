import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { securityHeaders } from '../src/server/response-policy.mjs';

const baseline = process.argv.includes('--baseline');
const base = new URL(process.env.QA_BASE_URL || 'http://127.0.0.1:4321/');
assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(base.hostname), 'QA only accepts a loopback server');
const output = path.resolve(process.env.QA_OUTPUT || ('docs/qa-real-logic-console/' + (baseline ? 'before' : 'after')));
const cases = [
  { template: 'invoice', behavior: 'honest', message: '6/6 FIELDS VALID', hash: '24bebc6d6cf244296d79d550a5a0103d2ad5b5da6fe843f75a3ad90dc21230b7' },
  { template: 'invoice', behavior: 'dishonest', message: '5/6 · MISSING: total_amount', hash: 'd0916655daaa815b0bb0283eb44e3f688898c18ef74c5c3a0dcf568489919710' },
  { template: 'contract', behavior: 'honest', message: '5/5 FIELDS VALID', hash: '23a95be05289196b66ae237cf8fff9a834a0c0fa2880e64b3c99a032b0813886' },
  { template: 'contract', behavior: 'dishonest', message: '4/5 · MISSING: governing_law', hash: 'ea5c542098cabc13e6d87cd0c46cc709208319390db5ebc57ebc031ff21850da' },
  { template: 'address', behavior: 'honest', message: '12/12 ROWS VALID', hash: '0430753bc25ae77fc674d0b6c8d0c9bf8a16ae43f1de4b753853f326e65eaddf' },
  { template: 'address', behavior: 'dishonest', message: '11/12 · INVALID POSTCODE, ROW 7', hash: '16f88af6d2436ddf1d3bc6dafb51d4fb43f82dd8a3ef5bb3fb430c5d1227cdbe' },
];
const evidence = {
  schemaVersion: 1, capturedAt: new Date().toISOString(), mode: baseline ? 'baseline' : 'real-logic',
  url: base.href, passed: false,
  expectedReportsSource: 'Mule-Protocol/mule ecfb8350e6ede380eb2ad83174576ef6580562e1, docs/testing/CONSOLE-5a/console-differential/summary.json',
  method: {
    requests: 'Chrome DevTools Protocol Network.requestWillBeSent, including cache and failures; wallTime mapped to performance.timeOrigin',
    successfulResources: 'PerformanceResourceTiming startTime/responseEnd and encodedBodySize/transferSize',
    boundaries: 'Capture-phase Launch click; cold computation lower bound = core chunk ResourceTiming responseEnd, before module execution; MutationObserver journal [01] for presentation only; terminal state + visible patch + enabled controls',
    application: 'Native form clicks run the original application; no replacement of its code, network APIs, clock or CSP',
    localCspDifference: 'Only upgrade-insecure-requests is removed by the loopback HTTP QA server',
  },
  pages: [], captures: [], reportLayout: [], offline: null, normalMotion: null,
};
await mkdir(output, { recursive: true });
let browser;
const sessions = [];

// The CI server may have just been started. Readiness never contacts an external URL.
async function ready() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(base, { signal: AbortSignal.timeout(1500), redirect: 'error' });
      if (response.ok) { await response.arrayBuffer(); return; }
    } catch { /* bounded local startup retry */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error('Loopback QA server was not ready within 30 seconds: ' + base.href);
}

// Independently serialize the report for hashing; this does not run or replace the validator.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  return value;
}
const digestReport = report => createHash('sha256').update(JSON.stringify(canonical(report)) + '\n').digest('hex');
const coreUrl = url => /\/console-core[.-][^/]*\.(?:m?js)(?:\?|$)/.test(url);
const relativeUrl = url => url.startsWith(base.origin) ? url.slice(base.origin.length) : url;

async function openSession(width, reducedMotion = 'reduce') {
  const context = await browser.newContext({ viewport: { width, height: width < 768 ? 812 : 960 }, reducedMotion, deviceScaleFactor: 1 });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const summary = { width, height: width < 768 ? 812 : 960, reducedMotion, csp: null, initialCoreRequests: [], initialCorePreloads: [], errors: [], cspViolations: [], runs: [] };
  evidence.pages.push(summary);
  const state = { context, page, summary, requests: [], byId: new Map(), timeOrigin: null };
  sessions.push(state);
  page.on('pageerror', error => summary.errors.push({ kind: 'pageerror', message: error.message }));
  page.on('console', message => { if (message.type() === 'error') summary.errors.push({ kind: 'console', message: message.text() }); });
  await page.addInitScript(() => {
    performance.setResourceTimingBufferSize(2000);
    const qa = { violations: [], runs: [], active: null, launchClickAt: null };
    globalThis.__muleConsoleQa = qa;
    document.addEventListener('securitypolicyviolation', event => {
      qa.violations.push({ at: performance.now(), directive: event.effectiveDirective, blockedURI: event.blockedURI, disposition: event.disposition });
    });
    document.addEventListener('click', event => {
      if (event.target instanceof Element && event.target.closest('#launch')) qa.launchClickAt = performance.now();
    }, true);
    document.addEventListener('submit', event => {
      if (event.target?.id !== 'conForm') return;
      const now = performance.now();
      const run = { startedAt: qa.launchClickAt !== null && now - qa.launchClickAt < 1000 ? qa.launchClickAt : now,
        submittedAt: now, firstStationAt: null, completedAt: null, reportResetObserved: false, stations: [] };
      qa.runs.push(run);
      qa.active = run;
    }, true);
    const inspect = () => {
      const run = qa.active;
      if (!run || run.completedAt !== null) return;
      const inspection = document.querySelector('#inspectionReport');
      if (run.firstStationAt === null && inspection?.hidden && !inspection.open) run.reportResetObserved = true;
      for (const item of document.querySelectorAll('#log li')) {
        const station = item.querySelector('.k')?.textContent;
        if (!/^\[0[1-5]\]$/.test(station || '') || run.stations.some(seen => seen.station === station)) continue;
        const at = performance.now();
        run.stations.push({ station, at, text: item.querySelector('.v')?.textContent || '' });
        if (station === '[01]') run.firstStationAt = at;
      }
      const status = document.querySelector('#msnState')?.textContent;
      const controls = document.querySelector('#missionControls');
      const patch = document.querySelector('#patch');
      if (run.stations.length === 5 && ['Settled', 'Returned'].includes(status) && controls && !controls.disabled && patch && !patch.hidden) {
        run.completedAt = performance.now();
      }
    };
    new MutationObserver(inspect).observe(document, { childList: true, subtree: true, attributes: true, characterData: true });
  });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable');
  cdp.on('Network.requestWillBeSent', event => {
    const item = { id: event.requestId, url: event.request.url, method: event.request.method,
      type: event.type, epochMs: event.wallTime * 1000, failed: false, fromCache: false };
    state.requests.push(item);
    state.byId.set(event.requestId, item);
  });
  cdp.on('Network.requestServedFromCache', event => { const item = state.byId.get(event.requestId); if (item) item.fromCache = true; });
  cdp.on('Network.responseReceived', event => {
    const item = state.byId.get(event.requestId);
    if (item) { item.status = event.response.status; item.fromCache ||= Boolean(event.response.fromDiskCache || event.response.fromPrefetchCache); }
  });
  cdp.on('Network.loadingFailed', event => {
    const item = state.byId.get(event.requestId);
    if (item) { item.failed = true; item.failure = event.errorText; item.canceled = event.canceled || false; }
  });
  const response = await page.goto(base.href, { waitUntil: 'networkidle' });
  assert.ok(response?.ok(), 'QA home page responds successfully');
  summary.csp = response.headers()['content-security-policy'];
  assert.equal(summary.csp, securityHeaders['Content-Security-Policy'].replace('; upgrade-insecure-requests', ''), 'Existing strict CSP is preserved');
  assert.ok(!summary.csp.includes("'unsafe-eval'") && !summary.csp.includes("'unsafe-inline'"));
  await page.waitForFunction(() => document.querySelector('#missionControls')?.disabled === false);
  await page.evaluate(() => document.fonts.ready);
  state.timeOrigin = await page.evaluate(() => performance.timeOrigin);
  summary.initialCoreRequests = state.requests.filter(item => coreUrl(item.url)).map(item => relativeUrl(item.url));
  summary.initialCorePreloads = await page.locator('link[rel="preload"],link[rel="modulepreload"],link[rel="prefetch"]').evaluateAll(elements =>
    elements.map(element => element.href).filter(url => url.includes('console-core')));
  assert.deepEqual(summary.initialCoreRequests, [], 'Core is not requested at initial page load');
  assert.deepEqual(summary.initialCorePreloads, [], 'Core is not preloaded');
  if (!baseline) assert.equal(await page.locator('#inspectionReport').isVisible(), false, 'Inspection is initially hidden');
  return state;
}

async function collectSession(state) {
  if (state.page.isClosed()) return;
  state.summary.cspViolations = await state.page.evaluate(() => globalThis.__muleConsoleQa.violations);
  state.summary.allRequests = state.requests.map(item => ({ url: relativeUrl(item.url), method: item.method, type: item.type,
    startTime: item.epochMs - state.timeOrigin, status: item.status, failed: item.failed, failure: item.failure, fromCache: item.fromCache }));
}
function healthy(state) {
  assert.deepEqual(state.summary.errors, [], 'No browser or console errors');
  assert.deepEqual(state.summary.cspViolations, [], 'No CSP violations');
  assert.equal(state.requests.filter(item => !item.url.startsWith(base.origin + '/')).length, 0, 'No external requests');
}

async function runCase(state, scenario, { warm = false, offline = false } = {}) {
  const { page } = state;
  await page.locator('#tpl').selectOption(scenario.template);
  const behaviorId = scenario.behavior === 'honest' ? 'behHonest' : 'behBad';
  await page.locator('label[for=' + behaviorId + ']').click();
  assert.equal(await page.locator('#' + behaviorId).isChecked(), true);
  const previousCount = await page.evaluate(() => globalThis.__muleConsoleQa.runs.length);
  await page.locator('#launch').click();
  await page.waitForFunction(count => {
    const run = globalThis.__muleConsoleQa.runs[count];
    return run?.completedAt !== null && run?.completedAt !== undefined || document.querySelector('#msnState')?.textContent === 'Simulation unavailable';
  }, previousCount);
  assert.notEqual(await page.locator('#msnState').innerText(), 'Simulation unavailable', 'Mission completes');
  const snapshot = await page.evaluate(index => ({
    timing: globalThis.__muleConsoleQa.runs[index],
    journal: [...document.querySelectorAll('#log li')].map(item => ({ station: item.querySelector('.k')?.textContent, text: item.querySelector('.v')?.textContent })),
    status: document.querySelector('#msnState')?.textContent,
    patchVisible: !document.querySelector('#patch').hidden,
    controlsEnabled: !document.querySelector('#missionControls').disabled,
    inspection: document.querySelector('#inspectionJson')?.textContent || null,
    resources: performance.getEntriesByType('resource').map(item => ({ name: item.name, initiatorType: item.initiatorType, startTime: item.startTime, responseEnd: item.responseEnd,
      transferSize: item.transferSize, encodedBodySize: item.encodedBodySize, decodedBodySize: item.decodedBodySize })),
  }), previousCount);
  const { timing, journal } = snapshot;
  assert.ok(timing.firstStationAt !== null && timing.completedAt !== null, 'Observed first instruction and complete patch');
  assert.deepEqual(journal.map(item => item.station), ['[01]', '[02]', '[03]', '[04]', '[05]']);
  assert.equal(journal[3].text, 'INSPECTION · ' + scenario.message);
  assert.equal(snapshot.status, scenario.behavior === 'honest' ? 'Settled' : 'Returned');
  assert.equal(snapshot.patchVisible && snapshot.controlsEnabled, true);
  const attempts = state.requests.filter(item => item.epochMs - state.timeOrigin >= timing.startedAt && item.epochMs - state.timeOrigin <= timing.completedAt)
    .map(item => ({ url: relativeUrl(item.url), method: item.method, type: item.type, startTime: item.epochMs - state.timeOrigin,
      status: item.status, failed: item.failed, failure: item.failure, fromCache: item.fromCache }));
  const resources = snapshot.resources.filter(item => item.startTime >= timing.startedAt && item.startTime <= timing.completedAt)
    .map(item => ({ ...item, name: relativeUrl(item.name) }));
  const duringInstructions = attempts.filter(item => item.startTime >= timing.firstStationAt);
  const resourcesDuringInstructions = resources.filter(item => item.startTime >= timing.firstStationAt);
  const result = { template: scenario.template, behavior: scenario.behavior, warm, offline, status: snapshot.status,
    validatorMessage: scenario.message, timing, durationMs: timing.completedAt - timing.startedAt,
    requestAttempts: attempts, requestsAfterFirstStation: duringInstructions, resources, resourcesAfterFirstStation: resourcesDuringInstructions,
    preparationResources: resources.filter(item => item.startTime < timing.firstStationAt), journal, inspection: null };
  state.summary.runs.push(result);
  if (baseline) {
    assert.equal(snapshot.inspection, null);
    assert.match(journal[0].text, /FAKE_TX_SIM_/);
  } else {
    assert.deepEqual(duringInstructions, [], 'No request attempts after journal [01], including failed requests');
    assert.equal(timing.reportResetObserved, true, 'Report is hidden and closed again before the next mission');
    assert.deepEqual(resourcesDuringInstructions, [], 'No ResourceTiming entries start after journal [01]');
    if (warm || offline) {
      assert.deepEqual(attempts, [], 'Warm/offline run makes no request attempts from Launch click');
      assert.deepEqual(resources, [], 'Warm/offline run has no resource loads from Launch click');
      result.computationBoundary = { kind: 'Launch click (warm/offline)', at: timing.startedAt };
      result.requestsDuringComputation = attempts;
    } else {
      const core = attempts.filter(item => coreUrl(item.url));
      assert.equal(core.length, 1, 'Exactly one lazy core chunk is first requested after Launch');
      const coreResources = resources.filter(item => coreUrl(item.name));
      assert.equal(coreResources.length, 1, 'Lazy core has one completed ResourceTiming entry');
      const computationAt = coreResources[0].responseEnd;
      assert.ok(computationAt <= timing.firstStationAt, 'Core is downloaded before the first journal station');
      result.computationBoundary = { kind: 'Core chunk responseEnd, before module execution and prepareMission', at: computationAt };
      result.requestsDuringComputation = attempts.filter(item => item.startTime >= computationAt);
      assert.deepEqual(result.requestsDuringComputation, [], 'No request attempt after core download, including calculation before [01]');
      assert.deepEqual(resources.filter(item => item.startTime >= computationAt), [], 'No resource starts while core executes');
      for (const resource of resources) assert.ok(resource.responseEnd <= computationAt, 'Images/fonts finish before core can execute: ' + resource.name);
      for (const request of attempts) {
        assert.equal(request.failed, false);
        assert.equal(request.method, 'GET');
        assert.ok(['Script', 'Image', 'Font'].includes(request.type), 'Preparation loads only local scripts/images/fonts');
      }
    }
    assert.ok(!journal.some(item => /FAKE_/.test(item.text)));
    assert.match(journal[0].text, /SIM-TX-LOCK-[a-f0-9]{8}$/);
    assert.match(journal[4].text, /SIM-TX-CLOSE-[a-f0-9]{8}$/);
    assert.match(journal[2].text, /sha256:[a-f0-9]{4}…[a-f0-9]{4}$/);
    assert.ok(!journal.some(item => /\b[1-9A-HJ-NP-Za-km-z]{32,88}\b/.test(item.text)), 'No address/signature-shaped base58 token in the visible journal');
    const inspection = JSON.parse(snapshot.inspection);
    assert.deepEqual(Object.keys(inspection).sort(), ['hashes', 'report']);
    assert.deepEqual(Object.keys(inspection.hashes).sort(), ['criteria', 'delivery', 'report']);
    for (const hash of Object.values(inspection.hashes)) assert.match(hash, /^[a-f0-9]{64}$/);
    assert.equal(inspection.report.message, scenario.message);
    assert.equal(inspection.report.pass, scenario.behavior === 'honest');
    assert.equal(inspection.report.criteria_hash, inspection.hashes.criteria);
    assert.equal(inspection.report.delivery_hash, inspection.hashes.delivery);
    assert.equal(digestReport(inspection.report), inspection.hashes.report);
    assert.equal(inspection.hashes.report, scenario.hash, 'Report SHA equals the reviewed Part A vector');
    assert.equal(inspection.report.mission, 'SIM-MISSION-' + scenario.template + '-' + scenario.behavior);
    assert.equal(await page.locator('#inspectionReport').isVisible(), true);
    assert.equal(await page.locator('#inspectionReport > summary').innerText(), 'Inspection report');
    result.inspection = inspection;
  }
  await collectSession(state);
  healthy(state);
  console.log((baseline ? 'before' : 'after') + ' ' + state.summary.width + 'px ' + scenario.template + '/' + scenario.behavior + (offline ? ' offline' : warm ? ' warm' : ' cold') + ': passed');
  return result;
}

async function capture(state, scenario) {
  const stem = scenario.template + '-' + scenario.behavior + '-' + state.summary.width;
  const details = state.page.locator('#inspectionReport');
  if (!baseline && await details.evaluate(element => element.open)) await details.locator('summary').click();
  const journalFile = stem + '-journal.png';
  await state.page.locator('#console .console').screenshot({ path: path.join(output, journalFile), animations: 'disabled' });
  const capture = { width: state.summary.width, height: state.summary.height, template: scenario.template, behavior: scenario.behavior,
    journal: journalFile, inspection: null, inspectionAbsent: baseline };
  if (baseline) capture.note = 'Inspection report absent in the baseline; journal captured instead.';
  else {
    await details.locator('summary').click();
    const reportFile = stem + '-inspection.png';
    await state.page.locator('#console .console').screenshot({ path: path.join(output, reportFile), animations: 'disabled' });
    capture.inspection = reportFile;
  }
  evidence.captures.push(capture);
}

async function checkReportLayouts(state) {
  for (const width of [360, 375, 768, 1440]) {
    await state.page.setViewportSize({ width, height: width < 768 ? 812 : 960 });
    const details = state.page.locator('#inspectionReport');
    if (!await details.evaluate(element => element.open)) await details.locator('summary').click();
    const measurement = await state.page.locator('#inspectionJson').evaluate(element => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      element.scrollLeft = 0;
      const initialScrollLeft = element.scrollLeft;
      element.scrollLeft = element.scrollWidth;
      const finalScrollLeft = element.scrollLeft;
      element.scrollLeft = 0;
      return { viewport: innerWidth, pageWidth: document.documentElement.scrollWidth,
        left: box.left, right: box.right, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth,
        overflowX: style.overflowX, whiteSpace: style.whiteSpace, tabindex: element.tabIndex,
        initialScrollLeft, finalScrollLeft };
    });
    assert.ok(measurement.pageWidth <= width + 1, 'No page horizontal overflow at ' + width);
    assert.ok(measurement.left >= -1 && measurement.right <= width + 1, 'Report fits viewport at ' + width);
    assert.ok(['auto', 'scroll'].includes(measurement.overflowX));
    assert.equal(measurement.tabindex, 0);
    if (measurement.scrollWidth > measurement.clientWidth) assert.ok(measurement.finalScrollLeft > 0, 'Report can scroll horizontally at ' + width);
    evidence.reportLayout.push({ width, passed: true, ...measurement });
  }
}

try {
  await ready();
  browser = await chromium.launch({ headless: true });
  evidence.engine = 'Chromium ' + browser.version() + ' headless; desktop emulation, not physical devices';
  const mobile = await openSession(375);
  for (const [index, scenario] of cases.entries()) {
    await runCase(mobile, scenario, { warm: index > 0 });
    if (scenario.template === 'invoice') await capture(mobile, scenario);
  }
  if (!baseline) {
    await checkReportLayouts(mobile);
    await mobile.page.setViewportSize({ width: 375, height: 812 });
    await mobile.context.setOffline(true);
    const offlineRuns = [];
    for (const scenario of cases) offlineRuns.push(await runCase(mobile, scenario, { warm: true, offline: true }));
    evidence.offline = { passed: true, prepared: 'Both outcome images and the core were cached through normal online Launch; no reload after switching the browser context offline',
      scenarios: offlineRuns.map(run => ({ template: run.template, behavior: run.behavior, status: run.status, requestAttempts: run.requestAttempts.length, reportHash: run.inspection.hashes.report })) };
    await mobile.context.setOffline(false);
  }
  const desktop = await openSession(1440);
  for (const [index, scenario] of cases.slice(0, 2).entries()) {
    await runCase(desktop, scenario, { warm: index > 0 });
    await capture(desktop, scenario);
  }
  const motion = await openSession(375, 'no-preference');
  const normal = await runCase(motion, cases[0]);
  const intervals = normal.timing.stations.slice(1).map((station, index) => station.at - normal.timing.stations[index].at);
  assert.ok(intervals.every(interval => interval >= 650), 'Normal motion preserves the approximately 800 ms journal rhythm');
  assert.ok(normal.timing.completedAt - normal.timing.firstStationAt >= 3800, 'Five normal station delays remain visible');
  evidence.normalMotion = { passed: true, stationIntervalsMs: intervals, firstStationToCompletionMs: normal.timing.completedAt - normal.timing.firstStationAt };
  evidence.passed = true;
} catch (error) {
  evidence.failure = { name: error.name, message: error.message, stack: error.stack };
  process.exitCode = 1;
} finally {
  for (const state of sessions) await collectSession(state).catch(error => { state.summary.collectionError = error.message; });
  await browser?.close();
  await writeFile(path.join(output, 'browser.json'), JSON.stringify(evidence, null, 2) + '\n');
}
console.log(JSON.stringify({ mode: evidence.mode, passed: evidence.passed, pages: evidence.pages.length,
  captures: evidence.captures.length, offline: evidence.offline?.passed ?? null, output, failure: evidence.failure?.message }, null, 2));
