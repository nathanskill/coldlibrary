// Shared pieces for the Open Stacks list pages (index, shelves, Claude's shelf, trails, plates, authors, search, random).
// Everything here is local to the list pages; shared components live in components.mjs.
import { esc, t, href, serif, glue, go, sep, tagOf, addGlyphs, addGlyphsTo, takeGlyphs, resetGlyphs } from '../lib.mjs';
import { SHELVES, shelfOf, titles, authorLabel, yearLabel, workHref, plateHref, shelfHref, ERAS, eraOf, isChineseText, splitCaesura, translationInto, authorSlug, pickNo } from '../stacks.mjs';
import { plateImg, plateCaption } from '../components.mjs';

export const OS = 'open-stacks';
export const osHref = (lang, rest = '') => href(lang, rest ? `${OS}/${rest}` : OS);
export const searchHref = (lang, params = {}) => {
  const q = Object.entries(params).filter(([, v]) => v !== '' && v != null).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  return osHref(lang, 'search') + (q ? '?' + q : '');
};
export const L = (lang, o) => (o == null ? '' : typeof o === 'string' ? o : o[lang] ?? o.en ?? '');
export const num = (n, lang) => Number(n).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en');

// "12 works" / "12 部"; one place for every measure word the list pages count with.
const NOUNS = { work: ['work', 'works', '部作品'], author: ['author', 'authors', '位作者'], plate: ['plate', 'plates', '幅图版'], trail: ['trail', 'trails', '条书单'],
  artwork: ['artwork', 'artworks', '幅艺术品'], photograph: ['photograph', 'photographs', '幅照片'], object: ['object', 'objects', '件实物'], minute: ['min', 'min', '分钟'] };
// Small numbers in words, for copy that counts something ("There are four ways in"); computed, never typed.
const WORDS = { en: ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'], zh: ['零', '一', '两', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二'] };
export const inWords = (n, lang) => (WORDS[lang === 'zh' ? 'zh' : 'en'][n] ?? num(n, lang));
// The "Start here" label: "从这三部读起" names its own count, and "from Claude's shelf" only when every one is a pick.
export function startLabel(lang, start, curated) {
  const allPicks = start.length > 0 && start.every((w) => w.pick);
  const n = inWords(start.length, lang);
  if (lang === 'zh') return `从这${n}部读起${!curated && allPicks ? ' · 选自 Claude 的书架' : ''}`;
  return `Start here${!curated && allPicks ? ` · ${n} from Claude’s shelf` : ''}`;
}
export function count(n, noun, lang) {
  const [one, many, zh] = NOUNS[noun];
  return lang === 'zh' ? `${num(n, lang)} ${zh}` : `${num(n, lang)} ${n === 1 ? one : many}`;
}

// ---- years ----
export const fmtYear = (y, lang) => (y < 0 ? (lang === 'zh' ? `公元前 ${-y} 年` : `${-y} BCE`) : (lang === 'zh' ? `${y} 年` : String(y)));
// A short form of a work's display date: the last clause of "Zhou dynasty, before c. 600 BCE", or the bare year.
export function shortYear(w, lang) {
  const d = (w.year_display && (w.year_display[lang] || w.year_display.en)) || '';
  if (!d || /[;；()（）]/.test(d)) return fmtYear(w.year, lang);
  const parts = d.split(lang === 'zh' ? /，|, / : /, /);
  return parts[parts.length - 1].trim();
}
export function yearRange(works, lang) {
  if (!works.length) return '';
  const ys = works.map((w) => w.year);
  const a = Math.min(...ys), b = Math.max(...ys);
  if (a === b) return fmtYear(a, lang);
  if (lang === 'zh') return a < 0 ? `${fmtYear(a, lang)}至 ${fmtYear(b, lang)}` : `${a}–${b} 年`;
  return a < 0 && b >= 0 ? `${fmtYear(a, lang)} to ${b}` : `${fmtYear(a, lang)}–${fmtYear(b, lang)}`;
}

// ---- languages and forms (facet labels) ----
export const langGroup = (l) => { const s = String(l || 'en'); return /^lzh/.test(s) ? 'lzh' : /^zh/.test(s) ? 'zh' : s.split('-')[0]; };
const LANGS = { lzh: ['Classical Chinese', '文言'], zh: ['Modern Chinese', '白话'], en: ['English', '英文'], fr: ['French', '法文'], la: ['Latin', '拉丁文'],
  de: ['German', '德文'], it: ['Italian', '意大利文'], es: ['Spanish', '西班牙文'], grc: ['Ancient Greek', '古希腊文'], ru: ['Russian', '俄文'], da: ['Danish', '丹麦文'], ja: ['Japanese', '日文'] };
export function langName(code, lang) {
  if (LANGS[code]) return LANGS[code][lang === 'zh' ? 1 : 0];
  try { return new Intl.DisplayNames([lang === 'zh' ? 'zh-Hans' : 'en'], { type: 'language' }).of(code) || code; } catch { return code; }
}
const FORMS = { verse: ['Verse', '韵文'], prose: ['Prose', '散文'], aphorisms: ['Aphorisms', '格言'], code: ['Code', '代码'], monospace: ['Fixed-width', '等宽文本'] };
export const formName = (f, lang) => (FORMS[f] ? FORMS[f][lang === 'zh' ? 1 : 0] : f);
export const eraName = (key, lang) => { const e = ERAS.find((x) => x.key === key); return e ? (lang === 'zh' ? e.zh : e.en) : key; };

// ---- crumbs: "Open Stacks / Poetry" ----
export function crumbs(lang, items) {
  const T = t(lang);
  const all = [[T('Open Stacks', '开架书库'), osHref(lang)], ...items];
  return `<nav class="os-crumbs" aria-label="${T('Breadcrumb', '位置')}">${all.map(([label, url], i) => (i === all.length - 1 && !url
    ? `<span aria-current="page">${label}</span>`
    : `<a href="${esc(url)}">${label}</a>`)).join('<span class="sep" aria-hidden="true">/</span><wbr>')}</nav>`;
}

// ---- plates ----
// kind: "artwork" | "photograph" | "object". Uses plate.kind when the catalogue sets it.
export function plateKind(p) {
  if (p.kind) return p.kind;
  const m = `${(p.medium && p.medium.en) || ''} ${(p.title && p.title.en) || ''}`;
  if (/\bplaque\b|record cover|replica/i.test(m) && !/oil|ink|woodblock/i.test(m)) return 'object';
  if (/photograph|negative|digital image|spacecraft|colour film/i.test(m)) return 'photograph';
  return 'artwork';
}
// The language of a plate's original title, when it can be known. Japanese never borrows Chinese glyph forms.
export function plateOrigLang(p) {
  const o = `${p.title.orig || ''}${(p.artist && p.artist.orig) || ''}`;
  if (p.title.lang) return p.title.lang;
  if (/[぀-ヿ]/.test(o)) return 'ja';
  if (/[가-힯]/.test(o)) return 'ko';
  if (/[一-鿿]/.test(p.title.orig || '')) return '';
  return /^[\x00-\x7F’‘–—]*$/.test(p.title.orig || '') ? 'en' : '';
}
export const plateTitle = (lang, p) => p.title[lang] || p.title.en;
export const plateArtist = (lang, p) => (p.artist && (p.artist[lang] || p.artist.en)) || '';
export const plateYear = (lang, p) => (p.year_display && (p.year_display[lang] || p.year_display.en)) || String(p.year);

// The figure for a T2-plate page header: the plate in a mat at its native ratio, its caption, and its catalogue link.
export function platePh(lang, p) {
  if (!p) return null;
  return {
    img: plateImg(p, { lang, sizes: '(min-width: 900px) 50vw, 100vw', eager: true }),
    caption: `${plateCaption(lang, p)} <span class="sep" aria-hidden="true">·</span> <a class="id" href="${plateHref(lang, p)}"><span class="vh">${t(lang)('Plate ', '图版 ')}</span>${esc(p.id)}</a>`,
  };
}
export const plateById = (stacks, id) => (id ? stacks.plateById.get(id) || null : null);

// ---- works ----
// The three works to start a shelf with: shelf.json "start", else Claude's picks on the shelf, else the first works.
export function startWorks(stacks, key, n = 3) {
  const meta = stacks.shelves[key] || {};
  const given = (meta.start || []).map((id) => stacks.byId.get(id)).filter((w) => w && w.shelf === key);
  const picks = stacks.picks.map((p) => p.work).filter((w) => w.shelf === key && !given.includes(w));
  const rest = stacks.works.filter((w) => w.shelf === key && !given.includes(w) && !picks.includes(w));
  return { works: [...given, ...picks, ...rest].slice(0, n), curated: given.length > 0 };
}
// The A–Z initial of an author: author.en, which is pinyin for Chinese authors, without diacritics.
export const initialOf = (author) => { const c = String(author.en || author.orig || '?').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/^[^A-Za-z]+/, '').charAt(0).toUpperCase(); return /[A-Z]/.test(c) ? c : '#'; };
export const shelfWorks = (stacks, key) => stacks.works.filter((w) => w.shelf === key);
export const authorCount = (works) => new Set(works.map(authorSlug)).size;

// An excerpt in the work's own script (simplified on the Chinese site), set in the serif, with a translation line
// when the page reads another language. Chinese clauses are kept whole, so a line wraps only between clauses.
export function excerptBlock(lang, w, { cls = 'os-ex', translate = true } = {}) {
  const ex = w.excerpt || {};
  const zhText = isChineseText(w);
  const orig = lang === 'zh' && zhText ? (ex.zh || ex.orig || '') : (ex.orig || '');
  if (!orig) return '';
  const tag = tagOf(lang === 'zh' && zhText && /-Hant$/.test(w.lang) ? 'zh-Hans' : w.lang);
  const body = zhText ? clauses(orig) : serif(orig);
  const pageIsText = (lang === 'zh' && zhText) || (lang === 'en' && /^en/.test(w.lang));
  const tr = translate && !pageIsText ? (ex[lang] || '') : '';
  return `<p class="${cls}"><span class="serif" lang="${esc(tag)}">${body}</span>${tr ? `<span class="os-ex-tr" lang="${lang === 'zh' ? 'zh-CN' : 'en'}">${esc(tr)}</span>` : ''}</p>`;
}
// Chinese text in clauses that never break inside (each clause ends at its punctuation).
export function clauses(text) {
  const parts = String(text).match(/[^，。；：！？、]+[，。；：！？、」』”’）》]*/gu) || [String(text)];
  return parts.map((c) => `<span class="os-cl">${serif(c)}</span>`).join('');
}

// Every glyph a fragment sets in serif goes to its own font key (for content that is shown later, e.g. the grid view).
// The page's own glyphs are left exactly as they were.
const BUCKETS = ['base', 'hant', 'hans', 'w600'];
export function glyphsInto(key, fn) {
  const before = takeGlyphs();
  resetGlyphs();
  const html = fn();
  const mine = takeGlyphs();
  resetGlyphs();
  for (const b of BUCKETS) addGlyphs(before[b], b);
  for (const [k, g] of Object.entries(before.extra || {})) for (const b of BUCKETS) addGlyphsTo(k, g[b], b);
  for (const b of BUCKETS) addGlyphsTo(key, mine[b], b);
  for (const [k, g] of Object.entries(mine.extra || {})) for (const b of BUCKETS) addGlyphsTo(k, g[b], b);
  return html;
}

// ---- a work row in sans, for search results and the author index (no serif, so no glyphs to slice) ----
export function srow(lang, w, stacks) {
  const T = t(lang);
  const tt = titles(w, lang);
  const a = authorLabel(w, lang);
  const n = pickNo(stacks, w);
  const zh = translationInto(w, 'zh');
  const marks = [
    `<span class="id">${w.size.minutes}${T(' min', ' 分钟')}</span>`,
    n ? (lang === 'zh' ? `<span class="brass os-pno" title="在 Claude 的书架上">第 <span class="id">${n}</span> 号</span>` : `<span class="id brass" title="On Claude’s shelf">No.&nbsp;${n}</span>`) : '',
    zh ? `<span class="id" title="${zh.full ? T('Chinese translation', '有中文译文') : T('Partial Chinese translation', '中文节译')}">${zh.full ? 'zh' : 'zh ½'}</span>` : '',
  ].join('');
  const s = shelfOf(w.shelf);
  return `<li class="wrow os-srow" data-id="${esc(w.id)}" data-shelf="${esc(w.shelf)}" data-form="${esc(w.form)}" data-year="${w.year}" data-lang="${esc(w.lang)}" data-pick="${w.pick ? 1 : 0}" data-tr="${zh ? (zh.full ? 2 : 1) : 0}" data-min="${w.size.minutes}" data-author="${esc(w.author.en)}" data-tags="${esc((w.tags || []).join(' '))}">
  <span class="r-id id"><span class="vh">${T('Catalogue number ', '馆藏号 ')}</span>${esc(w.id.slice(2))}</span>
  <span class="r-title"><a href="${workHref(lang, w)}"><span data-m lang="${esc(tagOf(tt.mainLang))}">${esc(tt.main)}</span></a>${tt.sub ? `<span class="alt" data-m>${esc(tt.sub)}</span>` : ''}</span>
  <span class="r-author"><span data-m>${esc(a.name)}</span>${a.orig ? ` <span data-m lang="${esc(tagOf(w.lang))}">${esc(a.orig)}</span>` : ''}<span class="os-rshelf"> · ${esc(T(s.en, s.zh))}</span></span>
  <span class="r-date">${esc(shortYear(w, lang))}</span><span class="r-marks">${marks}</span>
</li>`;
}

// ---- the filter bar (spec §6.6): facets with counts, toggles, sort and view. Behaviour in /assets/js/shelf.js ----
// facets: [{ key, label, values: [{ v, label, n, from?, to? }] }]; toggles: [{ key, label, n }]
export function filterBar(lang, { id = 'f', facets = [], toggles = [], sorts = [], view = false, total = 0 }) {
  const T = t(lang);
  const facet = (f) => `<div class="os-facet" role="group" aria-labelledby="${id}-${f.key}"><span class="os-fl" id="${id}-${f.key}">${esc(f.label)}</span>
    <button type="button" class="os-fb" data-f="${f.key}" data-v="" aria-pressed="true">${T('All', '全部')}</button>${f.values.map((v) => `<button type="button" class="os-fb" data-f="${f.key}" data-v="${esc(v.v)}" data-label="${esc(v.label)}"${v.from != null ? ` data-from="${v.from}" data-to="${v.to}"` : ''} aria-pressed="false"${v.n ? '' : ' disabled aria-disabled="true"'}>${esc(v.label)} <span class="id" data-n>${v.n}</span></button>`).join('')}</div>`;
  const toggle = (g) => `<button type="button" class="os-fb os-tog" data-t="${g.key}" data-label="${esc(g.label)}" aria-pressed="false"${g.n ? '' : ' disabled aria-disabled="true"'}><span class="os-box" aria-hidden="true"></span>${esc(g.label)} <span class="id" data-n>${g.n}</span></button>`;
  const sort = sorts.length ? `<label class="os-sort"><span>${T('Sort', '排序')}</span><select data-sort>${sorts.map(([v, label]) => `<option value="${v}">${esc(label)}</option>`).join('')}</select></label>` : '';
  const views = view ? `<span class="seg os-view" role="radiogroup" aria-label="${T('View', '视图')}"><input type="radio" name="${id}-view" id="${id}-v-list" value="list" checked data-view><label for="${id}-v-list">${T('List', '列表')}</label><input type="radio" name="${id}-view" id="${id}-v-grid" value="grid" data-view><label for="${id}-v-grid">${T('Grid', '卡片')}</label></span>` : '';
  return `<div class="os-fsent" data-fsent aria-hidden="true"></div>
<div class="os-fbar" data-fbar>
  <details class="os-fpanel" data-fpanel>
    <summary class="os-fsum">${T('Filter and sort', '筛选与排序')} <span data-nactive></span></summary>
    <div class="os-frow">
      <div class="os-facets">${facets.filter((f) => f.values.length > 1).map(facet).join('')}${toggles.length ? `<div class="os-facet os-toggles">${toggles.map(toggle).join('')}</div>` : ''}</div>
      ${sort || views ? `<div class="os-sv">${sort}${views}</div>` : ''}
    </div>
  </details>
</div>
<div class="os-status">
  <p class="os-count meta" data-count role="status" aria-live="polite">${esc(count(total, 'work', lang))}</p>
  <div class="chips os-chips" data-chips hidden></div>
</div>`;
}

// The empty state for filters: one sentence, then three next steps.
export function filterEmpty(lang, { searchAll = true } = {}) {
  const T = t(lang);
  return `<div class="empty os-empty" data-empty hidden>
  <p data-empty-msg>${T('Nothing on this shelf matches these filters yet.', '这个书架上还没有符合这些条件的作品。')}</p>
  <p class="actions"><button class="linkish" type="button" data-clear>${T('Clear filters', '清除筛选')}</button>${searchAll ? go(searchHref(lang), T('Search all shelves', '搜索全部书架'), { attrs: 'data-search-all' }) : ''}${go(osHref(lang, 'random'), T('A random work', '随便读一部'))}</p>
</div>`;
}

// Facet values for a set of works, with counts.
export function facetsFor(lang, works, keys = ['form', 'era', 'lang']) {
  const T = t(lang);
  const out = [];
  const tally = (f) => { const m = new Map(); for (const w of works) { const k = f(w); m.set(k, (m.get(k) || 0) + 1); } return m; };
  if (keys.includes('shelf')) {
    const m = tally((w) => w.shelf);
    out.push({ key: 'shelf', label: T('Shelf', '书架'), values: SHELVES.map((s) => ({ v: s.key, label: T(s.en, s.zh), n: m.get(s.key) || 0 })) });
  }
  if (keys.includes('form')) {
    const m = tally((w) => w.form);
    const order = ['verse', 'prose', 'aphorisms', 'code', 'monospace'];
    out.push({ key: 'form', label: T('Form', '体裁'), values: [...m.keys()].sort((a, b) => order.indexOf(a) - order.indexOf(b)).map((f) => ({ v: f, label: formName(f, lang), n: m.get(f) })) });
  }
  if (keys.includes('era')) {
    const m = tally(eraOf);
    out.push({ key: 'era', label: T('Era', '年代'), values: ERAS.map((e) => ({ v: e.key, label: lang === 'zh' ? e.zh : e.en, n: m.get(e.key) || 0, from: e.from, to: e.to })) });
  }
  if (keys.includes('lang')) {
    const m = tally((w) => langGroup(w.lang));
    const order = ['lzh', 'zh', 'en'];
    out.push({ key: 'lang', label: T('Language', '语种'), values: [...m.keys()].sort((a, b) => ((order.indexOf(a) + 1) || 9) - ((order.indexOf(b) + 1) || 9) || a.localeCompare(b)).map((l) => ({ v: l, label: langName(l, lang), n: m.get(l) })) });
  }
  return out;
}
export function togglesFor(lang, works) {
  const T = t(lang);
  return [
    { key: 'pick', label: T('Claude’s picks', 'Claude 选的'), n: works.filter((w) => w.pick).length },
    { key: 'tr', label: T('Has Chinese translation', '有现代中文译文'), n: works.filter((w) => translationInto(w, 'zh')).length },
  ];
}
export function sortsFor(lang, { rank = false } = {}) {
  const T = t(lang);
  return [
    ...(rank ? [['rank', T('Best match', '最相关')]] : []),
    ['id', T('Catalogue no.', '馆藏号')], ['year', T('Oldest first', '年代由远及近')], ['year-desc', T('Newest first', '年代由近及远')],
    ['title', T('Title', '题名')], ['author', T('Author', '作者')], ['min', T('Shortest first', '篇幅由短到长')],
  ];
}

// Labels for filters that appear only as chips (from the URL): tags, languages, forms, shelves, eras.
export function chipLabels(lang, stacks) {
  const tags = {};
  for (const w of stacks.works) for (const g of w.tags || []) if (!tags[g]) tags[g] = tagText(stacks, g, lang);
  const langs = {};
  for (const w of stacks.works) langs[langGroup(w.lang)] = langName(langGroup(w.lang), lang);
  const forms = {};
  for (const w of stacks.works) forms[w.form] = formName(w.form, lang);
  return { tag: tags, lang: langs, form: forms, shelf: Object.fromEntries(SHELVES.map((s) => [s.key, lang === 'zh' ? s.zh : s.en])), era: Object.fromEntries(ERAS.map((e) => [e.key, lang === 'zh' ? e.zh : e.en])),
    eraRanges: ERAS.map((e) => [e.key, e.from, e.to]) };
}
// A tag's label: from tags.json when it is there, else the tag itself in plain words.
export function tagText(stacks, tag, lang) {
  const x = stacks.tags && stacks.tags[tag];
  if (x && (x[lang] || x.en)) return x[lang] || x.en;
  const s = String(tag).replace(/-/g, ' ');
  return s.charAt(0).toUpperCase() + s.slice(1);
}
export const tagLabelled = (stacks, tag, lang) => !!(stacks.tags && stacks.tags[tag] && stacks.tags[tag][lang]);

// A JSON data block (never executed; allowed by the CSP).
export const dataBlock = (id, data) => `<script type="application/json" id="${id}">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

// The serif title of a work, linked, with the page-language title after it when it differs.
export function workTitleLink(lang, w, { cls = '' } = {}) {
  const tt = titles(w, lang);
  addGlyphs(tt.main);
  return `<a${cls ? ` class="${cls}"` : ''} href="${workHref(lang, w)}"><span class="serif" lang="${esc(tagOf(tt.mainLang))}">${glue(tt.main)}</span>${tt.sub ? ` <span class="os-tsub">${glue(tt.sub)}</span>` : ''}</a>`;
}
export const byLine = (lang, w) => {
  const a = authorLabel(w, lang);
  return [esc(a.name) + (a.orig ? ` <span lang="${esc(tagOf(w.lang))}">${esc(a.orig)}</span>` : ''), esc(yearLabel(w, lang))].join(sep);
};

export { SHELVES, shelfOf, shelfHref, workHref, plateHref, ERAS, eraOf, splitCaesura };
