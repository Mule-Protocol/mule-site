import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const chrome = await launch({ chromePath: chromium.executablePath(), chromeFlags: ['--headless=new', '--no-first-run'], logLevel: 'silent' });
try {
  const result = await lighthouse('http://127.0.0.1:4321/', {
    port: chrome.port,
    output: ['json', 'html'],
    logLevel: 'error',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
  });
  await writeFile('artifacts/pass-1/lighthouse-mobile.json', result.report[0]);
  await writeFile('artifacts/pass-1/lighthouse-mobile.html', result.report[1]);
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
  await writeFile('artifacts/pass-1/lighthouse-summary.json', JSON.stringify(metrics, null, 2));
  console.log(JSON.stringify(metrics, null, 2));
} finally { await chrome.kill(); }
