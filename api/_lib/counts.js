// In-memory counts for GET /api/ratings and GET /api/tributes (2026-11-16, Neon cost).
// Crawlers walk the catalog one page at a time; each page used to ask the database, so it never slept.
// Now each warm instance reads one small aggregate per table at most every CL_COUNTS_CACHE_SECONDS
// (default 30 minutes) and answers from memory. A reader's own rating or lamp still comes back fresh:
// the POST answers from the database and folds the new number in here at once.
import { limits } from './config.js';

const caches = new Map();

export async function cachedCounts(name, load) {
  let c = caches.get(name);
  if (!c) { c = { map: null, until: 0, loading: null }; caches.set(name, c); }
  if (c.map && c.until > Date.now()) return c.map;
  if (!c.loading) {
    c.loading = load()
      .then((map) => { c.map = map; c.until = Date.now() + limits().countsSeconds * 1000; return map; })
      .finally(() => { c.loading = null; });
  }
  return c.loading;
}

export function updateCount(name, key, value) {
  const c = caches.get(name);
  if (c && c.map) c.map.set(key, value);
}
