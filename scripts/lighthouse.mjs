import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { chromium } from '@playwright/test';
import { writeFile, mkdir } from 'node:fs/promises';

const target=process.env.QA_URL || 'http://127.0.0.1:4321/';
const output=process.env.QA_OUTPUT || 'artifacts/pass-2/lighthouse-home';
await mkdir(output,{recursive:true});

const chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-first-run'], logLevel: 'silent' });
try {
  const result = await lighthouse(target, {
    port: chrome.port,
    output: ['json', 'html'],
    logLevel: 'error',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  });
  await writeFile(`${output}/report.json`, result.report[0]);
  await writeFile(`${output}/report.html`, result.report[1]);
  const { audits, categories, configSettings } = result.lhr;
  const metrics = {
    measuredAt: result.lhr.fetchTime,
    url: result.lhr.finalDisplayedUrl,
    environment: 'Local preview, simulated mobile throttling; not a live domain or physical phone.',
    performance: Math.round(categories.performance.score * 100),
    accessibility: Math.round(categories.accessibility.score * 100),
    lcpMs: audits['largest-contentful-paint'].numericValue,
    cls: audits['cumulative-layout-shift'].numericValue,
    transferredBytes: audits['total-byte-weight'].numericValue,
    throttling: configSettings.throttling,
    failedAudits: Object.entries(audits).filter(([,a]) => a.score !== null && a.score < 1).map(([id,a]) => ({ id, score: a.score, title: a.title, displayValue: a.displayValue })),
  };
  await writeFile(`${output}/summary.json`, JSON.stringify(metrics, null, 2));
  console.log(JSON.stringify(metrics, null, 2));
} finally { chrome.kill(); }
