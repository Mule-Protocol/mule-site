import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { missionCounter } from '../src/server/mission-counter.ts';

// QA only: execute the unchanged API and migration against disposable SQLite.
// No Wrangler configuration, D1 binding or remote database is read or contacted.
export function createQaCounter() {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec(readFileSync(new URL('../migrations/0001_mission_counter.sql', import.meta.url), 'utf8'));
  const statement = (sql, values = []) => ({ sql, values, bind: (...bindings) => statement(sql, bindings) });
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
  return async (req, url) => {
    const request = new Request(url, {
      method: req.method,
      headers: req.headers,
      ...(['GET', 'HEAD'].includes(req.method) ? {} : { body: req, duplex: 'half' }),
    });
    return missionCounter(request, { MULE_COUNTER: binding });
  };
}
