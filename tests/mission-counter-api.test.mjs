import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { missionCounter } from '../src/server/mission-counter.ts';

const origin = 'https://muleprotocol.com';
const endpoint = `${origin}/api/mission-counter`;
const firstId = '3fa85f64-5717-4562-b3fc-2c963f66afa6';
const secondId = '3fa85f64-5717-4562-b3fc-2c963f66afa7';
const schema = readFileSync(new URL('../migrations/0001_mission_counter.sql', import.meta.url), 'utf8');

// Execute the real migration and SQL. Each D1-style batch is one SQLite transaction.
function localDatabase(t, migrated = true) {
  const sqlite = new DatabaseSync(':memory:');
  t.after(() => sqlite.close());
  if (migrated) sqlite.exec(schema);
  function statement(sql, values = []) {
    return { sql, values, bind: (...bindings) => statement(sql, bindings) };
  }
  const binding = {
    prepare: sql => statement(sql),
    async batch(statements) {
      sqlite.exec('BEGIN IMMEDIATE');
      try {
        const results = statements.map(item => ({ success: true, results: sqlite.prepare(item.sql).all(...item.values) }));
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
  return { sqlite, binding, env: { MULE_COUNTER: binding } };
}

function post(id = firstId, options = {}) {
  return new Request(endpoint, {
    method: 'POST',
    headers: { Origin: origin, 'Content-Type': 'application/json', ...options.headers },
    body: options.body ?? JSON.stringify({ id }),
  });
}

function assertPrivateResponse(response) {
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('X-Robots-Tag'), 'noindex, nofollow');
  assert.match(response.headers.get('Content-Type'), /^application\/json/);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
}

async function readTotal(env) {
  const response = await missionCounter(new Request(endpoint), env);
  assert.equal(response.status, 200);
  assertPrivateResponse(response);
  return response.json();
}

test('GET starts at zero and two independent clients share each committed manual mission', async t => {
  const { binding, sqlite } = localDatabase(t);
  const firstClient = { MULE_COUNTER: binding };
  const secondClient = { MULE_COUNTER: binding };
  assert.equal((await readTotal(firstClient)).manualTotal, 0);
  assert.equal((await missionCounter(post(firstId), firstClient)).status, 200);
  assert.equal((await readTotal(secondClient)).manualTotal, 1);
  assert.equal((await missionCounter(post(secondId), secondClient)).status, 200);
  assert.equal((await readTotal(firstClient)).manualTotal, 2);
  assert.deepEqual(sqlite.prepare('PRAGMA table_info(mission_counter_receipts)').all().map(row => row.name), ['id']);
  assert.deepEqual(sqlite.prepare('PRAGMA table_info(mission_counter)').all().map(row => row.name), ['id', 'manual_total']);
});

test('retries and simultaneous duplicate UUIDs add only once, including uppercase retries', async t => {
  const { env, sqlite } = localDatabase(t);
  const responses = await Promise.all(Array.from({ length: 10 }, () => missionCounter(post(), env)));
  for (const response of responses) {
    assert.equal(response.status, 200);
    assert.equal((await response.json()).manualTotal, 1);
  }
  assert.equal((await missionCounter(post(firstId.toUpperCase()), env)).status, 200);
  assert.equal((await readTotal(env)).manualTotal, 1);
  assert.equal(sqlite.prepare('SELECT count(*) AS total FROM mission_counter_receipts').get().total, 1);
  await Promise.all([missionCounter(post(secondId), env), missionCounter(post('3fa85f64-5717-4562-b3fc-2c963f66afa8'), env)]);
  assert.equal((await readTotal(env)).manualTotal, 3);
});

test('GET and POST return only the manual total and current server time, without caching', async t => {
  const { env } = localDatabase(t);
  const now = Date.parse('2026-10-08T02:10:15Z');
  t.mock.method(Date, 'now', () => now);
  assert.deepEqual(await readTotal(env), { manualTotal: 0, serverTime: now });
  const response = await missionCounter(post(firstId, { headers: { 'Content-Type': 'application/json; charset=utf-8' } }), env);
  assertPrivateResponse(response);
  assert.deepEqual(await response.json(), { manualTotal: 1, serverTime: now });
});

test('invalid methods, origins, content types and payloads never add a mission', async t => {
  const { env, sqlite } = localDatabase(t);
  const invalidRequests = [
    [new Request(endpoint, { method: 'PUT' }), 405],
    [new Request(endpoint, { method: 'OPTIONS' }), 405],
    [new Request(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: firstId }) }), 403],
    [post(firstId, { headers: { Origin: 'https://other.example' } }), 403],
    [post(firstId, { headers: { Origin: `${origin}:8443` } }), 403],
    [post(firstId, { headers: { Origin: 'null' } }), 403],
    [post(firstId, { headers: { 'Content-Type': 'text/plain' } }), 415],
    [post(firstId, { body: '{' }), 400],
    [post(firstId, { body: 'null' }), 400],
    [post(firstId, { body: '[]' }), 400],
    [post(firstId, { body: '{}' }), 400],
    [post(firstId, { body: JSON.stringify({ id: firstId, visitor: 'not accepted' }) }), 400],
    [post(42), 400],
    [post('3fa85f64-5717-1562-b3fc-2c963f66afa6'), 400],
    [post('3fa85f64-5717-4562-73fc-2c963f66afa6'), 400],
    [post(`${firstId}\n`), 400],
    [post(firstId, { headers: { 'Content-Length': '1025' } }), 413],
    [post(firstId, { headers: { 'Content-Length': 'invalid' } }), 400],
    [post(firstId, { body: `${' '.repeat(1024)}${JSON.stringify({ id: firstId })}` }), 413],
  ];
  for (const [request, status] of invalidRequests) {
    const response = await missionCounter(request, env);
    assert.equal(response.status, status, `${request.method} ${request.headers.get('Origin')}`);
    assertPrivateResponse(response);
    if (status === 405) assert.equal(response.headers.get('Allow'), 'GET, POST');
  }
  assert.equal((await readTotal(env)).manualTotal, 0);
  assert.equal(sqlite.prepare('SELECT count(*) AS total FROM mission_counter_receipts').get().total, 0);
});

test('the payload limit counts streamed bytes and interrupted bodies are rejected', async t => {
  const { env } = localDatabase(t);
  const chunks = [new Uint8Array(700), new Uint8Array(700)];
  let cancelled = false;
  const body = new ReadableStream({
    pull(controller) { controller.enqueue(chunks.shift() ?? new Uint8Array(700)); },
    cancel() { cancelled = true; },
  });
  const request = new Request(endpoint, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body, duplex: 'half' });
  assert.equal((await missionCounter(request, env)).status, 413);
  assert.equal(cancelled, true);
  const broken = new Request(endpoint, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, duplex: 'half',
    body: new ReadableStream({ start(controller) { controller.error(new Error('private stream detail')); } }),
  });
  const response = await missionCounter(broken, env);
  assert.equal(response.status, 400);
  assert.doesNotMatch(await response.text(), /private stream detail/);
  assert.equal((await readTotal(env)).manualTotal, 0);
});

test('missing binding, missing schema and database failures return a generic unavailable response', async t => {
  const { env: unmigrated } = localDatabase(t, false);
  const broken = { MULE_COUNTER: { prepare() { throw new Error('private database detail'); } } };
  for (const env of [{}, unmigrated, broken]) {
    for (const request of [new Request(endpoint), post()]) {
      const response = await missionCounter(request, env);
      assert.equal(response.status, 503);
      assertPrivateResponse(response);
      assert.deepEqual(await response.json(), { error: 'Counter unavailable.' });
    }
  }
});

test('a failed counter update rolls back the receipt so the same mission can retry', async t => {
  const { env, sqlite } = localDatabase(t);
  sqlite.exec("CREATE TRIGGER reject_counter BEFORE UPDATE ON mission_counter BEGIN SELECT RAISE(ABORT, 'private failure'); END");
  const failure = await missionCounter(post(), env);
  assert.equal(failure.status, 503);
  assert.deepEqual(await failure.json(), { error: 'Counter unavailable.' });
  assert.equal(sqlite.prepare('SELECT count(*) AS total FROM mission_counter_receipts').get().total, 0);
  assert.equal((await readTotal(env)).manualTotal, 0);
  sqlite.exec('DROP TRIGGER reject_counter');
  assert.equal((await missionCounter(post(), env)).status, 200);
  assert.equal((await readTotal(env)).manualTotal, 1);
});

test('a missing singleton does not consume the receipt before the counter is restored', async t => {
  const { env, sqlite } = localDatabase(t);
  sqlite.exec('DELETE FROM mission_counter WHERE id = 1');
  assert.equal((await missionCounter(post(), env)).status, 503);
  assert.equal(sqlite.prepare('SELECT count(*) AS total FROM mission_counter_receipts').get().total, 0);
  sqlite.exec('INSERT INTO mission_counter (id, manual_total) VALUES (1, 0)');
  assert.equal((await missionCounter(post(), env)).status, 200);
  assert.equal((await readTotal(env)).manualTotal, 1);
});
