import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const output = process.env.QA_OUTPUT || 'artifacts/pass-1-corrections';
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4321/';
const stepNames = ['Load', 'Lock', 'Transit', 'Inspect', 'Settle'];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
async function toggleMotion(page) {
  // Click the sticky control where the reader sees it; locator auto-scrolling can move the page first.
  const box = await page.getByRole('button', { name: 'Pause animations', exact: true }).boundingBox();
  assert.ok(box && box.y >= 0 && box.y + box.height <= 60);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}
async function checkAccessibleSteps(page, mode, width) {
  const tree = await page.locator('#lifecycle').ariaSnapshot();
  for (const name of stepNames) {
    assert.equal(tree.toLowerCase().split(`heading "${name.toLowerCase()}"`).length - 1, 1, `${mode}: ${name} appears exactly once`);
  }
  assert.equal((tree.match(/- listitem:/g) || []).length, 5, `${mode}: five accessible steps`);
  if (width === 375) await writeFile(`${output}/accessibility-${mode}.txt`, tree);
}
try {
  for (const width of [360, 375, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: width < 768 ? 812 : 960 }, deviceScaleFactor: 1 });
    page.setDefaultTimeout(15000);
    const errors = [], requests = [];
    page.on('pageerror', err => errors.push(err.message));
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    page.on('request', req => requests.push(req.url()));
    await page.goto(base, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.documentElement.classList.contains('motion-ready'));
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow at ${width}px`);
    assert.equal(await page.locator('h1').innerText(), 'PAY AI AGENTS ON DELIVERY.');
    const font = await page.locator('h1').evaluate(el => ({ family: getComputedStyle(el).fontFamily, ready: document.fonts.check('800 44px Archivo') }));
    assert.equal(font.ready, true);
    await page.screenshot({ path: `${output}/hero-${width}.png` });
    if (width < 768) {
      const firstButton = await page.locator('.hero__ctas a').first().boundingBox();
      assert.ok(firstButton.y + firstButton.height <= 812, 'First hero CTA fits on the initial mobile screen');
    }
    await checkAccessibleSteps(page, 'animated', width);
    const positions = await page.locator('#lifecycle').evaluate(el => ({ top: el.offsetTop - 56, span: el.offsetHeight - innerHeight + 56 }));
    const labels = [], transitions = [], geometry = [];
    for (let i = 0; i < 5; i++) {
      console.log(`QA ${width}px: step ${i + 1}`);
      await page.evaluate(y => scrollTo(0, y), positions.top + positions.span * ((i + .2) / 5));
      await page.waitForFunction(() => document.querySelector('#lifecycle').dataset.animated === 'true');
      await page.waitForFunction(step => document.querySelector('#stage').getAttribute('data-step') === String(step), i + 1, { timeout: 5000 }).catch(async error => {
        console.log({ width, expectedStep: i + 1, positions, actual: await page.evaluate(() => ({ y: scrollY, step: document.querySelector('#stage').dataset.step, off: document.documentElement.dataset.motion, viewBox: document.querySelector('#stage').getAttribute('viewBox') })) });
        throw error;
      });
      if (width < 768) await page.waitForFunction(() => document.querySelector('#stage').viewBox.baseVal.width === 270);
      const stateSelector = ['.st-criteria', '.st-crate-lock', '.st-crate-lock', '.m1-scene-4 .m1-scan-beam', '.st-out'][i];
      await page.waitForFunction(selector => Number(getComputedStyle(document.querySelector(`#stage ${selector}`)).opacity) > 0, stateSelector);
      await page.waitForFunction(() => document.querySelector('#lifecycle [data-flip]').textContent === '03');
      labels.push(await page.locator('#lcLabel').innerText());
      const measurements = await page.evaluate(() => {
        const stage = document.querySelector('#stage').getBoundingClientRect();
        const mule = document.querySelector('#lcMuleInner');
        const range = document.createRange();
        range.selectNodeContents(document.querySelector('#lcAnnotation'));
        return {
          stageWidth: stage.width, stageHeight: stage.height,
          muleWidth: mule.getBBox().width * mule.getScreenCTM().a,
          annotationHeight: range.getBoundingClientRect().height,
          labelDisplay: getComputedStyle(document.querySelector('.station-labels')).display,
          sectionLabelTop: document.querySelector('.lc-pin .sec-label').getBoundingClientRect().top,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert.equal(measurements.overflow, false);
      if (width < 768) {
        assert.ok(measurements.muleWidth > 190, `Mobile mule is large enough to read (${JSON.stringify(measurements)})`);
        assert.ok(measurements.annotationHeight >= 11, 'Mobile annotation is at least 11 screen pixels');
        assert.equal(measurements.labelDisplay, 'none');
        assert.ok(measurements.sectionLabelTop <= 100, 'No large blank space above the section title');
      }
      geometry.push(measurements);
      if ((width === 375 || width === 1440) && (i === 0 || i === 3)) await page.screenshot({ path: `${output}/lifecycle-${width}-step-${i + 1}.png` });
      await toggleMotion(page);
      assert.equal(await page.locator('#motionToggle').getAttribute('aria-pressed'), 'true');
      await checkAccessibleSteps(page, 'paused', width);
      const card = await page.locator(`#lifecycle-step-${i + 1}`).boundingBox();
      assert.ok(card.y >= 56 && card.y < 812 - 120, `Step ${i + 1} remains in view on pause (${card.y})`);
      const atDocumentEnd = await page.evaluate(() => Math.abs(document.documentElement.scrollHeight - innerHeight - scrollY) < 2);
      assert.ok(Math.abs(card.y - 72) < 2 || atDocumentEnd, `Pause anchors step ${i + 1}, not just a nearby card (${card.y})`);
      if (width === 375 && i === 3) await page.screenshot({ path: `${output}/pause-375-step-4.png` });
      await toggleMotion(page);
      try {
        await page.waitForFunction(step => document.querySelector('#lifecycle').dataset.animated === 'true' && document.querySelector('#stage').getAttribute('data-step') === String(step) && document.querySelector('.lifecycle-static').classList.contains('sr-only'), i + 1, { timeout: 5000 });
      } catch (error) {
        console.log({ width, step: i + 1, errors, state: await page.evaluate(() => ({ y: scrollY, step: document.querySelector('#stage').dataset.step, motion: document.documentElement.dataset.motion, classes: document.documentElement.className, staticClass: document.querySelector('.lifecycle-static').className })) });
        await page.screenshot({ path: `${output}/failed-resume.png` });
        throw error;
      }
      await page.waitForFunction(step => {
        const el = document.querySelector('#lifecycle');
        const p = (scrollY - (el.offsetTop - 56)) / (el.offsetHeight - innerHeight + 56);
        return Math.min(4, Math.floor(p * 5)) === step;
      }, i, { timeout: 5000 }).catch(async error => {
        console.log({ width, step: i + 1, errors, resume: await page.evaluate(() => { const el = document.querySelector('#lifecycle'); return { y: scrollY, top: el.offsetTop, height: el.offsetHeight, viewport: innerHeight, step: document.querySelector('#stage').dataset.step }; }) });
        throw error;
      });
      transitions.push({ step: i + 1, pausedCardTop: card.y, resumedStep: Number(await page.locator('#stage').getAttribute('data-step')) });
      console.log(transitions.at(-1));
    }
    assert.deepEqual(labels.map(x => x.toLowerCase()), ['load', 'lock', 'transit', 'inspect', 'settle']);
    await toggleMotion(page);
    assert.equal(await page.locator('.lifecycle-static li').count(), 5);
    assert.equal(await page.locator('.lifecycle-static').isVisible(), true);
    assert.equal(await page.locator('#trail').isVisible(), false);
    // A manual scroll while paused must select the card with its top nearest 72px.
    await page.locator('#lifecycle-step-4').evaluate(el => scrollTo(0,scrollY+el.getBoundingClientRect().top-110));
    await toggleMotion(page);
    await page.waitForFunction(()=>document.querySelector('#lifecycle').dataset.animated==='true' && document.querySelector('#stage').dataset.step==='4');
    await toggleMotion(page);
    if (width < 900) {
      await page.getByRole('button', { name: 'Open navigation menu' }).click();
      assert.equal(await page.locator('#mobileMenu').isVisible(), true);
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#mobileMenu').isVisible(), false);
      assert.equal(await page.locator('#menuOpen').getAttribute('aria-expanded'), 'false');
      await page.getByRole('button', { name: 'Open navigation menu' }).click();
      await page.getByRole('button', { name: 'Close navigation menu' }).click();
      assert.equal(await page.locator('#menuOpen').getAttribute('aria-expanded'), 'false');
      await page.getByRole('button', { name: 'Open navigation menu' }).click();
      await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('link', { name: 'Mission →' }).click();
      assert.equal(await page.locator('#menuOpen').getAttribute('aria-expanded'), 'false');
    }
    const external = requests.filter(url => !url.startsWith(base));
    assert.deepEqual(external, []);
    assert.deepEqual(errors, []);
    results.push({ width, horizontalOverflow: false, lifecycle: labels, transitions, geometry, accessibleStepsExactlyOnce: true, externalRequests: external, errors, font });
    await page.close();
  }
  const reduced = await browser.newPage({ viewport: { width: 375, height: 812 }, reducedMotion: 'reduce' });
  await reduced.goto(base, { waitUntil: 'networkidle' });
  await checkAccessibleSteps(reduced, 'reduced-motion', 375);
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
  await noJs.goto(base);
  await checkAccessibleSteps(noJs, 'no-javascript', 375);
  assert.equal(await noJs.locator('.lifecycle-static').isVisible(), true);
  assert.equal(await noJs.locator('.lifecycle-static li').count(), 5);
  results.push({ javaScriptDisabled: true, readableSteps: 5 });
  await noJs.close();
  await writeFile(`${output}/browser-qa.json`, JSON.stringify({ capturedAt: new Date().toISOString(), url: base, engine: 'Chromium headless; not physical devices', results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
