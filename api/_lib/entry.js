import { limits } from './config.js';
import { clientKey, send } from './util.js';

const entries = new Map();
// A bounded, per-instance shedder, before any database work. Distributed quotas
// still live in Postgres; this is not a replacement for the host's edge limits.
export function entryLimit(req, res, scope) {
  const cfg = limits(), now = Date.now();
  const max = req.method === 'GET' ? cfg.entryRead : cfg.entryWrite;
  const key = scope + ':' + req.method + ':' + clientKey(req);
  let row = entries.get(key);
  if (!row || row.until <= now) {
    if (entries.size >= cfg.cacheKeys) entries.delete(entries.keys().next().value);
    row = { hits: 0, until: now + 60000 };
    entries.set(key, row);
  }
  if (row.hits >= max) {
    send(res, 429, { message: 'Please wait a minute before trying again. 请稍后再试。' },
      { 'retry-after': String(Math.max(1, Math.ceil((row.until - now) / 1000))), 'cache-control': 'no-store' });
    return false;
  }
  row.hits++;
  return true;
}
