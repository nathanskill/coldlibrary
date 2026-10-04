// GET  /api/lamps?item=E-000001            → { count, notes: [{ text, at }] }
// POST /api/lamps { item, token, note? }   → light a lamp. Only recognised visitors hold the token:
// it is inside the locked layer, and we only know its SHA-256.
import { createRequire } from 'node:module';
import { ensureSchema, rateLimit } from './_lib/db.js';
import { send, readJson, lang, L, sha256, clientKey } from './_lib/util.js';

const require = createRequire(import.meta.url);
const HASHES = require('./_lib/lamp-hashes.json');
const ID = /^[EM]-\d{6}$/;

// Published items and their lamp hashes are committed with the catalog (tools/seal-item.mjs, tools/publish-item.mjs).
function expected(item) { return HASHES[item] || null; }

export default async function handler(req, res) {
  let sql;
  try { sql = await ensureSchema(); } catch { sql = null; }
  if (req.method === 'GET') {
    const item = String(req.query?.item || new URL(req.url, 'http://x').searchParams.get('item') || '');
    if (!ID.test(item)) return send(res, 400, { message: 'bad item' });
    if (!sql) return send(res, 200, { count: 0, notes: [] });
    const exp = expected(item);
    const [{ n }] = await sql`select count(*)::int as n from lamps where item = ${item}`;
    const notes = exp && exp.notes_public
      ? (await sql`select note, created_at from lamps where item = ${item} and note is not null order by created_at desc limit 30`).map((r) => ({ text: r.note, at: r.created_at }))
      : [];
    res.setHeader('cache-control', 'public, s-maxage=30');
    return send(res, 200, { count: n, notes });
  }
  if (req.method !== 'POST') return send(res, 405, { message: 'GET or POST' });
  const body = await readJson(req);
  const lg = lang(body.locale);
  const item = String(body.item || '');
  if (!ID.test(item) || typeof body.token !== 'string') return send(res, 400, { message: L(lg, 'This lamp cannot be lit.', '这盏灯点不了。') });
  if (!sql) return send(res, 503, { message: L(lg, 'The hall is closed for maintenance.', '大厅正在维护。') });
  const exp = expected(item);
  if (!exp || sha256(body.token) !== exp.hash) return send(res, 403, { message: L(lg, 'Only people the warden recognised can light a lamp here.', '只有守馆人认可的人才能在这里点灯。') });
  const ip = clientKey(req);
  if (!(await rateLimit(sql, 'lamp:' + ip, 6))) return send(res, 429, { message: L(lg, 'Your lamp is already lit. Come back another day.', '你的灯已经亮着了，改天再来。') });
  const note = String(body.note || '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 140) || null;
  await sql`insert into lamps (item, note, locale, ip_hash) values (${item}, ${note}, ${lg}, ${ip})`;
  return send(res, 200, { ok: true });
}
