import type { APIRoute } from 'astro';
import { robotsText } from '../config/site.mjs';

export const GET: APIRoute = () => new Response(robotsText(process.env), {
  headers: { 'Content-Type': 'text/plain; charset=utf-8' },
});
