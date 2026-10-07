import { site } from '../config/site.mjs';

export const securityHeaders = Object.freeze({
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self' https://cloudflareinsights.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
});

/**
 * @param {Request} request
 * @param {() => Response | Promise<Response>} next
 * @param {{ legalPublished?: boolean, notFound?: () => Response | Promise<Response> }} [options]
 */
export async function applyResponsePolicy(request, next, { legalPublished = site.LEGAL_PUBLISHED, notFound } = {}) {
  const url = new URL(request.url);
  if (url.hostname === `www.${site.DOMAIN}`) {
    url.hostname = site.DOMAIN;
    url.protocol = 'https:';
    url.port = '';
    return new Response(null, { status: 301, headers: { ...securityHeaders, Location: url.href } });
  }
  const legalPath = /^\/(legal|privacy|risks)(\/.*)?$/.test(url.pathname);
  const hidden = url.hostname === site.DOMAIN && legalPath && !legalPublished;
  const original = hidden ? await notFound() : await next();
  const response = new Response(request.method === 'HEAD' ? null : original.body, {
    status: hidden ? 404 : original.status,
    statusText: hidden ? 'Not Found' : original.statusText,
    headers: original.headers,
  });
  if (hidden) response.headers.set('Cache-Control', 'no-store');
  response.headers.delete('Access-Control-Allow-Origin');
  for (const [key, value] of Object.entries(securityHeaders)) response.headers.set(key, value);
  if (url.hostname !== site.DOMAIN || legalPath || /^\/m(?:\/|$)/.test(url.pathname)) response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
