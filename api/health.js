// GET /api/health → whether the register and the mail desk are configured. No secrets are returned.
import { ensureSchema } from './_lib/db.js';
import { send, mailConfigured } from './_lib/util.js';

export default async function handler(req, res) {
  let dbOk = false;
  try { const sql = await ensureSchema(); if (sql) { await sql`select 1`; dbOk = true; } } catch { dbOk = false; }
  return send(res, 200, { ok: true, db: dbOk, mail: mailConfigured() });
}
