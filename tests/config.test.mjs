import test from 'node:test';
import assert from 'node:assert/strict';
import { site, isProduction, robotsText } from '../src/config/site.mjs';

test('production is indexable while the contract stays absent', () => {
  assert.equal(site.LAUNCHED, false);
  assert.equal(site.CONTRACT_ADDRESS, null);
  const production = { CF_PAGES: '1', CF_PAGES_BRANCH: 'main' };
  assert.equal(isProduction(production), true);
  assert.match(robotsText(production), /Allow: \/\n/);
  assert.doesNotMatch(robotsText(production), /Disallow/);
});

test('previews and local builds cannot be indexed', () => {
  for (const env of [{ CF_PAGES: '1', CF_PAGES_BRANCH: 'codex/site-pass-1' }, { CF_PAGES_BRANCH: 'main' }, undefined]) {
    assert.equal(isProduction(env), false);
    assert.match(robotsText(env), /Disallow: \/\n/);
  }
});
