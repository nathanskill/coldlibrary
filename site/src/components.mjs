// Shared components (visual system v5). Each returns HTML. Serif text goes through serif() so its glyphs are sliced.
import { esc, t, href, serif, glue, go, sep, LOGO, ICON_SEARCH, tagOf, addGlyphs } from './lib.mjs';
import { SHELVES, shelfOf, workHref, plateHref, shelfHref, titles, authorLabel, yearLabel, yearShort, rightsCode, openingLines, translationInto, pickNo, isChineseText, isClassical } from './stacks.mjs';

const T = (lang) => t(lang);

// Claude's shelf number: "No. 7" in mono; "第 7 号" with the Han in sans and only the digits in mono.
export const pickMark = (lang, n, title = '') => lang === 'zh'
  ? `<span class="meta brass pickmark"${title ? ` title="${esc(title)}"` : ''}>第 <span class="id brass">${n}</span> 号</span>`
  : `<span class="id brass pickmark"${title ? ` title="${esc(title)}"` : ''}>No.&nbsp;${n}</span>`;

// A title in the serif, with lang, glued so it never ends on a single character.
export function serifTitle(text, langTag) {
  addGlyphs(text);
  return `<span class="serif" lang="${esc(tagOf(langTag))}">${glue(text)}</span>`;
}

// ---- work card (grid view) ----
export function wcard(lang, w, stacks, { heading = 'h3' } = {}) {
  const tt = titles(w, lang);
  const a = authorLabel(w, lang);
  const n = pickNo(stacks, w);
  const ol = openingLines(w, lang, 9);
  const textTag = tagOf(lang === 'zh' && w.textHans ? 'zh-Hans' : w.lang);
  const lines = ol.kind === 'code'
    ? `<div class="lines code">${esc(ol.lines.join('\n'))}</div>`
    : `<div class="lines" lang="${esc(textTag)}">${ol.lines.map((l) => (l === '' ? '<span>&nbsp;</span>' : `<span>${serif(l)}</span>`)).join('')}</div>`;
  return `<article class="wcard tone-${w.shelf}${w.pick ? ' pick' : ''}">
  <div class="page" aria-hidden="true">${lines}</div>
  <div class="label">
    <${heading}><a href="${workHref(lang, w)}">${serifTitle(tt.main, tt.mainLang)}${tt.sub ? ` <span class="alt">${glue(tt.sub)}</span>` : ''}</a></${heading}>
    <p class="by">${esc(a.name)}${a.orig ? ` <span lang="${esc(tagOf(w.orig_lang || w.lang))}">${esc(a.orig)}</span>` : ''} · ${esc(yearLabel(w, lang))}</p>
    <p class="marks"><span class="id"><span class="vh">${T(lang)('Catalogue number ', '馆藏号 ')}</span>${esc(w.id)}</span>${n ? pickMark(lang, n) : ''}</p>
  </div>
</article>`;
}

// ---- work row (list view). data-* attributes drive the shelf filters. ----
export function wrow(lang, w, stacks, { compact = false } = {}) {
  const tt = titles(w, lang);
  const a = authorLabel(w, lang);
  const n = pickNo(stacks, w);
  const zh = translationInto(w, 'zh');
  const en = translationInto(w, 'en');
  // The translation mark says whether this work can be read in the page's language: 中译 / 白话 on /zh/, EN on /.
  const into = lang === 'zh' ? zh : en;
  const native = lang === 'zh' ? isChineseText(w) && !isClassical(w) : /^en/.test(String(w.lang));
  const trMark = !into || native ? '' : lang === 'zh'
    ? `<span class="meta nw" title="${isClassical(w) ? '有 Claude 的白话译文' : '有 Claude 的中文译文'}">${isClassical(w) ? '白话' : '中译'}${into.full ? '' : '（节）'}</span>`
    : `<span class="id" title="English translation by Claude">EN${into.full ? '' : ' ½'}</span>`;
  const marks = [
    lang === 'zh' ? `<span class="meta nw"><span class="id">${w.size.minutes}</span> 分钟</span>` : `<span class="id">${w.size.minutes} min</span>`,
    n ? pickMark(lang, n, T(lang)('On Claude’s shelf', '在 Claude 的书架上')) : '',
    trMark,
  ].filter(Boolean).join('');
  return `<li class="wrow${compact ? ' compact' : ''}" data-id="${esc(w.id)}" data-form="${esc(w.form)}" data-year="${w.year}" data-lang="${esc(w.lang)}" data-pick="${w.pick ? 1 : 0}" data-tr="${zh ? (zh.full ? 2 : 1) : 0}" data-min="${w.size.minutes}" data-author="${esc(w.author.en)}" data-tags="${esc((w.tags || []).join(' '))}">
  ${compact ? '' : `<span class="r-id id"><span class="vh">${T(lang)('Catalogue number ', '馆藏号 ')}</span>${esc(w.id.slice(2))}</span>`}
  <span class="r-title"><a href="${workHref(lang, w)}">${serifTitle(tt.main, tt.mainLang)}</a>${tt.sub ? `<span class="alt">${esc(tt.sub)}</span>` : ''}</span>
  <span class="r-author">${esc(a.name)}${a.orig ? ` <span lang="${esc(tagOf(w.orig_lang || w.lang))}">${esc(a.orig)}</span>` : ''}</span>
  ${compact ? '' : `<span class="r-date">${esc(yearShort(w, lang))}</span><span class="r-marks">${marks}</span>`}
</li>`;
}

// ---- shelf card ----
export function shelfCard(lang, key, stacks, { heading = 'h3' } = {}) {
  const s = shelfOf(key);
  const tt = T(lang);
  const works = stacks.works.filter((w) => w.shelf === key);
  const meta = stacks.shelves[key] || {};
  const start = (meta.start && meta.start.length ? meta.start.map((id) => stacks.byId.get(id)).filter(Boolean) : works.filter((w) => w.pick)).slice(0, 3);
  const fill = start.length < 3 ? works.filter((w) => !start.includes(w)).slice(0, 3 - start.length) : [];
  const list = [...start, ...fill].map((w) => {
    const ti = titles(w, lang);
    return `<li><a href="${workHref(lang, w)}">${serifTitle(ti.main, ti.mainLang)}</a><span class="meta">${ti.sub ? `${glue(ti.sub)} · ` : ''}${esc(authorLabel(w, lang).name)}</span></li>`;
  }).join('');
  return `<article class="shelfcard tone-${key}">
  <${heading}><a href="${shelfHref(lang, key)}">${tt(s.en, s.zh)}</a><span class="other" lang="${lang === 'zh' ? 'en' : 'zh-CN'}">${lang === 'zh' ? s.en : s.zh}</span><span class="id count">${works.length}</span></${heading}>
  <p class="dek">${esc(tt(s.dek.en, s.dek.zh))}</p>
  <ul class="start">${list}</ul>
  ${go(shelfHref(lang, key), tt('Browse the shelf', '看整个书架'))}
</article>`;
}

// ---- plates ----
// Image files: <ID>.jpg (1600 on the long side), <ID>-sm.jpg (800), <ID>-480.jpg (480).
export function plateImg(p, { sizes = '(min-width: 1200px) 265px, (min-width: 600px) 33vw, 50vw', large = false, eager = false, lang = 'en' } = {}) {
  const w = p.image && p.image.width, h = p.image && p.image.height;
  const alt = (p.alt && (p.alt[lang] || p.alt.en)) || '';
  // Files are sized by their long side, so a portrait plate's 480 and 800 files are narrower than 480 and 800 px.
  const long = Math.max(w || 1600, h || 1600);
  const wOf = (n) => Math.round((w || 1600) * Math.min(1, n / long));
  const srcset = large
    ? `/assets/plates/${p.id}-sm.jpg ${wOf(800)}w, /assets/plates/${p.id}.jpg ${w || 1600}w`
    : `/assets/plates/${p.id}-480.jpg ${wOf(480)}w, /assets/plates/${p.id}-sm.jpg ${wOf(800)}w, /assets/plates/${p.id}.jpg ${w || 1600}w`;
  return `<img src="/assets/plates/${p.id}${large ? '' : '-sm'}.jpg" srcset="${srcset}" sizes="${sizes}"${w && h ? ` width="${w}" height="${h}"` : ''} alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async">`;
}
// "Artist, Title, year — Institution"
export function plateCaption(lang, p) {
  const artist = p.artist[lang] || p.artist.en;
  const title = p.title[lang] || p.title.en;
  const year = (p.year_display && (p.year_display[lang] || p.year_display.en)) || p.year;
  if (lang === 'zh') return `${esc(artist)}，<cite>《${serif(title)}》</cite>，${esc(year)}，<span lang="en">${esc(p.institution.name)}</span>`;
  return `${esc(artist)}, <cite>${serif(title)}</cite>, ${esc(year)} — ${esc(p.institution.name)}`;
}
export function plateTile(lang, p, { heading = 'h3' } = {}) {
  const title = p.title[lang] || p.title.en;
  return `<article class="ptile">
  <div class="well">${plateImg(p, { lang })}</div>
  <${heading}><a href="${plateHref(lang, p)}">${serif(title)}</a></${heading}>
  <p class="by">${esc(p.artist[lang] || p.artist.en)} · ${esc((p.year_display && (p.year_display[lang] || p.year_display.en)) || p.year)}</p>
  <p class="id">${esc(p.id)} · ${esc(plateRights(lang, p))}</p>
</article>`;
}
export function plateRights(lang, p) {
  const k = (p.rights && p.rights.kind) || (/government|17 U\.S\.C|NASA/i.test((p.rights && p.rights.basis && p.rights.basis.en) || '') ? 'us-gov' : (p.rights && p.rights.license === 'CC0-1.0' ? 'cc0' : 'age'));
  return lang === 'zh' ? { 'us-gov': '公版 · 美国政府', cc0: '公版 · CC0', age: '公版 · 年代' }[k] || '公版' : { 'us-gov': 'PD · US gov', cc0: 'PD · CC0', age: 'PD · age' }[k] || 'PD';
}

// ---- trail card ----
export function trailCard(lang, trail, stacks, { heading = 'h3' } = {}) {
  const tt = T(lang);
  const steps = trail.steps.map((s) => stacks.byId.get(s.id)).filter(Boolean);
  const min = steps.reduce((a, w) => a + w.size.minutes, 0);
  return `<article class="trailcard">
  <${heading}><a href="${href(lang, 'open-stacks/trails/' + trail.slug)}">${serif(trail.title[lang] || trail.title.en)}</a></${heading}>
  ${trail.dek ? `<p class="dek">${esc(trail.dek[lang] || trail.dek.en)}</p>` : ''}
  <ol>${steps.slice(0, 3).map((w) => { const ti = titles(w, lang); return `<li><span><span class="t">${serifTitle(ti.main, ti.mainLang)}</span><span class="meta"> · ${esc(authorLabel(w, lang).name)}</span></span></li>`; }).join('')}</ol>
  <p class="meta foot">${tt(`${steps.length} works · about ${min} min`, `${steps.length} 部 · 约 ${min} 分钟`)}</p>
</article>`;
}

// ---- library card ----
export function libCard(lang, { no, role, since }) {
  return `<div class="libcard">
  <p class="top meta">${LOGO}<span>${t(lang)('Cold Library · Librarian', '冷冻图书馆 · 馆员证')}</span></p>
  <p class="no">No. ${esc(no)}</p>
  <p><span class="role">${esc(role)}</span><br><span class="meta">${t(lang)('since', '始于')}</span> <span class="id">${esc(since)}</span></p>
</div>`;
}

// ---- search box (submits to the search page; search.js enhances it) ----
export function searchBox(lang, { big = false, autofocus = false, value = '' } = {}) {
  const tt = T(lang);
  return `<form class="search${big ? ' big' : ''}" role="search" action="${href(lang, 'open-stacks/search')}" method="get" data-search-form>
  <label class="vh" for="q-${big ? 'big' : 'small'}">${tt('Search the Open Stacks', '搜索开架书库')}</label>
  ${ICON_SEARCH}<input id="q-${big ? 'big' : 'small'}" type="search" name="q" value="${esc(value)}" placeholder="${tt('Search titles, authors and lines', '搜书名、作者或诗句')}" autocomplete="off" spellcheck="false"${autofocus ? ' autofocus' : ''}>
</form>`;
}

// ---- shelf list helpers ----
export function cardGrid(items, { cls = '' } = {}) { return `<div class="cards${cls ? ' ' + cls : ''}">${items.join('')}</div>`; }
export function rowList(items) { return `<ul class="wrows">${items.join('')}</ul>`; }
// An adaptive shelf: 1 → 8/4 with an invitation, 2 → halves, 3 → thirds, ≥4 → quarters.
export function adaptive(items, invitation = '') {
  if (items.length === 1) return `<div class="grid"><div class="c-main">${items[0]}</div>${invitation ? `<div class="c-aside">${invitation}</div>` : ''}</div>`;
  if (items.length === 2) return cardGrid(items, { cls: 'halves' });
  if (items.length === 3) return cardGrid(items, { cls: 'thirds' });
  return cardGrid(items);
}

export { SHELVES };
