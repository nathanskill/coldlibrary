// In-memory counts for GET /api/ratings and GET /api/tributes (2026-11-16, Neon cost).
// Crawlers walk the catalog one page at a time; each page used to ask the database, so it never slept.
// Now each warm instance reads one small aggregate per table at most every CL_COUNTS_CACHE_SECONDS
// (default 30 minutes) and answers from memory. A reader's own rating or lamp still comes back fresh:
// the POST answers from the database and folds the new number in here at once.
import { limits } from './config.js';

const caches = new Map();

/** @param {string} name @param {() => Promise<Map<string, any>>} load */
export async function cachedCounts(name, load) {
  let c = caches.get(name);
  if (!c) { c = { map: null, until: 0, loading: null, updates: null }; caches.set(name, c); }
  if (c.until > Date.now()) {
    if (c.map) return c.map;
    throw new Error('counts unavailable');
  }
  if (!c.loading) {
    c.updates = new Map();
    c.loading = Promise.resolve().then(load)
      .then((map) => {
        // The aggregate may have started before a POST finished. Merge writes
        // observed during this refresh instead of reverting to its old snapshot.
        for (const [key, value] of c.updates) map.set(key, value);
        c.map = map; c.until = Date.now() + limits().countsSeconds * 1000;
        return map;
      })
      .catch(() => {
        // Sequential requests during an outage must not each retry a full scan.
        c.until = Date.now() + limits().countsRetrySeconds * 1000;
        if (c.map) return c.map;
        throw new Error('counts unavailable');
      })
      .finally(() => { c.loading = null; c.updates = null; });
  }
  return c.loading;
}

export function updateCount(name, key, value) {
  const c = caches.get(name);
  if (c && c.map) c.map.set(key, value);
  if (c && c.updates) c.updates.set(key, value);
}
