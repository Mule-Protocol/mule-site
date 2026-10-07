import test from 'node:test';
import assert from 'node:assert/strict';
import { applyResponsePolicy, securityHeaders } from '../src/server/response-policy.mjs';
import { onRequest } from '../functions/_middleware.ts';

const paths = ['/legal', '/legal/', '/privacy', '/privacy/', '/risks', '/risks/'];
const previewHosts = ['mule-site.pages.dev', 'codex-legal-hidden.mule-site.pages.dev', 'abc12345.mule-site.pages.dev'];
const errorHtml = '<!doctype html><title>404</title><h1>Wrong station.</h1>';
const notFound = async () => new Response(errorHtml, {
  headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=3600', 'Access-Control-Allow-Origin': '*' },
});
const forbidden = () => { throw new Error('Draft asset must not be served.'); };
function assertSecurity(response) {
  for (const [name, value] of Object.entries(securityHeaders)) assert.equal(response.headers.get(name), value);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
}

for (const path of paths) {
  test(`unpublished ${path}: apex 404; www 301 then the same 404`, async () => {
    for (const method of ['GET', 'HEAD', 'POST']) {
      for (const host of ['muleprotocol.com', 'www.muleprotocol.com']) {
        let request = new Request(`https://${host}${path}?review=1`, { method });
        let response = await applyResponsePolicy(request, forbidden, { notFound });
        if (host.startsWith('www.')) {
          assert.equal(response.status, 301);
          assert.equal(response.headers.get('Location'), `https://muleprotocol.com${path}?review=1`);
          assertSecurity(response);
          request = new Request(response.headers.get('Location'), { method });
          response = await applyResponsePolicy(request, forbidden, { notFound });
        }
        assert.equal(response.status, 404);
        assert.equal(response.headers.get('Content-Type'), 'text/html; charset=utf-8');
        assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
        assert.equal(response.headers.get('Cache-Control'), 'no-store');
        assert.equal(await response.text(), method === 'HEAD' ? '' : errorHtml);
        assertSecurity(response);
      }
    }
  });

  test(`${path}: preview 200 and published apex 200 remain noindex`, async () => {
    for (const legalPublished of [false, true]) {
      const hosts = [...previewHosts, ...(legalPublished ? ['muleprotocol.com', 'www.muleprotocol.com'] : [])];
      for (const host of hosts) {
        let request = new Request(`https://${host}${path}`);
        const next = () => new Response('Legal document');
        let response = await applyResponsePolicy(request, next, { legalPublished, notFound: forbidden });
        if (host.startsWith('www.')) {
          assert.equal(response.status, 301);
          request = new Request(response.headers.get('Location'));
          response = await applyResponsePolicy(request, next, { legalPublished, notFound: forbidden });
        }
        assert.equal(response.status, 200);
        assert.equal(await response.text(), 'Legal document');
        assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
        assertSecurity(response);
      }
    }
  });
}

test('middleware loads the existing 404 asset with a fresh unconditional GET', async () => {
  for (const method of ['GET', 'HEAD', 'POST']) {
    let assetCalls = 0;
    const response = await onRequest({
      request: new Request('https://muleprotocol.com/legal/?x=1', {
        method, headers: { 'If-None-Match': 'old-page', Range: 'bytes=0-1' },
        ...(method === 'POST' ? { body: 'not an asset request' } : {}),
      }),
      next: forbidden,
      env: { ASSETS: { fetch: async request => {
        assetCalls++;
        assert.equal(request.url, 'https://muleprotocol.com/404');
        assert.equal(request.method, 'GET');
        assert.equal([...request.headers].length, 0);
        assert.equal(request.body, null);
        return notFound();
      } } },
    });
    assert.equal(assetCalls, 1);
    assert.equal(response.status, 404);
    assert.equal(await response.text(), method === 'HEAD' ? '' : errorHtml);
  }
});

test('www redirects before any asset lookup, including draft routes', async () => {
  for (const path of paths) {
    const response = await onRequest({
      request: new Request(`https://www.muleprotocol.com${path}`), next: forbidden,
      env: { ASSETS: { fetch: forbidden } },
    });
    assert.equal(response.status, 301);
  }
});

test('the gate does not intercept other site routes', async () => {
  for (const path of ['/', '/dossier/', '/legalese', '/legal-example/', '/privacy-policy/', '/risks-and-limits/']) {
    const response = await applyResponsePolicy(new Request(`https://muleprotocol.com${path}`),
      () => new Response('Public page'), { notFound: forbidden });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('X-Robots-Tag'), null);
  }
});

for (const path of ['/legal//', '/legal/x', '/privacy//', '/risks/index.html', '/legal/?a=1']) {
  test(`unpublished legal prefix variant ${path} is hidden and noindex on the apex`, async () => {
    for (const method of ['GET', 'HEAD']) {
      const response = await applyResponsePolicy(new Request(`https://muleprotocol.com${path}`, { method }),
        forbidden, { legalPublished: false, notFound });
      assert.equal(response.status, 404);
      assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
      assert.equal(response.headers.get('Cache-Control'), 'no-store');
      assert.equal(await response.text(), method === 'HEAD' ? '' : errorHtml);
      assertSecurity(response);
    }
  });
}
