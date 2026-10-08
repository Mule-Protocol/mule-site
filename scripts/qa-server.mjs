import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { applyResponsePolicy } from '../src/server/response-policy.mjs';

const root = path.resolve(process.env.QA_DIST || 'dist');
const port = Number(process.env.QA_PORT || 4321);
const counter = process.env.QA_COUNTER === '1' ? (await import('./qa-counter.mjs')).createQaCounter() : null;
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webmanifest': 'application/manifest+json' };

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (counter && url.pathname === '/api/mission-counter' && !url.search) {
      const response = await counter(req, url);
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(Buffer.from(await response.arrayBuffer()));
      return;
    }
    // Optional local-only apex policy for production-equivalent Lighthouse headers.
    const policyUrl = new URL(url);
    if (process.env.QA_APEX === '1') policyUrl.hostname = 'muleprotocol.com';
    const response = await applyResponsePolicy(new Request(policyUrl), async () => {
      let file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
      if (!file.startsWith(root + path.sep) && file !== root) return new Response('Forbidden', { status: 403 });
      let status = 200;
      try {
        if ((await stat(file)).isDirectory()) file = path.join(file, 'index.html');
        await stat(file);
      } catch { file = path.join(root, '404.html'); status = 404; }
      const assetHeaders = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' };
      if (url.pathname.startsWith('/_astro/')) assetHeaders['Cache-Control'] = 'public, max-age=31536000, immutable';
      return new Response(await readFile(file), { status, headers: assetHeaders });
    }, {
      notFound: async () => new Response(await readFile(path.join(root, '404.html')), {
        headers: { 'Content-Type': types['.html'] },
      }),
    });
    const headers = Object.fromEntries(response.headers);
    // HTTPS upgrade only applies to the real hosting; QA uses loopback HTTP.
    headers['content-security-policy'] = headers['content-security-policy'].replace('; upgrade-insecure-requests', '');
    let body = Buffer.from(await response.arrayBuffer());
    if (req.headers['accept-encoding']?.includes('gzip')) { body = gzipSync(body); headers['content-encoding'] = 'gzip'; }
    headers['content-length'] = String(body.length);
    res.writeHead(response.status, headers);
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch { res.writeHead(500); res.end('QA server error'); }
}).listen(port, '127.0.0.1', () => console.log(`MULE QA preview: http://127.0.0.1:${port}`));
