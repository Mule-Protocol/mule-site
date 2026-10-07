import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BUNDLE_NAME, VENDOR_DIRECTORY, fullCommit, sha256, sourceDocument, sourceUrls,
  verifyConsoleCoreBytes, verifyConsoleCoreDirectory } from '../scripts/console-core-integrity.mjs';
import { updateConsoleCore } from '../scripts/update-console-core.mjs';

function triplet(directory = VENDOR_DIRECTORY) {
  return { bundle: readFileSync(join(directory, BUNDLE_NAME)),
    checksum: readFileSync(join(directory, BUNDLE_NAME + '.sha256')),
    source: readFileSync(join(directory, 'SOURCE.md')) };
}
const checked = verifyConsoleCoreDirectory();
const original = triplet();

function withScratch(body) {
  const directory = mkdtempSync(join(tmpdir(), 'mule-console-integrity-'));
  return Promise.resolve().then(() => body(directory)).finally(() => rmSync(directory, { recursive: true, force: true }));
}

test('vendored bytes match both SOURCE.md and checksum, with no CR byte', () => {
  const result = verifyConsoleCoreBytes(original);
  assert.match(result.commit, /^[a-f0-9]{40}$/);
  assert.match(result.hash, /^[a-f0-9]{64}$/);
  assert.equal(result.bytes, original.bundle.byteLength);
  assert.equal(result.hash, sha256(original.bundle));
  for (const bytes of Object.values(original)) assert.equal(bytes.includes(13), false);
  assert.equal(result.urls.bundle, sourceUrls(result.commit).bundle);
});

test('offline directory verification does not call fetch', () => {
  const previous = globalThis.fetch;
  globalThis.fetch = () => { throw new Error('Network forbidden during integrity check'); };
  try { assert.deepEqual(verifyConsoleCoreDirectory(), checked); }
  finally { globalThis.fetch = previous; }
});

test('even a one-byte bundle corruption is rejected', () => {
  const bundle = Buffer.from(original.bundle);
  bundle[0] ^= 1;
  assert.throws(() => verifyConsoleCoreBytes({ ...original, bundle }), /SHA-256 differs from sidecar/);
});

test('SOURCE.md SHA mismatch is rejected even when the sidecar still matches', () => {
  const source = Buffer.from(original.source.toString('utf8').replace('SHA-256: ' + checked.hash, 'SHA-256: ' + '0'.repeat(64)));
  assert.throws(() => verifyConsoleCoreBytes({ ...original, source }), /SHA-256 differs from SOURCE.md/);
});

test('sidecar mismatch, duplicate metadata and moving source URLs are rejected', () => {
  assert.throws(() => verifyConsoleCoreBytes({ ...original,
    checksum: Buffer.from('0'.repeat(64) + '  console-core.mjs\n') }), /SHA-256 differs from sidecar/);
  assert.throws(() => verifyConsoleCoreBytes({ ...original,
    source: Buffer.concat([original.source, Buffer.from('SHA-256: ' + checked.hash + '\n')]) }), /exactly one SHA-256/);
  assert.throws(() => verifyConsoleCoreBytes({ ...original,
    source: Buffer.from(original.source.toString('utf8').replace('/' + checked.commit + '/', '/main/')) }), /source URL mismatch/);
  assert.throws(() => verifyConsoleCoreBytes({ ...original, expectedCommit: '0'.repeat(40) }), /commit mismatch/);
});

test('a CR is forbidden even after coherent recalculation of every SHA-256', () => {
  const bundle = Buffer.concat([original.bundle, Buffer.from('\r')]);
  const hash = sha256(bundle);
  assert.throws(() => verifyConsoleCoreBytes({
    bundle, checksum: Buffer.from(hash + '  console-core.mjs\n'),
    source: Buffer.from(sourceDocument(checked.commit, hash)),
  }), /CR byte forbidden/);
});

test('CRLF conversion of SOURCE.md or the checksum is explicitly rejected', () => {
  for (const name of ['source', 'checksum']) {
    const changed = Buffer.from(original[name].toString('utf8').replaceAll('\n', '\r\n'));
    assert.throws(() => verifyConsoleCoreBytes({ ...original, [name]: changed }), /CR byte forbidden/);
  }
});

test('update rejects branches, tags and short hashes before any network call', async () => {
  let calls = 0;
  for (const value of ['main', 'v0.1', checked.commit.slice(0, 7), '', '../main', 'z'.repeat(40)]) {
    assert.throws(() => fullCommit(value), /complete 40-hex commit/);
    await assert.rejects(updateConsoleCore(value, { fetchImpl: async () => { calls++; throw new Error('Must not fetch'); } }), /complete 40-hex commit/);
  }
  assert.equal(calls, 0);
});

test('explicit update copies exact response bytes from two immutable URLs', () => withScratch(async directory => {
  const requests = [];
  const urls = sourceUrls(checked.commit);
  const result = await updateConsoleCore(checked.commit, { directory, fetchImpl: async (url, options) => {
    requests.push(url);
    assert.equal(options.redirect, 'error');
    assert(options.signal instanceof AbortSignal);
    assert([urls.bundle, urls.checksum].includes(url));
    return new Response(url === urls.bundle ? original.bundle : original.checksum, { status: 200 });
  } });
  assert.deepEqual(requests.sort(), [urls.bundle, urls.checksum].sort());
  assert.deepEqual(readFileSync(join(directory, BUNDLE_NAME)), original.bundle);
  assert.deepEqual(readFileSync(join(directory, BUNDLE_NAME + '.sha256')), original.checksum);
  assert.deepEqual(verifyConsoleCoreDirectory(directory), result);
}));

test('failed downloaded checksum preserves every existing vendored file', () => withScratch(async directory => {
  for (const [name, bytes] of [[BUNDLE_NAME, original.bundle], [BUNDLE_NAME + '.sha256', original.checksum], ['SOURCE.md', original.source]]) {
    writeFileSync(join(directory, name), bytes);
  }
  await assert.rejects(updateConsoleCore(checked.commit, { directory, fetchImpl: async url =>
    new Response(url.endsWith('.sha256') ? Buffer.from('0'.repeat(64) + '  console-core.mjs\n') : original.bundle, { status: 200 }),
  }), /SHA-256 differs from sidecar/);
  assert.deepEqual(triplet(directory), original);
}));
