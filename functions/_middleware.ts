import { applyResponsePolicy } from '../src/server/response-policy.mjs';

interface PagesContext {
  request: Request;
  next: () => Promise<Response>;
  env: { ASSETS: { fetch: (request: Request) => Promise<Response> } };
}

// Host-based redirects are not supported by Pages' static _redirects format.
// Keep the 301 and response headers inside this site's deployment.
export function onRequest(context: PagesContext) {
  return applyResponsePolicy(context.request, () => context.next(), {
    // Pages serves 404.html at its extensionless path. A fresh GET avoids
    // forwarding conditional headers or a POST body to the static asset.
    notFound: () => context.env.ASSETS.fetch(new Request(new URL('/404', context.request.url))),
  });
}
