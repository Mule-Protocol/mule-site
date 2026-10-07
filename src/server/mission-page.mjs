import { parseMissionId } from '../data/mission.mjs';
import { site } from '../config/site.mjs';
import { securityHeaders } from './response-policy.mjs';

export function missionHeaders(request, extra = {}) {
  const headers = { ...securityHeaders, ...extra };
  if (new URL(request.url).hostname !== site.DOMAIN) headers['X-Robots-Tag'] = 'noindex, nofollow';
  return headers;
}
export function missingMission(request) {
  return new Response('Mission not found.', { status:404, headers:missionHeaders(request,{'Content-Type':'text/plain; charset=utf-8','X-Robots-Tag':'noindex, nofollow','Cache-Control':'no-store'}) });
}
// Called only with a parsed allowlisted mission. The silhouette contains no external assets.
export function patchSilhouette() {
  return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220"><polygon points="100,6 192,58 192,162 100,214 8,162 8,58" fill="#E9E8E3" stroke="#FF4F00" stroke-width="8"/><polygon points="100,22 178,66 178,154 100,198 22,154 22,66" fill="none" stroke="#0E0E0E" stroke-width="1.5" stroke-dasharray="3 3"/><g transform="translate(36 48) scale(1.8)" fill="none" stroke="#0E0E0E" stroke-width="3" stroke-linecap="square"><path d="M17 20L11 5M26 21L29 4"/><polygon points="12,20 34,22 58,46 56,56 44,58 20,44"/></g><circle cx="55.8" cy="57" r="4" fill="#0E0E0E"/><circle cx="88.2" cy="55.2" r="4" fill="#0E0E0E"/><circle cx="95" cy="105" r="5" fill="#FF4F00"/></svg>';
}
export function missionPage(request, id) {
  const mission=parseMissionId(id); if(!mission)return missingMission(request);
  const status=mission.settled?'SETTLED ✓':'RETURNED';
  const canonical=`${site.origin}/m/${mission.id}`;
  // Preview cards must resolve on the same deployed host; canonical identity stays apex.
  const origin=new URL(request.url).origin;
  const image=`${origin}/m/${mission.id}/og.png`;
  const robots=new URL(request.url).hostname===site.DOMAIN?'index, follow':'noindex, nofollow';
  const title=`${mission.mission} · ${status} · MULE`;
  const description=`${mission.template} · ${mission.date}. SIMULATION · NO REAL FUNDS.`;
  const share=(mission.settled?`My agent got paid on delivery. Mission ${mission.mission} settled.`:'My dishonest agent got nothing. Stubborn by design.')+` ${origin}/m/${mission.id} ${site.X_HANDLE}`;
  const html=`<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><meta name="description" content="${description}"><meta name="robots" content="${robots}"><link rel="canonical" href="${canonical}"><meta property="og:type" content="website"><meta property="og:title" content="${title}"><meta property="og:description" content="${description}"><meta property="og:url" content="${canonical}"><meta property="og:image" content="${image}"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="${description}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:image" content="${image}"><meta name="twitter:title" content="${title}"><meta name="twitter:description" content="${description}"><link rel="stylesheet" href="/brand/mission.css"><link rel="icon" href="/brand/mule-favicon.svg"></head><body><header><a href="/">MULE / HOME</a><span>MISSION PATCH</span></header><main><p class="signal">SIMULATION · NO REAL FUNDS</p><div class="patch ${mission.settled?'settled':'returned'}">${patchSilhouette()}<div class="identity"><h1>${mission.mission}</h1><p class="status">${status}</p><p>${mission.template}</p><time datetime="${mission.date}">${mission.date}</time></div></div><p>This patch represents a browser simulation. It is not proof of an on-chain mission.</p><nav><a href="https://x.com/intent/post?text=${encodeURIComponent(share)}" target="_blank" rel="noopener">SHARE ON X ↗</a><a href="/#console">RUN A MISSION →</a><a href="/dossier">READ THE DOSSIER</a></nav></main><footer>STUBBORN BY DESIGN. / MULE</footer></body></html>`;
  return new Response(html,{headers:missionHeaders(request,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'public, max-age=3600'})});
}
