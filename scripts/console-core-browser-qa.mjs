import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { join, resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { BUNDLE_NAME, VENDOR_DIRECTORY, sha256, verifyConsoleCoreDirectory } from './console-core-integrity.mjs';

// Adapted from the reviewed Part A proof at this immutable commit. This test
// serves the exact vendor Buffer, never the site, shared counter or its API.
// https://github.com/Mule-Protocol/mule/blob/ecfb8350e6ede380eb2ad83174576ef6580562e1/scripts/test-console-browser.mjs
const SOURCE_COMMIT = 'ecfb8350e6ede380eb2ad83174576ef6580562e1';
const SOURCE_SHA256 = '11fd73a2ee21035ff8fe07f696e0c13ef979bed055f8ce4bb33c58ffc368f47c';
const SOURCE_BASE = 'https://github.com/Mule-Protocol/mule/blob/' + SOURCE_COMMIT + '/';
const cases = [
  {
    "template": "invoice",
    "behavior": "honest",
    "designatedAgent": false,
    "missionReference": "SIM-MISSION-invoice-honest",
    "message": "6/6 FIELDS VALID",
    "hashes": {
      "criteria": "6cd24534940273abb71902f23eef17e7dd4fd7a4ed632641e951200935d082dc",
      "delivery": "4b8d8320b71af526db9cb17730d14d9275cd7d975df3819b45d42bae7be73335",
      "report": "24bebc6d6cf244296d79d550a5a0103d2ad5b5da6fe843f75a3ad90dc21230b7"
    }
  },
  {
    "template": "invoice",
    "behavior": "dishonest",
    "designatedAgent": false,
    "missionReference": "SIM-MISSION-invoice-dishonest",
    "message": "5/6 · MISSING: total_amount",
    "hashes": {
      "criteria": "6cd24534940273abb71902f23eef17e7dd4fd7a4ed632641e951200935d082dc",
      "delivery": "eb9d8f14c70ccb8ade733c5f31e99cc5fe455f7fcba1944128718918fc3d95a0",
      "report": "d0916655daaa815b0bb0283eb44e3f688898c18ef74c5c3a0dcf568489919710"
    }
  },
  {
    "template": "contract",
    "behavior": "honest",
    "designatedAgent": false,
    "missionReference": "SIM-MISSION-contract-honest",
    "message": "5/5 FIELDS VALID",
    "hashes": {
      "criteria": "dc19ca94f8a0d925f52ed97fac7708e46a6c305c00e74ea719630c328b254e37",
      "delivery": "449d2e0926be3f39a91cf65b91f9644ed7a502f082d2026cb9d450bc0990ceb1",
      "report": "23a95be05289196b66ae237cf8fff9a834a0c0fa2880e64b3c99a032b0813886"
    }
  },
  {
    "template": "contract",
    "behavior": "dishonest",
    "designatedAgent": false,
    "missionReference": "SIM-MISSION-contract-dishonest",
    "message": "4/5 · MISSING: governing_law",
    "hashes": {
      "criteria": "dc19ca94f8a0d925f52ed97fac7708e46a6c305c00e74ea719630c328b254e37",
      "delivery": "7f7121ad9377dd1837ae30512e8803196928dd80c71de47f7da8292f7ce0c90f",
      "report": "ea5c542098cabc13e6d87cd0c46cc709208319390db5ebc57ebc031ff21850da"
    }
  },
  {
    "template": "address",
    "behavior": "honest",
    "designatedAgent": false,
    "missionReference": "SIM-MISSION-address-honest",
    "message": "12/12 ROWS VALID",
    "hashes": {
      "criteria": "6a1653a0cc6939f8eac886ba4e23c9e0b4a746c6f5167d48888bdaef21b1a2f4",
      "delivery": "7fccb5ee6bda7ee3344c57b9739c04991a62532c09cc3f5400683a7e2e0ce784",
      "report": "0430753bc25ae77fc674d0b6c8d0c9bf8a16ae43f1de4b753853f326e65eaddf"
    }
  },
  {
    "template": "address",
    "behavior": "dishonest",
    "designatedAgent": false,
    "missionReference": "SIM-MISSION-address-dishonest",
    "message": "11/12 · INVALID POSTCODE, ROW 7",
    "hashes": {
      "criteria": "6a1653a0cc6939f8eac886ba4e23c9e0b4a746c6f5167d48888bdaef21b1a2f4",
      "delivery": "c9f32b9c1d5a105afd20373a7db6c94caa6944300915eb2379193f6376393f30",
      "report": "16f88af6d2436ddf1d3bc6dafb51d4fb43f82dd8a3ef5bb3fb430c5d1227cdbe"
    }
  },
  {
    "template": "invoice",
    "behavior": "honest",
    "designatedAgent": true,
    "missionReference": "SIM-MISSION-invoice-designated",
    "message": "6/6 FIELDS VALID",
    "hashes": {
      "criteria": "6cd24534940273abb71902f23eef17e7dd4fd7a4ed632641e951200935d082dc",
      "delivery": "4b8d8320b71af526db9cb17730d14d9275cd7d975df3819b45d42bae7be73335",
      "report": "4bc5292a24c79b782edaaf7b6c35f4dbd5a8f4b07d7bee2c2eaf24265468cefd"
    }
  }
];
const output = resolve(process.env.QA_OUTPUT || 'artifacts/real-logic-console/standalone');
const csp = "default-src 'none'; script-src 'self'; connect-src 'none'; img-src data:; base-uri 'none'; object-src 'none'";
const evidence = {
  schemaVersion: 1, capturedAt: new Date().toISOString(), passed: false,
  scope: 'Exact vendored console-core module alone; no site code, shared counter, Pages Functions or D1.',
  provenance: {
    commit: SOURCE_COMMIT,
    harness: SOURCE_BASE + 'scripts/test-console-browser.mjs',
    vectors: SOURCE_BASE + 'docs/testing/CONSOLE-5a/console-browser/summary.json',
    expectedBundleSha256: SOURCE_SHA256,
  },
  method: {
    bootstrap: 'Loopback ephemeral port; load only HTML, external harness and exact verified vendor bytes.',
    boundary: 'Complete preload and negative CSP control, reset observations, set context offline, start measurement BEFORE invoking any mission.',
    observation: 'Playwright request events including failed attempts, WebSocket events, console/page errors and native securitypolicyviolation events.',
    deferredEvents: 'Drain the next browser task and a CDP command after completion before reading observations.',
    networkExceptionsDuringMissions: [],
  },
  csp, cspNegativeControlBlocked: false, controlViolations: [], controlConsoleErrors: [],
  offlineDuringMissions: false, networkRequestsDuringMissions: [], webSocketsDuringMissions: [],
  browserErrorsDuringMissions: [], cspViolationsDuringMissions: [], scenarios: [], serverRequests: [],
};
await mkdir(output, { recursive: true });
let browser, server, measuring = false;

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}

try {
  const verified = verifyConsoleCoreDirectory();
  assert.equal(verified.commit, SOURCE_COMMIT, 'Update reviewed vectors when the source commit changes');
  assert.equal(verified.hash, SOURCE_SHA256, 'Test the exact Part A bytes');
  const moduleBytes = readFileSync(join(VENDOR_DIRECTORY, BUNDLE_NAME));
  assert.equal(sha256(moduleBytes), verified.hash, 'Served bytes must equal the integrity-checked file');
  evidence.bundleSha256 = verified.hash;
  evidence.bundleBytes = moduleBytes.length;

  const harness = "\nimport { prepareMission, runMission } from '/console-core.mjs';\nconst cases = __CASES__;\nwindow.violations = [];\nwindow.addEventListener('securitypolicyviolation', event => {\n  window.violations.push({ directive: event.effectiveDirective, blocked: event.blockedURI });\n});\n// The forbidden constructor exists only in this negative-control harness.\ndocument.getElementById('control').addEventListener('click', () => {\n  try { new Function('return 1')(); window.controlBlocked = false; }\n  catch (error) { window.controlBlocked = error.name === 'EvalError'; }\n});\ndocument.getElementById('run').addEventListener('click', async () => {\n  try {\n    const results = [];\n    for (const row of cases) {\n      const prepared = await prepareMission(row.template, row.behavior, {\n        missionReference: row.missionReference, designatedAgent: row.designatedAgent ? 'agent' : null,\n      });\n      const steps = [];\n      if (!row.designatedAgent) {\n        for await (const step of runMission(row.template, row.behavior)) steps.push(step);\n      }\n      results.push({ missionReference: row.missionReference, artifacts: prepared.artifacts,\n        trace: prepared.trace, final: prepared.final, steps });\n    }\n    window.results = JSON.parse(JSON.stringify(results, (_key, value) => typeof value === 'bigint' ? value.toString() : value));\n  } catch (error) { window.failure = error.stack || String(error); }\n  window.done = true;\n});\nwindow.ready = true;\n".replace('__CASES__', JSON.stringify(cases));
  const html = '<!doctype html><html><head><meta charset="utf-8"><link rel="icon" href="data:,"><title>Standalone console-core proof</title></head><body><button id="control">CSP control</button><button id="run">Run standalone missions</button><script type="module" src="/harness.mjs"></script></body></html>';
  server = createServer((request, response) => {
    evidence.serverRequests.push({ method: request.method, path: request.url, duringMissions: measuring });
    response.setHeader('Content-Security-Policy', csp);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    const content = request.url === '/' ? html : request.url === '/harness.mjs' ? harness
      : request.url === '/console-core.mjs' ? moduleBytes : null;
    if (request.method !== 'GET' || content === null) { response.writeHead(404); response.end(); return; }
    response.setHeader('Content-Type', request.url === '/' ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8');
    response.end(content);
  });
  await new Promise((resolveListening, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolveListening);
  });
  const origin = 'http://127.0.0.1:' + server.address().port;
  evidence.loopbackOrigin = origin;
  browser = await chromium.launch({ headless: true });
  evidence.engine = 'Real headless Chromium ' + browser.version();
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(20000);
  const cdp = await context.newCDPSession(page);
  context.on('request', request => {
    if (measuring) evidence.networkRequestsDuringMissions.push({ url: request.url(), method: request.method(), resourceType: request.resourceType() });
  });
  page.on('websocket', socket => {
    if (measuring) evidence.webSocketsDuringMissions.push(socket.url());
  });
  page.on('pageerror', error => {
    if (measuring) evidence.browserErrorsDuringMissions.push({ kind: 'pageerror', message: error.message });
  });
  page.on('console', message => {
    if (message.type() !== 'error') return;
    if (measuring) evidence.browserErrorsDuringMissions.push({ kind: 'console', message: message.text() });
    else evidence.controlConsoleErrors.push(message.text());
  });

  const response = await page.goto(origin + '/', { waitUntil: 'networkidle' });
  assert.equal(response.headers()['content-security-policy'], csp);
  await page.waitForFunction(() => globalThis.ready === true);
  await page.getByRole('button', { name: 'CSP control', exact: true }).click();
  await page.waitForFunction(() => globalThis.controlBlocked !== undefined && globalThis.violations.length > 0);
  assert.equal(await page.evaluate(() => globalThis.controlBlocked), true, 'The real event-handler Function constructor must be blocked');
  evidence.controlViolations = await page.evaluate(() => globalThis.violations);
  assert(evidence.controlViolations.some(item => item.directive === 'script-src' && item.blocked === 'eval'));
  evidence.cspNegativeControlBlocked = true;
  await page.evaluate(() => new Promise(resolveTask => setTimeout(resolveTask, 0)));
  await cdp.send('Runtime.evaluate', { expression: 'void 0' });
  await page.evaluate(() => { globalThis.violations = []; });
  await context.setOffline(true);
  evidence.offlineDuringMissions = true;
  measuring = true;
  await page.getByRole('button', { name: 'Run standalone missions', exact: true }).click();
  await page.waitForFunction(() => globalThis.done === true);
  await page.evaluate(() => new Promise(resolveTask => setTimeout(resolveTask, 0)));
  await cdp.send('Runtime.evaluate', { expression: 'void 0' });
  const actual = await page.evaluate(() => ({
    results: globalThis.results, failure: globalThis.failure, violations: globalThis.violations,
  }));
  evidence.cspViolationsDuringMissions = actual.violations;
  assert.equal(actual.failure, undefined, actual.failure);
  assert.deepEqual(actual.violations, [], 'No native CSP violation during any computation');
  assert.deepEqual(evidence.browserErrorsDuringMissions, [], 'No browser errors during module execution');
  assert.deepEqual(evidence.networkRequestsDuringMissions, [], 'No network attempt, including counter traffic or failed requests');
  assert.deepEqual(evidence.webSocketsDuringMissions, [], 'No WebSocket attempt');
  assert.equal(actual.results.length, 7);
  assert(evidence.serverRequests.every(request => request.method === 'GET'
    && ['/', '/harness.mjs', '/console-core.mjs'].includes(request.path) && !request.duringMissions),
  'Only the three bootstrap resources may reach this server');

  for (const [index, expected] of cases.entries()) {
    const result = actual.results[index];
    assert.equal(result.missionReference, expected.missionReference);
    const hashes = {};
    for (const kind of ['criteria', 'delivery', 'report']) {
      const artifact = result.artifacts[kind];
      assert.equal(artifact.json, JSON.stringify(canonical(artifact.value)) + '\n', 'Canonical JSON including LF');
      const hash = sha256(Buffer.from(artifact.json, 'utf8'));
      assert.equal(hash, artifact.hash, 'Independently recomputed artifact SHA');
      assert.equal(hash, expected.hashes[kind], 'Artifact SHA matches reviewed Part A vector');
      hashes[kind] = hash;
    }
    const report = result.artifacts.report.value;
    const passed = expected.behavior === 'honest';
    assert.equal(report.message, expected.message);
    assert.equal(report.pass, passed);
    assert.equal(report.mission, expected.missionReference);
    assert.equal(report.criteria_hash, hashes.criteria);
    assert.equal(report.delivery_hash, hashes.delivery);
    assert.equal(result.final.status, passed ? 'settled' : 'refunded');
    assert.deepEqual(result.final.balances, { client: passed ? '95000000' : '100000000', agent: passed ? '5000000' : '0', vault: '0' });
    assert.deepEqual(result.trace.map(step => step.after.status),
      ['open', 'accepted', 'submitted', passed ? 'passed' : 'failed', passed ? 'settled' : 'refunded']);
    if (!expected.designatedAgent) {
      const steps = result.steps;
      assert.deepEqual(steps.map(step => step.station), [1, 2, 3, 4, 5]);
      assert.equal(steps[3].text, 'INSPECTION · ' + expected.message);
      assert.equal(steps[3].failed, !passed);
      assert.equal(steps[4].outcome, passed ? 'settled' : 'returned');
      assert.equal(steps[4].failed, !passed);
      assert.deepEqual(steps[4].report, report);
      assert.deepEqual(steps[4].hashes, hashes);
      assert.match(steps[0].text, /SIM-TX-LOCK-[a-f0-9]{8}$/);
      assert.match(steps[2].text, /sha256:[a-f0-9]{4}…[a-f0-9]{4}$/);
      assert.match(steps[4].text, /SIM-TX-CLOSE-[a-f0-9]{8}$/);
    }
    evidence.scenarios.push({ template: expected.template, behavior: expected.behavior,
      designatedAgent: expected.designatedAgent, missionReference: expected.missionReference,
      validatorMessage: report.message, finalStatus: result.final.status, finalBalances: result.final.balances,
      hashes, passed: true, publicRunMissionChecked: !expected.designatedAgent });
  }
  evidence.passed = true;
} catch (error) {
  evidence.failure = { name: error.name, message: error.message, stack: error.stack };
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server?.listening) {
    server.closeAllConnections();
    await new Promise((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()));
  }
  await writeFile(join(output, 'standalone-core.json'), JSON.stringify(evidence, null, 2) + '\n');
}
console.log(JSON.stringify({ passed: evidence.passed, scenarios: evidence.scenarios.length,
  offline: evidence.offlineDuringMissions, bundleSha256: evidence.bundleSha256,
  networkRequests: evidence.networkRequestsDuringMissions.length,
  browserErrors: evidence.browserErrorsDuringMissions.length, output, failure: evidence.failure?.message }, null, 2));
