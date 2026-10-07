import { applyResponsePolicy } from '../src/server/response-policy.mjs';

interface PagesContext { request: Request; next: () => Promise<Response> }

// Host-based redirects are not supported by Pages' static _redirects format.
// Keep the 301 and response headers inside this site's deployment.
export function onRequest(context: PagesContext) {
  return applyResponsePolicy(context.request, () => context.next());
}
