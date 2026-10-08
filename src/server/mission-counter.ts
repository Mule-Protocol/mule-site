import { securityHeaders } from './response-policy.mjs';

interface CounterStatement {
  bind(...values: string[]): CounterStatement;
}

interface CounterResult {
  success: boolean;
  results: Record<string, unknown>[];
}

export interface CounterDatabase {
  prepare(sql: string): CounterStatement;
  batch(statements: CounterStatement[]): Promise<CounterResult[]>;
}

export interface MissionCounterEnv {
  MULE_COUNTER?: CounterDatabase;
}

const MAX_BODY_BYTES = 1024;
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SELECT_TOTAL = 'SELECT manual_total AS manualTotal FROM mission_counter WHERE id = 1';

function json(payload: Record<string, unknown>, status = 200, extraHeaders: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...securityHeaders,
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      ...extraHeaders,
    },
  });
}

function invalid(status = 400): Response {
  return json({ error: 'Invalid counter request.' }, status);
}

async function readMissionId(request: Request): Promise<string | Response> {
  const contentLength = request.headers.get('Content-Length');
  if (contentLength !== null) {
    if (!/^\d+$/.test(contentLength)) return invalid();
    if (Number(contentLength) > MAX_BODY_BYTES) return invalid(413);
  }
  const reader = request.body?.getReader();
  if (!reader) return invalid();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        return invalid(413);
      }
      chunks.push(value);
    }
  } catch {
    return invalid();
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  let body: unknown;
  try {
    body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch {
    return invalid();
  }
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1) return invalid();
  const id = (body as { id?: unknown }).id;
  return typeof id === 'string' && UUID_V4.test(id) ? id.toLowerCase() : invalid();
}

export async function missionCounter(request: Request, env: MissionCounterEnv): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'POST') {
    return json({ error: 'Method not allowed.' }, 405, { Allow: 'GET, POST' });
  }
  let id: string | undefined;
  if (request.method === 'POST') {
    if (request.headers.get('Origin') !== new URL(request.url).origin) return invalid(403);
    if (request.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase() !== 'application/json') return invalid(415);
    const parsed = await readMissionId(request);
    if (typeof parsed !== 'string') return parsed;
    id = parsed;
  }
  const db = env.MULE_COUNTER;
  if (!db) return json({ error: 'Counter unavailable.' }, 503);
  try {
    const statements = id ? [
      // An absent singleton must not consume an otherwise valid receipt.
      db.prepare('INSERT INTO mission_counter_receipts (id) SELECT ? WHERE EXISTS (SELECT 1 FROM mission_counter WHERE id = 1) ON CONFLICT(id) DO NOTHING').bind(id),
      // Keep this immediately after INSERT: changes() is 1 only for a new receipt.
      db.prepare('UPDATE mission_counter SET manual_total = manual_total + changes() WHERE id = 1'),
      db.prepare(SELECT_TOTAL),
    ] : [db.prepare(SELECT_TOTAL)];
    const result = await db.batch(statements);
    const manualTotal = result[result.length - 1]?.results[0]?.manualTotal;
    if (result.length !== statements.length || result.some(item => !item.success) || typeof manualTotal !== 'number' || !Number.isSafeInteger(manualTotal) || manualTotal < 0) {
      return json({ error: 'Counter unavailable.' }, 503);
    }
    return json({ manualTotal, serverTime: Date.now() });
  } catch {
    return json({ error: 'Counter unavailable.' }, 503);
  }
}
