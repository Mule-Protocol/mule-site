import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transform } from '@astrojs/compiler-rs';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { site } from '../src/config/site.mjs';
import { riskWarning } from '../src/data/legal.mjs';

// Use Astro's installed compiler and renderer; no browser or test-only component props.
const footerUrl = new URL('../src/components/Footer.astro', import.meta.url);
const compiled = transform(await readFile(footerUrl, 'utf8'), {
  filename: footerUrl.pathname, internalURL: 'astro/compiler-runtime', resultScopedSlot: true,
  resolvePath: specifier => specifier,
});
async function renderFooter(legalPublished = site.LEGAL_PUBLISHED) {
  const configUrl = `data:text/javascript;base64,${Buffer.from(`export const site = ${JSON.stringify({ ...site, LEGAL_PUBLISHED: legalPublished })}`).toString('base64')}`;
  const code = compiled.code.replace(/from "([^"]+)"/g, (_, specifier) => {
    const url = specifier === '../config/site.mjs' ? configUrl
      : specifier.startsWith('.') ? new URL(specifier, footerUrl).href : import.meta.resolve(specifier);
    return `from ${JSON.stringify(url)}`;
  });
  const { default: Footer } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  return (await AstroContainer.create()).renderToString(Footer);
}

test('unpublished footer omits draft links and retains X, GitHub, Dossier and the full warning', async () => {
  const html = await renderFooter();
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(hrefs, [site.X_URL, site.GITHUB_URL, '/dossier/']);
  for (const label of ['Legal notice', 'Privacy', 'Risks']) assert.ok(!html.includes(label));
  assert.ok(html.includes(riskWarning));
});

test('published footer restores the three legal links without changing the warning', async () => {
  const html = await renderFooter(true);
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(hrefs, [site.X_URL, site.GITHUB_URL, '/dossier/', '/legal/', '/privacy/', '/risks/']);
  assert.ok(html.includes(riskWarning));
});
