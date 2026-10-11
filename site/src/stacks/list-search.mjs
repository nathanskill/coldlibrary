// Search (/open-stacks/search, spec §5.7, §6.7) and the random work (/open-stacks/random).
// Search: every work is in the page, grouped by shelf, so the page is the "all works" list without JavaScript.
// /assets/js/search.js loads /open-stacks/index.json and lines.json on first use and ranks, marks and filters
// these rows; /assets/js/shelf.js applies the filters (?shelf= ?era= ?tag= ?pick=1 ?tr=zh ?lang= ?form=).
import { esc, t, go, sep, act, ph } from '../lib.mjs';
import { plateHref, workHref, shelfHref, counts, titles } from '../stacks.mjs';
import { searchBox, wrow, rowList, plateRights } from '../components.mjs';
import { osHref, crumbs, count, num, srow, filterBar, filterEmpty, facetsFor, togglesFor, sortsFor, chipLabels, dataBlock, plateTitle, plateArtist, plateYear, plateKind, inWords, SHELVES } from './list-common.mjs';

export function searchPages(ctx) {
  const stacks = ctx.open;
  return [{
    slug: 'open-stacks/search',
    title: { en: 'Search the Open Stacks', zh: '搜索开架书库' },
    description: (lang) => t(lang)(`Search ${stacks.works.length} public-domain works by title, author or line, or browse them all by shelf, era and tag.`, `按书名、作者或诗句搜索 ${stacks.works.length} 部公版作品，或按书架、年代和主题浏览全部作品。`),
    bodyClass: () => 'stacks os-page-search',
    scripts: ['shelf', 'search'],
    render: (lang) => renderSearch(lang, stacks),
  }, {
    slug: 'open-stacks/random',
    title: { en: 'A random work', zh: '随便读一部' },
    description: (lang) => t(lang)('Opens a random work from the Open Stacks.', '随机打开开架书库里的一部作品。'),
    noindex: true,
    bodyClass: () => 'stacks os-page-random',
    scripts: ['random'],
    render: (lang) => renderRandom(lang, stacks),
  }];
}

function renderSearch(lang, stacks) {
  const T = t(lang);
  const c = counts(stacks);
  const head = ph({
    lang,
    crumbs: crumbs(lang, [[T('Search', '搜索')]]),
    h1: T('Search the Open Stacks', '搜索开架书库'),
    lede: T('Titles, authors and the lines themselves. A query in simplified characters finds the traditional text.', '可以搜书名、作者，也可以搜诗文里的句子。用简体字也能搜到繁体原文。'),
    facts: [count(c.works, 'work', lang), count(c.plates, 'plate', lang)].join(sep),
    actions: `<div class="os-hsearch">${searchBox(lang, { big: true })}<button type="button" class="os-clearq" data-clear-q hidden aria-label="${T('Clear the search', '清除搜索')}">×</button></div>`,
    cls: 'os-ph',
  });
  const works = stacks.works;
  const bar = filterBar(lang, { id: 'fs', facets: facetsFor(lang, works, ['shelf', 'era']), toggles: togglesFor(lang, works), sorts: sortsFor(lang, { rank: true }), view: false, total: works.length });
  const groups = SHELVES.map((s) => {
    const list = works.filter((w) => w.shelf === s.key);
    return `<section class="os-group" data-group data-shelf-group="${s.key}" aria-labelledby="h-g-${s.key}">
  <h2 id="h-g-${s.key}" class="os-gh"><a href="${shelfHref(lang, s.key)}">${esc(T(s.en, s.zh))}</a> <span class="id" data-gcount>${list.length}</span></h2>
  <ul class="wrows">${list.map((w) => srow(lang, w, stacks)).join('')}</ul>
</section>`;
  }).join('');
  const plates = stacks.plates.map((p) => `<li class="wrow os-srow os-prow" data-pid="${esc(p.id)}" hidden>
  <span class="r-id id"><span class="vh">${T('Plate ', '图版 ')}</span>${esc(p.id.slice(2))}</span>
  <span class="r-title"><a href="${plateHref(lang, p)}"><span data-m>${esc(plateTitle(lang, p))}</span></a></span>
  <span class="r-author"><span data-m>${esc(plateArtist(lang, p))}</span></span>
  <span class="r-date">${esc(plateYear(lang, p))}</span><span class="r-marks"><span class="id">${esc(plateRights(lang, p))}</span></span>
</li>`).join('');
  const shelfLinks = SHELVES.map((s) => `<a href="${shelfHref(lang, s.key)}">${esc(T(s.en, s.zh))}</a>`).join('<span class="sep" aria-hidden="true">·</span><wbr>');
  const body = `<div class="wrap os-search" data-filter="search" data-search-page data-total="${works.length}">
  <noscript><p class="meta os-noscript">${T('Search needs JavaScript; every work is listed below, on its shelf and in the author index.', '搜索需要 JavaScript；所有作品都列在下面，也可以按书架或作者索引查找。')} <a href="${osHref(lang)}">${T('The shelves', '书架')}</a><span class="sep" aria-hidden="true">·</span><wbr><a href="${osHref(lang, 'authors')}">${T('Authors', '作者')}</a></p></noscript>
  ${bar}
  <div class="os-results" data-results-wrap hidden>
    <ol class="wrows" data-results aria-label="${T('Results', '搜索结果')}"></ol>
    <p class="meta os-more-note" data-more hidden></p>
  </div>
  <section class="os-presults" data-presults hidden aria-labelledby="h-presults"><h2 class="os-gh" id="h-presults">${T('Plates', '图版')} <span class="id" data-pcount></span></h2><ul class="wrows">${plates}</ul></section>
  <div class="os-groups" data-groups>${groups}</div>
  ${filterEmpty(lang, { searchAll: false })}
  <div class="empty os-empty" data-zero hidden>
    <p data-zero-msg></p>
    <p class="actions"><button class="linkish" type="button" data-clear-q>${T('Clear the search', '清除搜索')}</button><button class="linkish" type="button" data-clear hidden>${T('Clear filters', '清除筛选')}</button></p>
    <p class="meta">${T(`The ${inWords(SHELVES.length, 'en')} shelves:`, `${inWords(SHELVES.length, 'zh')}个书架：`)} ${shelfLinks}</p>
    <p class="meta" data-zero-random>${T('Or one of these:', '或者读读这几部：')} ${buildPicks(works, 3, 'zero').map((w) => `<a href="${workHref(lang, w)}">${esc(titles(w, lang).sub || titles(w, lang).main)}</a>`).join('<span class="sep" aria-hidden="true">·</span><wbr>')}<span class="sep" aria-hidden="true">·</span><wbr><a href="${osHref(lang, 'random')}">${T('a random work', '随便读一部')}<span class="nw">&nbsp;→</span></a></p>
  </div>
  ${dataBlock('fs-labels', { ...chipLabels(lang, stacks), msg: searchMessages(lang) })}
</div>`;
  return `${head}\n${act(body, { cls: 'tight' })}`;
}

// The search page's sentences, so search.js carries no copy of its own. {n} a number, {q} the query.
function searchMessages(lang) {
  return lang === 'zh' ? {
    searching: '正在搜索 {n} 部作品……', lines: ' · 正在搜索诗句……', one: '“{q}”共 1 条结果', many: '“{q}”共 {n} 条结果',
    zero: '书架上没有和“{q}”相符的作品。', zeroF: '在这些筛选条件下，书架上没有和“{q}”相符的作品。', fail: '搜索没有加载成功。所有作品都列在下面。',
  } : {
    searching: 'Searching {n} works…', lines: ' · searching lines…', one: '1 result for {q}', many: '{n} results for {q}',
    zero: 'Nothing on the shelves matches “{q}”.', zeroF: 'Nothing on the shelves matches “{q}” with these filters.', fail: 'Search could not load. Every work is listed below.',
  };
}

// Works "picked at build time": a different handful each day the site is built, the same for every visitor.
function buildPicks(works, n, salt) {
  let h = 2166136261;
  // Seeded by the catalogue, not the build date: the picks (and the characters their titles need) change only when works do.
  for (const ch of works.map((w) => w.id).join('') + salt) h = Math.imul(h ^ ch.charCodeAt(0), 16777619) >>> 0;
  const pool = [...works], out = [];
  while (out.length < n && pool.length) { h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0; out.push(pool.splice(h % pool.length, 1)[0]); }
  return out;
}

// A simple, honest stand-in when JavaScript is off: twelve works, picked from the catalogue as it stands.
function renderRandom(lang, stacks) {
  const T = t(lang);
  const urls = stacks.works.map((w) => workHref(lang, w));
  const picked = buildPicks(stacks.works, 12, 'random');
  const head = ph({
    lang,
    crumbs: crumbs(lang, [[T('A random work', '随便读一部')]]),
    h1: T('A random work', '随便读一部'),
    lede: T(`One of ${num(stacks.works.length, lang)} works, chosen for you.`, `从 ${num(stacks.works.length, lang)} 部作品里替你挑一部。`),
    cls: 'os-ph',
  });
  const body = `<div class="wrap">
  <noscript><p class="meta os-noscript">${T(`Choosing needs JavaScript, so here are ${inWords(picked.length, 'en')} works picked from the shelves.`, `随机挑选需要 JavaScript，所以这里先给你从书架上挑出的${inWords(picked.length, 'zh')}部作品。`)}</p></noscript>
  ${rowList(picked.map((w) => wrow(lang, w, stacks)))}
  <p class="os-next">${go(osHref(lang), T('The Open Stacks', '开架书库'))}</p>
</div>
${dataBlock('random-works', urls)}`;
  return `${head}\n${act(body, { cls: 'tight' })}`;
}
