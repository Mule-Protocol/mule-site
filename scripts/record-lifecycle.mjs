import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts/pass-1/video', { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: 'artifacts/pass-1/video', size: { width: 1440, height: 900 } } });
const page = await context.newPage();
const video = page.video();
await page.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.documentElement.classList.contains('motion-ready'));
const position = await page.locator('#lifecycle').evaluate(el => ({ top: el.offsetTop - 56, span: el.offsetHeight - innerHeight + 56 }));
const began = performance.now();
for (let frame = 0; frame <= 100; frame++) {
  await page.evaluate(y => scrollTo(0, y), position.top + position.span * frame / 100);
  const remaining = began + (frame + 1) * 200 - performance.now();
  if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
}
await context.close();
await video.saveAs('artifacts/pass-1/lifecycle-recording.webm');
await browser.close();
console.log('Saved lifecycle-recording.webm (full capture; trim the final 20 seconds for delivery).');
