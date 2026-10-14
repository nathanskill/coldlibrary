// The work page (reading view) for every work in the Open Stacks, and the house papers (spec §5.3).
// workPages(ctx) returns page objects (see the contract at the top of site/build.mjs).
//
// Two frames: W-short (under 3 minutes and fewer than 3 ## headings) is an 8/4 page with a margin for notes;
// W-long adds, at lg, a rail with contents and progress (text in columns 3–9, margin 10–12), and below lg a
// reading bar with CSS-only bottom sheets. One toolbar row (view · script · Aa) sits before the text; the checked
// radio is the only view state (40-reading.css), and view-init.js restores a stored choice before the text is parsed.
import { gzipSync } from 'node:zlib';
import { esc, t, href, glue, go, sep as SEP0, addGlyphs, tagOf, describe, REPO, SITE, FOUNDED } from '../lib.mjs';
import { wcard, serifTitle, plateImg, plateCaption } from '../components.mjs';
import { titles, authorLabel, yearLabel, periodOf, related, workHref, plateHref, shelfHref, shortWork, shelfOf, pickNo, isClassical, translationInto, measure, toc as tocOf } from '../stacks.mjs';
import { txtHref, rightsSentence } from '../outputs.mjs';
import { scoreStrip, lampBlock } from '../rate/ui.mjs';
import { renderReading, minutesOf, hanRuns } from './reading.mjs';
import { txtSizeLabel, paperSizeLabel } from './reading-txt.mjs';

// A separator dot with a line-break opportunity after it, so meta lines wrap at their joints.
const sep = SEP0 + '<wbr>';
const ARR = '<span class="nw">&nbsp;→</span>';
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
  it: ['Italian', '意大利语'], es: ['Spanish', '西班牙语'], nl: ['Dutch', '荷兰语'], pi: ['Pali', '巴利语'], pra: ['Prakrit', '普拉克里特语'],
  sa: ['Sanskrit', '梵语'], ja: ['Japanese', '日语'], ar: ['Arabic', '阿拉伯语'], fa: ['Persian', '波斯语'], he: ['Hebrew', '希伯来语'],
};
function langName(code, lang) {
  const base = String(code || '').split('-')[0];
  if (LANG_NAMES[base]) return LANG_NAMES[base][lang === 'zh' ? 1 : 0];
  try { return new Intl.DisplayNames([lang === 'zh' ? 'zh-CN' : 'en'], { type: 'language' }).of(base) || code; } catch { return code; }
}
const allHan = (s) => /^[\s\p{Script=Han}·・]+$/u.test(String(s || ''));
const pageTag = (lang) => (lang === 'zh' ? 'zh-Hans' : 'en');
// Which script a run of Han characters is in, from the catalogue's own Hant/Hans pairs (text.md beside
// text.zh-Hans.md, line by line): a character only traditional texts use makes it zh-Hant, one only the
// simplified copies use makes it zh-Hans; otherwise it takes the work's own script.
let SCRIPTS = null;
function scriptSets(stacks) {
  if (SCRIPTS) return SCRIPTS;
  const hant = new Set(), hans = new Set();
  for (const w of stacks.works) {
    if (!w.textHans) continue;
    const a = w.text.split('\n'), b = w.textHans.split('\n');
    if (a.length !== b.length) continue;
    a.forEach((l, i) => { const x = [...l], y = [...b[i]]; if (x.length === y.length) x.forEach((c, k) => { if (c !== y[k]) { hant.add(c); hans.add(y[k]); } }); });
  }
  for (const c of [...hant]) if (hans.has(c)) { hant.delete(c); hans.delete(c); }
  return (SCRIPTS = { hant, hans });
}
const runTagger = (w, stacks) => {
  const fallback = /-Hant$/.test(String(w.lang)) ? 'zh-Hant' : 'zh-Hans';
  return (run) => { const S = scriptSets(stacks), cs = [...run]; return cs.some((c) => S.hant.has(c)) ? 'zh-Hant' : cs.some((c) => S.hans.has(c)) ? 'zh-Hans' : fallback; };
};
// Copy in the page language; on the English site each Han run inside it gets its own lang.
let currentTagger = null;
const prose = (s, lang, w) => (lang === 'zh' ? esc(s) : hanRuns(esc(s), currentTagger || (/-Hant$/.test(String(w.lang)) ? 'zh-Hant' : 'zh-Hans')));
// The first sentences of a note, up to about 160 characters, for the page description.

// ---------------------------------------------------------------- the reading model of one work on one page
const groupOf = (w) => (/^lzh/.test(w.lang) ? 'lzh' : /^zh/.test(w.lang) ? 'zh' : w.lang === 'en' ? 'en' : 'other');
const isShort = (w) => w.size.minutes < 3 && tocOf(w.text).length < 3;

// Translation coverage (stacks.mjs translationInto). verbatim_only works never offer one. A translation declared
// full whose length is under the stacks-check floor is treated as partial without a segment map, so a fragment is
// never presented as the whole.
function coverage(w, l) {
  if (w.rights && w.rights.verbatim_only) return null;
  const c = translationInto(w, l);
  if (!c) return null;
  if (c.full) {
    const t = measure(w.trans[l]), src = measure(w.text);
    const zhSrc = /^(lzh|zh)/.test(w.lang);
    const into = l === 'zh' ? t.han : t.words, from = zhSrc ? src.han : src.words;
    const floor = l === 'zh' ? 0.5 : zhSrc ? 0.35 : 0.5;
    if (from && into / from < floor) return { ...c, full: false, label: null, segments: [], inferred: true };
  }
  return c;
}

// Reading kinds: the size, leading and paragraph style of the original (ko-*) and the paired translation (kt-*).
function kindOf(script, form, short, classical) {
  if (form === 'verse') return (short ? 'vd-' : 'vl-') + (script === 'cjk' ? 'cjk' : 'lat');
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
  // Every translation into English or Chinese is offered; the page language's comes first. A partial one pairs
  // only through its segment map; otherwise it is shown on its own.
  const cands = [lang, other].map((l) => ({ lang: l, cov: coverage(w, l) })).filter((c) => c.cov);
  let paired = null, solo = null;
  for (const c of cands) {
    const pairable = c.cov.full || c.cov.segments.length > 0;
    if (pairable && !paired) paired = c; else if (!solo) solo = c;
  }
  const label = (c) => {
    if (!c) return '';
    if (c.lang === 'en') return lang === 'zh' ? '英译' : 'English';
    const base = isClassical(w) ? T('Modern Chinese', '白话') : lang === 'zh' ? '中文' : '<span lang="zh-Hans">中文</span>';
    return c.cov.full ? base : base + T(' (partial)', '（节译）');
  };
  // Default view (§5.3.3), the first rule that matches.
  const pageLangText = (lang === 'en' && group === 'en') || (lang === 'zh' && group === 'zh');
  const pageT = cands.find((c) => c.lang === lang) || null;
  let view = 'orig', partialNote = false;
  if (pageLangText) view = 'orig';
  else if (pageT && pageT.cov.full) view = paired === pageT ? (verse || mins < 5 ? 'par' : 'tr') : 'tr2';
  else if (pageT) { view = 'orig'; partialNote = true; }
  return { T, other, group, cjk, verse, short, mins, paired, solo, label, view, partialNote, pageT };
}

// ---------------------------------------------------------------- header block
// Hant → Hans character pairs from the text and its simplified copy (the same lines, character for character).
function scriptMap(w) {
  const m = new Map();
  if (!w.textHans) return m;
  const a = w.text.split('\n'), b = w.textHans.split('\n');
  if (a.length !== b.length) return m;
  a.forEach((l, i) => { const x = [...l], y = [...b[i]]; if (x.length === y.length) x.forEach((c, k) => { if (c !== y[k]) m.set(c, y[k]); }); });
  return m;
}
// The simplified form of the original-script title, when title.zh is exactly that (title rule 3); else null.
function hansTitleOf(w, hasHans) {
  const o = w.title.orig, z = w.title.zh;
  if (!hasHans || !z || z === o || [...z].length !== [...o].length) return null;
  const map = scriptMap(w), A = [...o], B = [...z];
  return A.every((c, i) => c === B[i] || map.get(c) === B[i] || !map.has(c)) ? z : null;
}

function titleBlock(w, lang, m, hasHans) {
  const tt = titles(w, lang);
  const textTag = tagOf(w.lang);
  const hansTitle = w.translator ? null : hansTitleOf(w, hasHans);
  const main = w.translator ? tt.orig : w.title.orig;
  let h1;
  if (hansTitle) {
    const a = [...main], b = new Set([...hansTitle]);
    addGlyphs(a.filter((c) => b.has(c)).join(''), 'base');
    addGlyphs(a.filter((c) => !b.has(c)).join(''), 'hant');
    addGlyphs([...hansTitle].filter((c) => !a.includes(c)).join(''), 'hans');
    h1 = `<span class="serif o-hant" lang="${esc(textTag)}">${glue(main)}</span><span class="serif o-hans" lang="zh-Hans">${glue(hansTitle)}</span>`;
  } else {
    addGlyphs(main, 'base');
    h1 = `<span class="serif" lang="${esc(textTag)}">${glue(main)}</span>`;
  }
  const pageTitle = w.title[lang] || w.title.en;
  const sub = pageTitle && pageTitle !== main && pageTitle !== hansTitle ? pageTitle : '';
  return { html: `<h1 class="wtitle" id="work-title">${h1}</h1>${sub ? `<p class="wsub">${glue(sub)}</p>` : ''}`, main, hansTitle, sub };
}

// The original of a historical translation, when the Open Stacks also hold it.
function shelvedOriginal(w, stacks) {
  const o = w.title.orig;
  return stacks.works.find((x) => x !== w && !x.translator && x.title.orig === o)
    || (w.pairs || []).map((id) => stacks.byId.get(id)).find((x) => x && !x.translator && String(x.title.orig).startsWith(o)) || null;
}

function byline(w, lang, m, stacks) {
  const T = m.T;
  const a = authorLabel(w, lang);
  // The original name follows the page name unless it is the same name in the other Chinese script.
  let origName = a.orig;
  if (origName && allHan(origName) && allHan(a.name) && [...origName].length === [...a.name].length) origName = '';
  const bothLatin = origName && !allHan(origName) && !/[㐀-鿿]/.test(a.name);
  const orig = origName ? ` <span lang="${esc(tagOf(w.orig_lang || w.lang))}">${bothLatin ? '(' + esc(origName) + ')' : esc(origName)}</span>` : '';
  const dates = a.dates ? `<span class="${a.dates.length <= 14 ? 'nw ' : ''}tabular">${esc(a.dates)}</span>` : '';
  let html = `<p class="byline">${esc(a.name)}${orig}${dates ? `${sep}${dates}` : ''}</p>`;
  if (w.translator) {
    const tr = w.translator;
    html += `<p class="byline tl">${T(`Translated by ${esc(tr.name)}${tr.year ? ', ' + tr.year : ''}`, `${esc(tr.name)} 译${tr.year ? '，' + tr.year + ' 年' : ''}`)}</p>`;
    if (w.title.orig && w.title.orig !== titles(w, lang).orig) {
      const shelved = shelvedOriginal(w, stacks);
      const ol = w.orig_lang ? langName(w.orig_lang, lang) : '';
      const ot = `<span lang="${esc(tagOf(w.orig_lang || 'und'))}">${shelved ? `<a href="${workHref(lang, shelved)}">${esc(w.title.orig)}</a>` : esc(w.title.orig)}</span>`;
      html = `<p class="meta orig-title">${T('Original title: ', '原题：')}${ot}${ol ? T(` (${esc(ol)})`, `（${esc(ol)}）`) : ''}</p>` + html;
    }
  }
  return html;
}

// The translation credit, once per page (the facts line).
function creditLabel(w, lang, m) {
  const T = m.T;
  const cs = [m.paired, m.solo].filter(Boolean);
  if (!cs.length) return '';
  const by = (c) => (c.cov.by && c.cov.by !== 'Claude' ? esc(c.cov.by) : 'Claude');
  const lab = (c) => (c.cov.label ? esc(c.cov.label[lang] || c.cov.label.en || '') : '');
  const classical = isClassical(w);
  const zh = cs.find((c) => c.lang === 'zh'), en = cs.find((c) => c.lang === 'en');
  const parts = [];
  if (zh && !zh.cov.full) parts.push(T(`Chinese: partial translation by ${by(zh)}${lab(zh) ? ' · ' + lab(zh) : ''}`, `${classical ? '白话' : '中文'}：${by(zh)} 节译${lab(zh) ? ' · ' + lab(zh) : ''}`));
  if (en && !en.cov.full) parts.push(T(`English: partial translation by ${by(en)}${lab(en) ? ' · ' + lab(en) : ''}`, `英译：${by(en)} 节译${lab(en) ? ' · ' + lab(en) : ''}`));
  const fz = zh && zh.cov.full ? zh : null, fe = en && en.cov.full ? en : null;
  if (fz && fe && by(fz) === by(fe)) parts.unshift(T(`Translated by ${by(fe)} into English and ${classical ? 'modern ' : ''}Chinese`, `${by(fe)} 译为${classical ? '白话' : '中文'}和英文`));
  else {
    if (fe) parts.unshift(T(`Translated by ${by(fe)}`, `${by(fe)} 英译`));
    if (fz) parts.unshift(T(`${classical ? 'Modern Chinese' : 'Chinese'} translation by ${by(fz)}`, classical ? `${by(fz)} 译为白话` : `${by(fz)} 译`));
  }
  return parts.join(sep);
}

function factsLine(w, lang, m, stacks) {
  const T = m.T;
  const parts = [];
  const period = periodOf(w, lang);
  if (period) parts.push(esc(period));
  const yl = yearLabel(w, lang);
  parts.push(yl.length <= 18 ? `<span class="nw">${esc(yl)}</span>` : esc(yl));
  parts.push(`<span class="nw tabular">${m.cjk ? T(NUM(w.size.han, lang) + ' characters', NUM(w.size.han, lang) + ' 字') : T(NUM(w.size.words, lang) + ' words', NUM(w.size.words, lang) + ' 词')}</span>`);
  parts.push(`<span class="nw tabular">${T(w.size.minutes + ' min', w.size.minutes + ' 分钟')}</span>`);
  const cr = creditLabel(w, lang, m);
  if (cr) parts.push(cr.length <= 30 && !cr.includes('<') ? `<span class="nw">${cr}</span>` : cr);
  const n = pickNo(stacks, w);
  if (n) parts.push(`<a class="brass nw" href="${href(lang, 'open-stacks/claude')}">${T(`Claude’s shelf No. ${n}`, `Claude 的书架 第 ${n} 号`)}</a>`);
  return `<p class="meta facts">${parts.join(sep)}</p>`;
}

function idLine(w, lang, T) {
  const s = w.house ? null : shelfOf(w.shelf);
  const sid = `<a class="id" href="${shortWork(w)}" title="${T('Short link · cite this', '短链接 · 引用这一页')}"><span class="vh">${T('Catalogue number ', '馆藏号 ')}</span>${esc(w.id)}</a>`;
  const where = w.house ? `<span>${T('House paper', '馆内文献')}</span>` : `<a href="${shelfHref(lang, w.shelf)}">${T(s.en, s.zh)}</a>`;
  return `<p class="idline meta">${sid}${SEP0}${where}</p>`; // a flex row (components.css): the gap spaces the dot
}

// ---------------------------------------------------------------- toolbar
const radio = (name, id, value, label, checked, extra = '') => `<input type="radio" name="${name}" id="${id}" value="${value}"${checked ? ' checked' : ''}${extra}><label for="${id}">${label}</label>`;
// Aa: a disclosure holding the S / M / L radios (and, for fixed-width documents, Wrap lines).
function sizeControl(T, lang, fixed) {
  const sizes = [['s', T('Smaller', '小')], ['m', T('Default size', '中')], ['l', T('Larger', '大')]];
  const sz = sizes.map(([k, name]) => radio('rs', 'rs-' + k, k, lang === 'zh' ? name : `<span aria-hidden="true">${k.toUpperCase()}</span><span class="vh">${name}</span>`, k === 'm')).join('');
  const wrap = fixed ? `<label class="wrapt"><input type="checkbox" id="wrap-lines">${T('Wrap lines', '自动换行')}</label>` : '';
  return `<details class="aa"><summary class="aa-btn"><span class="aa-n">${T('Text size', '字号')}</span><span class="aa-a" aria-hidden="true">Aa</span></summary><div class="aa-pop"><div class="seg sizes" role="radiogroup" aria-label="${T('Text size', '字号')}">${sz}</div>${wrap}</div></details>`;
}
function toolbar(w, lang, m, r, { fixed, long }) {
  const T = m.T;
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
  groups.push(sizeControl(T, lang, fixed));
  const head = long ? `<div class="sheet-head"><p class="sheet-title">${T('Reading options', '阅读设置')}</p><label class="close" for="sheet-tools">${T('Close', '关闭')}</label></div>` : '';
  return `<div class="toolbar" id="tools" role="group" aria-label="${T('Reading options', '阅读设置')}">${head}${groups.join('')}</div>\n<script src="/assets/js/view-init.js"></script>`;
}

// ---------------------------------------------------------------- end matter
function tagLinks(w, lang, stacks) {
  const vocab = stacks.tags && Object.keys(stacks.tags).length ? stacks.tags : null;
  return (w.tags || []).map((tag) => {
    const e = vocab ? vocab[tag] : null;
    if (vocab && !e) return null; // only the controlled vocabulary is shown
    const label = e ? e[lang] || (lang === 'en' ? e.en : null) : lang === 'en' ? tag.replace(/[-_]/g, ' ').replace(/^./, (c) => c.toUpperCase()) : null;
    return label ? `<a href="${href(lang, 'open-stacks/search')}?tag=${encodeURIComponent(tag)}">${esc(label)}</a>` : null;
  }).filter(Boolean);
}
function curatorNote(w, lang, T, stacks) {
  const note = w.note && (w.note[lang] || w.note.en);
  if (!note) return '';
  const tags = tagLinks(w, lang, stacks);
  return `<section class="em-note" aria-labelledby="h-note"><h2 class="meta" id="h-note">${T('Curator’s note · Claude (an AI), Librarian No. 2', '馆员注 · Claude（AI），二号馆员')}</h2><p class="note-body">${prose(note, lang, w)}</p>${tags.length ? `<p class="meta tags"><span class="vh">${T('Tags: ', '标签：')}</span>${tags.join(sep)}</p>` : ''}</section>`;
}

function pickBlock(w, lang, T, stacks) {
  const n = pickNo(stacks, w);
  if (!w.pick || !n) return '';
  return `<section class="em-pick" aria-labelledby="h-pick"><h2 class="meta brass" id="h-pick">${T(`Claude’s shelf, No. ${n}`, `Claude 的书架 · 第 ${n} 号`)}</h2><p class="note-body">${prose(w.pick[lang] || w.pick.en, lang, w)}</p><p class="meta">${go(href(lang, 'open-stacks/claude'), T('The whole shelf', '看整个书架'))}</p></section>`;
}

function trailLines(w, lang, T, stacks) {
  const lines = (stacks.trails || []).filter((tr) => Array.isArray(tr.steps) && tr.steps.some((s) => s.id === w.id)).slice(0, 2).map((tr) => {
    const steps = tr.steps.filter((s) => stacks.byId.has(s.id));
    const i = steps.findIndex((s) => s.id === w.id);
    const next = steps[i + 1] ? stacks.byId.get(steps[i + 1].id) : null;
    const name = (tr.title && (tr.title[lang] || tr.title.en)) || tr.slug;
    addGlyphs(name, 'base');
    const th = href(lang, 'open-stacks/trails/' + tr.slug);
    const nx = next ? (() => { const tt = titles(next, lang); return `${T('Next: ', '下一部：')}<a href="${workHref(lang, next)}">${serifTitle(tt.main, tt.mainLang)}</a>${ARR}`; })() : `<a href="${th}">${T('The end of the trail', '书单到这里结束')}</a>`;
    return `<p class="meta trail">${T('On the trail ', '书单 ')}<a href="${th}"><cite class="serif">${esc(name)}</cite></a>${sep}<span class="tabular">${T(`${i + 1} of ${steps.length}`, `第 ${i + 1} 部，共 ${steps.length} 部`)}</span>${sep}${nx}</p>`;
  });
  return lines.length ? `<div class="em-trails">${lines.join('')}</div>` : '';
}

function creditText(w, lang, m) {
  const a = authorLabel(w, lang);
  const title = w.translator ? titles(w, lang).orig : w.title.orig;
  const page = w.title[lang] || w.title.en;
  const tr = [m.paired, m.solo].find((c) => c && c.lang === lang) || null;
  const url = SITE + shortWork(w);
  if (lang === 'zh') {
    return `${a.name}《${title}》${page !== title ? `（${page}）` : ''}，${yearLabel(w, lang)}。${w.translator ? `${w.translator.name} 译。` : ''}${tr ? (tr.cov.full ? 'Claude 译。' : 'Claude 节译。') : ''}冷冻图书馆 · 开架书库，${w.id}。${url}`;
  }
  return `${a.name}, ${title}${page !== title ? ` (${page})` : ''}, ${yearLabel(w, lang)}.${w.translator ? ` Translated by ${w.translator.name}${w.translator.year ? ', ' + w.translator.year : ''}.` : ''}${tr ? (tr.cov.full ? ' Translated by Claude.' : ' Partly translated by Claude.') : ''} Cold Library, Open Stacks, ${w.id}. ${url}`;
}

const dl = (rows) => `<dl class="tomb">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`;
const keepRow = (T, credit, txt, size) => `<p class="keep-row"><button class="btn small secondary needs-js" type="button" data-credit="${esc(credit)}">${T('Copy credit line', '复制引用')}</button><span class="copy-status" aria-live="polite"></span><a href="${txt}" type="text/plain">${T(`Plain text (.txt, ${size})`, `纯文本（.txt，${size}）`)}</a><button class="linkish needs-js" type="button" data-print>${T('Print', '打印')}</button></p>`;
const fixLine = (T, id) => `<p class="meta fix">${T('Spot a mistake?', '发现错误？')} <a href="${ISSUE(id)}">${T('Tell us with the catalogue number', '带上馆藏号告诉我们')}${ARR}</a></p>`;
const claudeYear = (w) => String((/^\d{4}-\d{2}-\d{2}$/.test(w.accessioned || '') && w.accessioned) || (w.source && /^\d{4}-\d{2}-\d{2}$/.test(w.source.retrieved || '') && w.source.retrieved) || FOUNDED).slice(0, 4);

function colophon(w, lang, m, r) {
  const T = m.T;
  const rt = w.rights || {};
  const rows = [];
  // Rights: the basis, the jurisdictions checked, the guidance line (the same sentence as the .txt, from outputs.mjs).
  const basis = String((rt.basis && (rt.basis[lang] || rt.basis.en)) || '').trim();
  const guide = T('Guidance, not legal advice.', '仅供参考，不是法律意见。');
  let checked = rightsSentence(w, lang);
  if (checked.startsWith(basis)) checked = checked.slice(basis.length);
  if (checked.endsWith(guide)) checked = checked.slice(0, -guide.length);
  checked = checked.trim();
  const rr = [`<p>${prose(basis, lang, w)}</p>`];
  if (rt.license) { const ll = lang === 'zh' && !/[㐀-鿿]/.test(rt.license) ? ' lang="en"' : ''; rr.push(`<p${ll}>${rt.license_url ? `<a href="${esc(rt.license_url)}">${esc(rt.license)}</a>` : esc(rt.license)}</p>`); }
  if (checked) rr.push(`<p>${esc(checked)}</p>`);
  if (rt.verbatim_only) rr.push(`<p>${T('Shared word for word, as its licence asks; no translation.', '按许可要求逐字收录，不做翻译。')}</p>`);
  rr.push(`<p class="meta">${guide}</p>`);
  rows.push([T('Rights', '权利'), rr.join('')]);
  // Source
  const s = w.source || {};
  rows.push([T('Source', '来源'), `<p>${s.url ? `<a class="src" href="${esc(s.url)}">${prose(s.name || s.url, lang, w)}</a>` : prose(s.name || '', lang, w)}${s.retrieved ? `${sep}<span class="nw">${T('retrieved ', '取于 ')}${fmtDate(s.retrieved, lang)}</span>` : ''}</p>`]);
  // Translation
  const tl = [];
  if (w.translator) tl.push(`<p>${esc(w.translator.name)}${w.translator.dates ? ` <span class="tabular">(${esc(w.translator.dates)})</span>` : ''}${w.translator.year ? T(`, ${w.translator.year}`, `，${w.translator.year} 年`) : ''}</p>`);
  for (const c of [m.paired, m.solo].filter(Boolean)) {
    const into = c.lang === 'en' ? T('English', '英文') : isClassical(w) ? T('Modern Chinese', '白话') : T('Chinese', '中文');
    const by = c.cov.by && c.cov.by !== 'Claude' ? esc(c.cov.by) : T(`Claude (an AI), ${claudeYear(w)} · CC0 1.0`, `Claude（AI），${claudeYear(w)} · CC0 1.0`);
    const lab = c.cov.label ? c.cov.label[lang] || c.cov.label.en : '';
    tl.push(`<p>${into}${T(': ', '：')}${by}${c.cov.full ? '' : T(` · partial${lab ? ': ' + esc(lab) : ''}`, ` · 节译${lab ? '：' + esc(lab) : ''}`)}</p>`);
  }
  if (!tl.length) tl.push(`<p>${rt.verbatim_only ? T('None: the licence allows no changes.', '无：许可不允许改动。') : T('No translation yet.', '暂无译文。')}</p>`);
  rows.push([T('Translation', '译文'), tl.join('')]);
  rows.push([T('Catalogue no.', '馆藏号'), `<p><span class="id">${esc(w.id)}</span>${sep}<a class="id" href="${shortWork(w)}">coldlibrary.com${shortWork(w)}</a></p>`]);
  rows.push([T('Cite and keep', '引用与保存'), keepRow(T, creditText(w, lang, m), txtHref(lang, w), txtSizeLabel(w, lang))]);
  // Full record
  const a = authorLabel(w, lang);
  const FORMS = { verse: ['Verse', '诗'], prose: ['Prose', '散文'], aphorisms: ['Aphorisms', '箴言'], code: ['Code and its documentation', '代码与文档'], monospace: ['Fixed-width document', '定宽排版文献'] };
  const scriptNote = r.hasHans ? T('; traditional characters, with a simplified copy converted by OpenCC', '；繁体原文，简体本由 OpenCC 转换') : '';
  const full = [
    [T('Title', '题名'), `<span lang="${esc(tagOf(w.translator ? w.orig_lang || 'und' : w.lang))}">${esc(w.title.orig)}</span>${w.title.en && w.title.en !== w.title.orig ? `${sep}<span lang="en">${esc(w.title.en)}</span>` : ''}${w.title.zh && w.title.zh !== w.title.orig ? `${sep}<span lang="zh-Hans">${esc(w.title.zh)}</span>` : ''}`],
    [T('Author', '作者'), `${esc(a.name)}${a.orig && !(allHan(a.orig) && allHan(a.name) && [...a.orig].length === [...a.name].length) ? ` <span lang="${esc(tagOf(w.orig_lang || w.lang))}">${esc(a.orig)}</span>` : ''}${a.dates ? ` <span class="tabular">(${esc(a.dates)})</span>` : ''}`],
    [T('Date', '年代'), [periodOf(w, lang), yearLabel(w, lang)].filter(Boolean).map(esc).join(sep)],
    [T('Form', '体裁'), esc((FORMS[w.form] || [w.form, w.form])[lang === 'zh' ? 1 : 0]) + (w.style === 'essay' ? T(' · essay', ' · 随笔') : '')],
    [T('Language', '语种'), esc(/^lzh/.test(w.lang) ? T('Classical Chinese', '文言文') : /^zh/.test(w.lang) ? T('Modern Chinese', '现代汉语') : langName(w.lang, lang)) + scriptNote],
  ];
  if (w.translator && w.orig_lang) full.push([T('Original language', '原文语种'), esc(langName(w.orig_lang, lang))]);
  if (w.edition) full.push([T('Edition', '版本'), prose(w.edition[lang] || w.edition.en || '', lang, w)]);
  full.push([T('This copy', '本副本'), `<p>${T('No added rights. Notes and translations by Claude are CC0 1.0.', '本馆不附加任何权利。Claude 的注释和译文以 CC0 1.0 发布。')}</p>${rt.notice ? `<p class="notice" lang="en">${esc(rt.notice)}</p>` : ''}`]);
  return `<section class="em-colophon" aria-labelledby="h-col"><h2 class="meta" id="h-col">${T('Colophon', '版本记')}</h2>${dl(rows)}<details class="full-record"><summary>${T('Full record', '完整著录')}</summary>${dl(full)}</details>${fixLine(T, w.id)}</section>`;
}

function relatedShelf(w, lang, m, stacks) {
  const T = m.T;
  const list = related(w, stacks, m.short ? 4 : 8);
  if (!list.length) return '';
  const a = authorLabel(w, lang);
  const sameAuthor = list.every((x) => x.author.en === w.author.en);
  const h = (w.pairs || []).length ? T('Claude pairs this with', 'Claude 把它和这几部放在一起') : sameAuthor ? T(`More by ${a.name}`, `${a.name}的其他作品`) : T('Nearby on the shelves', '书架上相近的作品');
  return `<section class="em-related" aria-labelledby="h-rel"><h2 id="h-rel">${glue(h)}</h2><div class="sideways${m.short ? ' four' : ''}">${list.map((x) => wcard(lang, x, stacks)).join('')}</div></section>`;
}

function neighbours(w, lang, T, stacks) {
  const shelf = stacks.works.filter((x) => x.shelf === w.shelf);
  const i = shelf.indexOf(w);
  const prev = shelf[i - 1], next = shelf[i + 1];
  if (!prev && !next) return '';
  const a = (x, rel, label) => { const tt = titles(x, lang); return `<a class="nb ${rel}" rel="${rel}" href="${workHref(lang, x)}"><span class="meta">${label}</span>${serifTitle(tt.main, tt.mainLang)}</a>`; };
  return `<nav class="neigh" aria-label="${T('On this shelf', '同一书架')}">${prev ? a(prev, 'prev', T('‹ Previous', '‹ 上一部')) : ''}${next ? a(next, 'next', T('Next ›', '下一部 ›')) : ''}</nav>`;
}

const bridge = (lang) => `<p class="meta bridge">${t(lang)('People have always left words for later.', '人们一直在给后来的人留话。')} ${go(href(lang, 'accession'), t(lang)('Leave yours at the Front Desk', '去前台留下你的'))}</p>`;

function plateFigure(w, lang, T, stacks) {
  const p = w.plate ? stacks.plateById.get(w.plate) : null;
  if (!p) return '';
  // On the records shelf the plate comes before the text, so it is the page's first image: not lazy.
  return `<figure class="wplate wide"><div class="mat">${plateImg(p, { large: true, lang, eager: w.shelf === 'records', sizes: '(min-width: 1200px) 939px, (min-width: 900px) 75vw, 100vw' })}</div><figcaption>${plateCaption(lang, p)}<br>${go(plateHref(lang, p), T('On the plate page', '去图版页'))}</figcaption></figure>`;
}

// ---------------------------------------------------------------- rail, reading bar, sheets (W-long)
// The progress noun: "Story 3 of 7" / "第 3 个故事，共 7 个", read from the headings (the translation's on /zh/).
function progressFormat(toc, lang) {
  if (lang === 'zh') {
    const heads = toc.map((x) => x.tr || x.text);
    const share = (re) => heads.length && heads.filter((h) => re.test(h)).length >= heads.length * 0.7;
    if (share(/故事/)) return '第 {i} 个故事，共 {n} 个';
    for (const [re, n] of [[/^第.+章|^章/, '章'], [/^卷|^第.+卷/, '卷'], [/^第.+讲/, '讲'], [/^第.+部分/, '部分'], [/^第.+幕/, '幕']]) if (share(re)) return `第 {i} ${n}，共 {n} ${n}`;
    return '第 {i} 节，共 {n} 节';
  }
  const heads = toc.map((x) => x.text);
  const share = (re) => heads.length && heads.filter((h) => re.test(h)).length >= heads.length * 0.7;
  for (const [re, n] of [[/\bstor(y|ies)\b/i, 'Story'], [/^book\b/i, 'Book'], [/^part\b/i, 'Part'], [/^chapter\b/i, 'Chapter'], [/^lecture\b/i, 'Lecture']]) if (share(re)) return `${n} {i} of {n}`;
  return 'Section {i} of {n}';
}

function rail(w, lang, T, r, back) {
  const hasToc = r.toc.length >= 3;
  const mark = lang === 'zh' ? '译' : 'zh';
  const ol = r.textTag && r.textTag !== pageTag(lang) ? ` lang="${esc(r.textTag)}"` : '';
  const entry = (x, i) => {
    const keep = r.paired && !x.tr ? ' keep' : '';
    const o = r.hasHans && x.hans ? `<span class="o o-hant${keep}"${ol}>${esc(x.text)}</span><span class="o o-hans${keep}" lang="zh-Hans">${esc(x.hans)}</span>` : `<span class="o${keep}"${ol}>${esc(x.text)}</span>`;
    const tr = x.tr ? `<span class="tr" lang="${esc(r.pTag)}">${esc(x.tr)}</span>` : '';
    return `<li><a href="#${x.id}"><span class="n">${i + 1}</span><span class="t">${o}${tr}${r.partial && x.translated ? `<span class="trmark" title="${T('Translated', '有译文')}">${mark}</span>` : ''}</span></a></li>`;
  };
  const toc = hasToc ? `<nav class="toc" id="toc" aria-labelledby="toc-h"><div class="toc-head"><h2 class="meta" id="toc-h">${T('Contents', '目录')}</h2><label class="close" for="sheet-toc">${T('Close', '关闭')}</label></div><ol>${r.toc.map(entry).join('')}</ol></nav>` : '';
  let prog = '';
  if (w.size.minutes >= 5) {
    const total = Math.max(1, Math.round(r.totalMin));
    const fmt = progressFormat(r.toc, lang);
    const where = hasToc ? fmt.replace('{i}', '1').replace('{n}', String(r.toc.length)) : '';
    const left = T('{m} min left', '还剩 {m} 分钟');
    prog = `<p class="progress meta" data-progress${hasToc ? ` data-where="${esc(fmt)}"` : ''} data-left="${esc(left)}" data-done="${T('Less than a minute left', '不到 1 分钟')}">${where ? `<span class="pw">${esc(where)}</span>${sep}` : ''}<span class="pleft tabular">${esc(left.replace('{m}', String(total)))}</span></p>`;
  }
  return { html: `<aside class="rail" aria-label="${T('Contents and progress', '目录与进度')}">${back.rail}${toc}${prog}</aside>`, hasToc, prog: !!prog };
}

function readingBar(T, title, back, hasToc) {
  const ttl = title.hans ? `<span class="o-hant">${esc(title.main)}</span><span class="o-hans" lang="zh-Hans">${esc(title.hans)}</span>` : esc(title.main);
  return `<div class="rbar" role="group" aria-label="${T('Reading bar', '阅读栏')}">${back.bar}<span class="rb-title serif" lang="${esc(title.tag)}" aria-hidden="true">${ttl}</span>${hasToc ? `<input type="checkbox" id="sheet-toc" class="sheet-cb" aria-controls="toc"><label class="rb-btn" for="sheet-toc">${T('Contents', '目录')}</label>` : ''}<input type="checkbox" id="sheet-tools" class="sheet-cb" aria-controls="tools"><label class="rb-btn" for="sheet-tools"><span class="vh">${T('Reading options', '阅读设置')} </span><span aria-hidden="true">Aa</span></label><span class="pbar" aria-hidden="true"></span></div>`;
}
const scrims = (T, hasToc) => `${hasToc ? `<label class="scrim" for="sheet-toc"><span class="vh">${T('Close', '关闭')}</span></label>` : ''}<label class="scrim" for="sheet-tools"><span class="vh">${T('Close', '关闭')}</span></label>`;
// The article: W-short is one column in an 8/4 frame; W-long adds the rail, the reading bar, sheets and scrims.
function frame(attrs, col, long, ra, bar, T, progress) {
  if (!long) return `<article ${attrs}><div class="wrap grid wgrid"><div class="wcol">${col}</div></div></article>`;
  return `<article ${attrs}>${bar}${progress ? '<span class="ptop" aria-hidden="true"></span>' : ''}<div class="wrap grid wgrid">${ra.html}<div class="wcol">${col}</div></div>${scrims(T, ra.hasToc)}</article>`;
}

// ---------------------------------------------------------------- the page
const budget = { over: [], max: [], verse: { line: [], half: [], stanza: [], mixed: [] }, warned: new Set(), rendered: 0, total: 0 };
const kbOf = (s) => gzipSync(s, { level: 9 }).length / 1024;

function renderWork(w, lang, ctx) {
  const stacks = ctx.open;
  const m = model(w, lang);
  const T = m.T;
  const fixed = isFixedWidth(w);
  const long = !m.short;
  const textTag = tagOf(w.lang);
  const trOf = (c) => (c ? { lang: c.lang, tag: pageTag(c.lang), text: w.trans[c.lang], info: c.cov, partial: !c.cov.full } : null);
  // Fiction (the prose shelf, unless marked an essay) sets English paragraphs with first-line indents.
  const essay = w.style === 'essay' || w.shelf !== 'prose';
  const parts = long && (w.size.minutes >= 5 || tocOf(w.text).length >= 3);
  currentTagger = runTagger(w, stacks);
  const opts = { lang, cjk: m.cjk, textTag, aph: w.form === 'aphorisms', parts, cv: w.size.minutes >= 10, runTag: currentTagger };
  let r = renderReading(w, { ...opts, P: trOf(m.paired), T2: trOf(m.solo) });
  if (r.unmapped) {
    // A partial translation whose segments do not map is shown on its own, never paired.
    m.solo = m.paired; m.paired = null;
    if (m.view === 'par' || m.view === 'tr') m.view = 'orig';
    r = renderReading(w, { ...opts, P: null, T2: trOf(m.solo) });
  }
  r.pTag = m.paired ? pageTag(m.paired.lang) : 'en';
  r.textTag = textTag;
  r.totalMin = r.toc.length ? r.toc.reduce((a, x) => a + x.min, 0) : minutesOf(w.text);
  if (lang === 'en' && r.warns.length && !budget.warned.has(w.id)) { budget.warned.add(w.id); for (const x of r.warns) console.warn(`[work] ${w.id}: ${x}`); }
  if (lang === 'en' && r.verseMode) budget.verse[r.verseMode].push(w.id);

  const tb = titleBlock(w, lang, m, r.hasHans);
  const ce = ctx.cat && ctx.cat.workEntry.get(w.id);
  const head = `<header class="whead">${idLine(w, lang, T)}${tb.html}${byline(w, lang, m, stacks)}${factsLine(w, lang, m, stacks)}${ce ? scoreStrip(lang, ce) : ''}</header>`;
  // A partial translation into the page language: one line pointing at the translated part (rule 3).
  let note = '';
  if (m.partialNote) {
    const c = m.pageT;
    const lab = c.cov.label ? esc(c.cov.label[lang] || c.cov.label.en) : '';
    if (m.paired === c) note = `<p class="meta pnote">${T(`Claude has translated ${lab || 'part of this work'} into English.`, `${lab || '其中一部分'}有 Claude 的中文译文。`)} <label class="linkish" for="v-par" data-goto="translated">${T('Read side by side', '对照阅读')}${ARR}</label></p>`;
    else if (m.solo === c) note = `<p class="meta pnote">${c.lang === 'zh' ? T('Claude has translated a few passages of this work into Chinese.', 'Claude 把这部作品的几段译成了中文。') : T('Claude has translated a few passages of this work into English.', 'Claude 把这部作品的几段译成了英文。')} <label class="linkish" for="v-tr2">${T('Read them', '去读译文')}${ARR}</label></p>`;
  }
  const tools = toolbar(w, lang, m, r, { fixed, long });
  const plate = plateFigure(w, lang, T, stacks);
  const ko = kindOf(m.cjk ? 'cjk' : 'lat', w.form, m.short, isClassical(w));
  const kt = m.paired ? kindOf(m.paired.lang === 'zh' ? 'cjk' : 'lat', w.form, m.short, false) : '';
  const readCls = ['read', 'ko-' + ko, kt && 'kt-' + kt, essay ? 'ess' : 'fic', fixed && 'fixed'].filter(Boolean).join(' ');
  const text = fixed ? `<pre class="doc wide" tabindex="0">${esc(String(w.text).split('\n').filter((l) => !/\[Page \d+\]\s*$/.test(l) && !/^\f/.test(l)).join('\n'))}</pre>` : r.html;
  const read = `<div class="${readCls}" lang="${esc(textTag)}" id="text">${text}</div>`;
  const endm = `<div class="endm">${curatorNote(w, lang, T, stacks)}${pickBlock(w, lang, T, stacks)}${lampBlock(lang, 'author', w.author)}${trailLines(w, lang, T, stacks)}${colophon(w, lang, m, r)}${relatedShelf(w, lang, m, stacks)}${neighbours(w, lang, T, stacks)}${w.shelf === 'records' ? bridge(lang) : ''}</div>`;
  // On the records shelf the plate comes first: the object is what the text describes.
  const col = `${head}${tools}${note}${w.shelf === 'records' ? plate : ''}${read}${w.shelf === 'records' ? '' : plate}${endm}`;
  const attrs = `class="work ${long ? 'long' : 'short'}" data-group="${m.group}" data-pl="${lang}" aria-labelledby="work-title"`;
  let html;
  if (long) {
    const s = shelfOf(w.shelf);
    const back = { rail: `<a class="back" href="${shelfHref(lang, w.shelf)}">← ${T(s.en, s.zh)}</a>`, bar: `<a class="rb-back" href="${shelfHref(lang, w.shelf)}">← <span class="rb-shelf">${T(s.en, s.zh)}</span></a>` };
    const ra = rail(w, lang, T, r, back);
    html = frame(attrs, col, true, ra, readingBar(T, { main: tb.main, hans: tb.hansTitle, tag: textTag }, back, ra.hasToc), T, ra.prog);
  } else html = frame(attrs, col, false);
  checkBudget(w, lang, html, stacks);
  return html;
}

// Fixed-width documents (form "monospace", or form "code" with no fenced blocks, or text that is mostly
// ≤ 72-column lines with aligned columns or page breaks). The catalogue's RFCs are stored as reflowed Markdown
// (form prose, verse or code), so today none renders this way; the path stays for typeset documents.
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

// Page budget (spec §5.3.7, §9.2): 60 KB gz, 120 KB gz for the longest work; pages over it are logged with the
// gzip size of their bare text (all layers, no markup), the floor no markup change can go under.
function checkBudget(w, lang, html, stacks) {
  const kb = kbOf(html);
  const longest = budget.longestId || (budget.longestId = stacks.works.reduce((a, b) => (b.size.words + b.size.han > a.size.words + a.size.han ? b : a)).id);
  const cap = w.id === longest ? 120 : 60;
  if (kb > cap) {
    const bare = kbOf(html.replace(/<[^>]+>/g, ''));
    budget.over.push(`${w.id} ${lang} ${kb.toFixed(1)} KB (text alone ${bare.toFixed(1)} KB)`);
    console.warn(`[work] ${w.id} ${lang}: page body ${kb.toFixed(1)} KB gz, over the ${cap} KB budget; its text alone is ${bare.toFixed(1)} KB gz`);
  }
  budget.max.push([kb, w.id + ' ' + lang]);
  budget.rendered++;
  if (budget.rendered === budget.total) {
    const v = budget.verse;
    const top = budget.max.sort((a, b) => b[0] - a[0]).slice(0, 3).map(([k, id]) => `${id} ${k.toFixed(1)} KB`).join(', ');
    console.log(`[work] verse pairing: ${v.line.length} line to line, ${v.half.length} by half-lines, ${v.mixed.length} mixed, ${v.stanza.length} by stanza · largest page bodies (gz): ${top}${budget.over.length ? ` · ${budget.over.length} over budget` : ' · all within budget'}`);
  }
}

// ---------------------------------------------------------------- house papers (S-000001 …)
// The library's own writing, on the work template: labelled House paper, not counted as a work, no translation.
function renderPaper(p, lang) {
  const T = t(lang);
  const doc = p[lang] || p.en;
  // The loader copies the English file when a paper has no Chinese one; that copy is still English.
  const zh = lang === 'zh' && String(doc.body || '') !== String(p.en.body || '');
  const body = String(doc.body || '');
  const size = measure(body);
  const wl = { id: p.id, slug: p.slug, house: true, form: 'prose', style: 'essay', lang: zh ? 'zh-Hans' : 'en', text: body, textHans: null, trans: {}, translations: {}, size, title: { orig: doc.title } };
  const long = size.minutes >= 3 || tocOf(body).length >= 3;
  const r = renderReading(wl, { lang, cjk: zh, textTag: wl.lang, parts: long, cv: false, P: null, T2: null });
  r.pTag = 'en';
  r.textTag = wl.lang;
  r.totalMin = minutesOf(body);
  addGlyphs(doc.title, 'base');
  const head = `<header class="whead">${idLine(wl, lang, T)}<h1 class="wtitle" id="work-title"><span class="serif">${glue(doc.title)}</span></h1><p class="byline">${esc(doc.author || '')}</p><p class="meta facts">${[`<span class="nw">${fmtDate(doc.date, lang)}</span>`, `<span class="nw tabular">${zh ? T(NUM(size.han, lang) + ' characters', NUM(size.han, lang) + ' 字') : T(NUM(size.words, lang) + ' words', NUM(size.words, lang) + ' 词')}</span>`, `<span class="nw tabular">${T(size.minutes + ' min', size.minutes + ' 分钟')}</span>`].join(sep)}</p></header>`;
  const sheetHead = long ? `<div class="sheet-head"><p class="sheet-title">${T('Reading options', '阅读设置')}</p><label class="close" for="sheet-tools">${T('Close', '关闭')}</label></div>` : '';
  const tools = `<div class="toolbar" id="tools" role="group" aria-label="${T('Reading options', '阅读设置')}">${sheetHead}${sizeControl(T, lang, false)}</div>\n<script src="/assets/js/view-init.js"></script>`;
  const read = `<div class="read ${zh ? 'ko-p-zh' : 'ko-p-lat'} ess" lang="${wl.lang}" id="text">${r.html}</div>`;
  const url = SITE + shortWork(p);
  const credit = lang === 'zh' ? `${doc.author}《${doc.title}》，${doc.date}。冷冻图书馆 · 馆内文献，${p.id}。${url}` : `${doc.author}, ${doc.title}, ${doc.date}. Cold Library, house paper ${p.id}. ${url}`;
  const rows = [
    [T('Rights', '权利'), `<p>${T('Written by Librarian No. 1 for this library.', '由一号馆员为本馆撰写。')}</p>`],
    [T('Source', '来源'), `<p><a class="src" href="${REPO}/tree/main/catalog/open-stacks">${T('Cold Library, catalog/open-stacks', '冷冻图书馆 catalog/open-stacks')}</a>${sep}<span class="nw">${fmtDate(doc.date, lang)}</span></p>`],
    [T('Catalogue no.', '馆藏号'), `<p><span class="id">${esc(p.id)}</span>${sep}<a class="id" href="${shortWork(p)}">coldlibrary.com${shortWork(p)}</a></p>`],
    [T('Cite and keep', '引用与保存'), keepRow(T, credit, href(lang, 'open-stacks/' + p.slug) + '.txt', paperSizeLabel(p, lang))],
  ];
  const full = [
    [T('Title', '题名'), `<span lang="en">${esc(p.en.title)}</span>${p.zh && p.zh.title !== p.en.title ? `${sep}<span lang="zh-Hans">${esc(p.zh.title)}</span>` : ''}`],
    [T('Author', '作者'), esc(doc.author || '')],
    [T('Date', '年代'), fmtDate(doc.date, lang)],
    [T('Form', '体裁'), T('Essay', '随笔')],
    [T('Language', '语种'), T('English and Chinese, each written for this library', '中文和英文两个版本，都为本馆而写')],
  ];
  const colo = `<section class="em-colophon" aria-labelledby="h-col"><h2 class="meta" id="h-col">${T('Colophon', '版本记')}</h2>${dl(rows)}<details class="full-record"><summary>${T('Full record', '完整著录')}</summary>${dl(full)}</details>${fixLine(T, p.id)}</section>`;
  const col = `${head}${tools}${read}<div class="endm">${colo}${bridge(lang)}</div>`;
  const attrs = `class="work house ${long ? 'long' : 'short'}" data-group="${zh ? 'zh' : 'en'}" data-pl="${lang}" aria-labelledby="work-title"`;
  if (!long) return frame(attrs, col, false);
  const back = { rail: `<a class="back" href="${href(lang, 'about')}">← ${T('About the library', '关于这座馆')}</a>`, bar: `<a class="rb-back" href="${href(lang, 'about')}">← <span class="rb-shelf">${T('About', '关于')}</span></a>` };
  const ra = rail(wl, lang, T, r, back);
  return frame(attrs, col, true, ra, readingBar(T, { main: doc.title, hans: null, tag: wl.lang }, back, ra.hasToc), T, ra.prog);
}

// ---------------------------------------------------------------- page objects
export function workPages(ctx) {
  const stacks = ctx.open;
  const papers = stacks.papers || [];
  budget.total = stacks.works.length * 2;
  const taken = new Set(stacks.works.map((w) => w.slug));
  const pages = stacks.works.map((w) => ({
    slug: 'open-stacks/' + w.slug,
    title: (lang) => { const tt = titles(w, lang); return tt.sub ? `${tt.main} · ${tt.sub}` : tt.main; },
    description: (lang) => describe(w.note && (w.note[lang] || w.note.en)),
    fontKey: w.id,
    bodyClass: () => 'stacks work-page' + (isShort(w) ? '' : ' reading'),
    scripts: ['reading', 'search', 'rate'],
    render: (lang, c) => renderWork(w, lang, c),
  }));
  for (const p of papers) {
    if (!p.id || !p.slug) continue;
    if (taken.has(p.slug)) { console.warn(`[work] house paper ${p.id}: slug "${p.slug}" is already a work; skipped`); continue; }
    const long = (lang) => { const d = p[lang] || p.en; return measure(d.body).minutes >= 3 || tocOf(d.body).length >= 3; };
    pages.push({
      slug: 'open-stacks/' + p.slug,
      title: (lang) => (p[lang] || p.en).title,
      description: (lang) => describe(String((p[lang] || p.en).body || '').replace(/^#+ .*$/gm, '').replace(/[#>*]/g, '').trim().split(/\n{2,}/)[0]),
      fontKey: p.id,
      bodyClass: (lang) => 'stacks work-page house-paper' + (long(lang) ? ' reading' : ''),
      scripts: ['reading', 'search'],
      render: (lang) => renderPaper(p, lang),
    });
  }
  return pages;
}
