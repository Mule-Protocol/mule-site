import { mkdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { BUNDLE_NAME, VENDOR_DIRECTORY, fullCommit, sha256, sourceDocument, sourceUrls,
  verifyConsoleCoreBytes } from './console-core-integrity.mjs';

/** The only network-enabled entry point. Call explicitly with an immutable commit. */
export async function updateConsoleCore(commit, { directory = VENDOR_DIRECTORY, fetchImpl = globalThis.fetch } = {}) {
  commit = fullCommit(commit);
  const urls = sourceUrls(commit);
  async function download(url) {
    const response = await fetchImpl(url, { redirect: 'error', signal: AbortSignal.timeout(30_000) });
    if (response.status !== 200) throw new Error('Download failed with HTTP ' + response.status + ': ' + url);
    // No text() call, normalization, decoding/re-encoding or newline conversion.
    return Buffer.from(await response.arrayBuffer());
  }
  const [bundle, checksum] = await Promise.all([download(urls.bundle), download(urls.checksum)]);
  const source = Buffer.from(sourceDocument(commit, sha256(bundle)), 'utf8');
  const verified = verifyConsoleCoreBytes({ bundle, checksum, source, expectedCommit: commit });
  // Validate all downloaded data BEFORE changing the existing copy. Each file is
  // replaced by rename; an interrupted multi-file update fails the offline check.
  mkdirSync(directory, { recursive: true });
  const files = [[BUNDLE_NAME, bundle], [BUNDLE_NAME + '.sha256', checksum], ['SOURCE.md', source]];
  const temporary = files.map(([name]) => join(directory, '.' + name + '.' + randomUUID() + '.tmp'));
  try {
    files.forEach(([, bytes], index) => writeFileSync(temporary[index], bytes, { flag: 'wx' }));
    files.forEach(([name], index) => renameSync(temporary[index], join(directory, name)));
  } finally {
    temporary.forEach(path => rmSync(path, { force: true }));
  }
  return verified;
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  if (process.argv.length !== 3) throw new Error('Usage: node scripts/update-console-core.mjs <full-40-hex-commit>');
  const result = await updateConsoleCore(process.argv[2]);
  console.log('Console core updated: ' + result.commit + '\nSHA-256: ' + result.hash + '\nBytes: ' + result.bytes);
}
