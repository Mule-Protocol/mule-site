import { site } from '../config/site.mjs';

export const securityHeaders = Object.freeze({
  'Content-Security-Policy': "default-src 'self'; script-src 'self' https://static.cloudflareinsights.com; style-src 'self'; font-src 'self'; img-src 'self'; connect-src 'self' https://cloudflareinsights.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; upgrade-insecure-requests",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
});

export async function applyResponsePolicy(request, next) {
  const url = new URL(request.url);
  if (url.hostname === `www.${site.DOMAIN}`) {
    url.hostname = site.DOMAIN;
    url.protocol = 'https:';
    url.port = '';
    return new Response(null, { status: 301, headers: { ...securityHeaders, Location: url.href } });
  }
  const original = await next();
  const response = new Response(original.body, original);
  response.headers.delete('Access-Control-Allow-Origin');
  for (const [key, value] of Object.entries(securityHeaders)) response.headers.set(key, value);
  if (url.hostname !== site.DOMAIN) response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return response;
}
