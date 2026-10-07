import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

// Read-only source import. Run once; never overwrite edited components automatically.
const [source, brand] = process.argv.slice(2);
if (!source || !brand) throw new Error('Usage: node scripts/import-reference.mjs <brief-directory> <brand-kit-directory>');
for (const dir of ['reference', 'src/components', 'src/styles', 'public/brand', 'public/images']) {
  await mkdir(dir, { recursive: true });
}
const hashes = {};
for (const name of ['MULE_site_prompt.md', 'PROMPT_mise-en-ligne.md', 'mule-site.html', 'mule-dossier.html']) {
  const bytes = await readFile(path.join(source, name));
  hashes[name] = createHash('sha256').update(bytes).digest('hex');
  await writeFile(path.join('reference', name), bytes);
}
await writeFile('reference/provenance.json', JSON.stringify({ source: path.basename(source), importedAt: new Date().toISOString(), sha256: hashes }, null, 2) + '\n');

const html = await readFile(path.join(source, 'mule-site.html'), 'utf8');
const allCSS = html.match(/<style>([\s\S]*?)<\/style>/)[1];
let css = allCSS.split('/* Console */')[0] + allCSS.slice(allCSS.indexOf('/* Footer */'));
const styleClasses = new Map();
function externalize(markup) {
  return markup.replace(/<([\w:-]+)([^<>]*?)\sstyle="([^"]*)"([^<>]*?)>/g, (_, tag, before, style, after) => {
    if (!styleClasses.has(style)) styleClasses.set(style, `ref-style-${styleClasses.size + 1}`);
    const cls = styleClasses.get(style);
    let attrs = before + after;
    if (/class="/.test(attrs)) attrs = attrs.replace(/class="([^"]*)"/, `class="$1 ${cls}"`);
    else attrs += ` class="${cls}"`;
    return `<${tag}${attrs}>`;
  });
}
function section(marker) {
  const start = html.indexOf('<section', html.indexOf(marker));
  return html.slice(start, html.indexOf('</section>', start) + '</section>'.length);
}

let hero = section('<!-- 01 HERO -->');
hero = hero.replace('<a class="btn btn--signal" href="#console">', '<button class="btn btn--signal" type="button" disabled title="Console available after the first design review">')
  .replace('Run a mission <span aria-hidden="true">→</span></a>', 'Run a mission <span aria-hidden="true">→</span></button>')
  .replace('<a class="btn" href="https://claude.ai/artifact/P2DDN7pJW3M53oRRaHi5ud">Read the dossier</a>', '<button class="btn" type="button" disabled title="Dossier available after the first design review">Read the dossier</button>')
  .replace('@mule_protocol.', '{site.X_HANDLE}.')
  .replace('role="marquee"', 'role="region"');
hero = externalize(hero);
await writeFile('src/components/Hero.astro', `---\nimport { site } from '../config/site.mjs';\n---\n${hero}\n`);

let lifecycle = externalize(section('<!-- 03 LIFECYCLE -->'));
lifecycle = lifecycle.replace('aria-live="polite"', 'aria-live="off"');
const stage = lifecycle.match(/<svg class="stage"[\s\S]*?<\/svg>/)[0];
const mule = stage.match(/<g id="lcMule"[\s\S]*$/)[0].replace(/<\/svg>$/, '');
const still = `<svg viewBox="0 0 390 290" class="stage" data-step={String(i + 1)} role="img" aria-label={\`Unit M-1: \${step.label}\`}>${mule.replace(/\sid="[^"]*"/g, '').replace('translate(-12 95) scale(0.75)', 'translate(20 60) scale(0.9)')}</svg>`;
const fallback = `\n  <ol class="lifecycle-static">\n    {steps.map((step, i) => (\n      <li class="wrap">\n        <div class="static-caption"><span class="dot static-number">0{i + 1}</span><div><h3 class="label">{step.label}</h3><p>{step.caption}</p></div></div>\n        ${still}\n        {i === 4 && <p class="static-outcomes label">PASS: SETTLED ✓ · FAIL: RETURNED</p>}\n      </li>\n    ))}\n  </ol>\n`;
lifecycle = lifecycle.replace('</section>', fallback + '</section>');
await writeFile('src/components/Lifecycle.astro', `---\nimport { lifecycle as steps } from '../data/lifecycle';\n---\n${lifecycle}\n`);
for (const [style, cls] of styleClasses) css += `\n.${cls} { ${style} }\n`;
await writeFile('src/styles/reference.css', css);

for (const name of ['mule-favicon.svg', 'mule-lockup-ink.svg']) {
  await copyFile(path.join(brand, '02_LOGOS/fichiers-svg-pour-le-site', name), path.join('public/brand', name));
}
for (const [from, to] of [['image-partage_site_1200x630.png', 'site.png'], ['image-partage_dossier_1200x630.png', 'dossier.png']]) {
  await copyFile(path.join(brand, '06_SITE_IMAGES-DE-PARTAGE', from), path.join('public/images', to));
}
console.log('Imported exact references, two Astro components, original styles, and supplied brand assets.');
