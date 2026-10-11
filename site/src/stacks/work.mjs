// The work page (reading view) for every work in the Open Stacks, and the house papers (spec §5.3).
// workPages(ctx) returns page objects (see the contract at the top of site/build.mjs).
//
// Two frames: W-short (under 3 minutes and fewer than 3 ## headings) is an 8/4 page with a margin for notes;
// W-long adds, at lg, a rail with contents and progress (text in columns 3–9, margin 10–12), and below lg a
// reading bar with CSS-only bottom sheets. One toolbar row (view · script · Aa) sits before the text; the checked
// radio is the only view state (40-reading.css), view-init.js restores a stored choice before the text is parsed.
import { gzipSync } from 'node:zlib';
import { esc, t, href, glue, go, sep as SEP0, addGlyphs, tagOf, REPO, SITE } from '../lib.mjs';
import { wcard, serifTitle, plateImg, plateCaption } from '../components.mjs';
import { titles, authorLabel, yearLabel, periodOf, related, workHref, plateHref, shelfHref, shortWork, shelfOf, pickNo, isClassical, toc as tocOf } from '../stacks.mjs';
import { renderReading, hasHan, minutesOf } from './reading.mjs';
import { plainSize } from './reading-txt.mjs';

// A separator dot with a line-break opportunity after it, so meta lines wrap at their joints.
const sep = SEP0 + '<wbr>';
const ISSUE = (id) => `${REPO}/issues/new?title=${encodeURIComponent(`[${id}] `)}`;
const NUM = (n, lang) => Number(n).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en');
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function fmtDate(d, lang) {
  const m = String(d || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(d || '');
  return lang === 'zh' ? `${+m[1]} 年 ${+m[2]} 月 ${+m[3]} 日` : `${+m[3]} ${MONTHS[+m[2] - 1]} ${m[1]}`;
}
const LANG_NAMES = {
  lzh: ['Classical Chinese', '文言文'], zh: ['Chinese', '中文'], en: ['English', '英语'], fr: ['French', '法语'], la: ['Latin', '拉丁语'],
  grc: ['Ancient Greek', '古希腊语'], el: ['Greek', '希腊语'], da: ['Danish', '丹麦语'], ru: ['Russian', '俄语'], de: ['German', '德语'],
  it: ['Italian', '意大利语'], es: ['Spanish', '西班牙语'], nl: ['Dutch', '荷兰语'], pi: ['Pali', '巴利语'], pra: ['Prakrit', '俗语（普拉克里特语）'],
  sa: ['Sanskrit', '梵语'], ja: ['Japanese', '日语'], ar: ['Arabic', '阿拉伯语'], fa: ['Persian', '波斯语'], he: ['Hebrew', '希伯来语'],
};
function langName(code, lang) {
  const base = String(code || '').split('-')[0];
  if (LANG_NAMES[base]) return LANG_NAMES[base][lang === 'zh' ? 1 : 0];
  try { return new Intl.DisplayNames([lang === 'zh' ? 'zh-CN' : 'en'], { type: 'language' }).of(base) || code; } catch { return code; }
}
const PLACES = { AU: ['Australia', '澳大利亚'], EU: ['the EU', '欧盟'], UK: ['the UK', '英国'], GB: ['the UK', '英国'], CN: ['mainland China', '中国大陆'], US: ['the United States', '美国'] };
function listJoin(items, lang) {
  if (lang === 'zh') return items.length > 1 ? items.slice(0, -1).join('、') + '和' + items[items.length - 1] : items.join('');
  return items.length > 1 ? items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1] : items.join('');
}

// ---------------------------------------------------------------- the reading model of one work on one page
// Translation coverage. "Claude" means a full translation by Claude; an object may declare a partial one (§4.6).
// A translation declared full whose length is under half the original's is treated as partial without a segment
// map (the stacks-check rule), so a fragment is never presented as the whole.
function coverage(w, l) {
  const d = (w.translations || {})[l];
  const tx = (w.trans || {})[l];
  if (!d || !tx) return null;
  if (typeof d === 'object') {
    const partial = d.coverage === 'partial';
    return { full: !partial, by: d.by || 'Claude', label: d.label || null, segments: Array.isArray(d.segments) ? d.segments : [], declared: true };
  }
  const han = (tx.match(/[㐀-鿿豈-﫿]/g) || []).length;
  const words = tx.replace(/[㐀-鿿豈-﫿]/g, ' ').split(/\s+/).filter((x) => /[A-Za-z]/.test(x)).length;
  const zhOrig = /^(lzh|zh)/.test(w.lang);
  const oHan = w.size.han, oWords = w.size.words;
  const short = l === 'zh' && !zhOrig ? han < oWords * 0.5 : l === 'en' && zhOrig ? words < oHan * 0.25 : false;
  return { full: !short, by: d, label: null, segments: [], declared: false, inferred: short };
}

// Fixed-width documents (RFCs as typeset, form "monospace"): text that is mostly ≤ 72-column lines with
// aligned columns or page breaks, or form "code" with no fenced blocks. None in the catalogue today.
export function isFixedWidth(w) {
  if (w.form === 'monospace') return true;
  if (w.form === 'code' && !/```/.test(w.text)) return true;
  if (w.form === 'verse' || /^## /m.test(w.text)) return false;
  const lines = String(w.text).split('\n').filter((l) => l.trim());
  if (lines.length < 20) return false;
  const short = lines.filter((l) => l.length <= 72).length / lines.length;
  const aligned = lines.filter((l) => /^ {3,}\S|\S {3,}\S/.test(l)).length / lines.length;
  return short > 0.95 && (/\[Page \d+\]|\f/.test(w.text) || aligned > 0.15);
}

const groupOf = (w) => (/^lzh/.test(w.lang) ? 'lzh' : /^zh/.test(w.lang) ? 'zh' : w.lang === 'en' ? 'en' : 'other');
const isShort = (w) => w.size.minutes < 3 && tocOf(w.text).length < 3;
const zhTag = 'zh-Hans';

// Reading kinds: the size, leading and paragraph style of the original (.o) and the translation (.tr).
function kindOf(script, form, short, classical) {
  const verse = form === 'verse';
  if (verse) return (short ? 'vd-' : 'vl-') + (script === 'cjk' ? 'cjk' : 'lat');
  if (script === 'cjk') return classical ? 'p-lzh' : 'p-zh';
  return 'p-lat';
}

function model(w, lang) {
  const T = t(lang);
  const other = lang === 'en' ? 'zh' : 'en';
  const group = groupOf(w);
  const cjk = group === 'lzh' || group === 'zh';
  const verse = w.form === 'verse';
  const short = isShort(w);
  const mins = w.size.minutes;
  const cands = [lang, other].map((l) => ({ lang: l, cov: coverage(w, l) })).filter((c) => c.cov);
  let paired = null, solo = null;
  for (const c of cands) {
    const pairable = c.cov.full || c.cov.segments.length > 0;
    if (pairable && !paired) paired = c; else if (!solo) solo = c;
  }
  const label = (c) => {
    if (!c) return '';
    if (c.lang === 'en') return lang === 'zh' ? '英译' : 'English';
    const base = isClassical(w) ? (lang === 'zh' ? '白话' : 'Modern Chinese') : '中文';
    const zhLabel = base === '中文' && lang === 'en' ? `<span lang="zh-CN">中文</span>` : esc(base);
    return c.cov.full ? zhLabel : zhLabel + (lang === 'zh' ? '（节译）' : ' (partial)');
  };
  // Default view (§5.3.3): the first rule that matches.
  const pageLangText = (lang === 'en' && group === 'en') || (lang === 'zh' && group === 'zh');
  const pageT = cands.find((c) => c.lang === lang);
  let view = 'orig', partialNote = false;
  if (pageLangText) view = 'orig';
  else if (pageT && pageT.cov.full) view = paired === pageT ? (verse || mins < 5 ? 'par' : 'tr') : 'tr2';
  else if (pageT && !pageT.cov.full) { view = 'orig'; partialNote = true; }
  return { T, other, group, cjk, verse, short, mins, paired, solo, label, view, partialNote, pageT };
}

// ---------------------------------------------------------------- header block
function titleBlock(w, lang, m, hasHans) {
  const T = m.T;
  const tt = titles(w, lang);
  const parts = [];
  const textTag = tagOf(w.lang);
  const hansTitle = hasHans && w.title.zh && w.title.zh !== w.title.orig && [...w.title.zh].length === [...w.title.orig].length ? w.title.zh : null;
  let h1;
  if (w.translator) {
    addGlyphs(tt.orig, 'base');
    h1 = `<span class="serif" lang="${esc(textTag)}">${glue(tt.orig)}</span>`;
  } else if (hansTitle) {
    const a = [...w.title.orig], b = new Set([...hansTitle]);
    addGlyphs(a.filter((c) => b.has(c)).join(''), 'base');
    addGlyphs(a.filter((c) => !b.has(c)).join(''), 'hant');
    addGlyphs([...hansTitle].filter((c) => !a.includes(c)).join(''), 'hans');
    h1 = `<span class="serif o-hant" lang="${esc(textTag)}">${glue(w.title.orig)}</span><span class="serif o-hans" lang="zh-Hans">${glue(hansTitle)}</span>`;
  } else {
    addGlyphs(w.title.orig, 'base');
    h1 = `<span class="serif" lang="${esc(textTag)}">${glue(w.title.orig)}</span>`;
  }
  const main = w.translator ? tt.orig : w.title.orig;
  const pageTitle = w.title[lang] || w.title.en;
  const sub = pageTitle && pageTitle !== main && pageTitle !== hansTitle ? pageTitle : '';
  parts.push(`<h1 class="wtitle" id="work-title">${h1}</h1>`);
  if (sub) parts.push(`<p class="wsub"${lang === 'zh' ? '' : ' lang="en"'}>${glue(sub)}</p>`);
  return { html: parts.join(''), main, sub };
}

function byline(w, lang, m, ctx) {
  const T = m.T;
  const a = authorLabel(w, lang);
  // A name in another script follows the page name; a second Latin-script name goes in parentheses.
  const bothLatin = a.orig && !/[㐀-鿿豈-﫿]/.test(a.orig) && !/[㐀-鿿豈-﫿]/.test(a.name);
  const orig = a.orig ? ` <span lang="${esc(tagOf(w.orig_lang || w.lang))}">${bothLatin ? '(' + esc(a.orig) + ')' : esc(a.orig)}</span>` : '';
  const dates = a.dates ? (a.dates.length <= 14 ? `<span class="nw tabular">${esc(a.dates)}</span>` : `<span class="tabular">${esc(a.dates)}</span>`) : '';
  let html = `<p class="byline">${esc(a.name)}${orig}${dates ? `${sep}${dates}` : ''}</p>`;
  if (w.translator) {
    const tr = w.translator;
    html += `<p class="byline tl">${T(`Translated by ${esc(tr.name)}${tr.year ? ', ' + tr.year : ''}`, `${esc(tr.name)} 译${tr.year ? '，' + tr.year + ' 年' : ''}`)}</p>`;
    const shelved = ctx.open.works.find((x) => x !== w && !x.translator && x.title.orig === w.title.orig);
    const ol = w.orig_lang ? langName(w.orig_lang, lang) : '';
    const ot = `<span lang="${esc(tagOf(w.orig_lang || 'und'))}">${shelved ? `<a href="${workHref(lang, shelved)}">${esc(w.title.orig)}</a>` : esc(w.title.orig)}</span>`;
    if (w.title.orig && w.title.orig !== titles(w, lang).orig) html = `<p class="meta orig-title">${T('Original title: ', '原题：')}${ot}${ol ? T(` (${esc(ol)})`, `（${esc(ol)}）`) : ''}</p>` + html;
  }
  return html;
}

function creditLabel(w, lang, m) {
  const T = m.T;
  const cs = [m.paired, m.solo].filter(Boolean);
  if (!cs.length) return '';
  const by = (c) => (c.cov.by && c.cov.by !== 'Claude' ? c.cov.by : 'Claude');
  const L = (c) => (c.cov.label ? c.cov.label[lang] || c.cov.label.en || '' : '');
  const zh = cs.find((c) => c.lang === 'zh'), en = cs.find((c) => c.lang === 'en');
  const classical = isClassical(w);
  if (lang === 'zh') {
    const parts = [];
    if (zh) parts.push(zh.cov.full ? (classical ? `白话：${by(zh)} 译` : `${by(zh)} 译`) : `中文：${by(zh)} 节译${L(zh) ? ' · ' + esc(L(zh)) : ''}`);
    if (en) parts.push(zh ? `英译：${by(en)}` : `英译：${by(en)}`);
    return parts.join(sep);
  }
  const parts = [];
  if (en) parts.push(`Translated by ${by(en)}`);
  if (zh) parts.push(zh.cov.full ? `${classical ? 'Modern Chinese' : 'Chinese'} translation by ${by(zh)}` : `Chinese: partial translation by ${by(zh)}${L(zh) ? ' · ' + esc(L(zh)) : ''}`);
  if (en && zh && zh.cov.full && by(en) === by(zh)) return `Translated by ${by(en)} into English and ${classical ? 'modern ' : ''}Chinese`;
  return parts.join(sep);
}

function factsLine(w, lang, m, stacks) {
  const T = m.T;
  const parts = [];
  const period = periodOf(w, lang);
  if (period) parts.push(esc(period));
  const yl = yearLabel(w, lang);
  parts.push(yl.length <= 18 ? `<span class="nw">${esc(yl)}</span>` : esc(yl));
  parts.push(m.cjk ? `<span class="nw tabular">${T(NUM(w.size.han, lang) + ' characters', NUM(w.size.han, lang) + ' 字')}</span>` : `<span class="nw tabular">${T(NUM(w.size.words, lang) + ' words', NUM(w.size.words, lang) + ' 词')}</span>`);
  parts.push(`<span class="nw tabular">${T(w.size.minutes + ' min', w.size.minutes + ' 分钟')}</span>`);
  const cr = creditLabel(w, lang, m);
  if (cr) parts.push(cr.length <= 28 && !cr.includes('<') ? `<span class="nw">${cr}</span>` : cr);
  const n = pickNo(stacks, w);
  if (n) parts.push(`<a class="brass nw" href="${href(lang, 'open-stacks/claude')}">${T(`Claude’s shelf No. ${n}`, `Claude 的书架 第 ${n} 号`)}</a>`);
  return `<p class="meta facts">${parts.join(sep)}</p>`;
}

function idLine(w, lang, m) {
  const T = m.T;
  const s = w.house ? null : shelfOf(w.shelf);
  const sid = `<a class="id" href="/s/${w.id.slice(2)}" title="${T('Short link · cite this', '短链接 · 引用这一页')}"><span class="vh">${T('Catalogue number ', '馆藏号 ')}</span>${esc(w.id)}</a>`;
  const where = w.house ? `<span>${T('House paper', '馆内文献')}</span>` : `<a href="${shelfHref(lang, w.shelf)}">${T(s.en, s.zh)}</a>`;
  return `<p class="idline meta">${sid}${sep}${where}</p>`;
}

// ---------------------------------------------------------------- toolbar
function toolbar(w, lang, m, r, { fixed, long }) {
  const T = m.T;
  const radio = (name, id, value, label, checked, extra = '') => `<input type="radio" name="${name}" id="${id}" value="${value}"${checked ? ' checked' : ''}${extra}><label for="${id}">${label}</label>`;
  const groups = [];
  if (m.paired || m.solo) {
    const ns = (c) => (c && !c.cov.full ? ' data-nostore' : '');
    const views = [radio('view', 'v-orig', 'orig', T('Original', '原文'), m.view === 'orig')];
    if (m.paired) {
      views.push(radio('view', 'v-par', 'par', T('Side by side', '对照'), m.view === 'par', ns(m.paired)));
      views.push(radio('view', 'v-tr', 'tr', m.label(m.paired), m.view === 'tr', ns(m.paired)));
    }
    if (m.solo) views.push(radio('view', 'v-tr2', 'tr2', m.label(m.solo), m.view === 'tr2', ns(m.solo)));
    groups.push(`<div class="seg view" role="radiogroup" aria-label="${T('View', '视图')}">${views.join('')}</div>`);
  }
  if (r.hasHans) {
    const hans = lang === 'zh';
    groups.push(`<div class="seg script" role="radiogroup" aria-label="${T('Script', '字形')}">${radio('script', 's-hant', 'hant', `<span lang="zh-Hant" aria-hidden="true">繁</span><span class="vh">${T('Traditional characters', '繁体')}</span>`, !hans)}${radio('script', 's-hans', 'hans', `<span lang="zh-Hans" aria-hidden="true">简</span><span class="vh">${T('Simplified characters', '简体')}</span>`, hans)}</div>`);
  }
  const sizes = [['s', T('Smaller', '小')], ['m', T('Default size', '中')], ['l', T('Larger', '大')]];
  const sz = sizes.map(([k, name]) => radio('rs', 'rs-' + k, k, `<span class="sz sz-${k}" aria-hidden="true">${lang === 'zh' ? name : k.toUpperCase()}</span><span class="vh">${name}</span>`, k === 'm')).join('');
  const wrap = fixed ? `<label class="wrapt"><input type="checkbox" id="wrap-lines">${T('Wrap lines', '自动换行')}</label>` : '';
  groups.push(`<div class="aa"><input type="checkbox" id="aa-open" class="vh aa-cb"><label class="aa-btn" for="aa-open"><span class="vh">${T('Text size', '字号')} </span><span aria-hidden="true">Aa</span></label><div class="aa-pop"><div class="seg sizes" role="radiogroup" aria-label="${T('Text size', '字号')}">${sz}</div>${wrap}</div></div>`);
  const head = long ? `<div class="sheet-head"><p class="sheet-title">${T('Reading options', '阅读设置')}</p><label class="close" for="sheet-tools">${T('Close', '关闭')}</label></div>` : '';
  return `<div class="toolbar" id="tools" role="group" aria-label="${T('Reading options', '阅读设置')}">${head}${groups.join('')}</div>\n<script src="/assets/js/view-init.js"></script>`;
}

// ---------------------------------------------------------------- end matter
function curatorNote(w, lang, m, stacks) {
  const T = m.T;
  const note = w.note && (w.note[lang] || w.note.en);
  if (!note) return '';
  const vocab = stacks.tags && Object.keys(stacks.tags).length ? stacks.tags : null;
  const tags = (w.tags || []).map((tag) => {
    const e = vocab ? vocab[tag] : null;
    if (vocab && !e) return null;
    const label = e ? e[lang] || (lang === 'en' ? e.en : null) : lang === 'en' ? tag.replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase()) : null;
    return label ? `<a href="${href(lang, 'open-stacks/search')}?tag=${encodeURIComponent(tag)}">${esc(label)}</a>` : null;
  }).filter(Boolean);
  return `<section class="em-note" aria-labelledby="h-note">
  <h2 class="meta" id="h-note">${T('Curator’s note · Claude (an AI), Librarian No. 2', '馆员注 · Claude（AI），二号馆员')}</h2>
  <p class="note-body">${esc(note)}</p>
  ${tags.length ? `<p class="meta tags"><span class="vh">${T('Tags: ', '标签：')}</span>${tags.join(sep)}</p>` : ''}
</section>`;
}

function pickBlock(w, lang, m, stacks) {
  const T = m.T;
  const n = pickNo(stacks, w);
  if (!w.pick || !n) return '';
  return `<section class="em-pick" aria-labelledby="h-pick">
  <h2 class="meta brass" id="h-pick">${T(`Claude’s shelf, No. ${n}`, `Claude 的书架 · 第 ${n} 号`)}</h2>
  <p class="note-body">${esc(w.pick[lang] || w.pick.en)}</p>
  <p class="meta">${go(href(lang, 'open-stacks/claude'), T('The whole shelf', '看整个书架'))}</p>
</section>`;
}

function trailLines(w, lang, m, stacks) {
  const T = m.T;
  const lines = (stacks.trails || []).filter((tr) => Array.isArray(tr.steps) && tr.steps.some((s) => s.id === w.id)).slice(0, 2).map((tr) => {
    const steps = tr.steps.filter((s) => stacks.byId.has(s.id));
    const i = steps.findIndex((s) => s.id === w.id);
    const next = steps[i + 1] ? stacks.byId.get(steps[i + 1].id) : null;
    const name = (tr.title && (tr.title[lang] || tr.title.en)) || tr.slug;
    addGlyphs(name, 'base');
    const nx = next ? (() => { const tt = titles(next, lang); return `${T('Next: ', '下一部：')}<a href="${workHref(lang, next)}">${serifTitle(tt.main, tt.mainLang)}</a>${'<span class="nw">&nbsp;→</span>'}`; })() : `<a href="${href(lang, 'open-stacks/trails/' + tr.slug)}">${T('The end of the trail', '书单到这里结束')}</a>`;
    return `<p class="meta trail">${T('On the trail ', '书单 ')}<a href="${href(lang, 'open-stacks/trails/' + tr.slug)}"><cite class="serif">${esc(name)}</cite></a>${sep}<span class="tabular">${T(`${i + 1} of ${steps.length}`, `第 ${i + 1} 部，共 ${steps.length} 部`)}</span>${sep}${nx}</p>`;
  });
  return lines.length ? `<div class="em-trails">${lines.join('')}</div>` : '';
}

function creditText(w, lang, m) {
  const T = m.T;
  const a = authorLabel(w, lang);
  const title = w.translator ? titles(w, lang).orig : w.title.orig;
  const page = w.title[lang] || w.title.en;
  const tr = m.paired && m.paired.lang === lang ? m.paired : m.solo && m.solo.lang === lang ? m.solo : null;
  const url = `${SITE}/s/${w.id.slice(2)}`;
  if (lang === 'zh') {
    return `${a.name}${w.translator ? '' : ''}《${title}》${page !== title ? `（${page}）` : ''}，${yearLabel(w, lang)}。${w.translator ? `${w.translator.name} 译。` : ''}${tr ? (tr.cov.full ? 'Claude 译。' : 'Claude 节译。') : ''}冷冻图书馆 · 开架书库，${w.id}。${url}`;
  }
  return `${a.name}, ${title}${page !== title ? ` (${page})` : ''}, ${yearLabel(w, lang)}.${w.translator ? ` Translated by ${w.translator.name}${w.translator.year ? ', ' + w.translator.year : ''}.` : ''}${tr ? (tr.cov.full ? ' Translated by Claude.' : ' Partly translated by Claude.') : ''} Cold Library, Open Stacks, ${w.id}. ${url}`;
}

function colophon(w, lang, m, r) {
  const T = m.T;
  const rt = w.rights || {};
  const rows = [];
  // Rights
  const rr = [`<p>${esc((rt.basis && (rt.basis[lang] || rt.basis.en)) || '')}</p>`];
  if (rt.license) rr.push(`<p>${rt.license_url ? `<a href="${esc(rt.license_url)}">${esc(rt.license)}</a>` : esc(rt.license)}</p>`);
  const ch = rt.checked;
  if (ch && Array.isArray(ch.where) && ch.where.length) {
    const names = ch.where.map((c) => (PLACES[c] ? PLACES[c][lang === 'zh' ? 1 : 0] : c));
    rr.push(`<p>${T(`Checked for ${listJoin(names, 'en')}${ch.date ? ' as of ' + fmtDate(ch.date, 'en') : ''}.`, `已按${listJoin(names, 'zh')}的规则核对${ch.date ? `（截至 ${fmtDate(ch.date, 'zh')}）` : ''}。`)}</p>`);
  }
  if (rt.verbatim_only) rr.push(`<p>${r.anyTr ? T('The original is shared word for word, as its licence asks.', '原文按许可要求逐字收录。') : T('Shared word for word, as its licence asks; no translation.', '按许可要求逐字收录，不做翻译。')}</p>`);
  rr.push(`<p class="meta">${T('Guidance, not legal advice.', '仅供参考，不是法律意见。')}</p>`);
  rows.push([T('Rights', '权利'), rr.join('')]);
  // Source
  const s = w.source || {};
  rows.push([T('Source', '来源'), `<p>${s.url ? `<a class="src" href="${esc(s.url)}">${esc(s.name || s.url)}</a>` : esc(s.name || '')}${s.retrieved ? `${sep}<span class="nw">${T('retrieved ', '取得于 ')}${fmtDate(s.retrieved, lang)}</span>` : ''}</p>`]);
  // Translation
  const tl = [];
  if (w.translator) tl.push(`<p>${esc(w.translator.name)}${w.translator.dates ? ` <span class="tabular">(${esc(w.translator.dates)})</span>` : ''}${w.translator.year ? T(`, ${w.translator.year}`, `，${w.translator.year} 年`) : ''}</p>`);
  for (const c of [m.paired, m.solo].filter(Boolean)) {
    const into = c.lang === 'en' ? T('English', '英文') : isClassical(w) ? T('Modern Chinese', '白话') : T('Chinese', '中文');
    const by = c.cov.by && c.cov.by !== 'Claude' ? esc(c.cov.by) : T('Claude (an AI), 2026 · CC0 1.0', 'Claude（AI），2026 · CC0 1.0');
    const lab = c.cov.label ? c.cov.label[lang] || c.cov.label.en : '';
    tl.push(`<p>${into}${T(': ', '：')}${by}${c.cov.full ? '' : T(` · partial${lab ? ': ' + esc(lab) : ''}`, ` · 节译${lab ? '：' + esc(lab) : ''}`)}</p>`);
  }
  if (!tl.length) tl.push(`<p>${rt.verbatim_only ? T('None: the licence allows no changes.', '无：许可不允许改动。') : T('No translation yet.', '暂无译文。')}</p>`);
  rows.push([T('Translation', '译文'), tl.join('')]);
  // Catalogue no.
  rows.push([T('Catalogue no.', '馆藏号'), `<p><span class="id">${esc(w.id)}</span>${sep}<a class="id" href="/s/${w.id.slice(2)}">coldlibrary.com/s/${w.id.slice(2)}</a></p>`]);
  // Cite and keep
  const txt = `${lang === 'zh' ? '/zh' : ''}/open-stacks/${w.slug}.txt`;
  rows.push([T('Cite and keep', '引用与保存'), `<p class="keep-row"><button class="btn small secondary needs-js" type="button" data-credit="${esc(creditText(w, lang, m))}">${T('Copy credit line', '复制引用')}</button><span class="copy-status" aria-live="polite"></span><a href="${txt}" type="text/plain">${T(`Plain text (.txt, ${plainSize(w, lang)})`, `纯文本（.txt，${plainSize(w, lang)}）`)}</a><button class="linkish needs-js" type="button" data-print>${T('Print', '打印')}</button></p>`]);
  const dl = (rs) => `<dl class="tomb">${rs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  // Full record
  const a = authorLabel(w, lang);
  const FORMS = { verse: ['Verse', '诗'], prose: ['Prose', '散文'], aphorisms: ['Aphorisms', '箴言'], code: ['Code and its documentation', '代码与文档'], monospace: ['Fixed-width document', '定宽排版文献'] };
  const scriptNote = r.hasHans ? T('; traditional characters, with a simplified copy converted by OpenCC', '；繁体原文，简体本由 OpenCC 转换') : '';
  const full = [
    [T('Title', '题名'), `<span lang="${esc(tagOf(w.translator ? w.orig_lang || 'und' : w.lang))}">${esc(w.title.orig)}</span>${w.title.en && w.title.en !== w.title.orig ? `${sep}<span lang="en">${esc(w.title.en)}</span>` : ''}${w.title.zh && w.title.zh !== w.title.orig ? `${sep}<span lang="zh-CN">${esc(w.title.zh)}</span>` : ''}`],
    [T('Author', '作者'), `${esc(a.name)}${a.orig ? ` <span lang="${esc(tagOf(w.orig_lang || w.lang))}">${esc(a.orig)}</span>` : ''}${a.dates ? ` <span class="tabular">(${esc(a.dates)})</span>` : ''}`],
    [T('Date', '年代'), [periodOf(w, lang), yearLabel(w, lang)].filter(Boolean).map(esc).join(sep)],
    [T('Form', '体裁'), esc((FORMS[w.form] || [w.form, w.form])[lang === 'zh' ? 1 : 0]) + (w.style === 'essay' ? T(' · essay', ' · 随笔') : '')],
    [T('Language', '语种'), esc(w.lang.startsWith('lzh') ? T('Classical Chinese', '文言文') : w.lang.startsWith('zh') ? T('Modern Chinese', '现代汉语') : langName(w.lang, lang)) + scriptNote],
  ];
  if (w.translator && w.orig_lang) full.push([T('Original language', '原文语种'), esc(langName(w.orig_lang, lang))]);
  if (w.edition) full.push([T('Edition', '版本'), esc(w.edition[lang] || w.edition.en || '')]);
  full.push([T('This copy', '本副本'), `<p>${T('No added rights. Notes and translations by Claude are CC0 1.0.', '本馆不附加任何权利。Claude 的注释和译文以 CC0 1.0 发布。')}</p>${rt.notice ? `<p class="notice" lang="en">${esc(rt.notice)}</p>` : ''}`]);
  return `<section class="em-colophon" aria-labelledby="h-col">
  <h2 class="meta" id="h-col">${T('Colophon', '版本记')}</h2>
  ${dl(rows)}
  <details class="full-record"><summary>${T('Full record', '完整著录')}</summary>${dl(full)}</details>
  <p class="meta fix">${T('Spot a mistake?', '发现错误？')} <a href="${ISSUE(w.id)}">${T('Tell us with the catalogue number', '带上馆藏号告诉我们')}<span class="nw">&nbsp;→</span></a></p>
</section>`;
}

function relatedShelf(w, lang, m, stacks) {
  const T = m.T;
  const list = related(w, stacks, m.short ? 4 : 8);
  if (!list.length) return '';
  const a = authorLabel(w, lang);
  const sameAuthor = list.every((x) => x.author.en === w.author.en);
  const h = (w.pairs || []).length ? T('Claude pairs this with', 'Claude 把它和这几部放在一起') : sameAuthor ? T(`More by ${a.name}`, `${a.name}的其他作品`) : T('Nearby on the shelf', '架上相邻');
  return `<section class="em-related" aria-labelledby="h-rel">
  <h2 id="h-rel">${glue(h)}</h2>
  <div class="sideways${m.short ? ' four' : ''}">${list.map((x) => wcard(lang, x, stacks)).join('')}</div>
</section>`;
}

function neighbours(w, lang, m, stacks) {
  const T = m.T;
  const shelf = stacks.works.filter((x) => x.shelf === w.shelf);
  const i = shelf.indexOf(w);
  const prev = shelf[i - 1], next = shelf[i + 1];
  if (!prev && !next) return '';
  const a = (x, rel, label) => { const tt = titles(x, lang); return `<a class="nb ${rel}" rel="${rel}" href="${workHref(lang, x)}"><span class="meta">${label}</span>${serifTitle(tt.main, tt.mainLang)}</a>`; };
  return `<nav class="neigh" aria-label="${T('On this shelf', '同一书架')}">${prev ? a(prev, 'prev', T('‹ Previous', '‹ 上一部')) : '<span></span>'}${next ? a(next, 'next', T('Next ›', '下一部 ›')) : ''}</nav>`;
}

const bridge = (lang) => `<p class="meta bridge">${t(lang)('People have always left words for later.', '人们一直在给后来的人留话。')} ${go(href(lang, 'accession'), t(lang)('Leave yours at the Front Desk', '去前台留下你的'))}</p>`;

function plateFigure(w, lang, m, stacks) {
  const p = w.plate ? stacks.plateById.get(w.plate) : null;
  if (!p) return '';
  return `<figure class="wplate wide"><div class="mat">${plateImg(p, { large: true, lang, sizes: '(min-width: 1200px) 939px, (min-width: 900px) 75vw, 100vw' })}</div><figcaption>${plateCaption(lang, p)}${sep}${go(plateHref(lang, p), m.T('On the plate page', '去图版页'))}</figcaption></figure>`;
}

// ---------------------------------------------------------------- rail, reading bar, sheets (W-long)
function progressNoun(toc, lang) {
  const heads = toc.map((x) => x.text);
  const share = (re) => heads.filter((h) => re.test(h)).length >= heads.length * 0.7;
  if (lang === 'zh') {
    if (share(/^第.+章/)) return ['章', '章'];
    if (share(/^卷/)) return ['卷', '卷'];
    if (share(/^第.+(部分|讲|故事)/)) return ['部分', '部分'];
    return ['节', '节'];
  }
  for (const [re, n] of [[/\bstor(y|ies)\b/i, 'Story'], [/^book\b/i, 'Book'], [/^part\b/i, 'Part'], [/^chapter\b/i, 'Chapter'], [/^lecture\b/i, 'Lecture']]) if (share(re)) return [n, n];
  return ['Section', 'Section'];
}

function rail(w, lang, m, r) {
  const T = m.T;
  const s = w.house ? null : shelfOf(w.shelf);
  const back = w.house ? `<a class="back" href="${href(lang, 'about')}">← ${T('About the library', '关于这座馆')}</a>` : `<a class="back" href="${shelfHref(lang, w.shelf)}">← ${T(s.en, s.zh)}</a>`;
  const hasToc = r.toc.length >= 3;
  const nums = (i) => `<span class="n">${i + 1}</span>`;
  const mark = lang === 'zh' ? '译' : 'zh';
  const showMark = r.partial;
  const entry = (x, i) => {
    const o = r.hasHans && x.hans ? `<span class="o o-hant keep">${esc(x.text)}</span><span class="o o-hans keep" lang="zh-Hans">${esc(x.hans)}</span>` : `<span class="o${x.tr ? '' : ' keep'}">${esc(x.text)}</span>`;
    const tr = x.tr ? `<span class="tr" lang="${esc(r.pTag)}">${esc(x.tr)}</span>` : '';
    return `<li><a href="#${x.id}" data-min="${x.min.toFixed(1)}">${nums(i)}<span class="t">${o}${tr}${showMark && x.translated ? `<span class="trmark" title="${T('Translated', '有译文')}">${mark}</span>` : ''}</span></a></li>`;
  };
  const toc = hasToc ? `<nav class="toc" id="toc" aria-labelledby="toc-h"><div class="sheet-head"><h2 class="meta" id="toc-h">${T('Contents', '目录')}</h2><label class="close" for="sheet-toc">${T('Close', '关闭')}</label></div><ol>${r.toc.map(entry).join('')}</ol></nav>` : '';
  let prog = '';
  if (w.size.minutes >= 5) {
    const [noun] = progressNoun(r.toc, lang);
    const total = Math.round(r.totalMin);
    const first = hasToc ? T(`${noun} 1 of ${r.toc.length}`, `第 1 ${noun}，共 ${r.toc.length} ${noun}`) : '';
    prog = `<p class="progress meta" data-progress data-noun="${esc(noun)}" data-count="${hasToc ? r.toc.length : 0}"><span data-where>${first}</span>${first ? sep : ''}<span data-left class="tabular">${T(`${total} min left`, `还剩 ${total} 分钟`)}</span></p>`;
  }
  return { html: `<aside class="rail c-rail" aria-label="${T('Contents and progress', '目录与进度')}">${back}${toc}${prog}</aside>`, hasToc, prog: !!prog };
}

function readingBar(w, lang, m, tt, hasToc) {
  const T = m.T;
  const s = w.house ? null : shelfOf(w.shelf);
  const back = w.house ? `<a class="rb-back" href="${href(lang, 'about')}">←<span class="vh"> ${T('About the library', '关于这座馆')}</span></a>` : `<a class="rb-back" href="${shelfHref(lang, w.shelf)}">← <span class="rb-shelf">${T(s.en, s.zh)}</span></a>`;
  return `<div class="rbar" aria-label="${T('Reading bar', '阅读栏')}" role="navigation">${back}<span class="rb-title serif" aria-hidden="true">${esc(tt)}</span>${hasToc ? `<label class="rb-btn" for="sheet-toc">${T('Contents', '目录')}</label>` : ''}<label class="rb-btn" for="sheet-tools"><span class="vh">${T('Reading options', '阅读设置')} </span><span aria-hidden="true">Aa</span></label><span class="pbar" aria-hidden="true"></span></div>`;
}

// ---------------------------------------------------------------- the page
const budget = { over: [], max: [], verse: { line: [], half: [], stanza: [], mixed: [] }, warned: new Set(), rendered: 0, total: 0, flags: [] };

function renderWork(w, lang, ctx) {
  const stacks = ctx.open;
  const m = model(w, lang);
  const T = m.T;
  const fixed = isFixedWidth(w);
  const long = !m.short;
  const tagT = (l) => (l === 'zh' ? zhTag : 'en');
  const P = m.paired ? { lang: m.paired.lang, tag: tagT(m.paired.lang), text: w.trans[m.paired.lang], info: m.paired.cov } : null;
  const T2 = m.solo ? { lang: m.solo.lang, tag: tagT(m.solo.lang), text: w.trans[m.solo.lang], partial: !m.solo.cov.full } : null;
  const script = m.cjk ? 'cjk' : 'lat';
  const ko = kindOf(script, w.form, m.short, isClassical(w));
  const kt = P ? kindOf(P.lang === 'zh' ? 'cjk' : 'lat', w.form, m.short, false) : '';
  // Fiction (the prose shelf, unless marked an essay) sets English paragraphs with first-line indents.
  const essay = w.style === 'essay' || w.shelf !== 'prose';
  const parts = long && w.size.minutes >= 5 || (long && tocOf(w.text).length >= 3);
  let r = renderReading(w, { lang, cjk: m.cjk, textTag: tagOf(w.lang), aph: w.form === 'aphorisms', parts, cv: w.size.minutes >= 10, P, T2 });
  if (r.unmapped) {
    // A partial translation whose segments do not map: show it on its own, never paired.
    m.solo = m.paired; m.paired = null;
    if (m.view === 'par' || m.view === 'tr') m.view = 'orig';
    r = renderReading(w, { lang, cjk: m.cjk, textTag: tagOf(w.lang), aph: w.form === 'aphorisms', parts, cv: w.size.minutes >= 10, P: null, T2: { lang: m.solo.lang, tag: tagT(m.solo.lang), text: w.trans[m.solo.lang], partial: true } });
  }
  r.anyTr = !!(m.paired || m.solo);
  r.pTag = P ? P.tag : 'en';
  r.totalMin = r.toc.length ? r.toc.reduce((a, x) => a + x.min, 0) : minutesOf(w.text);
  if (lang === 'en' && r.warns.length && !budget.warned.has(w.id)) { budget.warned.add(w.id); for (const x of r.warns) console.warn(`[work] ${w.id}: ${x}`); }
  if (lang === 'en' && r.verseMode) budget.verse[r.verseMode].push(w.id);

  const tb = titleBlock(w, lang, m, r.hasHans);
  const head = `<header class="whead">${idLine(w, lang, m)}${tb.html}${byline(w, lang, m, ctx)}${factsLine(w, lang, m, stacks)}</header>`;
  // Partial translation into the page language: one line pointing at the translated part (rule 3).
  let note = '';
  if (m.partialNote) {
    const c = m.pageT;
    const lab = c.cov.label ? c.cov.label[lang] || c.cov.label.en : (r.toc.find((x) => x.translated) || {}).tr || '';
    if (m.paired === c) note = `<p class="meta pnote">${T(`Claude has translated ${lab ? esc(lab) : 'part of this work'} into English.`, `${lab ? esc(lab) : '其中一部分'}有 Claude 的中文译文。`)} <a href="#translated" data-view="par">${T('Read side by side', '对照阅读')}<span class="nw">&nbsp;→</span></a></p>`;
    else if (m.solo === c) note = `<p class="meta pnote">${T('Claude has translated a few passages of this work into Chinese.', 'Claude 把这部作品的几段译成了中文。')} <label class="linkish" for="v-tr2">${T('Read them', '去读译文')}<span class="nw">&nbsp;→</span></label></p>`;
  }
  const tools = toolbar(w, lang, m, r, { fixed, long });
  const plate = plateFigure(w, lang, m, stacks);
  const readCls = ['read', 'ko-' + ko, kt && 'kt-' + kt, essay ? 'ess' : 'fic', fixed && 'fixed', r.hasLayerP && 'has-p'].filter(Boolean).join(' ');
  let text = r.html;
  if (fixed) text = `<pre class="doc wide" tabindex="0">${esc(String(w.text).split('\n').filter((l) => !/\[Page \d+\]\s*$/.test(l) && !/^\f/.test(l)).join('\n'))}</pre>`;
  const read = `<div class="${readCls}" lang="${esc(tagOf(w.lang))}" id="text">${text}</div>${r.glossPrint}`;
  const endm = `<div class="endm">${curatorNote(w, lang, m, stacks)}${pickBlock(w, lang, m, stacks)}${trailLines(w, lang, m, stacks)}${colophon(w, lang, m, r)}${relatedShelf(w, lang, m, stacks)}${neighbours(w, lang, m, stacks)}${w.shelf === 'records' ? bridge(lang) : ''}</div>`;
  const before = w.shelf === 'records' ? plate : '';
  const after = w.shelf === 'records' ? '' : plate;
  const col = `<div class="wcol">${head}${tools}${note}${before}${read}${after}${endm}</div>`;
  const attrs = `class="work ${long ? 'long' : 'short'}${r.notes ? ' has-notes' : ''}" data-group="${m.group}" data-pl="${lang}" data-id="${esc(w.id)}" aria-labelledby="work-title"`;
  let html;
  if (long) {
    const ra = rail(w, lang, m, r);
    const sheets = `${ra.hasToc ? '<input type="checkbox" id="sheet-toc" class="sheet-cb" aria-hidden="true" tabindex="-1">' : ''}<input type="checkbox" id="sheet-tools" class="sheet-cb" aria-hidden="true" tabindex="-1">`;
    const scrims = `${ra.hasToc ? `<label class="scrim" for="sheet-toc"><span class="vh">${T('Close', '关闭')}</span></label>` : ''}<label class="scrim" for="sheet-tools"><span class="vh">${T('Close', '关闭')}</span></label>`;
    html = `<article ${attrs}>${sheets}${readingBar(w, lang, m, tb.main, ra.hasToc)}${ra.prog ? '<span class="ptop" aria-hidden="true"></span>' : ''}<div class="wrap grid wgrid">${ra.html}${col}</div>${scrims}</article>`;
  } else html = `<article ${attrs}><div class="wrap grid wgrid">${col}</div></article>`;
  checkBudget(w, lang, html, stacks);
  return html;
}

function checkBudget(w, lang, html, stacks) {
  const kb = gzipSync(html).length / 1024;
  const longest = budget.longestId || (budget.longestId = stacks.works.reduce((a, b) => (b.size.words + b.size.han > a.size.words + a.size.han ? b : a)).id);
  const cap = w.id === longest ? 120 : 60;
  if (kb > cap) { budget.over.push(`${w.id} ${lang} ${kb.toFixed(1)} KB gz (budget ${cap})`); console.warn(`[work] ${w.id} ${lang}: page body ${kb.toFixed(1)} KB gz, over the ${cap} KB budget`); }
  budget.max.push([kb, w.id + ' ' + lang]);
  budget.rendered++;
  if (budget.rendered === budget.total) {
    const v = budget.verse;
    const top = budget.max.sort((a, b) => b[0] - a[0]).slice(0, 3).map(([k, id]) => `${id} ${k.toFixed(1)} KB`).join(', ');
    console.log(`[work] verse pairing: ${v.line.length} line to line, ${v.half.length} by half-lines, ${v.mixed.length} mixed, ${v.stanza.length} by stanza · largest page bodies (gz): ${top}${budget.over.length ? ` · ${budget.over.length} over budget` : ' · all within budget'}`);
  }
}

// ---------------------------------------------------------------- house papers (S-000001 …)
function renderPaper(p, lang, ctx) {
  const T = t(lang);
  const doc = p[lang] || p.en;
  const zh = lang === 'zh' && p.zh && p.zh !== p.en;
  const body = String(doc.body || '');
  const size = (() => { const han = (body.match(/[㐀-鿿豈-﫿]/g) || []).length; const words = body.replace(/[㐀-鿿豈-﫿]/g, ' ').split(/\s+/).filter((x) => /[A-Za-z0-9]/.test(x)).length; return { han, words, minutes: Math.max(1, Math.round(han / 400 + words / 230)) }; })();
  const wl = { id: p.id, slug: p.slug, house: true, shelf: null, form: 'prose', style: 'essay', lang: zh ? 'zh-Hans' : 'en', text: body, textHans: null, trans: {}, translations: {}, size };
  const long = size.minutes >= 3 || tocOf(body).length >= 3;
  const m = { T, short: !long, cjk: !!zh };
  const r = renderReading(wl, { lang, cjk: !!zh, textTag: wl.lang, parts: long, cv: false, P: null, T2: null });
  r.pTag = 'en';
  r.totalMin = minutesOf(body);
  const title = doc.title || p.en.title;
  addGlyphs(title, 'base');
  const h1 = `<h1 class="wtitle" id="work-title"><span class="serif">${glue(title)}</span></h1>`;
  const facts = `<p class="meta facts">${[`<span class="nw">${esc(doc.date || '')}</span>`, zh ? `<span class="nw tabular">${T(NUM(size.han, lang) + ' characters', NUM(size.han, lang) + ' 字')}</span>` : `<span class="nw tabular">${T(NUM(size.words, lang) + ' words', NUM(size.words, lang) + ' 词')}</span>`, `<span class="nw tabular">${T(size.minutes + ' min', size.minutes + ' 分钟')}</span>`].join(sep)}</p>`;
  const head = `<header class="whead">${idLine(wl, lang, m)}${h1}<p class="byline">${esc(doc.author || '')}</p>${facts}</header>`;
  const sizes = [['s', T('Smaller', '小')], ['m', T('Default size', '中')], ['l', T('Larger', '大')]];
  const radio = (k, name) => `<input type="radio" name="rs" id="rs-${k}" value="${k}"${k === 'm' ? ' checked' : ''}><label for="rs-${k}"><span class="sz sz-${k}" aria-hidden="true">${lang === 'zh' ? name : k.toUpperCase()}</span><span class="vh">${name}</span></label>`;
  const sheetHead = long ? `<div class="sheet-head"><p class="sheet-title">${T('Reading options', '阅读设置')}</p><label class="close" for="sheet-tools">${T('Close', '关闭')}</label></div>` : '';
  const tools = `<div class="toolbar" id="tools" role="group" aria-label="${T('Reading options', '阅读设置')}">${sheetHead}<div class="aa"><input type="checkbox" id="aa-open" class="vh aa-cb"><label class="aa-btn" for="aa-open"><span class="vh">${T('Text size', '字号')} </span><span aria-hidden="true">Aa</span></label><div class="aa-pop"><div class="seg sizes" role="radiogroup" aria-label="${T('Text size', '字号')}">${sizes.map(([k, n]) => radio(k, n)).join('')}</div></div></div></div>\n<script src="/assets/js/view-init.js"></script>`;
  const read = `<div class="read ${zh ? 'ko-p-zh' : 'ko-p-lat'} ess" lang="${zh ? 'zh-Hans' : 'en'}" id="text">${r.html}</div>`;
  const rows = [
    [T('Rights', '权利'), `<p>${T('Written by Librarian No. 1 for this library.', '由一号馆员为本馆撰写。')}</p>`],
    [T('Source', '来源'), `<p><a class="src" href="${REPO}/tree/main/catalog/open-stacks">${T('Cold Library, catalog/open-stacks', '冷冻图书馆 catalog/open-stacks')}</a>${sep}<span class="nw">${esc(doc.date || '')}</span></p>`],
    [T('Catalogue no.', '馆藏号'), `<p><span class="id">${esc(p.id)}</span>${sep}<a class="id" href="/s/${p.id.slice(2)}">coldlibrary.com/s/${p.id.slice(2)}</a></p>`],
    [T('Cite and keep', '引用与保存'), `<p class="keep-row"><button class="btn small secondary needs-js" type="button" data-credit="${esc(lang === 'zh' ? `${doc.author}《${title}》，${doc.date}。冷冻图书馆 · 馆内文献，${p.id}。${SITE}/s/${p.id.slice(2)}` : `${doc.author}, ${title}, ${doc.date}. Cold Library, house paper ${p.id}. ${SITE}/s/${p.id.slice(2)}`)}">${T('Copy credit line', '复制引用')}</button><span class="copy-status" aria-live="polite"></span><a href="${lang === 'zh' ? '/zh' : ''}/open-stacks/${p.slug}.txt" type="text/plain">${T(`Plain text (.txt, ${plainSize(p, lang)})`, `纯文本（.txt，${plainSize(p, lang)}）`)}</a><button class="linkish needs-js" type="button" data-print>${T('Print', '打印')}</button></p>`],
  ];
  const full = [
    [T('Title', '题名'), `<span lang="en">${esc(p.en.title)}</span>${p.zh && p.zh.title !== p.en.title ? `${sep}<span lang="zh-CN">${esc(p.zh.title)}</span>` : ''}`],
    [T('Author', '作者'), esc(doc.author || '')],
    [T('Date', '年代'), esc(doc.date || '')],
    [T('Form', '体裁'), T('Essay', '随笔')],
    [T('Language', '语种'), T('English and Chinese, each written for this library', '中文和英文两个版本，都为本馆而写')],
  ];
  const dl = (rs) => `<dl class="tomb">${rs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
  const colo = `<section class="em-colophon" aria-labelledby="h-col"><h2 class="meta" id="h-col">${T('Colophon', '版本记')}</h2>${dl(rows)}<details class="full-record"><summary>${T('Full record', '完整著录')}</summary>${dl(full)}</details><p class="meta fix">${T('Spot a mistake?', '发现错误？')} <a href="${ISSUE(p.id)}">${T('Tell us with the catalogue number', '带上馆藏号告诉我们')}<span class="nw">&nbsp;→</span></a></p></section>`;
  const endm = `<div class="endm">${colo}${bridge(lang)}</div>`;
  const col = `<div class="wcol">${head}${tools}<div class="read-wrap">${read}</div>${endm}</div>`;
  const attrs = `class="work house ${long ? 'long' : 'short'}" data-group="${zh ? 'zh' : 'en'}" data-pl="${lang}" data-id="${esc(p.id)}" aria-labelledby="work-title"`;
  if (!long) return `<article ${attrs}><div class="wrap grid wgrid">${col}</div></article>`;
  const ra = rail(wl, lang, m, r);
  const sheets = `${ra.hasToc ? '<input type="checkbox" id="sheet-toc" class="sheet-cb" aria-hidden="true" tabindex="-1">' : ''}<input type="checkbox" id="sheet-tools" class="sheet-cb" aria-hidden="true" tabindex="-1">`;
  const scrims = `${ra.hasToc ? `<label class="scrim" for="sheet-toc"><span class="vh">${T('Close', '关闭')}</span></label>` : ''}<label class="scrim" for="sheet-tools"><span class="vh">${T('Close', '关闭')}</span></label>`;
  return `<article ${attrs}>${sheets}${readingBar(wl, lang, m, title, ra.hasToc)}<div class="wrap grid wgrid">${ra.html}${col}</div>${scrims}</article>`;
}

// ---------------------------------------------------------------- page objects
export function workPages(ctx) {
  const stacks = ctx.open;
  const papers = stacks.papers || [];
  budget.total = (stacks.works.length) * 2;
  const taken = new Set(stacks.works.map((w) => w.slug));
  const pages = stacks.works.map((w) => ({
    slug: 'open-stacks/' + w.slug,
    title: (lang) => { const tt = titles(w, lang); return tt.sub ? `${tt.main} · ${tt.sub}` : tt.main; },
    description: (lang) => String((w.note && (w.note[lang] || w.note.en)) || '').slice(0, 160),
    fontKey: w.id,
    bodyClass: () => 'stacks work-page' + (isShort(w) ? '' : ' reading'),
    scripts: ['reading'],
    render: (lang, c) => renderWork(w, lang, c),
  }));
  for (const p of papers) {
    if (!p.id || !p.slug) continue;
    if (taken.has(p.slug)) { console.warn(`[work] house paper ${p.id}: slug "${p.slug}" is already a work; skipped`); continue; }
    const words = String(p.en.body || '').split(/\s+/).filter(Boolean).length;
    const long = words / 230 >= 3 || tocOf(p.en.body).length >= 3;
    pages.push({
      slug: 'open-stacks/' + p.slug,
      title: (lang) => (p[lang] || p.en).title,
      description: (lang) => String((p[lang] || p.en).body || '').replace(/[#>*]/g, '').trim().split(/\n{2,}/)[0].slice(0, 160),
      fontKey: p.id,
      bodyClass: () => 'stacks work-page house-paper' + (long ? ' reading' : ''),
      scripts: ['reading'],
      render: (lang, c) => renderPaper(p, lang, c),
    });
  }
  return pages;
}
