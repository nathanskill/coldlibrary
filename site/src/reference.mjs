// The Reference Room (资料室, 2026-11-01): open resources on GitHub that belong with the library's kinds: texts and
// corpora, scripture data, sources and maps, museum collections, typefaces, scores and metadata, and the tools to use them.
// The room keeps a name, a one-line note by the librarian, the repository's own description, the licence and a link;
// never the contents. Rules: docs/收录规则.md. Data: catalog/reference/repos.json, written by tools/reference/collect.mjs.
// Pages: /reference (the categories and a search across all) and /reference/<category> (every entry, by kind).
// /assets/js/reference.js filters a category page and searches /reference/index.json from the room's front page.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { esc, t, href, go, sep, act, ph, ICON_SEARCH } from './lib.mjs';

export const REF_CATS = [
  { key: 'literature', en: 'Literature', zh: '文学', dek: ['Poetry and prose to read in full, and the corpora for studying them.', '诗词、古籍和文学语料，可以读，也可以拿来研究。'] },
  { key: 'faith', en: 'Faith', zh: '信仰', dek: ['Scripture and its translations as open data, with the dictionaries and tools to read them.', '经典原文和译本的开放数据，以及读它们用的辞典和工具。'] },
  { key: 'history', en: 'History', zh: '历史', dek: ['Sources, chronologies, historical maps, gazetteers and open datasets.', '史料、年表、历史地图、地名辞典和开放数据。'] },
  { key: 'aesthetics', en: 'Aesthetics', zh: '美学', dek: ['Museum collections as open data, typefaces, the shapes of characters and the names of colours.', '博物馆开放馆藏、开源字体、汉字字形和传统色。'] },
  { key: 'music', en: 'Music', zh: '音乐', dek: ['Album and track metadata, scores as data, and tools for notation and theory.', '专辑和曲目资料、乐谱数据、记谱和乐理工具。'] },
  { key: 'tools', en: 'Tools', zh: '工具', dek: ['OCR for old books, text encoding, collation, image viewers, calendars and conversion.', '古籍识别、文本编码、校勘、看图、历法和繁简转换。'] },
];
export const REF_KINDS = [
  { key: 'text', en: 'Texts', zh: '全文' },
  { key: 'dataset', en: 'Datasets', zh: '数据集' },
  { key: 'api', en: 'APIs', zh: '接口' },
  { key: 'font', en: 'Typefaces', zh: '字体' },
  { key: 'tool', en: 'Tools', zh: '工具' },
  { key: 'list', en: 'Lists', zh: '书单' },
];
// What a licence lets you do, in five tiers (docs/收录规则.md §2).
export const RIGHTS = {
  'public-domain': ['Public domain', '公有领域'],
  permissive: ['Permissive licence', '宽松许可'],
  'share-alike': ['Share-alike licence', '相同方式共享'],
  limited: ['Restricted licence', '受限许可'],
  custom: ['Own terms', '自定条款'],
  unstated: ['No licence stated', '未声明许可证'],
};
const FREE = new Set(['public-domain', 'permissive']);

export function loadReference(root) {
  const p = join(root, 'catalog/reference/repos.json');
  const data = existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : { entries: [] };
  const entries = data.entries.filter((e) => e.status !== 'gone');
  for (const e of entries) {
    if (!REF_CATS.some((c) => c.key === e.cat)) throw new Error(`${e.id}: unknown category "${e.cat}"`);
    if (!REF_KINDS.some((k) => k.key === e.kind)) throw new Error(`${e.id}: unknown kind "${e.kind}"`);
    if (!RIGHTS[e.rights]) throw new Error(`${e.id}: unknown rights "${e.rights}"`);
    if (!e.note || !e.note.en || !e.note.zh) throw new Error(`${e.id}: a shelved entry needs a note in both languages`);
  }
  const pp = join(root, 'catalog/reference/picks.json');
  const picks = existsSync(pp) ? JSON.parse(readFileSync(pp, 'utf8')) : {};
  return { entries, checked: data.checked || '', picks };
}

const L = (lang, o) => (o == null ? '' : typeof o === 'string' ? o : o[lang] ?? o.en ?? '');
const crumbs = (lang, items) => `<nav class="os-crumbs" aria-label="${t(lang)('Breadcrumb', '位置')}">${items.map(([label, url], i) => (i === items.length - 1 && !url
  ? `<span aria-current="page">${label}</span>`
  : `<a href="${esc(url)}">${label}</a>`)).join('<span class="sep" aria-hidden="true">/</span><wbr>')}</nav>`;
// Lists read best with the most-used first; stars are a hint, never a verdict (docs/收录规则.md §3).
const byStars = (a, b) => b.stars - a.stars || a.repo.localeCompare(b.repo);
// GitHub descriptions often carry emoji shortcodes (":books:"); the room shows the words only.
const said = (s) => String(s || '').replace(/:[a-z0-9_+-]+:/g, '').replace(/\s{2,}/g, ' ').trim();
const searchText = (e) => [e.repo, e.note.en, e.note.zh, e.desc, (e.topics || []).join(' ')].join(' ').toLowerCase();

// One entry, kept short (Nathan, 2026-11-01: no explanations that get in the way of browsing): the name links to
// GitHub, the licence sits beside it in small type, the librarian's line follows. Stars, dates and the repository's
// own description stay in the data (and in search) but are not shown.
const licTag = (e) => (e.license && e.license !== 'NOASSERTION' && e.license !== 'OTHER' ? ` <span class="ref-lic">${esc(e.license)}</span>` : '');
export function refRow(lang, e) {
  const [owner, name] = e.repo.split('/');
  return `<li class="ref" id="${esc(e.id)}" data-k="${esc(e.kind)}" data-q="${esc(searchText(e))}">
  <h3 class="ref-name"><a href="https://github.com/${esc(e.repo)}" rel="noopener"><span class="ref-owner">${esc(owner)}/</span>${esc(name)}</a>${licTag(e)}</h3>
  <p class="ref-note">${esc(L(lang, e.note))}</p>
  ${e.excerpt && FREE.has(e.rights) ? `<blockquote class="ref-excerpt"><p>${esc(e.excerpt.text)}</p><footer class="meta">${esc(L(lang, e.excerpt.source))}</footer></blockquote>` : ''}
</li>`;
}

export function referencePages(ctx) {
  const ref = ctx.ref;
  if (!ref || !ref.entries.length) return [];
  const all = ref.entries;
  const cats = REF_CATS.filter((c) => all.some((e) => e.cat === c.key));
  return [indexPage(all, cats, ref.picks || {}), ...cats.map((c) => catPage(all, c, cats))];
}

// A card's four: the librarian's picks first (catalog/reference/picks.json), then the most-starred.
function cardPicks(list, chosen = []) {
  const first = chosen.map((r) => list.find((e) => e.repo.toLowerCase() === r.toLowerCase())).filter(Boolean);
  return [...first, ...[...list].sort(byStars).filter((e) => !first.includes(e))].slice(0, 4);
}

// The room's front page: the title, a search, one card per category.
function indexPage(all, cats, picks) {
  return {
    slug: 'reference',
    title: { en: 'The Reference Room', zh: '资料室' },
    description: (lang) => t(lang)(`${all.length} open resources on GitHub: poetry and classical texts, scripture data, historical maps, museum collections, typefaces, scores and the tools to use them.`, `GitHub 上的 ${all.length} 个开放资源：诗词古籍、经典数据、历史地图、博物馆馆藏、开源字体、乐谱资料和工具。`),
    bodyClass: () => 'reference ref-index',
    scripts: ['reference'],
    render: (lang) => {
      const T = t(lang);
      const head = ph({
        lang,
        h1: esc(T('The Reference Room', '资料室')),
        actions: `<form class="search big ref-search" role="search" data-ref-search hidden><label class="vh" for="ref-q">${T('Search the Reference Room', '搜索资料室')}</label>${ICON_SEARCH}<input id="ref-q" type="search" placeholder="${T('Poetry, bible, museum, font…', '诗词、圣经、博物馆、字体……')}" autocomplete="off" spellcheck="false"></form>`,
        cls: 'ref-ph',
      });
      const results = `<div class="wrap ref-results" data-ref-results hidden><p class="meta" data-ref-count aria-live="polite"></p><ol class="refs" data-ref-list></ol></div>`;
      const cards = `<div class="ref-cards">${cats.map((c) => {
        const list = all.filter((e) => e.cat === c.key);
        return `<article class="ref-card"><h2 class="h-small"><a href="${href(lang, 'reference/' + c.key)}">${esc(T(c.en, c.zh))}</a></h2>
  <ul class="ref-picks">${cardPicks(list, picks[c.key]).map((e) => `<li><a href="${href(lang, 'reference/' + c.key)}#${esc(e.id)}">${esc(e.repo.split('/')[1])}</a> <span class="meta">${esc(L(lang, e.note))}</span></li>`).join('')}</ul>
  <p>${go(href(lang, 'reference/' + c.key), T(`All ${list.length}`, `全部 ${list.length} 条`))}</p></article>`;
      }).join('')}</div>`;
      return `${head}${results}${act(`<div class="wrap">${cards}</div>`, { cls: 'tight' })}`;
    },
  };
}

// A category: the title, a filter by kind and by words, the entries grouped by kind.
function catPage(all, c, cats) {
  const list = all.filter((e) => e.cat === c.key);
  return {
    slug: 'reference/' + c.key,
    title: (lang) => t(lang)(`${c.en} · The Reference Room`, `${c.zh} · 资料室`),
    description: (lang) => t(lang)(`${list.length} open resources for ${c.en.toLowerCase()} on GitHub. ${c.dek[0]}`, `资料室·${c.zh}：GitHub 上的 ${list.length} 个开放资源。${c.dek[1]}`),
    bodyClass: () => 'reference ref-cat',
    scripts: ['reference'],
    render: (lang) => {
      const T = t(lang);
      const kinds = REF_KINDS.filter((k) => list.some((e) => e.kind === k.key));
      const head = ph({
        lang,
        crumbs: crumbs(lang, [[T('The Reference Room', '资料室'), href(lang, 'reference')], [esc(T(c.en, c.zh))]]),
        h1: esc(T(c.en, c.zh)),
        cls: 'ref-ph',
      });
      const chip = (name, v, label, n) => `<input type="radio" name="${name}" id="${name}-${v || 'all'}" value="${esc(v)}"${v ? '' : ' checked'}><label for="${name}-${v || 'all'}">${esc(label)}${n != null ? ` <span class="id">${n}</span>` : ''}</label>`;
      const filters = `<form class="mfilters ref-filters" data-ref-filters hidden>
  <fieldset class="chips"><legend class="vh">${T('Kind', '形态')}</legend>${chip('k', '', T('All', '全部'), list.length)}${kinds.map((k) => chip('k', k.key, T(k.en, k.zh), list.filter((e) => e.kind === k.key).length)).join('')}</fieldset>
  <p><label class="vh" for="ref-f">${T('Filter this list', '在本页筛选')}</label><input class="ref-f" id="ref-f" type="search" data-ref-f placeholder="${T('Filter this list', '在本页筛选')}" autocomplete="off" spellcheck="false"></p>
</form>`;
      const groups = kinds.map((k) => {
        const rows = list.filter((e) => e.kind === k.key).sort(byStars);
        return `<section class="ref-group" data-ref-group aria-labelledby="h-${k.key}"><h2 class="ref-gh" id="h-${k.key}">${esc(T(k.en, k.zh))}</h2><ol class="refs">${rows.map((e) => refRow(lang, e)).join('')}</ol></section>`;
      }).join('');
      const empty = `<p class="meta" data-ref-empty hidden>${T('Nothing matches.', '没有符合的条目。')}</p>`;
      const others = cats.filter((x) => x.key !== c.key).map((x) => `<a href="${href(lang, 'reference/' + x.key)}">${esc(T(x.en, x.zh))}</a>`).join(sep);
      return `${head}${act(`<div class="wrap">${filters}${groups}${empty}<p class="meta ref-others">${others}</p></div>`, { cls: 'tight' })}`;
    },
  };
}

// Search data for /reference: read by reference.js on the room's front page.
export function referenceIndex(ref) {
  return { entries: ref.entries.map((e) => ({ i: e.id, r: e.repo, c: e.cat, k: e.kind, g: e.rights, l: e.license || '', s: e.stars, u: e.updated, a: !!e.archived, n: e.note, d: said(e.desc), t: e.topics || [] })) };
}
