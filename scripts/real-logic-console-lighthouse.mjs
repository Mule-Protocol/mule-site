import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
const [phase, url] = process.argv.slice(2);
if (!['before', 'after'].includes(phase) || !/^http:\/\/127\.0\.0\.1:\d+\/$/.test(url || '')) throw new Error('Usage: node scripts/real-logic-console-lighthouse.mjs before|after http://127.0.0.1:PORT/');
const runs = [];
const out = 'docs/qa-real-logic-console';
await mkdir(out, { recursive: true });
for (let index = 1; index <= 3; index++) {
  const directory = 'artifacts/real-logic-console/lighthouse-' + phase + '-' + index;
  await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ['scripts/lighthouse.mjs'], { env: { ...process.env, QA_URL: url, QA_OUTPUT: directory }, stdio: ['ignore', 'ignore', 'inherit'] });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolve() : reject(new Error('Lighthouse failed: ' + code)));
  });
  const lhr = JSON.parse(await readFile(directory + '/report.json', 'utf8'));
  const scores = Object.fromEntries(Object.entries(lhr.categories).map(([name, category]) => [name, Math.round(category.score * 100)]));
  const metrics = Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'cumulative-layout-shift', 'total-blocking-time', 'speed-index', 'total-byte-weight'].map(name => [name, lhr.audits[name].numericValue]));
  runs.push({ index, measuredAt: lhr.fetchTime, lighthouseVersion: lhr.lighthouseVersion, scores, metrics, environment: lhr.environment, formFactor: lhr.configSettings.formFactor, throttlingMethod: lhr.configSettings.throttlingMethod, throttling: lhr.configSettings.throttling, failedAudits: Object.entries(lhr.audits).filter(([, a]) => a.score !== null && a.score < 1).map(([id, a]) => ({ id, score: a.score, title: a.title, displayValue: a.displayValue })) });
  console.log(JSON.stringify({ phase, index, scores, metrics }));
}
const median = values => [...values].sort((a, b) => a - b)[1];
const result = { phase, url, environment: 'Local immutable build with production-equivalent apex headers; HTTP loopback, simulated mobile. No live deployment.', runs, medianScores: Object.fromEntries(Object.keys(runs[0].scores).map(key => [key, median(runs.map(run => run.scores[key]))])), medianMetrics: Object.fromEntries(Object.keys(runs[0].metrics).map(key => [key, median(runs.map(run => run.metrics[key]))])) };
await writeFile(out + '/lighthouse-' + phase + '.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.medianScores));
