import test from 'node:test';
import assert from 'node:assert/strict';
import { isCounterRequest, isCounterResource, offlineCounterRequestForLog, classifyBrowserErrors, OFFLINE_COUNTER_ERROR } from '../scripts/console-network-policy.mjs';

const origin = 'http://127.0.0.1:4332';
const url = origin + '/api/mission-counter';
const request = { id: 'counter-1', url, method: 'POST', startTime: 125, offline: true, failed: true, failure: 'net::ERR_INTERNET_DISCONNECTED' };
const nativeLog = { source: 'network', level: 'error', text: OFFLINE_COUNTER_ERROR, url, networkRequestId: request.id, timestamp: 1000 };
const error = { kind: 'console', message: OFFLINE_COUNTER_ERROR, url, observedAt: 1002 };

test('counter exception accepts only the exact origin, path and GET/POST method', () => {
  for (const method of ['GET', 'POST']) assert.equal(isCounterRequest({ url, method }, origin), true);
  for (const method of ['PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH', 'get', '', undefined]) {
    assert.equal(isCounterRequest({ url, method }, origin), false, String(method));
  }
  for (const wrong of [
    '/api/mission-counter', url + '/', url + '?', url + '?receipt=1', url + '#',
    url + '/extra', origin + '/api/mission-counterfeit', origin + '/api/%6dission-counter',
    origin + '/api/a/../mission-counter', origin + '//api/mission-counter',
    'http://localhost:4332/api/mission-counter', 'http://127.0.0.1:4333/api/mission-counter',
    'https://127.0.0.1:4332/api/mission-counter', 'http://user@127.0.0.1:4332/api/mission-counter',
    'http://127.0.0.1:4332.attacker.invalid/api/mission-counter',
  ]) assert.equal(isCounterRequest({ url: wrong, method: 'GET' }, origin), false, wrong);
});

test('ResourceTiming needs an attributed allowed method; unknown or conflicting evidence fails closed', () => {
  const resource = { name: url, initiatorType: 'fetch', startTime: 125.2 };
  assert.equal(isCounterResource(resource, [request], origin), true);
  assert.equal(isCounterResource(resource, [], origin), false);
  assert.equal(isCounterResource(resource, [{ ...request, method: 'DELETE' }], origin), false);
  assert.equal(isCounterResource(resource, [request, { ...request, id: 'wrong', method: 'DELETE' }], origin), false);
  assert.equal(isCounterResource(resource, [{ ...request, startTime: 100 }], origin), false);
  assert.equal(isCounterResource({ ...resource, name: url + '?x' }, [request], origin), false);
  assert.equal(isCounterResource({ ...resource, initiatorType: 'script' }, [request], origin), false);
});

test('offline exception requires the precise failed request, method, URL and native CDP request ID', () => {
  assert.equal(offlineCounterRequestForLog(nativeLog, [request], origin), request);
  for (const patch of [
    { offline: false }, { failed: false }, { failure: 'net::ERR_FAILED' },
    { url: url + '?x' }, { method: 'DELETE' }, { id: 'unrelated' },
  ]) assert.equal(offlineCounterRequestForLog(nativeLog, [{ ...request, ...patch }], origin), null);
  for (const patch of [
    { source: 'javascript' }, { level: 'warning' }, { networkRequestId: undefined },
    { url: origin + '/other' }, { text: 'Failed to load resource: the server responded with a status of 503' },
  ]) assert.equal(offlineCounterRequestForLog({ ...nativeLog, ...patch }, [request], origin), null);
});

test('generic pageerror, JS console.error and unmatched or duplicated network messages still fail', () => {
  const known = classifyBrowserErrors([error], [nativeLog], [request], origin);
  assert.deepEqual(known.unexpected, []);
  assert.deepEqual(known.unexpectedNetworkErrors, []);
  assert.equal(known.allowedCounterErrors[0].method, 'POST');
  assert.equal(known.allowedCounterErrors[0].requestId, request.id);
  for (const value of [
    { ...error, kind: 'pageerror' },
    { ...error, message: 'Counter unavailable' },
    { ...error, url: origin + '/_astro/console.js' },
    { ...error, observedAt: 9999 },
  ]) assert.equal(classifyBrowserErrors([value], [nativeLog], [request], origin).unexpected.length, 1);
  assert.equal(classifyBrowserErrors([error], [], [request], origin).unexpected.length, 1);
  assert.equal(classifyBrowserErrors([error, error], [nativeLog], [request], origin).unexpected.length, 1);
  assert.equal(classifyBrowserErrors([], [{ ...nativeLog, url: origin + '/other' }], [request], origin).unexpectedNetworkErrors.length, 1);
});
