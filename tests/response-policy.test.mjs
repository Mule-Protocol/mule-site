import test from 'node:test';
import assert from 'node:assert/strict';
import { applyResponsePolicy, securityHeaders } from '../src/server/response-policy.mjs';

test('www redirects with 301 and preserves the path and query', async () => {
  const response = await applyResponsePolicy(new Request('https://www.muleprotocol.com/dossier?source=x'), () => {
    throw new Error('Redirect must happen before serving an asset.');
  });
  assert.equal(response.status, 301);
  assert.equal(response.headers.get('location'), 'https://muleprotocol.com/dossier?source=x');
});

test('apex stays public; Pages hosts and errors are noindex with security headers', async () => {
  for (const host of ['muleprotocol.com', 'mule.pages.dev', 'review.mule.pages.dev']) {
    for (const status of [200, 404]) {
      const response = await applyResponsePolicy(new Request(`https://${host}/`), async () => new Response('page', { status, headers: { 'Access-Control-Allow-Origin': '*' } }));
      assert.equal(response.status, status);
      assert.equal(await response.text(), 'page');
      assert.equal(response.headers.get('access-control-allow-origin'), null);
      assert.equal(response.headers.get('x-robots-tag'), host === 'muleprotocol.com' ? null : 'noindex, nofollow');
      for (const [name, value] of Object.entries(securityHeaders)) assert.equal(response.headers.get(name), value);
    }
  }
});
test('every mission path remains noindex on the production host', async () => {
  for (const path of ['/m','/m/0042-s-inv-20261007','/m/0042-s-inv-20261007/og.png','/m/unknown/nested/path']) {
    const response=await applyResponsePolicy(new Request(`https://muleprotocol.com${path}`),()=>new Response('Draft'));
    assert.equal(response.headers.get('X-Robots-Tag'),'noindex, nofollow');
  }
});
