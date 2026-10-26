// GET  /api/ratings?ids=S-001001,A-002001   → { stats: { id: [count, sum of stars] } }
// POST /api/ratings { id, stars: 1–5, device } → { ok, n, sum }
// One rating per entry per device (a new one replaces the old). Scripture of a living faith cannot be rated.
// Stored: entry, a hash of the device id, stars, a hash of the address, dates. Nothing that names anyone.
import { createRequire } from 'node:module';
import { ensureSchema, rateLimit, saveRating } from './_lib/db.js';
import { send, readJson, lang, L, sha256, clientKey } from './_lib/util.js';
import { entryLimit } from './_lib/entry.js';
import { limits } from './_lib/config.js';

const require = createRequire(import.meta.url);
const RATE = new Set(require('./_lib/rate-ids.json').rate);
const DEVICE = /^[0-9a-f]{32}$/;

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return send(res, 405, { message: 'GET or POST' });
  if (!entryLimit(req, res, 'ratings')) return;
  let sql;
  try { sql = await ensureSchema(); } catch { sql = null; }
  if (req.method === 'GET') {
    const raw = String(req.query?.ids || new URL(req.url, 'http://x').searchParams.get('ids') || '');
    const ids = [...new Set(raw.split(',').map((s) => s.trim()).filter((s) => RATE.has(s)))].slice(0, 100);
    if (!ids.length) return send(res, 400, { message: 'bad ids' });
    if (!sql) return send(res, 200, { stats: {} });
    const rows = await sql`select item, count(*)::int as n, sum(stars)::int as s from ratings
      where item = any(string_to_array(${ids.join(',')}, ',')) group by item`;
    res.setHeader('cache-control', 'public, s-maxage=60, stale-while-revalidate=600');
    return send(res, 200, { stats: Object.fromEntries(rows.map((r) => [r.item, [r.n, r.s]])) });
  }
  if (req.method !== 'POST') return send(res, 405, { message: 'GET or POST' });
  const body = await readJson(req, res);
  if (!body) return;
  const lg = lang(body.locale);
  const id = String(body.id || '');
  const stars = Number(body.stars);
  const dv = String(body.device || '');
  if (!RATE.has(id) || !Number.isInteger(stars) || stars < 1 || stars > 5 || !DEVICE.test(dv)) return send(res, 400, { message: L(lg, 'This rating cannot be saved.', '这个评分存不了。') });
  if (!sql) return send(res, 503, { message: L(lg, 'Ratings are resting for maintenance.', '评分正在维护。') });
  const ip = clientKey(req);
  if (!(await rateLimit(sql, 'rate:' + ip, limits().ratings))) return send(res, 429, { message: L(lg, 'That is a lot of ratings at once. Try again in a few minutes.', '一下子打了太多分，过几分钟再试。') });
  const dh = sha256('device:' + dv).slice(0, 32);
  if (!(await saveRating(sql, id, dh, stars, ip))) return send(res, 429, { message: L(lg, 'Enough ratings for this one have come from here already.', '这一部从这里打的分已经够多了。') });
  const [r] = await sql`select count(*)::int as n, coalesce(sum(stars), 0)::int as s from ratings where item = ${id}`;
  return send(res, 200, { ok: true, n: r.n, sum: r.s });
}
