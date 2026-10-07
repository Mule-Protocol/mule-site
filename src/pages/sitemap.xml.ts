import type { APIRoute } from 'astro';
import { site } from '../config/site.mjs';

export const GET: APIRoute = () => new Response(
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${site.origin}/</loc></url><url><loc>${site.origin}/dossier</loc></url></urlset>`,
  { headers: { 'Content-Type': 'application/xml; charset=utf-8' } },
);
