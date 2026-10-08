import { createHash } from 'node:crypto';
import { lstatSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

export const REPOSITORY = 'Mule-Protocol/mule';
export const UPSTREAM_DIRECTORY = 'packages/console-core/dist';
export const VENDOR_DIRECTORY = fileURLToPath(new URL('../src/vendor/mule-console-core/', import.meta.url));
export const BUNDLE_NAME = 'console-core.mjs';

export function fullCommit(value) {
  if (typeof value !== 'string' || !/^[a-fA-F0-9]{40}$/.test(value)) {
    throw new Error('A complete 40-hex commit is required; branches, tags and short SHAs are forbidden');
  }
  return value.toLowerCase();
}

export function sourceUrls(commit) {
  const base = 'https://raw.githubusercontent.com/' + REPOSITORY + '/' + fullCommit(commit) + '/' + UPSTREAM_DIRECTORY + '/';
  return { bundle: base + BUNDLE_NAME, checksum: base + BUNDLE_NAME + '.sha256' };
}

export function sha256(bytes) {
  if (!Buffer.isBuffer(bytes) && !(bytes instanceof Uint8Array)) throw new TypeError('SHA-256 requires exact bytes');
  return createHash('sha256').update(bytes).digest('hex');
}

export function sourceDocument(commit, hash) {
  commit = fullCommit(commit);
  if (!/^[a-f0-9]{64}$/.test(hash)) throw new Error('Invalid SHA-256');
  const urls = sourceUrls(commit);
  return '# MULE console core source\n\n' +
    'Repository: ' + REPOSITORY + '\n' +
    'Commit: ' + commit + '\n' +
    'SHA-256: ' + hash + '\n' +
    'Bundle: ' + urls.bundle + '\n' +
    'Checksum: ' + urls.checksum + '\n\n' +
    'The bundle and checksum are copied as exact upstream bytes. No line-ending conversion is permitted.\n' +
    'Only the explicit update command downloads files. Tests and builds verify this copy offline.\n';
}

function bytesWithoutCr(value, name) {
  if (!Buffer.isBuffer(value) && !(value instanceof Uint8Array)) throw new TypeError(name + ' must be bytes');
  if (value.includes(13)) throw new Error(name + ': CR byte forbidden; preserve upstream LF bytes exactly');
  return value;
}

function utf8(value, name) {
  return new TextDecoder('utf-8', { fatal: true }).decode(bytesWithoutCr(value, name));
}

/** Hash the original binary data; decoding is limited to the two metadata files. */
export function verifyConsoleCoreBytes({ bundle, checksum, source, expectedCommit }) {
  bytesWithoutCr(bundle, BUNDLE_NAME);
  if (bundle.byteLength === 0) throw new Error('Empty console core bundle');
  const checksumText = utf8(checksum, BUNDLE_NAME + '.sha256');
  const sidecar = /^([a-f0-9]{64})  console-core\.mjs\n$/.exec(checksumText);
  if (!sidecar) throw new Error('Invalid console-core.mjs.sha256 format');
  const text = utf8(source, 'SOURCE.md');
  const lines = text.split('\n');
  function field(label) {
    const matches = lines.filter(line => line.startsWith(label + ':'));
    if (matches.length !== 1 || !matches[0].startsWith(label + ': ')) {
      throw new Error('SOURCE.md must contain exactly one ' + label);
    }
    return matches[0].slice(label.length + 2);
  }
  if (field('Repository') !== REPOSITORY) throw new Error('SOURCE.md repository mismatch');
  const commit = fullCommit(field('Commit'));
  if (expectedCommit !== undefined && commit !== fullCommit(expectedCommit)) throw new Error('SOURCE.md commit mismatch');
  const sourceHash = field('SHA-256');
  if (!/^[a-f0-9]{64}$/.test(sourceHash)) throw new Error('SOURCE.md SHA-256 invalid');
  const urls = sourceUrls(commit);
  if (field('Bundle') !== urls.bundle || field('Checksum') !== urls.checksum) throw new Error('SOURCE.md immutable source URL mismatch');
  const actualHash = sha256(bundle);
  if (sidecar[1] !== actualHash) throw new Error('Bundle SHA-256 differs from sidecar');
  if (sourceHash !== actualHash) throw new Error('Bundle SHA-256 differs from SOURCE.md');
  return { commit, hash: actualHash, bytes: bundle.byteLength, urls };
}

export function verifyConsoleCoreDirectory(directory = VENDOR_DIRECTORY) {
  function read(name) {
    const path = join(directory, name);
    const status = lstatSync(path);
    if (status.isSymbolicLink() || !status.isFile()) throw new Error(name + ' must be a regular file');
    return readFileSync(path);
  }
  return verifyConsoleCoreBytes({ bundle: read(BUNDLE_NAME), checksum: read(BUNDLE_NAME + '.sha256'), source: read('SOURCE.md') });
}
