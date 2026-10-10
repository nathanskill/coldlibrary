// Build the static site: node site/build.mjs  →  site/dist/
// Zero dependencies. English at /, Chinese at /zh/.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, statSync, copyFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { layout, SITE, href } from './src/lib.mjs';
import { PAGES, stackItemPage, itemPage } from './src/pages.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const dist = join(here, 'dist');

function copyDir(src, dst) {
  mkdirSync(dst, { recursive: true });
  for (const name of readdirSync(src)) {
    const s = join(src, name), d = join(dst, name);
    if (statSync(s).isDirectory()) copyDir(s, d); else copyFileSync(s, d);
  }
}

function frontMatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: text };
  const meta = {};
  for (const line of m[1].split('\n')) { const i = line.indexOf(':'); if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  return { meta, body: m[2] };
}

// ---- catalog ----
const projects = readdirSync(join(root, 'catalog/projects')).filter((f) => f.endsWith('.json')).sort()
  .map((f) => JSON.parse(readFileSync(join(root, 'catalog/projects', f), 'utf8')));

const stackFiles = readdirSync(join(root, 'catalog/open-stacks')).filter((f) => f.endsWith('.en.md')).sort();
const stacks = stackFiles.map((f) => {
  const base = f.replace(/\.en\.md$/, '');
  const en = frontMatter(readFileSync(join(root, 'catalog/open-stacks', f), 'utf8'));
  const zhPath = join(root, 'catalog/open-stacks', base + '.zh.md');
  const zh = existsSync(zhPath) ? frontMatter(readFileSync(zhPath, 'utf8')) : en;
  const excerpt = (b) => b.trim().split(/\n{2,}/)[0].replace(/[*#>]/g, '').slice(0, 180);
  return {
    accession: en.meta.accession,
    slug: base.replace(/^S-\d+-/, ''),
    en: { ...en.meta, body: en.body, excerpt: excerpt(en.body) },
    zh: { ...zh.meta, body: zh.body, excerpt: excerpt(zh.body) },
  };
});

const items = readdirSync(join(root, 'catalog/items')).filter((f) => f.endsWith('.json')).sort()
  .map((f) => JSON.parse(readFileSync(join(root, 'catalog/items', f), 'utf8')));
for (const i of items) if (JSON.stringify(i).includes('"answer"')) throw new Error(`${i.id}: answers must never be published`);

const log = JSON.parse(readFileSync(join(root, 'catalog/log.json'), 'utf8'));
// Contract test count, counted from source so the homepage never claims a number by hand.
const testDir = join(root, 'contracts/test');
const tests = existsSync(testDir) ? readdirSync(testDir).filter((f) => f.endsWith('.sol')).map((f) => (readFileSync(join(testDir, f), 'utf8').match(/function test/g) || []).length).reduce((a, b) => a + b, 0) : 0;
const ctx = { projects, stacks, items, log, tests };
const all = [...PAGES, ...stacks.map(stackItemPage), ...items.map(itemPage)];

// ---- render ----
rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
copyDir(join(here, 'public'), dist);

const urls = [];
for (const p of all) {
  for (const lang of ['en', 'zh']) {
    const html = layout({
      lang,
      slug: p.slug === '404' ? '' : p.slug,
      title: p.title[lang] ?? p.title.en,
      description: p.description[lang] ?? p.description.en,
      image: p.image,
      noindex: !!p.noindex,
      bodyClass: p.bodyClass || '',
      body: p.render(lang, ctx),
    });
    let file;
    if (p.slug === '404') file = lang === 'en' ? '404.html' : 'zh/404.html';
    else if (p.slug === '') file = lang === 'en' ? 'index.html' : 'zh.html';
    else file = (lang === 'en' ? '' : 'zh/') + p.slug + '.html';
    const out = join(dist, file);
    mkdirSync(dirname(out), { recursive: true });
    writeFileSync(out, html);
    if (p.slug !== '404') urls.push(SITE + href(lang, p.slug));
  }
}

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

writeFileSync(join(dist, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u}</loc></url>`).join('\n')}\n</urlset>\n`);
writeFileSync(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${SITE}/sitemap.xml\n`);

// Spec and schema are served from the site too, so the format can be fetched without GitHub.
mkdirSync(join(dist, 'spec/v0.1'), { recursive: true });
copyFileSync(join(root, 'spec/v0.1/core.schema.json'), join(dist, 'spec/v0.1/core.schema.json'));

console.log(`built ${all.length * 2} pages → ${dist}`);
