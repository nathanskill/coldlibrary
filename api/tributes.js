// GET  /api/tributes?keys=author:lu-xun,artist:faye-wong → { counts: { key: n } }
// POST /api/tributes { key, device }                    → { ok, count }
// A lamp for a writer or a musician: one per person per device per day. Counted, never named.
import { createRequire } from 'node:module';
import { ensureSchema, rateLimit } from './_lib/db.js';
import { send, readJson, lang, L, sha256, clientKey } from './_lib/util.js';

const require = createRequire(import.meta.url);
const PEOPLE = new Set(require('./_lib/rate-ids.json').people);
const DEVICE = /^[0-9a-f]{32}$/;

export default async function handler(req, res) {
  let sql;
  try { sql = await ensureSchema(); } catch { sql = null; }
  if (req.method === 'GET') {
    const raw = String(req.query?.keys || new URL(req.url, 'http://x').searchParams.get('keys') || '');
    const keys = [...new Set(raw.split(',').map((s) => s.trim()).filter((s) => PEOPLE.has(s)))].slice(0, 50);
    if (!keys.length) return send(res, 400, { message: 'bad keys' });
    if (!sql) return send(res, 200, { counts: {} });
    const rows = await sql`select person, count(*)::int as n from tributes
      where person = any(string_to_array(${keys.join(',')}, ',')) group by person`;
    res.setHeader('cache-control', 'public, s-maxage=60, stale-while-revalidate=600');
    return send(res, 200, { counts: Object.fromEntries(rows.map((r) => [r.person, r.n])) });
  }
  if (req.method !== 'POST') return send(res, 405, { message: 'GET or POST' });
  const body = await readJson(req);
  const lg = lang(body.locale);
  const key = String(body.key || '');
  const dv = String(body.device || '');
  if (!PEOPLE.has(key) || !DEVICE.test(dv)) return send(res, 400, { message: L(lg, 'This lamp cannot be lit.', '这盏灯点不了。') });
  if (!sql) return send(res, 503, { message: L(lg, 'The lamps are resting for maintenance.', '灯正在维护。') });
  const ip = clientKey(req);
  if (!(await rateLimit(sql, 'tribute:' + ip, 30))) return send(res, 429, { message: L(lg, 'Many lamps at once. Come back in a little while.', '一下子点了太多盏灯，过一会儿再来。') });
  const dh = sha256('device:' + dv).slice(0, 32);
  await sql`insert into tributes (person, device, ip_hash) values (${key}, ${dh}, ${ip}) on conflict do nothing`;
  const [r] = await sql`select count(*)::int as n from tributes where person = ${key}`;
  return send(res, 200, { ok: true, count: r.n });
}
