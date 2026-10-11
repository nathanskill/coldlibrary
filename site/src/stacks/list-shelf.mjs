// A shelf page (/open-stacks/poetry …, spec §5.2): Claude's shelf essay, three works to start with, and every work on
// the shelf as a filterable list (filters, sort and the grid view are /assets/js/shelf.js; without JS the full list shows).
import { esc, t, sep, act, sec, ph } from '../lib.mjs';
import { shelfOf, shelfHref } from '../stacks.mjs';
import { wcard, wrow, shelfCard, cardGrid, rowList } from '../components.mjs';
import { fontCssHref } from '../fonts.mjs';
import { osHref, crumbs, count, yearRange, platePh, plateById, startWorks, shelfWorks, authorCount, glyphsInto, filterBar, filterEmpty, facetsFor, togglesFor, sortsFor, chipLabels, dataBlock, startLabel, SHELVES } from './list-common.mjs';

export function shelfPages(ctx) {
  const stacks = ctx.open;
  return SHELVES.map((s) => ({
    slug: 'open-stacks/' + s.key,
    title: { en: `${s.en} · The Open Stacks`, zh: `${s.zh} · 开架书库` },
    description: (lang) => {
      const T = t(lang);
      const n = shelfWorks(stacks, s.key).length;
      return T(`${s.dek.en} ${n} public-domain works on the ${s.en} shelf of the Open Stacks, each with its source.`, `${s.dek.zh}开架书库「${s.zh}」书架上的 ${n} 部公版作品，各附来源。`);
    },
    bodyClass: () => 'stacks os-page-shelf',
    scripts: ['shelf', 'search'],
    render: (lang) => render(lang, stacks, s.key),
  }));
}

function render(lang, stacks, key) {
  const T = t(lang);
  const s = shelfOf(key);
  const meta = stacks.shelves[key] || {};
  const works = shelfWorks(stacks, key);
  const picks = works.filter((w) => w.pick).length;
  const other = lang === 'zh' ? s.en : s.zh;
  const head = ph({
    lang,
    tone: key,
    crumbs: crumbs(lang, [[T(s.en, s.zh)]]),
    h1: `${esc(T(s.en, s.zh))}<span class="os-h1alt" lang="${lang === 'zh' ? 'en' : 'zh-CN'}"><span class="sep" aria-hidden="true">·</span>${esc(other)}</span>`,
    lede: esc(T(s.dek.en, s.dek.zh)),
    facts: [count(works.length, 'work', lang), count(authorCount(works), 'author', lang), yearRange(works, lang), picks ? `<span class="brass">${T(`${picks} on Claude’s shelf`, `Claude 选了 ${picks} 部`)}</span>` : ''].filter(Boolean).join(sep),
    plate: platePh(lang, plateById(stacks, meta.plate)),
    cls: 'os-ph',
  });

  // Claude's essay and the three works to start with.
  const essay = typeof meta.essay === 'string' ? meta.essay : meta.essay && (meta.essay[lang] || meta.essay.en);
  const { works: start, curated } = startWorks(stacks, key);
  const essayHtml = essay
    ? `<div class="c-main note os-essay">${String(essay).trim().split(/\n\s*\n/).map((p) => `<p>${esc(p.trim())}</p>`).join('')}<p class="meta signed">${T('Claude, Librarian No. 2', 'Claude，二号馆员')}</p></div>`
    : '';
  const label = esc(startLabel(lang, start, curated));
  const startHtml = start.length ? `<section class="os-start c-all" aria-labelledby="h-start-${key}">
    <h2 class="meta os-label" id="h-start-${key}">${label}</h2>
    ${cardGrid(start.map((w) => wcard(lang, w, stacks)), { cls: start.length >= 3 ? 'thirds' : 'halves' })}
  </section>` : '';
  const intro = `<div class="wrap grid os-intro">${essayHtml}${startHtml}</div>`;

  // Every work: list by default, a grid of cards on request. The grid lives in a <template>, with its glyphs on a
  // separate font key, so the list view never downloads the opening lines' characters.
  const gridKey = `grid:open-stacks/${key}`;
  const grid = glyphsInto(gridKey, () => works.map((w) => `<div class="os-cell" data-cell="${w.id}">${wcard(lang, w, stacks)}</div>`).join(''));
  const fid = `f-${key}`;
  const bar = filterBar(lang, { id: fid, facets: facetsFor(lang, works), toggles: togglesFor(lang, works), sorts: sortsFor(lang), view: true, total: works.length });
  const list = `<section class="sec os-works" id="works" aria-labelledby="h-works">
  <div class="wrap" data-filter="shelf" data-total="${works.length}">
    <header class="sec-head os-works-head"><h2 id="h-works">${T('Every work on the shelf', '书架上的全部作品')}</h2></header>
    ${bar}
    <div data-group>${rowList(works.map((w) => wrow(lang, w, stacks)))}</div>
    <template data-grid-tpl>${grid}</template>
    <div class="cards os-grid" data-grid hidden data-font-css="${esc(fontCssHref(gridKey, lang))}"></div>
    ${filterEmpty(lang)}
    ${dataBlock(`${fid}-labels`, { shelf: T(s.en, s.zh), ...chipLabels(lang, stacks) })}
  </div>
</section>`;

  const others = SHELVES.filter((x) => x.key !== key).map((x) => shelfCard(lang, x.key, stacks));
  const otherSec = sec({ id: 'other-shelves', h: T('Other shelves', '其他书架'), body: cardGrid(others, { cls: 'thirds' }) });
  return `${head}
${act(`${intro}${list}`)}
${act(otherSec, { alt: true })}`;
}

export { shelfHref, osHref };
