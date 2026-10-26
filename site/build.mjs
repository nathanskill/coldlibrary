// Build the static site: node site/build.mjs  →  site/dist/
// Zero dependencies. Chinese at / (the default since 2026-10-15), English at /en/.
//
// Page contract (every module that adds pages exports objects like this):
//   { slug, title: {en, zh} | (lang) => string, description: {en, zh} | (lang) => string,
//     render(lang, ctx) => html, bodyClass?: string | (lang) => string, fontKey?: string,
//     noindex?, image?, scripts?: ['reading', …] (files in /assets/js/), alternates?: true }
// Text set in the Chinese serif must go through serif()/addGlyphs() (lib.mjs) so its glyphs reach the font slicer.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { layout, SITE, href, resetGlyphs, takeGlyphs } from './src/lib.mjs';
import { loadStacks } from './src/stacks.mjs';
import { PAGES, itemPage } from './src/pages.mjs';
import { workPages } from './src/stacks/work.mjs';
import { stackPages } from './src/stacks/lists.mjs';
import { fontHead, writeManifest } from './src/fonts.mjs';
import { emitOutputs } from './src/outputs.mjs';
import { checkStacks } from '../tools/stacks-check.mjs';
import { loadCatalog, rateIds } from './src/catalog.mjs';
import { ratePages } from './src/rate/pages.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
// CL_DIST lets parallel builds write to their own folder; CL_NO_MANIFEST=1 skips writing site/cjk-manifest.json.
const dist = process.env.CL_DIST || join(here, 'dist');

function copyDir(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const name of readdirSync(src)) {
    const s = join(src, name), d = join(dst, name);
    if (statSync(s).isDirectory()) copyDir(s, d); else copyFileSync(s, d);
  }
}

// ---- catalog ----
const projects = readdirSync(join(root, 'catalog/projects')).filter((f) => f.endsWith('.json')).sort()
  .map((f) => JSON.parse(readFileSync(join(root, 'catalog/projects', f), 'utf8')));

const items = readdirSync(join(root, 'catalog/items')).filter((f) => f.endsWith('.json')).sort()
  .map((f) => JSON.parse(readFileSync(join(root, 'catalog/items', f), 'utf8')));
for (const i of items) if (JSON.stringify(i).includes('"answer"')) throw new Error(`${i.id}: answers must never be published`);

const log = JSON.parse(readFileSync(join(root, 'catalog/log.json'), 'utf8'));
// Contract test count, counted from source so the homepage never claims a number by hand.
const testDir = join(root, 'contracts/test');
const tests = existsSync(testDir) ? readdirSync(testDir).filter((f) => f.endsWith('.sol')).map((f) => (readFileSync(join(testDir, f), 'utf8').match(/function test/g) || []).length).reduce((a, b) => a + b, 0) : 0;

// The Open Stacks: works, plates, shelves, trails, Claude's shelf, tags, house papers.
const open = loadStacks(root);
// The catalogue checker runs on every build, as a warning: content edits never block a deploy.
try { const r = checkStacks(root); const n = (r && (r.errors || r.problems) || []).length; const wn = (r && r.warnings || []).length; console.log(`stacks-check: ${n} problem(s), ${wn} warning(s)`); } catch (e) { console.warn('stacks-check could not run: ' + e.message); }
// The rated catalogue (2026-10-15): scores on works, book entries and albums.
const cat = loadCatalog(root, open);
const ctx = { root, projects, items, log, tests, open, cat };
// The API only accepts ids and people listed in api/_lib/rate-ids.json (tools/rate-ids.mjs writes it).
try {
  const want = JSON.stringify(rateIds(cat, open));
  const have = existsSync(join(root, 'api/_lib/rate-ids.json')) ? JSON.stringify(JSON.parse(readFileSync(join(root, 'api/_lib/rate-ids.json'), 'utf8'))) : '';
  if (want !== have) console.warn('rate-ids: api/_lib/rate-ids.json is out of date; run node tools/rate-ids.mjs');
} catch (e) { console.warn('rate-ids could not be checked: ' + e.message); }

const all = [...PAGES, ...items.map(itemPage), ...stackPages(ctx), ...workPages(ctx), ...ratePages(ctx)];
const seen = new Set();
for (const p of all) { if (seen.has(p.slug)) throw new Error(`two pages claim the slug "${p.slug}"`); seen.add(p.slug); }

// ---- render ----
// Offline reviews may forbid deleting any files. Require a fresh output folder
// in that mode; never merge into stale output or remove a previous build.
if (process.env.CL_NO_CLEAN === '1') {
  if (existsSync(dist)) throw new Error('CL_NO_CLEAN needs a new CL_DIST directory');
} else rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
copyDir(join(here, 'public'), dist);

// One stylesheet, assembled from site/src/css/NN-*.css in name order (files starting with "_" are not shipped).
const cssDir = join(here, 'src/css');
const cssParts = readdirSync(cssDir).filter((f) => /^\d.*\.css$/.test(f)).sort();
// A conservative minifier: comments and layout whitespace only (spaces inside calc() and selectors are kept).
const minCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s*\n\s*/g, '\n').replace(/\n+/g, '\n')
  .replace(/\s*([{};])\s*/g, '$1').replace(/;}/g, '}').replace(/,\n/g, ',').replace(/\n/g, ' ').replace(/\s{2,}/g, ' ').trim() + '\n';
const cssAll = cssParts.map((f) => readFileSync(join(cssDir, f), 'utf8')).join('\n');
writeFileSync(join(dist, 'assets/site.css'), process.env.CL_CSS_PRETTY ? cssParts.map((f) => `/* ---- ${f} ---- */\n` + readFileSync(join(cssDir, f), 'utf8')).join('\n') : minCss(cssAll));

const pick = (v, lang) => (typeof v === 'function' ? v(lang) : typeof v === 'string' ? v : v && (v[lang] ?? v.en));
const urls = [];
const manifest = {};
let pages = 0;
for (const p of all) {
  for (const lang of p.langs || ['en', 'zh']) {
    resetGlyphs();
    const body = p.render(lang, ctx);
    const glyphs = takeGlyphs();
    const fontKey = p.fontKey || 'page:' + (p.slug || 'lobby');
    const merge = (key, g) => {
      const m = manifest[key] || (manifest[key] = { base: '', hant: '', hans: '', w600: '' });
      for (const k of Object.keys(m)) m[k] = [...new Set(m[k] + (g[k] || ''))].join('');
    };
    merge(fontKey, glyphs);
    for (const [k, g] of Object.entries(glyphs.extra || {})) merge(k, g);
    const html = layout({
      lang,
      slug: p.slug === '404' ? '' : p.slug,
      notFound: p.slug === '404',
      title: pick(p.title, lang),
      description: pick(p.description, lang),
      image: p.image,
      noindex: !!p.noindex,
      bodyClass: pick(p.bodyClass, lang) || '',
      head: fontHead(fontKey, glyphs, lang),
      scripts: p.scripts || [],
      alternates: p.alternates !== false,
      body,
    });
    let file;
    if (p.slug === '404') file = lang === 'zh' ? '404.html' : 'en/404.html';
    else if (p.slug === '') file = lang === 'zh' ? 'index.html' : 'en.html';
    else file = (lang === 'zh' ? '' : 'en/') + p.slug + '.html';
    const out = join(dist, file);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html);
    pages++;
    if (p.slug !== '404' && !p.noindex) urls.push(SITE + href(lang, p.slug));
  }
}
if (!process.env.CL_NO_MANIFEST) writeManifest(manifest, root);

// Every item as a file its owner can keep: public fields and ciphertext only, never answers.
mkdirSync(join(dist, 'items'), { recursive: true });
for (const i of items) writeFileSync(join(dist, 'items', i.id + '.json'), JSON.stringify(i, null, 2) + '\n');
writeFileSync(join(dist, 'items', 'index.json'), JSON.stringify(Object.fromEntries(items.map((i) => [i.id, (i.kind === 'exhibit' ? 'exhibits/' : 'plaques/') + i.slug]))) + '\n');

// Short catalogue URLs for citing and printing: /e/000001, /m/000001. Plain files, so every new item gets one.
for (const i of items) {
  const to = '/' + (i.kind === 'exhibit' ? 'exhibits/' : 'plaques/') + i.slug;
  const dir = join(dist, i.id[0].toLowerCase());
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, i.id.slice(2) + '.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${i.id} · Cold Library</title><link rel="canonical" href="${SITE}${to}"><meta http-equiv="refresh" content="0; url=${to}"></head><body><p><a href="${to}">${i.id} →</a></p></body></html>\n`);
}

// Open Stacks outputs: .txt copies, search data, feeds, /s/ and /g/ short URLs, extra sitemap entries.
const extraUrls = emitOutputs(ctx, dist) || [];
// Search data for the rated catalogue (books and albums), read by search.js next to index.json.
writeFileSync(join(dist, 'open-stacks/catalog.json'), JSON.stringify({ entries: cat.entries.filter((e) => e.kind !== 'work').map((e) => {
  const r = e.ref, p = e.kind === 'album' ? r.artist : r.author;
  return { i: e.id, t: [r.title.orig, r.title.en, r.title.zh].filter((x, k, a) => x && a.indexOf(x) === k).join(' / '), a: p ? [p.orig, p.en, p.zh].filter((x, k, a) => x && a.indexOf(x) === k).join(' / ') : '', y: r.year };
}) }) + '\n');

writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${[...urls, ...extraUrls].map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${SITE}/sitemap.xml\n`);

// Spec and schema are served from the site too, so the format can be fetched without GitHub.
mkdirSync(join(dist, 'spec/v0.1'), { recursive: true });
copyFileSync(join(root, 'spec/v0.1/core.schema.json'), join(dist, 'spec/v0.1/core.schema.json'));

console.log(`built ${pages} pages (${open.works.length} works, ${open.plates.length} plates, ${cat.books.length} books, ${cat.albums.length} albums) → ${dist}`);
