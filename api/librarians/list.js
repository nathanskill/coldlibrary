// GET /api/librarians/list?lang=en|zh  → the public register (pen names and numbers only)
import { ensureSchema } from '../_lib/db.js';
import { send } from '../_lib/util.js';

export default async function handler(req, res) {
  let sql;
  try { sql = await ensureSchema(); } catch { sql = null; }
  if (!sql) return send(res, 503, { librarians: [] });
  const zh = String(req.query?.lang || '') === 'zh';
  const rows = await sql`select uid, pen_name, created_at from librarians
    where status = 'active' and (listed or uid = 1) order by created_at asc, uid asc limit 500`;
  const total = await sql`select count(*)::int as n from librarians where status = 'active'`;
  const librarians = rows.map((r) => ({
    uid: r.uid,
    penName: r.uid === 1 ? (zh ? '创始馆员' : 'Founding Librarian') : r.pen_name,
    since: new Date(r.created_at).toISOString().slice(0, 10),
  }));
  return send(res, 200, { librarians, total: total[0].n }, { 'cache-control': 'public, s-maxage=60, stale-while-revalidate=300' });
}
