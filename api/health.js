// GET /api/health → whether the register and the mail desk are configured. No secrets are returned.
import { db } from './_lib/db.js';
import { send, mailConfigured } from './_lib/util.js';
import { entryLimit } from './_lib/entry.js';
import { limits, mailPaused } from './_lib/config.js';

let cached = null, until = 0, checking = null;

export default async function handler(req, res) {
  if (req.method !== 'GET') return send(res, 405, { message: 'GET only' });
  if (!entryLimit(req, res, 'health')) return;
  const seconds = limits().healthSeconds;
  if (!cached || until <= Date.now()) {
    if (!checking) checking = (async () => {
      let dbOk = false;
      try { const sql = db(); if (sql) { await sql`select 1`; dbOk = true; } } catch { dbOk = false; }
      cached = { ok: true, db: dbOk, mail: mailConfigured() && !mailPaused() };
      until = Date.now() + seconds * 1000;
    })().finally(() => { checking = null; });
    await checking;
  }
  return send(res, 200, cached, { 'cache-control': `public, s-maxage=${seconds}, stale-while-revalidate=${seconds}` });
}
