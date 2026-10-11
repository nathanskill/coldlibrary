// Open Stacks build outputs beyond HTML pages (spec v5 §4.2, §4.6, §5.3.10, §9.2):
//   /open-stacks/<slug>.txt and /zh/open-stacks/<slug>.txt   plain-text copies with a colophon header
//   /open-stacks/index.json, /open-stacks/lines.json          search data (identical copies under /zh/)
//   /open-stacks/feed.xml, /zh/open-stacks/feed.xml           Atom feeds of new accessions
//   /s/NNNNNN.html, /g/NNNNNN.html                             short catalogue URLs (works, plates)
// emitOutputs(ctx, dist) writes them and returns extra sitemap URLs (none: HTML pages are already listed).
// The work page can show the .txt size with txtSize(w, lang) and link it with txtHref(lang, w).
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { gzipSync } from 'node:zlib';
import { SITE, esc, href, FOUNDED } from './lib.mjs';
import { searchIndex, titles, authorLabel, yearLabel, periodOf, translationInto, shortWork, shortPlate, shelfOf } from './stacks.mjs';

// Budgets (spec §9.2), gzip level 9.
export const BUDGET = { index: 40 * 1024, lines: 60 * 1024 };

// The build date in the build machine's own calendar day (CL_BUILD_DATE=YYYY-MM-DD overrides, for reproducible builds).
const today = () => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(process.env.CL_BUILD_DATE || '')) return process.env.CL_BUILD_DATE;
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
const isoDate = (s) => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? String(s) : null);
const T = (lang) => (en, zh) => (lang === 'zh' ? zh : en);
const pickL = (o, lang) => (o == null ? '' : typeof o === 'string' ? o : o[lang] ?? o.en ?? '');
const gz = (s) => gzipSync(s, { level: 9 }).length;
const kb = (n) => (n / 1024).toFixed(1) + 'KB';
const HAN = /[㐀-䶿一-鿿豈-﫿]|[\u{20000}-\u{2ebef}]/u;
const HAN_G = /[㐀-䶿一-鿿豈-﫿]|[\u{20000}-\u{2ebef}]/gu;
const hanCount = (s) => (String(s).match(HAN_G) || []).length;
// XML 1.0 forbids most C0 controls; drop them before escaping.
const xml = (s) => esc(String(s ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, ''));

export const txtHref = (lang, w) => href(lang, 'open-stacks/' + w.slug) + '.txt';
const accessioned = (w) => isoDate(w.accessioned) || isoDate(w.source && w.source.retrieved) || FOUNDED;
const claudeYear = (w) => accessioned(w).slice(0, 4);

// ---------------------------------------------------------------- plain text (§5.3.10)

// The text as plain text: LF line ends, no trailing spaces, code fences dropped, "## " markers dropped
// (a heading keeps its own line, with an extra blank line above it). Emphasis markers stay: *word* is plain-text emphasis.
function plain(src) {
  const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, ''));
  const out = [];
  let fence = false;
  for (const l of lines) {
    if (/^```/.test(l)) { fence = !fence; continue; }
    const h = !fence && l.match(/^#{2,3}\s+(.+)$/);
    if (h) {
      while (out.length && out[out.length - 1] === '') out.pop();
      if (out.length) out.push('', '');
      out.push(h[1].trim());
      continue;
    }
    out.push(l);
  }
  return out.join('\n').replace(/\n{4,}/g, '\n\n\n').replace(/^\n+|\n+$/g, '');
}
// verbatim_only: the text word for word. Only the catalogue's own markup goes: line ends are normalised, code-fence
// lines are dropped and a "## " heading keeps its words without the marker. Nothing else changes.
const verbatim = (src) => String(src || '').replace(/\r\n?/g, '\n').split('\n')
  .filter((l) => !/^```/.test(l)).map((l) => l.replace(/^#{2,3}\s+/, '')).join('\n').replace(/^\n+|\s+$/g, '');

// The author as one line: the page-language name, then the original only when it adds something
// (not when it is the same name in the other Chinese script, or already inside the page-language name).
function authorLine(w, lang) {
  const a = authorLabel(w, lang);
  let orig = a.orig;
  const allHan = (s) => /^[\s\p{Script=Han}·・]+$/u.test(s);
  if (orig && lang === 'zh' && allHan(orig) && allHan(a.name) && [...orig].length === [...a.name].length) orig = '';
  if (orig && String(a.name).toLowerCase().includes(String(orig).toLowerCase())) orig = '';
  return { name: a.name, orig, dates: a.dates };
}
// An open licence named with its address, for a licence that asks for one (CC BY, BY-ND …).
function licenceLine(w, lang) {
  const r = w.rights || {};
  if (r.status !== 'open-license' || !r.license) return '';
  return `${lang === 'zh' ? '许可：' : 'Licence: '}${r.license}${r.license_url ? (lang === 'zh' ? '，' : ', ') + r.license_url : ''}`;
}

const WHERE = {
  AU: ['Australia', '澳大利亚'], EU: ['the EU', '欧盟'], UK: ['the UK', '英国'], GB: ['the UK', '英国'], CN: ['mainland China', '中国大陆'], US: ['the United States', '美国'],
};
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function longDate(iso, lang) {
  const [y, m, d] = iso.split('-').map(Number);
  return lang === 'zh' ? `${y} 年 ${m} 月 ${d} 日` : `${d} ${MONTHS[m - 1]} ${y}`;
}
const andList = (xs, lang) => (lang === 'zh' ? xs.join('、').replace(/、([^、]*)$/, '和$1') : xs.length < 3 ? xs.join(' and ') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

// The rights sentence: basis, the jurisdictions checked (rights.checked), and the guidance line.
export function rightsSentence(w, lang) {
  const tt = T(lang);
  const r = w.rights || {};
  const parts = [pickL(r.basis, lang).trim()];
  const c = r.checked;
  if (c && Array.isArray(c.where) && c.where.length && isoDate(c.date)) {
    const names = c.where.map((k) => WHERE[String(k).toUpperCase()]).filter(Boolean).map((n) => n[lang === 'zh' ? 1 : 0]);
    if (names.length) parts.push(tt(`Checked for ${andList(names, lang)} as of ${longDate(c.date, lang)}.`, `已按${andList(names, lang)}的规则核对（截至 ${longDate(c.date, lang)}）。`));
  }
  parts.push(tt('Guidance, not legal advice.', '仅供参考，不是法律意见。'));
  return parts.filter(Boolean).join(lang === 'zh' ? '' : ' ');
}

// The page-language translation included in a .txt: { text, label, credit } or null.
function pageTranslation(w, lang) {
  if (w.rights && w.rights.verbatim_only) return null;
  const tr = translationInto(w, lang);
  if (!tr || !w.trans || !w.trans[lang]) return null;
  const tt = T(lang);
  const who = tr.by && tr.by !== 'Claude' ? tr.by : tt('Claude (an AI)', 'Claude（AI）');
  const part = tr.full ? '' : pickL(tr.label, lang);
  const classical = /^lzh/.test(String(w.lang));
  const label = tr.full
    ? tt(`English translation by ${who}`, `${classical ? '白话译文' : '中文译文'} · ${who}译`)
    : tt(`Partial English translation by ${who}${part ? ': ' + part : ''}`, `${classical ? '白话节译' : '中文节译'} · ${who}译${part ? ' · ' + part : ''}`);
  // Claude's own changes are CC0; an openly licensed original keeps its licence underneath the translation.
  const lic = w.rights && w.rights.status === 'open-license' && w.rights.license ? w.rights.license : '';
  const keep = lic ? tt(`; the original stays under ${lic}`, `；原文仍按 ${lic} 许可`) : '';
  const credit = tt(`${who}, ${claudeYear(w)} · CC0 1.0${part ? ' · ' + part : ''}${keep}`, `${who}，${claudeYear(w)} · CC0 1.0${part ? ' · ' + part : ''}${keep}`);
  const factLabel = tr.full
    ? tt('English translation: ', classical ? '白话译文：' : '中文译文：')
    : tt('Partial English translation: ', classical ? '白话节译：' : '中文节译：');
  return { text: plain(w.trans[lang]), label, credit, classical, factLabel };
}

// "Danish" / "丹麦语" for a BCP 47 tag; classical Chinese is 文言.
function langName(tag, lang) {
  const t = String(tag || '');
  if (!t) return '';
  if (/^lzh/.test(t)) return lang === 'zh' ? '文言' : 'Classical Chinese';
  try { const n = new Intl.DisplayNames([lang === 'zh' ? 'zh-Hans' : 'en'], { type: 'language' }).of(t); return n && n !== t ? n : ''; } catch { return ''; }
}

// The whole .txt for one work in one page language.
export function txtFile(w, lang, { date = today() } = {}) {
  const r = w.rights || {};
  if (r.verbatim_only) {
    const text = verbatim(w.text);
    const notice = String(r.notice || '').trim();
    let out = notice && !text.includes(notice) ? `${text}\n\n${notice}` : text;
    // A Creative Commons notice links its licence; plain text loses the link, so its address follows the notice.
    const url = String(r.license_url || '');
    if (/^https:\/\/creativecommons\.org\//.test(url) && !out.includes(url)) out += `\n${url}`;
    return out + '\n';
  }
  const tt = T(lang);
  const ti = titles(w, lang);
  const head = [ti.orig];
  const pageTitle = pickL(w.title, lang);
  if (pageTitle && pageTitle !== ti.orig) head.push(pageTitle);
  if (w.translator && w.title && w.title.orig && w.title.orig !== ti.orig) {
    const ln = langName(w.orig_lang, lang);
    head.push(tt(`Original title: ${w.title.orig}${ln ? ` (${ln})` : ''}`, `原题：${w.title.orig}${ln ? `（${ln}）` : ''}`));
  }
  const a = authorLine(w, lang);
  head.push(`${a.name}${a.orig ? ' ' + a.orig : ''}${a.dates ? tt(` (${a.dates})`, `（${a.dates}）`) : ''}`);
  if (w.translator && w.translator.name) {
    const tr = w.translator;
    head.push(tt(`Translated by ${tr.name}${tr.dates ? ` (${tr.dates})` : ''}${tr.year ? `, ${tr.year}` : ''}`, `译者：${tr.name}${tr.dates ? `（${tr.dates}）` : ''}${tr.year ? `，${tr.year} 年` : ''}`));
  }
  const period = periodOf(w, lang);
  head.push([period, yearLabel(w, lang)].filter(Boolean).join(' · '));
  const pt = pageTranslation(w, lang);
  const src = w.source || {};
  const facts = [
    `${tt('Cold Library · Open Stacks', '冷冻图书馆 · 开架书库')} · ${w.id} · ${SITE}${shortWork(w)}`,
    `${tt('Rights: ', '权利：')}${rightsSentence(w, lang)}`,
    `${tt('Source: ', '来源：')}${[src.name, src.url].filter(Boolean).join(tt(', ', '，'))}${src.retrieved ? tt(` (retrieved ${src.retrieved})`, `（取于 ${src.retrieved}）`) : ''}`,
  ];
  const lic = licenceLine(w, lang);
  if (lic) facts.splice(2, 0, lic);
  if (pt) facts.push(pt.factLabel + pt.credit);
  facts.push(tt(`Generated ${date} from ${SITE}${href('en', 'open-stacks/' + w.slug)}`, `生成于 ${date}，来自 ${SITE}${href('zh', 'open-stacks/' + w.slug)}`));
  const parts = [head.filter(Boolean).join('\n') + '\n\n' + facts.join('\n'), plain(w.text)];
  if (w.textHans) parts.push(plain(w.textHans));
  if (pt) parts.push(pt.label + '\n\n' + pt.text);
  return parts.join('\n\n----\n\n') + '\n';
}
export const txtSize = (w, lang) => Buffer.byteLength(txtFile(w, lang), 'utf8');
// "2.4 KB" (one decimal under 10 KB, whole numbers above), the same in both languages.
export function fmtSize(bytes) {
  const k = bytes / 1024;
  return `${k < 10 ? k.toFixed(1) : String(Math.round(k))} KB`;
}

// A house paper (S-000001 …) as plain text, when its page exists.
function paperTxt(p, lang, date = today()) {
  const tt = T(lang);
  const s = p[lang] || p.en;
  const head = [s.title, s.author, s.date].filter(Boolean).join('\n');
  const facts = [
    `${tt('Cold Library · house paper', '冷冻图书馆 · 馆内文献')} · ${p.id} · ${SITE}/s/${p.id.slice(2)}`,
    s.author ? tt(`Written for this library by ${s.author}.`, `${s.author}${/[A-Za-z0-9.]$/.test(s.author) ? ' ' : ''}为本馆撰写。`) : '',
    tt(`Generated ${date} from ${SITE}${href('en', 'open-stacks/' + p.slug)}`, `生成于 ${date}，来自 ${SITE}${href('zh', 'open-stacks/' + p.slug)}`),
  ];
  return `${head}\n\n${facts.filter(Boolean).join('\n')}\n\n----\n\n${plain(s.body)}\n`;
}

// ---------------------------------------------------------------- search data (§5.7)

// Lines of a text for search: no fences, no "## " headings, no emphasis markers, trimmed. Code (inside a fence,
// or a work whose form is code) is kept as written.
function searchLines(src, code = false) {
  const out = [];
  let fence = false;
  for (const l of String(src || '').replace(/\r\n?/g, '\n').split('\n')) {
    if (/^```/.test(l)) { fence = !fence; continue; }
    if (fence) { out.push(l.trim()); continue; }
    if (/^#{2,3}\s/.test(l)) continue;
    if (code) { out.push(l.trim()); continue; }
    out.push(l.replace(/\*\*(.+?)\*\*/g, '$1').replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1$2').trim());
  }
  return out;
}
// The opening of a text: whole paragraphs until `han` Han or `latin` Latin characters (120 / 300), cut at that point.
function opening(src, verse, han = 120, latin = 300, code = false) {
  const paras = [];
  let cur = [];
  for (const l of searchLines(src, code)) { if (l) cur.push(l); else if (cur.length) { paras.push(cur); cur = []; } }
  if (cur.length) paras.push(cur);
  // A Chinese text counts Han characters; a Latin text that quotes a few characters still counts letters.
  const all = paras.flat().join('');
  const cjk = hanCount(all) > (all.match(/\p{L}/gu) || []).length / 2;
  let out = '';
  for (const p of paras) {
    const flat = verse ? p.join('\n') : p.join(cjk ? '' : ' ');
    out = out ? out + '\n' + flat : flat;
    if (cjk ? hanCount(out) >= han : out.length >= latin) break;
  }
  if (cjk) {
    let n = 0, i = 0;
    for (const ch of out) { i += ch.length; if (HAN.test(ch) && ++n === han) break; }
    const rest = out.slice(i).match(/^[，。；：！？、」』”’）》〉…—]*/u)[0];
    return out.slice(0, i + rest.length);
  }
  if (out.length <= latin) return out;
  const cut = out.slice(0, latin);
  return cut.slice(0, Math.max(cut.lastIndexOf(' '), Math.round(latin * 0.67))).trim();
}

// lines.json: { "S-001001": "line\nline…" }. Verse (and code) of 32 lines or fewer in full, every other work's
// opening; for a -Hant text the simplified copy follows, so a simplified query finds the traditional original.
export function linesData(open, { han = 120, latin = 300 } = {}) {
  const out = {};
  for (const w of open.works) {
    const code = w.form === 'code';
    const verseLike = w.form === 'verse' || code;
    const lines = searchLines(w.text, code).filter(Boolean);
    const one = (src) => (verseLike && lines.length <= 32 ? searchLines(src, code).filter(Boolean).join('\n') : opening(src, verseLike, han, latin, code));
    let v = one(w.text);
    if (w.textHans) v += '\n' + one(w.textHans);
    if (v.trim()) out[w.id] = v;
  }
  return out;
}

// index.json: searchIndex() from stacks.mjs, unchanged in shape (keys i,s,h,y,l,e2,r,t,a,e,ez,p,g,tz for works;
// i,s,t,a,y for plates; every key stays present). To keep it under budget, step by step until it fits:
//   1. `ez` carries only the simplified copy of a Chinese excerpt ('' when it would repeat `e`, and for
//      non-Chinese works);
//   2. an excerpt that lines.json already holds is '' here (search finds it there once lines.json arrives);
//   3. the remaining excerpts are shortened, to 60 Han / 140 Latin characters, then 40 / 90.
// So a client shows `ez || e` when it has one, and otherwise the matched line from lines.json.
const capText = (x, nh, nl) => {
  if (!x) return x || '';
  const han = HAN.test(x);
  const n = han ? nh : nl;
  if ([...x].length <= n) return x;
  const cut = [...x].slice(0, n).join('');
  const m = cut.match(han ? /^.*[，。；：！？、]/su : /^.*[,.;:!?](?=\s)/su);
  return (m && [...m[0]].length > n * 0.5 ? m[0] : cut).trim() + '…';
};
// Search normalisation used for the containment test below (the client does the same, spec §5.7).
const norm = (x) => String(x || '').normalize('NFKC').toLowerCase().replace(/[\p{P}\p{S}\p{Z}\s]+/gu, '');
export function indexData(open, lines = null) {
  const idx = searchIndex(open);
  const hansOnly = (w) => ({ ...w, ez: /^(lzh|zh)/.test(String(w.l)) && w.ez && w.ez !== w.e ? w.ez : '' });
  // An excerpt that lines.json already holds is left out first (it is found once lines.json arrives);
  // only then are the remaining excerpts shortened.
  const held = (w) => { const x = hansOnly(w); const v = lines && lines[w.i] ? norm(lines[w.i]) : ''; const has = (e) => e && v.includes(norm(e)); return { ...x, e: has(x.e) ? '' : x.e, ez: has(x.ez) ? '' : x.ez }; };
  const cap = (n, l) => (w) => { const x = held(w); return { ...x, e: capText(x.e, n, l), ez: capText(x.ez, n, l) }; };
  const levels = [
    ['simplified excerpts only for Chinese works', hansOnly],
    ['excerpts already in lines.json left out', held],
    ['other excerpts cut to 60 Han / 140 Latin', cap(60, 140)],
    ['other excerpts cut to 40 Han / 90 Latin', cap(40, 90)],
  ];
  let json = '', level = '';
  for (const [name, f] of levels) {
    json = JSON.stringify({ works: idx.works.map(f), plates: idx.plates });
    level = name;
    if (gz(json) <= BUDGET.index) break;
  }
  return { json, level };
}

// ---------------------------------------------------------------- Atom feeds

export function feedXml(open, lang, { limit = 50 } = {}) {
  const tt = T(lang);
  const pre = lang === 'zh' ? '/zh' : '';
  const tagBase = 'tag:coldlibrary.com,2026-10-04:';
  const entries = [...open.works].sort((a, b) => accessioned(b).localeCompare(accessioned(a)) || b.id.localeCompare(a.id)).slice(0, limit);
  const updated = entries.length ? accessioned(entries[0]) : FOUNDED;
  const stamp = (d) => `${d}T00:00:00Z`;
  const entry = (w) => {
    const ti = titles(w, lang);
    const a = authorLine(w, lang);
    const shelf = shelfOf(w.shelf);
    const page = SITE + href(lang, 'open-stacks/' + w.slug);
    const d = stamp(accessioned(w));
    const by = w.translator && w.translator.name ? tt(`, translated by ${w.translator.name}`, `，${w.translator.name} 译`) : '';
    const summary = `${a.name}${a.orig ? ' ' + a.orig : ''} · ${yearLabel(w, lang)}${by}${tt('. ', '。')}${pickL(w.note, lang)}`;
    return `  <entry>
    <id>${tagBase}${pre.slice(1)}${pre ? '/' : ''}open-stacks/${w.id}</id>
    <title>${xml(ti.sub ? `${ti.main} · ${ti.sub}` : ti.main)}</title>
    <link rel="alternate" type="text/html" hreflang="${lang === 'zh' ? 'zh-CN' : 'en'}" href="${xml(page)}"/>
    <link rel="alternate" type="text/plain" href="${xml(page)}.txt"/>
    <published>${d}</published>
    <updated>${d}</updated>
    <author><name>${xml(a.name)}</name></author>
    ${shelf ? `<category term="${xml(shelf.key)}" label="${xml(lang === 'zh' ? shelf.zh : shelf.en)}"/>` : ''}
    <summary type="text">${xml(summary)}</summary>
  </entry>`;
  };
  return `<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom" xml:lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
  <id>${tagBase}${pre.slice(1)}${pre ? '/' : ''}open-stacks/feed</id>
  <title>${xml(tt('Cold Library · Open Stacks · new accessions', '冷冻图书馆 · 开架书库 · 新入藏'))}</title>
  <subtitle>${xml(tt('Real works anyone may read, copy and keep, newest first.', '谁都能读、能抄、能带走的真实作品，最新入藏的在前。'))}</subtitle>
  <link rel="self" type="application/atom+xml" href="${SITE}${pre}/open-stacks/feed.xml"/>
  <link rel="alternate" type="text/html" href="${SITE}${href(lang, 'open-stacks')}"/>
  <link rel="alternate" type="application/atom+xml" hreflang="${lang === 'zh' ? 'en' : 'zh-CN'}" href="${SITE}${lang === 'zh' ? '' : '/zh'}/open-stacks/feed.xml"/>
  <updated>${stamp(updated)}</updated>
  <author><name>${xml(tt('Cold Library', '冷冻图书馆'))}</name><uri>${SITE}</uri></author>
  <icon>${SITE}/favicon.svg</icon>
${entries.map(entry).join('\n')}
</feed>
`;
}

// ---------------------------------------------------------------- short URLs

function stub(id, label, to) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>${esc(id)} · ${esc(label)} · Cold Library</title><link rel="canonical" href="${SITE}${to}"><meta http-equiv="refresh" content="0; url=${to}"></head><body><p><a href="${to}">${esc(id)} · ${esc(label)} →</a></p></body></html>\n`;
}

// ---------------------------------------------------------------- emit

const put = (file, data) => { mkdirSync(dirname(file), { recursive: true }); writeFileSync(file, data); };
const pageFile = (dist, lang, slug) => join(dist, (lang === 'zh' ? 'zh/' : '') + slug + '.html');

export function emitOutputs(ctx, dist) {
  const open = ctx && ctx.open;
  if (!open || !Array.isArray(open.works)) return [];
  const date = today();
  const problems = [];
  let txt = 0;

  // .txt copies, one per work per language; a work that cannot be rendered is reported, never fatal.
  for (const w of open.works) {
    for (const lang of ['en', 'zh']) {
      try { put(join(dist, lang === 'zh' ? 'zh' : '', 'open-stacks', w.slug + '.txt'), txtFile(w, lang, { date })); txt++; }
      catch (e) { problems.push(`${w.id}: .txt (${lang}) failed: ${e.message}`); }
    }
  }
  // House papers get a .txt and a short URL once their page exists.
  const papers = (open.papers || []).filter((p) => p && p.id && p.slug && existsSync(pageFile(dist, 'en', 'open-stacks/' + p.slug)));
  for (const p of papers) for (const lang of ['en', 'zh']) { put(join(dist, lang === 'zh' ? 'zh' : '', 'open-stacks', p.slug + '.txt'), paperTxt(p, lang, date)); txt++; }

  // Search data.
  let index = { json: '{"works":[],"plates":[]}', level: '' }, linesObj = {}, linesLevel = '';
  try {
    // Openings shrink step by step if the file is over budget; short verse always stays whole.
    for (const [han, latin] of [[120, 300], [80, 200], [60, 150]]) {
      linesObj = linesData(open, { han, latin });
      linesLevel = han === 120 ? '' : `openings cut to ${han} Han / ${latin} Latin`;
      if (gz(JSON.stringify(linesObj)) <= BUDGET.lines) break;
    }
  } catch (e) { problems.push('lines.json failed: ' + e.message); }
  try { index = indexData(open, linesObj); } catch (e) { problems.push('index.json failed: ' + e.message); }
  const lines = JSON.stringify(linesObj);
  for (const pre of ['', 'zh']) {
    put(join(dist, pre, 'open-stacks', 'index.json'), index.json);
    put(join(dist, pre, 'open-stacks', 'lines.json'), lines);
  }
  const gi = gz(index.json), gl = gz(lines);
  if (gi > BUDGET.index) problems.push(`index.json is ${kb(gi)} gz, over its ${kb(BUDGET.index)} budget even with ${index.level}`);
  if (gl > BUDGET.lines) problems.push(`lines.json is ${kb(gl)} gz, over its ${kb(BUDGET.lines)} budget even with ${linesLevel}`);

  // Feeds.
  for (const lang of ['en', 'zh']) {
    try { put(join(dist, lang === 'zh' ? 'zh' : '', 'open-stacks', 'feed.xml'), feedXml(open, lang)); }
    catch (e) { problems.push(`feed.xml (${lang}) failed: ${e.message}`); }
  }

  // Short URLs: /s/ for works and house papers, /g/ for plates.
  let shorts = 0;
  const missing = { s: 0, g: 0 };
  for (const w of [...open.works, ...papers]) {
    const slug = 'open-stacks/' + w.slug;
    if (!existsSync(pageFile(dist, 'en', slug))) missing.s++;
    put(join(dist, shortWork(w).slice(1) + '.html'), stub(w.id, (w.title && w.title.en) || (w.en && w.en.title) || w.slug, '/' + slug));
    shorts++;
  }
  for (const p of open.plates || []) {
    if (!p || !p.id || !p.slug) continue;
    const slug = 'open-stacks/plates/' + p.slug;
    if (!existsSync(pageFile(dist, 'en', slug))) missing.g++;
    put(join(dist, shortPlate(p).slice(1) + '.html'), stub(p.id, (p.title && p.title.en) || p.slug, '/' + slug));
    shorts++;
  }
  if (missing.s) problems.push(`${missing.s} /s/ short URL(s) point at work pages that were not built`);
  if (missing.g) problems.push(`${missing.g} /g/ short URL(s) point at plate pages that were not built yet`);

  console.log(`outputs: ${txt} .txt, index.json ${kb(gi)} gz${index.level ? ` (${index.level})` : ''}, lines.json ${kb(gl)} gz${linesLevel ? ` (${linesLevel})` : ''}, 2 feeds, ${shorts} short URLs`);
  for (const p of problems) console.warn('  outputs: ' + p);
  return [];
}

// A standalone check of a built dist folder:
//   node -e "import('./site/src/stacks.mjs').then(async (s) => console.log((await import('./site/src/outputs.mjs')).check({ open: s.loadStacks('.') }, 'site/dist')))"
// Returns a list of problems; empty means every work has both .txt copies and a /s/ URL, every plate a /g/ URL
// whose page was built, and the search data and feeds exist in both languages, parse, and fit their budgets.
export function check(ctx, dist) {
  const problems = [];
  const open = ctx.open;
  for (const w of open.works) for (const pre of ['', 'zh']) if (!existsSync(join(dist, pre, 'open-stacks', w.slug + '.txt'))) problems.push(`${w.id}: missing ${pre ? '/zh' : ''}/open-stacks/${w.slug}.txt`);
  for (const pre of ['', 'zh']) {
    for (const [f, budget] of [['index.json', BUDGET.index], ['lines.json', BUDGET.lines], ['feed.xml', 0]]) {
      const file = join(dist, pre, 'open-stacks', f);
      if (!existsSync(file)) { problems.push(`missing ${pre ? '/zh' : ''}/open-stacks/${f}`); continue; }
      const body = readFileSync(file, 'utf8');
      if (f.endsWith('.json')) { try { JSON.parse(body); } catch (e) { problems.push(`${f} does not parse: ${e.message}`); } }
      else if ((body.match(/<entry>/g) || []).length !== Math.min(50, open.works.length)) problems.push(`${pre ? '/zh' : ''}/open-stacks/feed.xml has the wrong number of entries`);
      if (budget && gz(body) > budget) problems.push(`${f} is ${kb(gz(body))} gz, over ${kb(budget)}`);
    }
  }
  for (const w of open.works) if (!existsSync(join(dist, 's', w.id.slice(2) + '.html'))) problems.push(`${w.id}: missing /s/ short URL`);
  for (const p of open.plates) {
    if (!existsSync(join(dist, 'g', p.id.slice(2) + '.html'))) problems.push(`${p.id}: missing /g/ short URL`);
    if (!existsSync(pageFile(dist, 'en', 'open-stacks/plates/' + p.slug))) problems.push(`${p.id}: /g/ target /open-stacks/plates/${p.slug} is not built`);
  }
  return problems;
}
