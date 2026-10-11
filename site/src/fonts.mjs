// Chinese serif ("Cold Serif SC" = Noto Serif SC 2.003, SIL OFL 1.1), cut per page by tools/cjk-font.py (spec §3.6).
//
// Templates register every character they set in the serif (serif()/addGlyphs() in lib.mjs) under the page's font key:
// the work ID, "page:<slug>", or a block a script shows later ("today-<id>" on the lobby, "grid:<slug>" on a shelf,
// through addGlyphsTo). writeManifest() records them in site/cjk-manifest.json; tools/cjk-font.py reads that and
// writes the subsets with map.json and coverage.json, which this module reads, synchronously, to link the right files:
//   fontHead(key, glyphs, lang)  the <link>s for one page: common.css, the key's own CSS and, for a large key on the
//                                shared core, the CSS of each core slice it uses; plus a preload of the key's base
//                                file when it is small and the page surely shows it. No two faces a page can load
//                                share a code point.
//   fontCssHref(key)             the CSS a script inserts when it shows a later block ('' when there is nothing to load).
//   writeManifest(manifest, root)
// Coverage gate: characters a page sets that no subset covers fall back to the system serif (readable, never blank),
// and the build warns once per key. Nothing here throws, so fonts never fail a build: without usable subsets (on
// Vercel there is no Python) every page simply uses the system serif.
// Re-cut after content changes: node site/build.mjs && python3 tools/cjk-font.py && node site/build.mjs
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PUBLIC = fileURLToPath(new URL('../public/', import.meta.url));
const DIR = join(PUBLIC, 'assets/fonts/cjk');
const PRELOAD_MAX = 40 * 1024; // preload a key's base file only up to this size
const W600_WARN = 16 * 1024; // spec §3.5: more bold Chinese than this on one page is an editorial problem
const BUCKETS = ['base', 'hant', 'hans', 'w600'];
const RERUN = 'Run node site/build.mjs && python3 tools/cjk-font.py, then build again.';

let fonts; // undefined: not read yet; null: no usable subsets
const said = new Set();
const related = new Map(); // page key → keys of blocks the page shows later (written to the manifest as "with")
const covers = new Map(); // key → coverage, or null for a key without usable subsets

const chars = (s) => [...String(s || '')];
const has = (g) => !!g && BUCKETS.some((b) => g[b]);
const all400 = (g) => (g.base || '') + (g.hant || '') + (g.hans || '');
const short = (list, n = 40) => (list.length > n ? list.slice(0, n).join('') + `… (+${list.length - n})` : list.join(''));
function once(id, msg, quiet = false) {
  if (said.has(id)) return;
  said.add(id);
  (quiet ? console.log : console.warn)(msg);
}

function load() {
  if (fonts !== undefined) return fonts;
  try {
    const map = JSON.parse(readFileSync(join(DIR, 'map.json'), 'utf8'));
    const cov = JSON.parse(readFileSync(join(DIR, 'coverage.json'), 'utf8'));
    if (!map || map.version !== 3 || !cov || cov.version !== 3 || !map.keys || !cov.keys) throw new Error('not version 3');
    // A file named in map.json but missing on disk would be a 404 for every visitor: such a key counts as uncut.
    const lost = [];
    const ok = (href) => {
      if (typeof href !== 'string' || !href.startsWith('/assets/fonts/cjk/')) return false;
      if (existsSync(join(PUBLIC, href.slice(1)))) return true;
      lost.push(href);
      return false;
    };
    const core = (map.core || []).map((c) => ok(c.href) && ok(c.css));
    const common = map.common && ok(map.common.css) && ok(map.common.href) ? map.common.css : '';
    const broken = new Set();
    for (const [k, e] of Object.entries(map.keys)) {
      const files = BUCKETS.filter((b) => e[b]).map((b) => e[b].href);
      if ((e.css && !ok(e.css)) || !files.every(ok) || (e.core || []).some((i) => !core[i])) broken.add(k);
    }
    if (lost.length) once('lost', `[fonts] ${lost.length} files named in map.json are missing (${lost.slice(0, 3).join(', ')}); the pages that need them use the system serif. ${RERUN}`);
    fonts = {
      map, cov, common, broken,
      commonSet: common ? new Set(chars(cov.common)) : new Set(),
      free: new Set(chars((cov.punct || '') + (cov.space || ''))), // drawn by "CL Punct Serif", or a space
      missing: new Set(chars(cov.missing)), // not in Noto Serif SC: always the system serif
      core: (cov.core || []).map((s) => new Set(chars(s))),
    };
  } catch {
    fonts = null;
    once('*', `[fonts] No usable Cold Serif SC subsets in site/public/assets/fonts/cjk (map.json and coverage.json, version 3); Chinese serif text uses the system serif. ${RERUN}`);
  }
  return fonts;
}

// What one key's files cover: { c400, c600, base, css, entry }, or null when the key has no usable subsets.
function coverOf(key) {
  if (covers.has(key)) return covers.get(key);
  const f = fonts;
  const e = f.map.keys[key];
  const c = f.cov.keys[key];
  let out = null;
  if (e && c && !f.broken.has(key)) {
    const c400 = new Set(chars(all400(c)));
    for (const i of c.core || []) for (const ch of f.core[i] || []) c400.add(ch);
    out = { c400, c600: new Set(chars(c.w600)), base: new Set(chars(c.base)), css: e.css || '', entry: e,
      core: (e.core || []).map((i) => f.map.core[i].css) };
  }
  covers.set(key, out);
  return out;
}

// The characters of g that no file in `cv` (and neither common nor the punctuation face) holds, and the known fallbacks.
function lacking(g, cv) {
  const f = fonts;
  const l4 = [], l6 = [];
  let fallback = false;
  for (const ch of new Set(chars(all400(g)))) {
    if (f.free.has(ch) || f.commonSet.has(ch) || cv.some((c) => c && c.c400.has(ch))) continue;
    if (f.missing.has(ch)) fallback = true;
    else l4.push(ch);
  }
  for (const ch of new Set(chars(g.w600))) {
    if (f.free.has(ch) || cv.some((c) => c && c.c600.has(ch))) continue;
    if (f.missing.has(ch)) fallback = true;
    else l6.push(ch);
  }
  if (fallback) once('missing', `[fonts] Not in Noto Serif SC, so always set in the system serif (known fallbacks): ${[...f.missing].join('')}`, true);
  return { l4, l6 };
}

function gateWarn(key, known, l4, l6) {
  if (!l4.length && !l6.length) return;
  const n = l4.length + l6.length;
  if (!known) return once(key, `[fonts] ${key}: no Cold Serif SC subset yet (${n} characters); the page uses the system serif. ${RERUN}`);
  const parts = [l4.length ? `${l4.length} regular: ${short(l4)}` : '', l6.length ? `${l6.length} bold: ${short(l6)}` : ''].filter(Boolean).join('; ');
  once(key, `[fonts] ${key}: characters without a Cold Serif SC subset fall back to the system serif (${parts}). ${RERUN}`);
}

const css = (href) => `<link rel="stylesheet" href="${href}">\n`;
const preload = (href) => `<link rel="preload" href="${href}" as="font" type="font/woff2" crossorigin>\n`;

function head(key, g, lang) {
  const extras = Object.entries(g.extra || {}).filter(([, x]) => has(x)).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  if (extras.length) {
    const s = related.get(key) || new Set();
    for (const [k] of extras) s.add(k);
    related.set(key, s);
  }
  const own = has(g);
  if (!own && !extras.length) return '';
  const f = load();
  if (!f) return '';
  const cv = coverOf(key);
  const links = [];
  let pre = '';
  if (own && !cv) {
    // No subset for this key at all (a new page since the last cut): link the common file only if it covers every
    // character, so a text is never set half in Cold Serif SC and half in the system serif.
    const { l4, l6 } = lacking(g, []);
    if (f.common && !l4.length && !l6.length) links.push(f.common);
    else gateWarn(key, false, l4, l6);
  } else if (own) {
    if (f.common) links.push(f.common);
    links.push(...cv.core);
    if (cv.css) links.push(cv.css);
    let { l4, l6 } = lacking(g, [cv]);
    // The page may show text that a later block's files hold (the lobby's visible pick, when the build day differs
    // from the day the fonts were cut): link that block's CSS too. Its files leave out what this key covers.
    for (const [k] of extras) {
      if (!l4.length && !l6.length) break;
      const xc = coverOf(k);
      if (!xc || !xc.css || !(l4.some((ch) => xc.c400.has(ch)) || l6.some((ch) => xc.c600.has(ch)))) continue;
      links.push(xc.css);
      l4 = l4.filter((ch) => !xc.c400.has(ch));
      l6 = l6.filter((ch) => !xc.c600.has(ch));
    }
    gateWarn(key, true, l4, l6);
    const e = cv.entry;
    // Preload the base file when it is small and the page surely shows it: Chinese pages always show their Chinese,
    // English pages do when the key has a script split (a Chinese original); an English page whose only Chinese is a
    // hidden translation layer would preload a file it never uses.
    if (e.base && e.base.bytes <= PRELOAD_MAX && (lang === 'zh' || e.hant || e.hans) && chars(all400(g)).some((ch) => cv.base.has(ch))) pre = preload(e.base.href);
    if (e.w600 && e.w600.bytes > W600_WARN) once('w600:' + key, `[fonts] ${key}: ${Math.round(e.w600.bytes / 1024)} KB of bold Chinese (budget 16 KB); the fix is editorial: less bold.`);
  }
  for (const [k, x] of extras) {
    const xc = coverOf(k);
    const { l4, l6 } = lacking(x, [cv, xc]);
    gateWarn(k, !!xc, l4, l6);
  }
  // A later block's files leave out the common characters, so a page with such a block always links common.css.
  if (extras.length && f.common && !links.includes(f.common)) links.unshift(f.common);
  return pre + [...new Set(links)].map(css).join('');
}

export function fontHead(key, glyphs, lang) {
  try {
    return head(key, glyphs || {}, lang);
  } catch (e) {
    once('error:' + key, `[fonts] ${key}: ${e && e.message}; the page uses the system serif.`);
    return '';
  }
}

// The CSS for a block a script inserts later (the lobby's today-<id>, a shelf's grid). '' when the block needs no
// file of its own (its page already covers it) or has no subset yet; the scripts skip an empty href.
export function fontCssHref(key) {
  try {
    if (!load()) return '';
    const c = coverOf(key);
    return (c && c.css) || '';
  } catch {
    return '';
  }
}

// site/cjk-manifest.json: { "<fontKey>": { base, hant, hans, w600 [, with: [keys of blocks the page shows later]] } }.
export function writeManifest(manifest, root) {
  try {
    const out = {};
    for (const k of Object.keys(manifest).sort()) {
      const e = {};
      for (const b of BUCKETS) e[b] = [...new Set(String(manifest[k][b] || ''))].sort().join('');
      const w = related.get(k);
      if (w && w.size) e.with = [...w].filter((x) => manifest[x]).sort();
      out[k] = e;
    }
    writeFileSync(join(root, 'site/cjk-manifest.json'), JSON.stringify(out, null, 0).replace(/},"/g, '},\n"') + '\n');
  } catch (e) {
    console.warn(`[fonts] could not write site/cjk-manifest.json: ${e && e.message}`);
  }
}
