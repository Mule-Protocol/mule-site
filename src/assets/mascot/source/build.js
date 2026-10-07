// Builds the Unit M-1 sheets and standalone files from m1.js.
const fs = require('fs'), path = require('path');
const { mule, POSES, svg, INK, BONE, SIG } = require('./m1');
const OUT = process.argv[2] || path.join(__dirname, 'out'); fs.mkdirSync(OUT, { recursive: true });
const ground = `<line x1="14" y1="210" x2="296" y2="210" stroke="${INK}" stroke-width="1" stroke-dasharray="2 4"/>`;

// Head-only icon: just the head group of the neutral pose, cropped.
const headOnly = (p = {}) => {
  const full = mule(p); const s = full.indexOf('<g id="head"'); let d = 0, re = /<g\b|<\/g>/g; re.lastIndex = s; let m, e;
  while ((m = re.exec(full))) { if (m[0] === '<g') d++; else if (!--d) { e = m.index + 4; break; } }
  return full.slice(s, e);
};
const HEAD_VB = '218 8 82 88';
const favicon = svg(`<rect x="218" y="8" width="82" height="88" fill="${SIG}"/>${headOnly()}`, HEAD_VB, ' width="64" height="64"');
const headSvg = svg(headOnly(), HEAD_VB, ' width="256" height="275" role="img" aria-label="Unit M-1 head"');

// Standalone files
const master = svg(mule(), '0 0 300 240', ' width="300" height="240" role="img" aria-label="Unit M-1, a robot mule carrying an orange crate"');
fs.writeFileSync(path.join(OUT, 'unit-m1.svg'), master);
fs.writeFileSync(path.join(OUT, 'unit-m1-head.svg'), headSvg);
fs.writeFileSync(path.join(OUT, 'unit-m1-favicon.svg'), favicon);
for (const [name, p] of Object.entries(POSES)) fs.writeFileSync(path.join(OUT, `unit-m1-pose-${name}.svg`), svg(mule(p), '0 0 300 240', ` width="300" height="240" role="img" aria-label="Unit M-1, ${name}"`));

const LABELS = { neutral: ['01', 'Neutre', 'Référence'], walk: ['02', 'Marche', 'Héros, cycle 03'], load: ['03', 'Chargement', 'Cycle 01'], locked: ['04', 'Verrouillé', 'Cycle 02'],
  scan: ['05', 'Inspection', 'Cycle 04'], refuse: ['06', 'Refus', 'Échec · RETURNED'], delivered: ['07', 'Livré', 'Succès · SETTLED'], idle: ['08', 'Couché', 'Attente, 404'] };
const cells = Object.entries(POSES).map(([k, p]) => `<section class="cell"><div class="cap"><b>${LABELS[k][0]}</b><span>${LABELS[k][1]}</span><i>${LABELS[k][2]}</i></div>${svg(ground + mule(p), '0 -10 300 236')}</section>`).join('');

const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Unit M-1</title><style>
@font-face{font-family:Azeret;src:url('../fonts/azeret-mono-latin-400-normal.woff2') format('woff2')}
@font-face{font-family:Archivo;src:url('../fonts/archivo-125-800-latin.woff2') format('woff2');font-weight:800;font-stretch:125%}
*{box-sizing:border-box}body{margin:0;background:${BONE};color:${INK};font-family:Azeret,monospace}
.sheet{width:2048px;padding:72px}
.top{display:flex;justify-content:space-between;align-items:end;border-bottom:2px solid ${INK};padding-bottom:20px}
h1{font-family:Archivo;font-weight:800;font-stretch:125%;font-size:64px;line-height:.95;margin:0;text-transform:uppercase;letter-spacing:-.02em}
.meta{font-size:18px;letter-spacing:.08em;text-transform:uppercase;text-align:right;line-height:1.6}
.hero{display:grid;grid-template-columns:1.6fr 1fr;border:1px solid ${INK};margin-top:40px;background-image:linear-gradient(#CFCDC6 1px,transparent 1px),linear-gradient(90deg,#CFCDC6 1px,transparent 1px);background-size:24px 24px}
.hero>svg{width:100%;height:auto;display:block;padding:24px}
.icons{border-left:1px solid ${INK};background:${BONE};padding:32px;display:grid;gap:28px;align-content:center}
.icons .r{display:flex;gap:28px;align-items:end}
figure{margin:0;display:grid;gap:10px;justify-items:start;font-size:14px;letter-spacing:.08em;text-transform:uppercase;color:#4A4A45}
.grid{display:grid;grid-template-columns:repeat(4,1fr);border-top:1px solid ${INK};border-left:1px solid ${INK};margin-top:40px}
.cell{border-right:1px solid ${INK};border-bottom:1px solid ${INK};padding:20px}
.cell svg{width:100%;height:auto;display:block}
.cap{display:flex;gap:14px;align-items:baseline;font-size:16px;letter-spacing:.08em;text-transform:uppercase}
.cap b{color:#A83200;font-weight:400}.cap span{font-family:Archivo;font-weight:800;font-stretch:125%;font-size:24px;letter-spacing:-.01em;text-transform:uppercase}.cap i{margin-left:auto;font-style:normal;color:#4A4A45;font-size:14px}
.sil{filter:brightness(0)}
</style></head><body><div class="sheet">
<div class="top"><h1>Unit M-1<br>Final</h1><div class="meta">MULE / Mascotte finale<br>Corps V1 · Tête V4 · 8 poses</div></div>
<div class="hero">${svg(ground + mule(), '0 -6 300 232')}
<div class="icons">
<div class="r"><figure>${svg(headOnly(), HEAD_VB, ' width="220" height="236" style="border:1px solid #0E0E0E"')}Tête</figure>
<figure>${svg(`<rect x="218" y="8" width="82" height="88" fill="${SIG}"/>${headOnly()}`, HEAD_VB, ' width="128" height="128"')}Avatar 128</figure></div>
<div class="r"><figure>${svg(`<rect x="218" y="8" width="82" height="88" fill="${SIG}"/>${headOnly()}`, HEAD_VB, ' width="64" height="64"')}64</figure>
<figure>${svg(`<rect x="218" y="8" width="82" height="88" fill="${SIG}"/>${headOnly()}`, HEAD_VB, ' width="32" height="32"')}32</figure>
<figure>${svg(`<rect x="218" y="8" width="82" height="88" fill="${SIG}"/>${headOnly()}`, HEAD_VB, ' width="16" height="16"')}16</figure>
<figure><span class="sil">${svg(mule(), '0 0 300 240', ' width="200" height="160"')}</span>Silhouette</figure></div>
</div></div>
<div class="grid">${cells}</div></div></body></html>`;
fs.writeFileSync(path.join(__dirname, 'final.html'), html);
console.log('ok', Object.keys(POSES).length, 'poses');
