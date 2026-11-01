// The Reference Room (资料室, 2026-11-01): open resources on GitHub that belong with the library's kinds: texts and
// corpora, scripture data, sources and maps, museum collections, typefaces, scores and metadata, and the tools to use them.
// The room keeps a name, a one-line note by the librarian, the repository's own description, the licence and a link;
// never the contents. Rules: docs/收录规则.md. Data: catalog/reference/repos.json, written by tools/reference/collect.mjs.
// Pages: /reference (the categories and a search across all) and /reference/<category> (every entry, by kind).
// /assets/js/reference.js filters a category page and searches /reference/index.json from the room's front page.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { esc, t, href, go, sep, act, sec, ph, glue, REPO, ICON_SEARCH } from './lib.mjs';

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
const catOf = (key) => REF_CATS.find((c) => c.key === key);
const kindOf = (key) => REF_KINDS.find((k) => k.key === key);
const compact = (lang, n) => new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
const hasHan = (s) => /[㐀-鿿]/.test(s);
const crumbs = (lang, items) => `<nav class="os-crumbs" aria-label="${t(lang)('Breadcrumb', '位置')}">${items.map(([label, url], i) => (i === items.length - 1 && !url
  ? `<span aria-current="page">${label}</span>`
  : `<a href="${esc(url)}">${label}</a>`)).join('<span class="sep" aria-hidden="true">/</span><wbr>')}</nav>`;
// Lists read best with the most-used first; stars are a hint, never a verdict (docs/收录规则.md §3).
const byStars = (a, b) => b.stars - a.stars || a.repo.localeCompare(b.repo);
// GitHub descriptions often carry emoji shortcodes (":books:"); the room shows the words only.
const said = (s) => String(s || '').replace(/:[a-z0-9_+-]+:/g, '').replace(/\s{2,}/g, ' ').trim();
const searchText = (e) => [e.repo, e.note.en, e.note.zh, e.desc, (e.topics || []).join(' ')].join(' ').toLowerCase();

// One entry: the repository's name links to GitHub; the note is the librarian's; the description is the repository's own.
export function refRow(lang, e, { cat = false } = {}) {
  const T = t(lang);
  const [owner, name] = e.repo.split('/');
  const lic = e.license && e.license !== 'NOASSERTION' && e.license !== 'OTHER' ? `<span class="ref-lic">${esc(e.license)}</span> ` : '';
  const facts = [
    `${lic}${esc(T(...RIGHTS[e.rights]))}`,
    `<span title="${T('GitHub stars', 'GitHub 星数')}">★ ${esc(compact(lang, e.stars))}</span>`,
    e.archived ? T(`archived, last change ${e.updated.slice(0, 7)}`, `已归档，最后更新 ${e.updated.slice(0, 7)}`) : T(`updated ${e.updated.slice(0, 7)}`, `更新于 ${e.updated.slice(0, 7)}`),
    cat ? `<a href="${href(lang, 'reference/' + e.cat)}">${esc(T(catOf(e.cat).en, catOf(e.cat).zh))}</a>` : '',
    e.homepage && /^https:\/\//.test(e.homepage) ? `<a href="${esc(e.homepage)}" rel="noopener">${T('website', '网站')}</a>` : '',
    `<span class="id">${esc(e.id)}</span>`,
  ].filter(Boolean).join(sep);
  return `<li class="ref" id="${esc(e.id)}" data-k="${esc(e.kind)}" data-r="${esc(e.rights)}" data-q="${esc(searchText(e))}">
  <h3 class="ref-name"><a href="https://github.com/${esc(e.repo)}" rel="noopener"><span class="ref-owner">${esc(owner)}/</span>${esc(name)}</a>${cat ? ` <span class="ref-kind">${esc(T(kindOf(e.kind).en, kindOf(e.kind).zh))}</span>` : ''}</h3>
  <p class="ref-note">${esc(L(lang, e.note))}</p>
  ${said(e.desc) ? `<p class="ref-desc"><span class="ref-said">${T('In its own words', '仓库自述')}</span> <span lang="${hasHan(e.desc) ? 'zh' : 'en'}">${esc(said(e.desc))}</span></p>` : ''}
  ${e.excerpt && FREE.has(e.rights) ? `<blockquote class="ref-excerpt"><p>${esc(e.excerpt.text)}</p><footer class="meta">${esc(L(lang, e.excerpt.source))}</footer></blockquote>` : ''}
  <p class="meta ref-facts">${facts}</p>
</li>`;
}

const rightsNote = (lang) => t(lang)(
  'Licences are what each repository declares; code and data inside one repository can carry different terms, so read its own notes before reuse. Where no licence is stated, all rights are reserved and the room lists only the name and a link.',
  '许可证是各仓库自己声明的；同一个仓库里代码和数据可能各有条款，拿来用之前请看仓库说明。没有声明许可证的，按保留所有权利对待，本馆只列名字和链接。');

export function referencePages(ctx) {
  const ref = ctx.ref;
  if (!ref || !ref.entries.length) return [];
  const all = ref.entries;
  const cats = REF_CATS.filter((c) => all.some((e) => e.cat === c.key));
  return [indexPage(all, cats, ref.checked, ref.picks || {}), ...cats.map((c) => catPage(all, c, cats))];
}

// A card's four: the librarian's picks first (catalog/reference/picks.json), then the most-starred.
function cardPicks(list, chosen = []) {
  const first = chosen.map((r) => list.find((e) => e.repo.toLowerCase() === r.toLowerCase())).filter(Boolean);
  return [...first, ...[...list].sort(byStars).filter((e) => !first.includes(e))].slice(0, 4);
}

function indexPage(all, cats, checked, picks) {
  return {
    slug: 'reference',
    title: { en: 'The Reference Room', zh: '资料室' },
    description: (lang) => t(lang)(`${all.length} open resources on GitHub: poetry and classical texts, scripture data, historical maps, museum collections, typefaces, scores and the tools to use them. Each with its licence and source.`, `GitHub 上的 ${all.length} 个开放资源：诗词古籍、经典数据、历史地图、博物馆馆藏、开源字体、乐谱资料和工具，每条写明许可证和来源。`),
    bodyClass: () => 'reference ref-index',
    scripts: ['reference'],
    render: (lang) => {
      const T = t(lang);
      const free = all.filter((e) => FREE.has(e.rights)).length;
      const head = ph({
        lang,
        h1: esc(T('The Reference Room', '资料室')),
        lede: T('Open resources on GitHub that belong with this library: texts and corpora, scripture as data, sources and historical maps, museum collections, typefaces, scores, and the tools to work with them. We keep a name, a line and a link, never the contents. Every entry shows its licence and where it lives.',
          'GitHub 上和本馆有关的开放资源：诗词古籍和语料、经典数据、史料和历史地图、博物馆馆藏、开源字体、乐谱资料，以及用得上的工具。本馆只记名字、一句话和链接，不搬运内容；每条都写明许可证和出处。'),
        facts: [T(`${all.length} entries`, `${all.length} 条`), T(`${cats.length} kinds`, `${cats.length} 类`), T(`${free} public domain or permissive`, `${free} 条是公有领域或宽松许可`), checked ? T(`checked weekly, last on ${checked}`, `每周核对，最近一次 ${checked}`) : ''].filter(Boolean).join(sep),
        actions: `<form class="search big ref-search" role="search" data-ref-search hidden><label class="vh" for="ref-q">${T('Search the Reference Room', '搜索资料室')}</label>${ICON_SEARCH}<input id="ref-q" type="search" placeholder="${T('Search names, notes and topics: poetry, bible, museum, font…', '搜名字、介绍或主题：诗词、圣经、博物馆、字体……')}" autocomplete="off" spellcheck="false"></form>`,
        cls: 'ref-ph',
      });
      const results = `<div class="wrap ref-results" data-ref-results hidden><p class="meta" data-ref-count aria-live="polite"></p><ol class="refs" data-ref-list></ol></div>`;
      const cards = `<div class="ref-cards">${cats.map((c) => {
        const list = all.filter((e) => e.cat === c.key).sort(byStars);
        const kinds = REF_KINDS.filter((k) => list.some((e) => e.kind === k.key)).map((k) => `${T(k.en, k.zh)} ${list.filter((e) => e.kind === k.key).length}`);
        return `<article class="ref-card"><h2 class="h-small"><a href="${href(lang, 'reference/' + c.key)}">${esc(T(c.en, c.zh))}</a> <span class="id">${list.length}</span></h2>
  <p>${esc(T(...c.dek))}</p>
  <ul class="ref-picks">${cardPicks(list, picks[c.key]).map((e) => `<li><a href="${href(lang, 'reference/' + c.key)}#${esc(e.id)}">${esc(e.repo.split('/')[1])}</a> <span class="meta">${esc(L(lang, e.note))}</span></li>`).join('')}</ul>
  <p class="meta">${esc(kinds.join(' · '))}</p>
  <p>${go(href(lang, 'reference/' + c.key), T(`All ${list.length}`, `全部 ${list.length} 条`))}</p></article>`;
      }).join('')}</div>`;
      const how = sec({
        id: 'how',
        h: glue(T('How the room is kept', '怎么收的')),
        intro: T('A script reads awesome lists, GitHub topics and searches every week, fetches each repository’s licence, stars and last change, and drops forks, empty repositories, spam and anything that copies what it has no right to. The librarian reads what is left and writes one line for each. Stars are a hint, never the reason.',
          '每周由脚本读 awesome 书单、GitHub 主题和搜索结果，取每个仓库的许可证、星数和最近更新，先去掉 fork、空仓库、垃圾仓库和搬运盗版的；剩下的由馆员逐条看过，写一句介绍。星数只作参考。'),
        body: `<div class="grid"><div class="c-main"><p class="meta">${esc(rightsNote(lang))}</p><p>${go(`${REPO}/blob/main/docs/${encodeURIComponent('收录规则')}.md`, T('The rules, in full (Chinese)', '收录规则全文'))}</p></div></div>`,
      });
      return `${head}${results}${act(`<div class="wrap">${cards}</div>`, { cls: 'tight' })}${act(how, { alt: true })}`;
    },
  };
}

function catPage(all, c, cats) {
  const list = all.filter((e) => e.cat === c.key);
  return {
    slug: 'reference/' + c.key,
    title: (lang) => t(lang)(`${c.en} · The Reference Room`, `${c.zh} · 资料室`),
    description: (lang) => t(lang)(`${list.length} open resources for ${c.en.toLowerCase()} on GitHub. ${c.dek[0]} Each with its licence and source.`, `资料室·${c.zh}：GitHub 上的 ${list.length} 个开放资源。${c.dek[1]}每条写明许可证和来源。`),
    bodyClass: () => 'reference ref-cat',
    scripts: ['reference'],
    render: (lang) => {
      const T = t(lang);
      const kinds = REF_KINDS.filter((k) => list.some((e) => e.kind === k.key));
      const head = ph({
        lang,
        crumbs: crumbs(lang, [[T('The Reference Room', '资料室'), href(lang, 'reference')], [esc(T(c.en, c.zh))]]),
        h1: esc(T(c.en, c.zh)),
        lede: esc(T(...c.dek)),
        facts: kinds.map((k) => `${esc(T(k.en, k.zh))} ${list.filter((e) => e.kind === k.key).length}`).join(sep),
        cls: 'ref-ph',
      });
      const chip = (name, v, label, n) => `<input type="radio" name="${name}" id="${name}-${v || 'all'}" value="${esc(v)}"${v ? '' : ' checked'}><label for="${name}-${v || 'all'}">${esc(label)}${n != null ? ` <span class="id">${n}</span>` : ''}</label>`;
      const filters = `<form class="mfilters ref-filters" data-ref-filters hidden>
  <fieldset class="chips"><legend class="meta">${T('Kind', '形态')}</legend>${chip('k', '', T('All', '全部'), list.length)}${kinds.map((k) => chip('k', k.key, T(k.en, k.zh), list.filter((e) => e.kind === k.key).length)).join('')}</fieldset>
  <p class="meta"><label class="vh" for="ref-f">${T('Filter this list', '在本页筛选')}</label><input class="ref-f" id="ref-f" type="search" data-ref-f placeholder="${T('Filter this list', '在本页筛选')}" autocomplete="off" spellcheck="false"> <label class="linkish"><input type="checkbox" data-ref-free> ${T('Free to reuse only', '只看可自由使用的')}</label>${sep}<span data-ref-count>${T(`${list.length} entries`, `${list.length} 条`)}</span></p>
</form>`;
      const groups = kinds.map((k) => {
        const rows = list.filter((e) => e.kind === k.key).sort(byStars);
        return `<section class="ref-group" data-ref-group aria-labelledby="h-${k.key}"><h2 class="ref-gh" id="h-${k.key}">${esc(T(k.en, k.zh))} <span class="id">${rows.length}</span></h2><ol class="refs">${rows.map((e) => refRow(lang, e)).join('')}</ol></section>`;
      }).join('');
      const empty = `<p class="meta" data-ref-empty hidden>${T('Nothing here matches. Try fewer words, or all kinds.', '没有符合的条目。少写几个字，或者选「全部」试试。')}</p>`;
      const others = cats.filter((x) => x.key !== c.key).map((x) => `<a href="${href(lang, 'reference/' + x.key)}">${esc(T(x.en, x.zh))}</a>`).join(sep);
      return `${head}${act(`<div class="wrap">${filters}${groups}${empty}<p class="meta ref-rights">${esc(rightsNote(lang))}</p><p class="meta ref-others">${T('Other kinds: ', '其他类别：')}${others}${sep}${go(href(lang, 'reference'), T('The Reference Room', '资料室'))}</p></div>`, { cls: 'tight' })}`;
    },
  };
}

// Search data for /reference: read by reference.js on the room's front page.
export function referenceIndex(ref) {
  return { entries: ref.entries.map((e) => ({ i: e.id, r: e.repo, c: e.cat, k: e.kind, g: e.rights, l: e.license || '', s: e.stars, u: e.updated, a: !!e.archived, n: e.note, d: said(e.desc), t: e.topics || [] })) };
}
