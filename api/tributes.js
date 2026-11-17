// GET  /api/tributes?keys=author:lu-xun,artist:faye-wong → { counts: { key: n } }
// POST /api/tributes { key, device }                    → { ok, count }
// A lamp for a writer or a musician: one per person per device per day. Counted, never named.
import { createRequire } from 'node:module';
import { ensureSchema, rateLimit } from './_lib/db.js';
import { send, readJson, validFields, queryString, lang, L, sha256, clientKey } from './_lib/util.js';
import { entryLimit } from './_lib/entry.js';
import { limits } from './_lib/config.js';
import { cachedCounts, updateCount } from './_lib/counts.js';

const require = createRequire(import.meta.url);
const PEOPLE = new Set(require('./_lib/rate-ids.json').people);
const DEVICE = /^[0-9a-f]{32}$/;

export default async function handler(req, res) {
  if (!['GET', 'POST'].includes(req.method)) return send(res, 405, { message: 'GET or POST' });
  if (!entryLimit(req, res, 'tributes')) return;
  if (req.method === 'GET') {
    const raw = queryString(req, 'keys');
    if (raw === null) return send(res, 400, { message: 'bad keys' });
    const keys = [...new Set(raw.split(',').map((s) => s.trim()).filter((s) => PEOPLE.has(s)))].slice(0, 50);
    if (!keys.length) return send(res, 400, { message: 'bad keys' });
    let all;
    try {
      all = await cachedCounts('tributes', async () => {
        const sql = await ensureSchema();
        if (!sql) throw new Error('no database');
        const rows = await sql`select person, count(*)::int as n from tributes group by person`;
        return new Map(rows.map((r) => [r.person, r.n]));
      });
    } catch { return send(res, 200, { counts: {} }); }
    res.setHeader('cache-control', 'public, s-maxage=600, stale-while-revalidate=3600');
    return send(res, 200, { counts: Object.fromEntries(keys.filter((k) => all.has(k)).map((k) => [k, all.get(k)])) });
  }
  const body = await readJson(req, res);
  if (!body) return;
  const lg = lang(body.locale);
  if (!validFields(body, { key: 'string', device: 'string' }, { locale: 'string' })) return send(res, 400, { message: L(lg, 'This lamp cannot be lit.', '这盏灯点不了。') });
  const key = body.key;
  const dv = body.device;
  if (!PEOPLE.has(key) || !DEVICE.test(dv)) return send(res, 400, { message: L(lg, 'This lamp cannot be lit.', '这盏灯点不了。') });
  let sql;
  try { sql = await ensureSchema(); } catch { sql = null; }
  if (!sql) return send(res, 503, { message: L(lg, 'The lamps are resting for maintenance.', '灯正在维护。') });
  const ip = clientKey(req);
  if (!(await rateLimit(sql, 'tribute:' + ip, limits().tributes))) return send(res, 429, { message: L(lg, 'Many lamps at once. Come back in a little while.', '一下子点了太多盏灯，过一会儿再来。') });
  const dh = sha256('device:' + dv).slice(0, 32);
  await sql`insert into tributes (person, device, ip_hash) values (${key}, ${dh}, ${ip}) on conflict do nothing`;
  const [r] = await sql`select count(*)::int as n from tributes where person = ${key}`;
  updateCount('tributes', key, r.n);
  return send(res, 200, { ok: true, count: r.n });
}
