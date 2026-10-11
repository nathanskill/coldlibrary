// The Open Stacks index (/open-stacks, spec §5.1) and the lobby's Open Stacks block (shelfSection, spec §5.8 block 3).
import { esc, t, href, go, sep, act, sec, ph, REPO } from '../lib.mjs';
import { counts, titles, rightsKind, workHref, plateHref, shelfHref, ERAS, eraOf } from '../stacks.mjs';
import { wcard, wrow, shelfCard, plateTile, trailCard, searchBox, cardGrid, rowList, adaptive } from '../components.mjs';
import { osHref, searchHref, count, num, shortYear, yearRange, crumbs, plateKind, platePh, plateById, startWorks, shelfWorks, authorCount, tagText, tagLabelled, langGroup, langName, initialOf, inWords, startLabel, SHELVES } from './list-common.mjs';
import { claudeIntro } from './list-claude.mjs';
import { validTrails } from './list-trails.mjs';

// "from “Reeds” (before c. 600 BCE) to “PEP 20: The Zen of Python” (2004)", computed from the catalogue.
export function spanLine(lang, stacks) {
  const c = counts(stacks);
  if (!c.first || !c.last) return '';
  const name = (w) => esc(titles(w, lang).sub || titles(w, lang).main);
  const link = (w) => `<a href="${workHref(lang, w)}">${lang === 'zh' ? `《${name(w)}》` : `“${name(w)}”`}</a>`;
  return lang === 'zh'
    ? `从${link(c.first)}（${esc(shortYear(c.first, lang))}）到${link(c.last)}（${esc(shortYear(c.last, lang))}）`
    : `from ${link(c.first)} (${esc(shortYear(c.first, lang))}) to ${link(c.last)} (${esc(shortYear(c.last, lang))})`;
}
export function factsLine(lang, stacks) {
  const c = counts(stacks);
  return [count(c.works, 'work', lang), count(c.authors, 'author', lang), count(c.plates, 'plate', lang), spanLine(lang, stacks)].filter(Boolean).join(sep);
}

// Plates for a small shelf of tiles: the ones Claude wrote about first, then artworks, then the rest.
export function featuredPlates(stacks, n = 4) {
  const rank = (p) => (p.pick ? 0 : plateKind(p) === 'artwork' ? 1 : 2);
  return [...stacks.plates].sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id)).slice(0, n);
}

const RULES = [
  { k: 'age', en: ['Public domain by age', 'Every author and translator died before 1956, and the text was published before 1931.'], zh: ['年代久远的公版作品', '作者和译者都在 1956 年以前去世，文本在 1931 年以前发表。'] },
  { k: 'us-gov', en: ['United States government work', 'Written or made by the US federal government, which holds no copyright in its own work.'], zh: ['美国联邦政府作品', '由美国联邦政府撰写或制作；联邦政府对自己的作品不享有版权。'] },
  { k: 'dedicated', en: ['Given to the public domain', 'The author placed it in the public domain, as the makers of SQLite and the Python PEPs did.'], zh: ['作者献给公有领域', '作者亲自把它放进了公有领域，就像 SQLite 和 Python PEP 的作者那样。'] },
  { k: 'license', en: ['An open licence', 'A licence allows anyone to share it; where it forbids changes, we keep every word and add no translation.'], zh: ['开放许可', '许可允许任何人传播；许可禁止改动的，我们一字不改，也不附译文。'] },
];

export function indexPage(ctx) {
  const stacks = ctx.open;
  return {
    slug: 'open-stacks',
    title: { en: 'The Open Stacks', zh: '开架书库' },
    description: (lang) => t(lang)(
      `Real works anyone may read, copy and keep: ${counts(stacks).works} public-domain works, each with its source and the reason it is free, chosen and annotated by Claude, an AI librarian.`,
      `谁都能读、能抄、能带走的真实作品：${counts(stacks).works} 部公版作品，每一部都写明来源和可以自由传播的理由，由 AI 馆员 Claude 挑选并作注。`),
    bodyClass: () => 'stacks os-page-index',
    scripts: ['search'],
    render: (lang) => renderIndex(lang, stacks),
  };
}

function renderIndex(lang, stacks) {
  const T = t(lang);
  const c = counts(stacks);
  const head = ph({
    lang,
    h1: T('The Open Stacks', '开架书库'),
    lede: T('Real works anyone may read, copy and keep. Each says why it is free to share, with a source you can check. Chosen and annotated by Claude, an AI librarian.',
      '谁都能读、能抄、能带走的真实作品。每一部都写明为什么可以自由传播，并附上可以核对的来源。由 AI 馆员 Claude 挑选并作注。'),
    facts: factsLine(lang, stacks),
    actions: `<div class="os-hsearch">${searchBox(lang, { big: true })}</div>${go(osHref(lang, 'random'), T('A random work', '随便读一部'))}`,
    plate: platePh(lang, plateById(stacks, (stacks.claudeShelf && stacks.claudeShelf.index_plate) || null)),
    cls: 'os-ph',
  });

  // ---- act I: Claude's shelf, trails, the six shelves ----
  const picks = stacks.picks.slice(0, 4).map((p) => wcard(lang, p.work, stacks));
  const claudeSec = picks.length ? sec({
    id: 'claude', h: T('Claude’s shelf', 'Claude 的书架'),
    intro: esc(claudeIntro(lang, stacks).first),
    body: adaptive(picks),
    foot: go(osHref(lang, 'claude'), T(`All ${num(c.picks, lang)} on Claude’s shelf`, `Claude 的书架上全部 ${num(c.picks, lang)} 部`)),
  }) : '';
  const trails = validTrails(stacks);
  const trailSec = trails.length ? sec({
    id: 'trails', h: T('Reading trails', '书单'),
    intro: T('Paths through the shelves, one sentence at a time.', '穿过各个书架的路线，一步一句话。'),
    body: adaptive(trails.slice(0, 3).map((tr) => trailCard(lang, tr, stacks))),
    foot: go(osHref(lang, 'trails'), T(`All ${count(trails.length, 'trail', lang)}`, `全部 ${num(trails.length, lang)} 条书单`)),
  }) : '';
  const shelfSecs = SHELVES.map((s) => shelfIndexSection(lang, stacks, s)).join('\n');

  // ---- act II: plates, browse by, new accessions, rights ----
  const plates = featuredPlates(stacks, 4);
  const plateSec = plates.length ? sec({
    id: 'plates', h: T('Plates', '图版'),
    intro: T('Public-domain paintings, prints and photographs, hung uncropped, each with its institution and its rights.', '公有领域的绘画、版画和照片，一律不裁切，每一幅都写明收藏机构和权利。'),
    body: adaptive(plates.map((p) => plateTile(lang, p))),
    foot: go(osHref(lang, 'plates'), T(`All ${count(c.plates, 'plate', lang)}`, `全部 ${num(c.plates, lang)} 幅图版`)),
  }) : '';
  const browseSec = sec({ id: 'browse', h: T('Browse by', '按类浏览'), body: browseBy(lang, stacks) });
  const newSec = newOnShelves(lang, stacks);
  const rightsSec = sec({
    id: 'rights', side: true, h: T('How these works got here', '这些作品是怎么来的'),
    intro: T(`Every work says why it is free to share, and links the source it was copied from. There are ${inWords(RULES.length, 'en')} ways in.`, `每一部都写明为什么可以自由传播，并链接到抄录它的来源。进来的路只有${inWords(RULES.length, 'zh')}条。`),
    body: rulesRows(lang, stacks),
    foot: `<a class="go" href="${REPO}/issues/new">${T('Spot a mistake? Tell us with the catalogue number', '发现错误？请附上馆藏号告诉我们')}<span class="nw">&nbsp;→</span></a>`,
  });

  return `${head}
${act(`${claudeSec}${trailSec}${shelfSecs}`, { id: 'shelves' })}
${act(`${plateSec}${browseSec}${newSec}${rightsSec}`, { alt: true })}`;
}

// One shelf on the index: a sticky side head (tone edge, name, counts, dek) and its three works to start with.
function shelfIndexSection(lang, stacks, s) {
  const T = t(lang);
  const works = shelfWorks(stacks, s.key);
  const picks = works.filter((w) => w.pick).length;
  const { works: start, curated } = startWorks(stacks, s.key);
  const meta = [count(works.length, 'work', lang), count(authorCount(works), 'author', lang), yearRange(works, lang)].join('<span class="sep" aria-hidden="true">·</span>');
  return `<section class="sec sec--side os-shelfsec tone-${s.key}" id="shelf-${s.key}" aria-labelledby="h-shelf-${s.key}">
  <div class="wrap grid">
    <header class="sec-head">
      <span class="tone-edge" aria-hidden="true"></span>
      <h2 id="h-shelf-${s.key}"><a href="${shelfHref(lang, s.key)}">${T(s.en, s.zh)}</a></h2>
      <p class="meta os-other" lang="${lang === 'zh' ? 'en' : 'zh-CN'}">${lang === 'zh' ? s.en : s.zh}</p>
      <p class="meta os-counts">${meta}${picks ? `<span class="sep" aria-hidden="true">·</span><span class="brass">${T(`${picks} on Claude’s shelf`, `Claude 选了 ${picks} 部`)}</span>` : ''}</p>
      <p class="os-dek">${esc(T(s.dek.en, s.dek.zh))}</p>
      <p class="os-browse">${go(shelfHref(lang, s.key), T('Browse the shelf', '看整个书架'))}</p>
    </header>
    <div class="sec-body">
      <p class="meta os-label">${esc(startLabel(lang, start, curated))}</p>
      ${rowList(start.map((w) => wrow(lang, w, stacks)))}
    </div>
  </div>
</section>`;
}

function browseBy(lang, stacks) {
  const T = t(lang);
  // Authors: the letters of the A–Z index, with counts; empty letters are shown but not linked.
  const byLetter = new Map();
  for (const a of stacks.authors) { const k = initialOf(a.author); byLetter.set(k, (byLetter.get(k) || 0) + 1); }
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((ch) => (byLetter.get(ch)
    ? `<a href="${osHref(lang, 'authors')}#letter-${ch.toLowerCase()}" aria-label="${T(`${ch}: ${count(byLetter.get(ch), 'author', lang)}`, `${ch}：${byLetter.get(ch)} 位作者`)}"><span>${ch}</span><span class="id">${byLetter.get(ch)}</span></a>`
    : `<span class="os-off" aria-hidden="true"><span>${ch}</span></span>`)).join('');
  const authors = `<div class="c-third os-by"><h3>${T('Authors', '作者')}</h3><p class="os-letters">${letters}</p>${go(osHref(lang, 'authors'), T(`All ${count(stacks.authors.length, 'author', lang)}`, `全部 ${stacks.authors.length} 位作者`))}</div>`;
  // Eras: the seven buckets, each a filtered list on the search page.
  const eraN = new Map();
  for (const w of stacks.works) eraN.set(eraOf(w), (eraN.get(eraOf(w)) || 0) + 1);
  const eras = `<div class="c-third os-by"><h3>${T('Eras', '年代')}</h3><ul class="os-list">${ERAS.map((e) => (eraN.get(e.key)
    ? `<li><a href="${searchHref(lang, { era: e.key })}">${esc(lang === 'zh' ? e.zh : e.en)}</a><span class="id">${eraN.get(e.key)}</span></li>`
    : `<li class="os-off"><span>${esc(lang === 'zh' ? e.zh : e.en)}</span><span class="id">0</span></li>`)).join('')}</ul></div>`;
  // Tags with a label in this language (tags.json); without labels, the languages of the texts instead.
  const tagN = new Map();
  for (const w of stacks.works) for (const g of w.tags || []) if (tagLabelled(stacks, g, lang)) tagN.set(g, (tagN.get(g) || 0) + 1);
  let third;
  if (tagN.size >= 5) {
    const top = [...tagN].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 15);
    third = `<div class="c-third os-by"><h3>${T('Tags', '主题')}</h3><p class="chips">${top.map(([g, n]) => `<a class="chip" href="${searchHref(lang, { tag: g })}">${esc(tagText(stacks, g, lang))}<span class="id">${n}</span></a>`).join('')}</p></div>`;
  } else {
    const ln = new Map();
    for (const w of stacks.works) ln.set(langGroup(w.lang), (ln.get(langGroup(w.lang)) || 0) + 1);
    third = `<div class="c-third os-by"><h3>${T('Languages of the texts', '原文语种')}</h3><ul class="os-list">${[...ln].sort((a, b) => b[1] - a[1]).map(([l, n]) => `<li><a href="${searchHref(lang, { lang: l })}">${esc(langName(l, lang))}</a><span class="id">${n}</span></li>`).join('')}</ul></div>`;
  }
  return `<div class="grid os-browseby">${authors}${eras}${third}</div>`;
}

// "New on the shelves": only once something is accessioned after the founding batch of 2026-10-11.
function newOnShelves(lang, stacks) {
  const T = t(lang);
  const acc = (w) => w.accessioned || (w.source && w.source.retrieved) || '2026-10-11';
  const fresh = stacks.works.filter((w) => acc(w) > '2026-10-11').sort((a, b) => acc(b).localeCompare(acc(a)) || b.id.localeCompare(a.id)).slice(0, 8);
  if (!fresh.length) return '';
  return sec({
    id: 'new', h: T('New on the shelves', '新上架'), intro: T(`Last added ${acc(fresh[0])}.`, `最近一次上架：${acc(fresh[0])}。`),
    body: rowList(fresh.map((w) => wrow(lang, w, stacks))),
    foot: `<a class="go" href="${lang === 'zh' ? '/zh' : ''}/open-stacks/feed.xml">${T('Follow new accessions (Atom feed)', '订阅新入藏（Atom）')}<span class="nw">&nbsp;→</span></a>`,
  });
}

function rulesRows(lang, stacks) {
  const n = new Map();
  for (const w of stacks.works) n.set(rightsKind(w), (n.get(rightsKind(w)) || 0) + 1);
  return `<ol class="os-rules">${RULES.map((r, i) => {
    const [h, s] = lang === 'zh' ? r.zh : r.en;
    return `<li><span class="os-rn id">${i + 1}</span><span class="os-rb"><span class="os-rh">${esc(h)}</span><span class="os-rs">${esc(s)}</span></span><span class="id os-rc">${num(n.get(r.k) || 0, lang)}</span></li>`;
  }).join('')}</ol>`;
}

// ---- the lobby's Open Stacks block (spec §5.8, block 3) ----
// shelfSectionParts(lang, ctx) → { id, h, intro, body, foot }, ready for sec(); shelfSection(lang, ctx) → body only.
export function shelfSectionParts(lang, ctx) {
  const stacks = ctx.open || ctx;
  const T = t(lang);
  const c = counts(stacks);
  const cards = SHELVES.map((s) => shelfCard(lang, s.key, stacks));
  const trails = validTrails(stacks).slice(0, 3);
  const trailLine = trails.length
    ? `<p class="os-trailline meta"><span>${T('Reading trails:', '书单：')}</span> ${trails.map((tr) => `<a href="${osHref(lang, 'trails/' + tr.slug)}">${esc(tr.title[lang] || tr.title.en)}</a>`).join('<span class="sep" aria-hidden="true">·</span>')}<span class="sep" aria-hidden="true">·</span><a href="${osHref(lang, 'trails')}">${T('all trails', '全部书单')}<span class="nw">&nbsp;→</span></a></p>`
    : '';
  const body = `<div class="cards thirds os-snap">${cards.join('')}</div>
<div class="grid os-lobby-find"><div class="c-main"><div class="os-findrow">${searchBox(lang)}${go(osHref(lang, 'random'), T('A random work', '随便读一部'))}</div></div></div>
${trailLine}`;
  return {
    id: 'open-stacks',
    h: T('The Open Stacks', '开架书库'),
    intro: T(`${count(c.works, 'work', lang)} · ${count(c.authors, 'author', lang)} · ${count(c.plates, 'plate', lang)}, ${spanLine(lang, stacks)}. Every one says why it is free.`,
      `${count(c.works, 'work', lang)} · ${count(c.authors, 'author', lang)} · ${count(c.plates, 'plate', lang)}，${spanLine(lang, stacks)}。每一部都写明为什么可以自由传播。`),
    body,
    foot: go(osHref(lang), T(`Browse all ${num(c.works, lang)} works`, `浏览全部 ${num(c.works, lang)} 部作品`)),
  };
}
export function shelfSection(lang, ctx) { return shelfSectionParts(lang, ctx).body; }
