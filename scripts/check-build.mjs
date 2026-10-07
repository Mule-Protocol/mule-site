import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { isProduction, robotsText } from '../src/config/site.mjs';

const directory = process.argv[2] || 'dist';
const html = await readFile(`${directory}/index.html`, 'utf8');
const robots = await readFile(`${directory}/robots.txt`, 'utf8');
const indexable = isProduction(process.env);
const expectedMeta = indexable ? 'index, follow' : 'noindex, nofollow';
assert.ok(html.includes(`name="robots" content="${expectedMeta}"`), `Wrong robots meta in ${directory}`);
assert.equal(robots, robotsText(process.env), `Wrong robots.txt in ${directory}`);
assert.ok(html.includes('charset="UTF-8"'));
assert.ok(!/Â|â€|�/.test(html), 'Unexpected encoding artifacts in generated HTML');
const errorHtml = await readFile(`${directory}/404.html`, 'utf8');
assert.ok(errorHtml.includes('name="robots" content="noindex, nofollow"'));
for (const page of ['', 'dossier', 'legal', 'privacy', 'risks']) {
  const content=await readFile(`${directory}/${page ? page+'/' : ''}index.html`,'utf8');
  assert.ok(!/\sstyle\s*=|<script(?![^>]*\bsrc=)/i.test(content),`Inline style or script on /${page}`);
  assert.ok(!/Â|â€|�/.test(content),`Encoding error on /${page}`);
  if(['legal','privacy','risks'].includes(page)) assert.ok(content.includes('name="robots" content="noindex, nofollow"'));
  else assert.ok(!content.includes('[À COMPLÉTER]'),`Placeholder on /${page}`);
}
console.log(JSON.stringify({ directory, indexable, robotsMeta: expectedMeta, robotsTxtMatches: true, utf8: true, errorsNoindex: true }));
