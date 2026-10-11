// Chinese serif ("Cold Serif SC" = Noto Serif SC 2.003, SIL OFL 1.1), cut per page by tools/cjk-font.py (spec §3.6).
//
// The build registers every character it sets in the serif (serif()/addGlyphs() in lib.mjs) under a font key: the work
// ID, "page:<slug>", or a block a script shows later ("today-<id>", "grid:<slug>"). writeManifest() records them in
// site/cjk-manifest.json; the Python tool reads that and writes the subsets, map.json and coverage.json, which this
// module reads (synchronously) to link the right files:
//   fontHead(key, glyphs, lang)  the <link>s for one page: the common CSS and the key's own CSS, plus a preload of the
//                                key's base file when it is small. A key on the shared core (long works and big lists,
//                                only so storage fits 15 MB) also links the core CSS, which its own CSS imports too.
//                                No two files one page links share a code point.
//   fontCssHref(key)             the CSS for a block a script inserts later (the lobby's today-<id>, a shelf's grid).
//   writeManifest(manifest, root)
// Coverage gate: characters a page sets that no subset covers fall back to the system serif (readable, never blank),
// and the build warns once per key. On Vercel there is no Python, so a stale map degrades this way and never fails.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('../public/assets/fonts/cjk/', import.meta.url));
const PRELOAD_MAX = 40 * 1024;
const BUCKETS = ['base', 'hant', 'hans', 'w600'];

let fonts; // undefined: not read yet; null: no subsets on disk
const warned = new Set();
const related = new Map(); // page key → keys of blocks the page shows later (recorded into the manifest as "with")
const cache = new Map(); // key → { c400: Set, c600: Set, base: Set }

function load() {
  if (fonts !== undefined) return fonts;
  try {
    const map = JSON.parse(readFileSync(join(DIR, 'map.json'), 'utf8'));
    const cov = JSON.parse(readFileSync(join(DIR, 'coverage.json'), 'utf8'));
    if (!map || map.version !== 2 || !cov || cov.version !== 2) throw new Error('old format');
    fonts = { map, cov, common: new Set(cov.common || ''), core: new Set(cov.core || ''), missing: new Set(cov.missing || '') };
  } catch {
    fonts = null;
    warn('*', '[fonts] No Cold Serif SC subsets in site/public/assets/fonts/cjk (map.json, coverage.json). Chinese serif text uses the system serif. Run: node site/build.mjs && python3 tools/cjk-font.py');
  }
  return fonts;
}

function warn(key, msg) {
  if (warned.has(key)) return;
  warned.add(key);
  console.warn(msg);
}

const chars = (s) => [...String(s || '')];
const has = (g) => !!g && BUCKETS.some((b) => g[b]);
const short = (list, n = 40) => (list.length > n ? list.slice(0, n).join('') + `… (+${list.length - n})` : list.join(''));

function coverOf(key) {
  if (cache.has(key)) return cache.get(key);
  const f = fonts;
  const e = f.map.keys[key];
  const c = f.cov.keys[key] || {};
  let out = null;
  if (e) {
    const c400 = new Set(chars((c.base || '') + (c.hant || '') + (c.hans || '')));
    if (e.mode === 'core') for (const ch of f.core) c400.add(ch);
    out = { mode: e.mode, c400, c600: new Set(chars(c.w600)), base: new Set(chars(c.base)) };
  }
  cache.set(key, out);
  return out;
}

// Which of a key's characters no subset covers; warns once per key. Returns { unknown, lack }.
function gate(key, g) {
  const f = fonts;
  const cv = coverOf(key);
  const lack400 = [], lack600 = [], fallback = [];
  for (const ch of new Set(chars((g.base || '') + (g.hant || '') + (g.hans || '')))) {
    if (f.missing.has(ch)) fallback.push(ch);
    else if (!f.common.has(ch) && !(cv && cv.c400.has(ch))) lack400.push(ch);
  }
  for (const ch of new Set(chars(g.w600))) {
    if (f.missing.has(ch)) fallback.push(ch);
    else if (!(cv && cv.c600.has(ch))) lack600.push(ch);
  }
  if (fallback.length) warn('missing:' + fallback.join(''), `[fonts] Not in Noto Serif SC, so always set in the system serif (known fallback): ${short(fallback)}`);
  if (!cv) warn(key, `[fonts] ${key}: no Cold Serif SC subset yet (${lack400.length + lack600.length} characters); the page uses the system serif. Run python3 tools/cjk-font.py after this build.`);
  else if (lack400.length || lack600.length) {
    const parts = [lack400.length ? `${lack400.length} regular: ${short(lack400)}` : '', lack600.length ? `${lack600.length} bold: ${short(lack600)}` : ''].filter(Boolean).join('; ');
    warn(key, `[fonts] ${key}: characters without a subset fall back to the system serif (${parts}). Run python3 tools/cjk-font.py after this build.`);
  }
  return { unknown: !cv, lack: lack400.length + lack600.length };
}

const css = (href) => `<link rel="stylesheet" href="${href}">\n`;
const preload = (href) => `<link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin>\n`;

const DUMP = process.env.CL_FONT_DUMP ? {} : null;
if (DUMP) process.on('exit', () => writeFileSync(process.env.CL_FONT_DUMP, JSON.stringify(DUMP)));
export function fontHead(key, glyphs, lang) {
  const g = glyphs || {};
  if (DUMP) { (DUMP[key] ||= {})[lang] = { base: g.base, hant: g.hant, hans: g.hans, w600: g.w600, extra: g.extra }; }
  const extras = Object.entries(g.extra || {}).filter(([, x]) => has(x));
  if (extras.length) {
    const s = related.get(key) || new Set();
    for (const [k] of extras) s.add(k);
    related.set(key, s);
  }
  const own = has(g);
  if (!own && !extras.length) return '';
  const f = load();
  if (!f) return '';
  const common = f.map.common && f.map.common.css;
  let head = '';
  if (own) {
    const { unknown } = gate(key, g);
    const e = f.map.keys[key];
    if (unknown) {
      // No subset for this key at all: link the common file only if it covers everything, so a page is never set
      // half in Noto and half in the system serif.
      const all = chars((g.base || '') + (g.hant || '') + (g.hans || ''));
      if (common && !g.w600 && all.every((ch) => f.common.has(ch) || f.missing.has(ch))) head += css(common);
    } else {
      if (common) head += css(common);
      if (e.mode === 'core' && f.map.core) head += css(f.map.core.css); // also imported by e.css; linked here so it loads in parallel
      if (e.css) head += css(e.css);
      const cv = coverOf(key);
      if (e.base && e.base.bytes <= PRELOAD_MAX && chars((g.base || '') + (g.hant || '') + (g.hans || '')).some((ch) => cv.base.has(ch))) head += preload(e.base.href);
    }
  }
  for (const [k, x] of extras) gate(k, x);
  if (extras.length && common && !head.includes(common)) head = css(common) + head;
  return head;
}

// The CSS for a block a script inserts later. An unknown key gets the common CSS (already linked: inserting it again
// downloads nothing), so a script never inserts an empty href.
export function fontCssHref(key) {
  const f = load();
  if (!f) return '';
  const e = f.map.keys[key];
  const common = (f.map.common && f.map.common.css) || '';
  return (e && e.css) || common;
}

// site/cjk-manifest.json: { "<fontKey>": { base, hant, hans, w600 [, with: [keys the page shows later]] } }.
export function writeManifest(manifest, root) {
  const out = {};
  for (const k of Object.keys(manifest).sort()) {
    const e = {};
    for (const b of BUCKETS) e[b] = [...new Set(String(manifest[k][b] || ''))].sort().join('');
    const w = related.get(k);
    if (w && w.size) e.with = [...w].filter((x) => manifest[x]).sort();
    out[k] = e;
  }
  writeFileSync(join(root, 'site/cjk-manifest.json'), JSON.stringify(out, null, 0).replace(/},"/g, '},\n"') + '\n');
}
