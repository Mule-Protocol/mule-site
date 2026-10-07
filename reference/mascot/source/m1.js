// Unit M-1 final mascot generator: V1 body + V4 head. Every pose is a set of transforms on named groups.
const INK = '#0E0E0E', BONE = '#E9E8E3', SIG = '#FF4F00';

// Leg geometry in neutral pose (viewBox 0 0 300 240). Near side = animal's left (facing right).
const LEGS = {
  'leg-fr': { hip: [216, 142], knee: [224, 176], foot: [216, 204], near: false },
  'leg-br': { hip: [104, 142], knee: [98, 176], foot: [108, 204], near: false },
  'leg-bl': { hip: [88, 142], knee: [80, 176], foot: [92, 204], near: true },
  'leg-fl': { hip: [202, 142], knee: [210, 176], foot: [200, 204], near: true },
};
const PIVOTS = { chassis: [202, 142], neckHead: [216, 98], head: [238, 74], lid: [96, 70], earL: [239, 56], earR: [257, 56] };

const rot = (a, [x, y]) => (a ? ` transform="rotate(${a} ${x} ${y})"` : '');

function leg(id, [thigh = 0, shin = 0] = []) {
  const { hip, knee, foot, near } = LEGS[id];
  const w = near ? 3.5 : 3, op = near ? '' : ' opacity=".55"';
  const [fx, fy] = foot;
  const hoof = `<path d="M${fx - 8} ${fy}H${fx + 8}L${fx + 6} ${fy + 5}H${fx - 8}Z" fill="${INK}"/>`;
  const kneeMark = near
    ? `<circle cx="${knee[0]}" cy="${knee[1]}" r="5" fill="${BONE}" stroke="${INK}" stroke-width="2.5"/><circle cx="${knee[0]}" cy="${knee[1]}" r="1.6" fill="${INK}"/>`
    : '';
  return `<g id="${id}" data-pivot-hip="${hip}" data-pivot-knee="${knee}"${rot(thigh, hip)}${op}>` +
    `<path d="M${hip[0]} ${hip[1]}L${knee[0]} ${knee[1]}" stroke="${INK}" stroke-width="${w}" stroke-linecap="square"/>` +
    `<g class="shin"${rot(shin, knee)}><path d="M${knee[0]} ${knee[1]}L${fx} ${fy}" stroke="${INK}" stroke-width="${w}" stroke-linecap="square"/>${hoof}</g>` +
    `${kneeMark}</g>`;
}

function mule(p = {}) {
  const L = p.legs || {};
  const lid = p.lidOpen
    ? `<g id="crate-lid"${rot(p.lidOpen, PIVOTS.lid)}><rect x="96" y="58" width="96" height="12" fill="${SIG}" stroke="${INK}" stroke-width="2.5"/></g>`
    : `<g id="crate-lid"><rect x="96" y="58" width="96" height="12" fill="${SIG}" stroke="${INK}" stroke-width="2.5"/></g>`;
  const latch = p.locked
    ? `<g id="lock"><path d="M139.5 66V61a4.5 4.5 0 0 1 9 0V66" fill="none" stroke="${INK}" stroke-width="2"/><rect x="136" y="65" width="16" height="12" fill="${INK}"/><rect x="143" y="69" width="2" height="4" fill="${SIG}"/></g>`
    : `<rect x="139" y="65" width="10" height="10" fill="${BONE}" stroke="${INK}" stroke-width="1.5"/>`;
  const interior = p.lidOpen ? `<rect x="98.5" y="71" width="91" height="5" fill="${INK}"/>` : '';
  const crate = p.noCrate ? '' :
    `<g id="crate"${p.crateDy ? ` transform="translate(0 ${p.crateDy})"` : ''}>` +
    `<g id="crate-box"><rect x="96" y="70" width="96" height="28" fill="${SIG}" stroke="${INK}" stroke-width="2.5"/>${interior}` +
    `<rect x="110" y="70" width="5" height="31" fill="${INK}"/><rect x="173" y="70" width="5" height="31" fill="${INK}"/></g>` +
    `${lid}${p.lidOpen ? '' : latch}</g>`;
  const ear = (id, x, a) => `<g id="${id}"${rot(a, [x + 3, 56])}><rect x="${x}" y="22" width="6" height="34" fill="${INK}"/><circle class="tip" cx="${x + 3}" cy="19" r="5" fill="${INK}"/></g>`;
  const head =
    `<g id="head"${rot(p.head, PIVOTS.head)}>` +
    ear('antenna-l', 236, p.ears?.[0]) + ear('antenna-r', 254, p.ears?.[1]) +
    `<path d="M224 56H284L294 66V90H224Z" fill="${BONE}" stroke="${INK}" stroke-width="3" stroke-linejoin="miter"/>` +
    `<path d="M282 82H294" stroke="${INK}" stroke-width="1.5"/>` +
    `<circle id="eye" cx="266" cy="72" r="7" fill="${SIG}" stroke="${INK}" stroke-width="2"/></g>`;
  const neckHead =
    `<g id="neck-head"${rot(p.neck, PIVOTS.neckHead)}>` +
    `<g id="neck"><path d="M206 100L224 100L248 84L232 78Z" fill="${BONE}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="miter"/>` +
    `<path d="M214 94L224 98M220 89L232 94" stroke="${INK}" stroke-width="1"/></g>${head}</g>`;
  const body =
    `<g id="body"><path d="M70 98H220L228 106V136L220 144H70L62 136V106Z" fill="${BONE}" stroke="${INK}" stroke-width="2.5" stroke-linejoin="miter"/>` +
    `<path d="M146 104V138" stroke="${INK}" stroke-width="1"/><path d="M76 132H96M76 126H96M76 120H96" stroke="${INK}" stroke-width="1.2"/>` +
    `<rect id="status-led" x="208" y="112" width="6" height="6" fill="${SIG}" stroke="${INK}" stroke-width="1"/></g>`;
  const tail =
    `<g id="tail"${rot(p.tail, [64, 112])}><path d="M64 112C50 118 46 134 54 146" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
    `<rect x="50" y="145" width="8" height="5" fill="${INK}" transform="rotate(25 54 147)"/></g>`;
  const chassis =
    `<g id="chassis"${p.chassis ? ` transform="${p.chassis}"` : ''}>` +
    leg('leg-fr', L.fr) + leg('leg-br', L.br) + tail + leg('leg-bl', L.bl) + leg('leg-fl', L.fl) +
    body + crate + neckHead + '</g>';
  const beam = p.beam ? scanBeam(p) : '';
  return `<g id="unit-m1">${chassis}${beam}${p.extra || ''}</g>`;
}

function rotPt([x, y], a, [cx, cy]) {
  const r = a * Math.PI / 180, dx = x - cx, dy = y - cy;
  return [cx + dx * Math.cos(r) - dy * Math.sin(r), cy + dx * Math.sin(r) + dy * Math.cos(r)];
}
// Inspection beam starts at the eye wherever the head and neck rotations put it.
function scanBeam(p) {
  const [x, y] = rotPt(rotPt([266, 72], p.head || 0, PIVOTS.head), p.neck || 0, PIVOTS.neckHead).map(v => Math.round(v * 10) / 10);
  return `<g id="scan-beam"><path d="M${x} ${y}L${x + 20} 208H${x - 36}Z" fill="${SIG}" opacity=".14"/>` +
    `<path d="M${x} ${y}L${x - 8} 208" stroke="${SIG}" stroke-width="1.5"/></g>`;
}

const POSES = {
  neutral: {},
  walk: { legs: { fl: [-22, 34], br: [-16, 26], bl: [12, -4], fr: [10, -4] }, chassis: 'translate(0 -2)', tail: 6 },
  load: { crateDy: -30, head: -4, extra:
    `<g stroke="${INK}" stroke-width="1.5" fill="none" stroke-dasharray="3 3"><path d="M104 64V90M184 64V90"/></g>` +
    `<path d="M99 86L104 92L109 86M179 86L184 92L189 86" fill="none" stroke="${INK}" stroke-width="2"/>` },
  locked: { locked: true },
  scan: { neck: 20, head: 14, beam: true },
  refuse: { chassis: 'rotate(-5 100 144)', legs: { fl: [-24, -2], fr: [-20, -2], bl: [8, -12], br: [8, -12] }, neck: -10, head: -6, ears: [-38, -30], tail: 18,
    extra: `<g stroke="${INK}" stroke-width="2"><path d="M178 214H190M164 218H172M206 214H216"/></g>` },
  delivered: { lidOpen: -112, head: -6, ears: [-6, 6] },
  idle: { chassis: 'translate(0 58)', legs: { fl: [-84, 168], fr: [-84, 168], bl: [84, -168], br: [84, -168] }, neck: -6, head: 8, ears: [-12, -26], tail: 50 },
};

const svg = (inner, vb = '0 0 300 240', attrs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}"${attrs}>${inner}</svg>`;

module.exports = { mule, POSES, svg, LEGS, PIVOTS, INK, BONE, SIG };
