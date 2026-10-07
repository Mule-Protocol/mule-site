import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const output = 'artifacts/pass-1';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
try {
  for (const width of [360, 375, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: width < 768 ? 812 : 960 }, deviceScaleFactor: 1 });
    const errors = [], requests = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('request', req => requests.push(req.url()));
    await page.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.documentElement.classList.contains('motion-ready'));
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow at ${width}px`);
    assert.equal(await page.locator('h1').innerText(), 'PAY AI AGENTS ON DELIVERY.');
    const font = await page.locator('h1').evaluate(el => ({ family: getComputedStyle(el).fontFamily, ready: document.fonts.check('800 44px Archivo') }));
    assert.equal(font.ready, true);
    await page.screenshot({ path: `${output}/hero-${width}.png` });
    const positions = await page.locator('#lifecycle').evaluate(el => ({ top: el.offsetTop - 56, span: el.offsetHeight - innerHeight + 56 }));
    const labels = [];
    for (let i = 0; i < 5; i++) {
      await page.evaluate(y => scrollTo(0, y), positions.top + positions.span * ((i + .2) / 5));
      await page.waitForFunction(step => document.querySelector('#stage').getAttribute('data-step') === String(step), i + 1);
      const stateSelector = ['.st-criteria', '.st-crate-lock', '.st-crate-lock', '.st-scan', '.st-out'][i];
      await page.waitForFunction(selector => getComputedStyle(document.querySelector(`#stage ${selector}`)).opacity === '1', stateSelector);
      await page.waitForFunction(() => document.querySelector('[data-flip]').textContent === '03');
      labels.push(await page.locator('#lcLabel').innerText());
      if ((width === 375 || width === 1440) && (i === 0 || i === 4)) await page.screenshot({ path: `${output}/lifecycle-${width}-step-${i + 1}.png` });
    }
    assert.deepEqual(labels.map(x => x.toLowerCase()), ['load', 'lock', 'transit', 'inspect', 'settle']);
    await page.getByRole('button', { name: 'Pause animations' }).click();
    assert.equal(await page.locator('.lifecycle-static li').count(), 5);
    assert.equal(await page.locator('.lifecycle-static').isVisible(), true);
    assert.equal(await page.locator('#trail').isVisible(), false);
    if (width < 900) {
      await page.getByRole('button', { name: 'Open navigation menu' }).click();
      assert.equal(await page.locator('#mobileMenu').isVisible(), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#mobileMenu').isVisible(), false);
    }
    const external = requests.filter(url => !url.startsWith('http://127.0.0.1:4321/'));
    assert.deepEqual(external, []);
    assert.deepEqual(errors, []);
    results.push({ width, horizontalOverflow: false, lifecycle: labels, pauseWorks: true, externalRequests: external, errors, font });
    await page.close();
  }
  const reduced = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
  await reduced.goto('http://127.0.0.1:4321/', { waitUntil: 'networkidle' });
  assert.equal(await reduced.locator('.lifecycle-static').isVisible(), true);
  assert.equal(await reduced.locator('.lc-pin').evaluate(el => getComputedStyle(el).position), 'static');
  assert.equal(await reduced.evaluate(() => document.getAnimations().filter(a => a.playState === 'running').length), 0);
  await reduced.screenshot({ path: `${output}/reduced-motion-375.png`, fullPage: true });
  await reduced.keyboard.press('Tab');
  assert.equal(await reduced.evaluate(() => document.activeElement?.textContent), 'Skip to content');
  assert.equal(await reduced.evaluate(() => getComputedStyle(document.activeElement).outlineWidth), '2px');
  results.push({ reducedMotion: true, pinned: false, runningAnimations: 0, keyboardSkipLink: true });
  await reduced.close();
  const noJs = await browser.newPage({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  await noJs.goto('http://127.0.0.1:4321/');
  assert.equal(await noJs.locator('.lifecycle-static').isVisible(), true);
  assert.equal(await noJs.locator('.lifecycle-static li').count(), 5);
  results.push({ javaScriptDisabled: true, readableSteps: 5 });
  await noJs.close();
  await writeFile(`${output}/browser-qa.json`, JSON.stringify({ capturedAt: new Date().toISOString(), engine: 'Chromium (headless, local; not physical devices)', results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
