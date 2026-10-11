// The Open Stacks: load works, plates and curation files from catalog/, and the data helpers every template shares.
// Format: catalog/stacks/README.md. Layout lives in components.mjs and site/src/stacks/*.mjs.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { esc, href } from './lib.mjs';

export const SHELVES = [
  { key: 'poetry', en: 'Poetry', zh: '诗与词', dek: { en: 'Poems from the Book of Songs to Tagore.', zh: '从《诗经》到泰戈尔。' } },
  { key: 'prose', en: 'Prose & Stories', zh: '文与小说', dek: { en: 'Essays, stories and the classical prose that taught people to write.', zh: '散文、小说，和教会人写文章的古文。' } },
  { key: 'thought', en: 'Thought', zh: '哲思', dek: { en: 'How to live, think and pass things on.', zh: '怎样活、怎样想、怎样把东西传下去。' } },
  { key: 'science', en: 'Science', zh: '科学', dek: { en: 'First-hand accounts of finding out.', zh: '第一手的发现。' } },
  { key: 'computing', en: 'Computing & Open Source', zh: '计算与开源', dek: { en: 'From the Analytical Engine to the licences that keep code free.', zh: '从分析机，到让代码保持自由的许可证。' } },
  { key: 'records', en: 'Messages Forward', zh: '寄往未来', dek: { en: 'Words written for people not yet born.', zh: '写给还没出生的人的话。' } },
];
export const shelfOf = (key) => SHELVES.find((s) => s.key === key);
export const RESERVED = ['claude', 'authors', 'eras', 'plates', 'search', 'random', 'index', 'trails', 'feed', 'new', ...SHELVES.map((s) => s.key)];

const CJK = /[㐀-鿿豈-﫿]/g;
// Reading length: CJK counts characters, everything else counts words.
export function measure(text) {
  const han = (String(text).match(CJK) || []).length;
  const words = String(text).replace(CJK, ' ').split(/\s+/).filter((w) => /[A-Za-z0-9À-ɏ]/.test(w)).length;
  const minutes = Math.max(1, Math.round(han / 400 + words / 230));
  return { han, words, minutes };
}

const readIf = (p) => (existsSync(p) ? readFileSync(p, 'utf8').replace(/\r\n/g, '\n') : null);
const jsonIf = (p, fallback) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : fallback);

export function frontMatter(src) {
  const m = src.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { meta: {}, body: src };
  const meta = {};
  for (const line of m[1].split('\n')) { const i = line.indexOf(':'); if (i > 0) meta[line.slice(0, i).trim()] = line.slice(i + 1).trim(); }
  return { meta, body: m[2] };
}

// ---- loading ----
export function loadStacks(root) {
  const base = join(root, 'catalog/stacks');
  const works = [];
  const shelves = {};
  for (const shelf of existsSync(base) ? readdirSync(base) : []) {
    const sdir = join(base, shelf);
    if (shelf.startsWith('_') || !statSync(sdir).isDirectory()) continue;
    shelves[shelf] = jsonIf(join(sdir, 'shelf.json'), { essay: null, start: [], plate: null });
    for (const f of readdirSync(sdir)) {
      const d = join(sdir, f);
      if (!statSync(d).isDirectory() || !existsSync(join(d, 'work.json'))) continue;
      const w = JSON.parse(readFileSync(join(d, 'work.json'), 'utf8'));
      w.text = readIf(join(d, 'text.md')) || '';
      w.textHans = readIf(join(d, 'text.zh-Hans.md'));
      w.trans = {};
      for (const lang of Object.keys(w.translations || {})) {
        const tx = readIf(join(d, `translation.${lang}.md`));
        if (tx) w.trans[lang] = tx;
      }
      w.size = measure(w.textHans || w.text);
      works.push(w);
    }
  }
  works.sort((a, b) => a.id.localeCompare(b.id));
  const pdir = join(root, 'catalog/plates');
  const plates = (existsSync(pdir) ? readdirSync(pdir) : []).filter((f) => f.endsWith('.json') && !f.startsWith('_')).sort()
    .map((f) => JSON.parse(readFileSync(join(pdir, f), 'utf8')));
  const tdir = join(base, '_trails');
  const trails = (existsSync(tdir) ? readdirSync(tdir) : []).filter((f) => f.endsWith('.json')).sort()
    .map((f) => JSON.parse(readFileSync(join(tdir, f), 'utf8')));
  const claudeShelf = jsonIf(join(base, 'claude-shelf.json'), null);
  const tags = jsonIf(join(base, 'tags.json'), {});
  const papers = loadHousePapers(root);
  const byId = new Map(works.map((w) => [w.id, w]));
  const plateById = new Map(plates.map((p) => [p.id, p]));
  const stacks = { works, plates, shelves, trails, claudeShelf, tags, papers, byId, plateById };
  stacks.picks = pickOrder(stacks);
  stacks.authors = authorsOf(works);
  return stacks;
}

// House papers (S-000001 …): the library's own writing, in catalog/open-stacks/*.{en,zh}.md. Not counted as works.
function loadHousePapers(root) {
  const dir = join(root, 'catalog/open-stacks');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.en.md')).sort().map((f) => {
    const baseName = f.replace(/\.en\.md$/, '');
    const en = frontMatter(readFileSync(join(dir, f), 'utf8'));
    const zhPath = join(dir, baseName + '.zh.md');
    const zh = existsSync(zhPath) ? frontMatter(readFileSync(zhPath, 'utf8')) : en;
    return { id: en.meta.accession, slug: baseName.replace(/^S-\d+-/, ''), house: true, en: { ...en.meta, body: en.body }, zh: { ...zh.meta, body: zh.body } };
  });
}

// Claude's shelf, in display order, each with its permanent accession number.
function pickOrder(stacks) {
  const picks = stacks.works.filter((w) => w.pick);
  const cs = stacks.claudeShelf;
  if (!cs || !Array.isArray(cs.entries)) return picks.map((w, i) => ({ n: i + 1, work: w }));
  const nOf = new Map(cs.entries.map((e) => [e.id, e.n]));
  const order = Array.isArray(cs.order) && cs.order.length ? cs.order : cs.entries.map((e) => e.id);
  const listed = order.map((id) => stacks.byId.get(id)).filter((w) => w && w.pick);
  const rest = picks.filter((w) => !listed.includes(w));
  let next = Math.max(0, ...cs.entries.map((e) => e.n), ...((cs.retired || []).map((e) => e.n))) + 1;
  return [...listed, ...rest].map((w) => ({ n: nOf.get(w.id) ?? next++, work: w }));
}
export const pickNo = (stacks, w) => (stacks.picks.find((p) => p.work === w) || {}).n;

// ---- naming ----
export const authorSlug = (w) => String(w.author.en || w.author.orig).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'anonymous';
function authorsOf(works) {
  const m = new Map();
  for (const w of works) {
    const k = authorSlug(w);
    if (!m.has(k)) m.set(k, { slug: k, author: w.author, works: [] });
    m.get(k).works.push(w);
  }
  return [...m.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

export const workHref = (lang, w) => href(lang, 'open-stacks/' + w.slug);
export const plateHref = (lang, p) => href(lang, 'open-stacks/plates/' + p.slug);
export const shelfHref = (lang, key) => href(lang, 'open-stacks/' + key);
export const shortWork = (w) => '/s/' + w.id.slice(2);
export const shortPlate = (p) => '/g/' + p.id.slice(2);
export const textLang = (w) => String(w.lang || 'en');
export const isChineseText = (w) => /^(lzh|zh)/.test(textLang(w));
export const isClassical = (w) => /^lzh/.test(textLang(w));
export const hasHant = (w) => /-Hant$/.test(textLang(w));

// The title rule: normally the original-script title; for a historical translation, the title in the text's language.
export function titles(w, lang) {
  const pageTitle = w.title[lang] || w.title.en;
  let main = w.title.orig, mainLang = textLang(w);
  if (w.translator && w.title[String(w.lang).slice(0, 2)]) main = w.title[String(w.lang).slice(0, 2)];
  // Chinese text on the Chinese site: show the page-script title (simplified) when they differ only by script.
  const mainShown = lang === 'zh' && hasHant(w) && w.title.zh ? w.title.zh : main;
  const sub = pageTitle && pageTitle !== main && pageTitle !== mainShown ? pageTitle : '';
  return { main: mainShown, mainLang: lang === 'zh' && hasHant(w) ? 'zh-Hans' : mainLang, orig: main, sub };
}

export function authorLabel(w, lang) {
  const a = w.author;
  const page = a[lang] || a.en;
  return page !== a.orig && a.orig ? { name: page, orig: a.orig, dates: a.dates } : { name: page, orig: '', dates: a.dates };
}

export const yearLabel = (w, lang) => (w.year_display && (w.year_display[lang] || w.year_display.en)) || String(w.year);

const PERIODS = [
  [-99999, -221, '先秦', 'Pre-Qin'], [-221, 220, '秦汉', 'Qin–Han'], [220, 589, '魏晋南北朝', 'Six Dynasties'], [589, 907, '隋唐', 'Sui–Tang'],
  [907, 960, '五代', 'Five Dynasties'], [960, 1279, '宋', 'Song'], [1279, 1368, '元', 'Yuan'], [1368, 1644, '明', 'Ming'], [1644, 1912, '清', 'Qing'], [1912, 99999, '民国以后', 'Republican era and after'],
];
export function periodOf(w, lang) {
  if (w.period) return w.period[lang] || w.period.en;
  if (!isChineseText(w)) return '';
  const p = PERIODS.find(([a, b]) => w.year >= a && w.year < b);
  return p ? (lang === 'zh' ? p[2] : p[3]) : '';
}
export const ERAS = [
  { key: 'bce', from: -99999, to: 1, en: 'Before 1 CE', zh: '公元前' },
  { key: '1', from: 1, to: 600, en: '1–599', zh: '1–599 年' },
  { key: '600', from: 600, to: 1000, en: '600–999', zh: '600–999 年' },
  { key: '1000', from: 1000, to: 1400, en: '1000–1399', zh: '1000–1399 年' },
  { key: '1400', from: 1400, to: 1800, en: '1400–1799', zh: '1400–1799 年' },
  { key: '1800', from: 1800, to: 1900, en: '1800s', zh: '19 世纪' },
  { key: '1900', from: 1900, to: 99999, en: '1900 on', zh: '1900 年以后' },
];
export const eraOf = (w) => (ERAS.find((e) => w.year >= e.from && w.year < e.to) || ERAS[ERAS.length - 1]).key;

// Rights card code: PD · age, PD · US gov, PD · dedicated, or the licence name.
export function rightsKind(w) {
  const r = w.rights || {};
  if (r.kind) return r.kind;
  if (r.status === 'open-license') return 'license';
  const b = (r.basis && r.basis.en) || '';
  if (/government|17 U\.S\.C|federal/i.test(b)) return 'us-gov';
  if (/dedicat|public domain by its author|CC0|placed in the public domain|released into the public domain/i.test(b)) return 'dedicated';
  return 'age';
}
export function rightsCode(w, lang) {
  const k = rightsKind(w);
  if (k === 'license') return w.rights.license || (lang === 'zh' ? '开放许可' : 'Open licence');
  return lang === 'zh' ? { age: '公版 · 年代', 'us-gov': '公版 · 美国政府', dedicated: '公版 · 作者献出' }[k] : { age: 'PD · age', 'us-gov': 'PD · US gov', dedicated: 'PD · dedicated' }[k];
}

// Translation status into a language: null, { full: true } or { full: false, label }.
export function translationInto(w, lang) {
  const t = (w.translations || {})[lang];
  if (!t || !w.trans[lang]) return null;
  if (typeof t === 'string') return { full: true, by: t };
  return { full: t.coverage !== 'partial', by: t.by || 'Claude', label: t.label || null, segments: t.segments || [] };
}

// Split a classical line at its single mid-line caesura (，or ；). Returns null if there is not exactly one.
export function splitCaesura(line) {
  const s = String(line).trim();
  const marks = [...s.matchAll(/[，；,;]/g)].filter((m) => m.index > 0 && m.index < s.length - 1);
  if (marks.length !== 1) return null;
  const i = marks[0].index + 1;
  return [s.slice(0, i), s.slice(i)];
}

// Opening lines for a work card (aria-hidden): verse lines (CJK couplets as half-lines), a prose opening, or code.
export function openingLines(w, lang, max = 9) {
  const src = (lang === 'zh' && w.textHans) ? w.textHans : w.text;
  const body = src.replace(/^#{2,3} .*$/gm, '').trim();
  if (w.form === 'code') return { kind: 'code', lines: body.replace(/```[^\n]*\n?/g, '').split('\n').slice(0, 8) };
  if (w.form === 'verse') {
    const out = [];
    for (const raw of body.split('\n')) {
      const l = raw.trim();
      if (!l) { if (out.length && out[out.length - 1] !== '') out.push(''); continue; }
      if (isChineseText(w) && l.length > 8) {
        // A couplet-per-line source line ("蒹葭蒼蒼，白露為霜。所謂伊人，在水一方。"): sentences first, then the caesura.
        for (const sentence of l.match(/[^。？！；]+[。？！；]?/g) || [l]) {
          const half = sentence.length > 8 ? splitCaesura(sentence) : null;
          if (half) out.push(...half);
          else if (sentence.length > 9 && /，/.test(sentence)) out.push(...sentence.split(/(?<=，)/));
          else out.push(sentence);
        }
      } else out.push(l);
      if (out.length >= max) break;
    }
    return { kind: 'verse', lines: out.filter((x, i) => !(x === '' && i === 0)).slice(0, max) };
  }
  const para = body.split(/\n\s*\n/).find((p) => p.trim().length > 0) || '';
  const flat = para.replace(/\s*\n\s*/g, isChineseText(w) ? '' : ' ').replace(/[*_]/g, '');
  const cut = isChineseText(w) ? flat.slice(0, 140) : flat.split(/\s+/).slice(0, 50).join(' ');
  return { kind: 'prose', lines: [cut + (cut.length < flat.length ? '…' : '')] };
}

// Glosses and marginalia anchor on the text as read: emphasis markers removed. Shared by the renderer and the checker.
export const anchorText = (src) => String(src ?? '').replace(/\*\*?/g, '');

// Related works: Claude's pairs first, then the same author, the same tags, the same era.
export function related(w, stacks, limit = 8) {
  const seen = new Set([w.id]);
  const out = [];
  const push = (x) => { if (x && !seen.has(x.id) && out.length < limit) { seen.add(x.id); out.push(x); } };
  for (const id of w.pairs || []) push(stacks.byId.get(id));
  const ak = authorSlug(w);
  for (const x of stacks.works) if (authorSlug(x) === ak) push(x);
  const tags = new Set(w.tags || []);
  const scored = stacks.works.filter((x) => !seen.has(x.id)).map((x) => [x, (x.tags || []).filter((t) => tags.has(t)).length + (x.shelf === w.shelf ? 0.5 : 0)]).filter(([, s]) => s >= 1.5).sort((a, b) => b[1] - a[1]);
  for (const [x] of scored) push(x);
  for (const x of stacks.works) if (x.shelf === w.shelf && eraOf(x) === eraOf(w)) push(x);
  return out;
}

export function tagLabel(stacks, tag, lang) {
  const t = stacks.tags && stacks.tags[tag];
  return t ? (t[lang] || t.en) : tag;
}

// Counts that copy may quote; never typed by hand.
export function counts(stacks) {
  const works = stacks.works.length;
  const plates = stacks.plates.length;
  const authors = stacks.authors.length;
  const picks = stacks.picks.length;
  const years = stacks.works.map((w) => w.year);
  const first = stacks.works.reduce((a, b) => (b.year < a.year ? b : a), stacks.works[0]);
  const last = stacks.works.reduce((a, b) => (b.year > a.year ? b : a), stacks.works[0]);
  return { works, plates, authors, picks, trails: stacks.trails.length, min: Math.min(...years), max: Math.max(...years), first, last };
}

// ---- text rendering (the work page uses its own renderer in site/src/stacks/work.mjs; this one serves excerpts) ----
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>');
const anchor = (s, n) => {
  const a = s.toLowerCase().normalize('NFKD').replace(/[^\w㐀-鿿]+/g, '-').replace(/^-+|-+$/g, '');
  return (a && a.length < 60 ? a : 'part') + '-' + n;
};
// Split a text into blocks: { type: 'h', level, text, id } | { type: 'p', lines } | { type: 'code', text }.
export function blocks(src) {
  const out = [];
  let h = 0;
  const parts = String(src).replace(/\n{3,}/g, '\n\n').split(/\n```[^\n]*\n([\s\S]*?)\n```\n?/);
  parts.forEach((part, i) => {
    if (i % 2 === 1) { out.push({ type: 'code', text: part }); return; }
    for (const chunk of part.split(/\n\s*\n/)) {
      const lines = chunk.split('\n').filter((l) => l.trim() !== '');
      if (!lines.length) continue;
      const m = lines[0].match(/^(#{2,3})\s+(.+)$/);
      if (m) {
        out.push({ type: 'h', level: m[1].length, text: m[2].trim(), id: anchor(m[2], ++h) });
        if (lines.length > 1) out.push({ type: 'p', lines: lines.slice(1) });
      } else out.push({ type: 'p', lines });
    }
  });
  return out;
}
export function toc(src) {
  return blocks(src).filter((b) => b.type === 'h' && b.level === 2).map((b) => ({ id: b.id, text: b.text }));
}
export function renderText(src, form) {
  return blocks(src).map((b) => {
    if (b.type === 'h') return `<h${b.level} id="${b.id}">${inline(b.text)}</h${b.level}>`;
    if (b.type === 'code') return `<pre class="code"><code>${esc(b.text)}</code></pre>`;
    if (form === 'verse') {
      return `<p class="stanza">${b.lines.map((l) => {
        const lead = (l.match(/^[ 　]*/)[0].replace(/　/g, '  ').length) >> 1;
        return `<span class="line${lead ? ' i' + Math.min(lead, 4) : ''}">${inline(l.trim())}</span>`;
      }).join('')}</p>`;
    }
    if (form === 'aphorisms') return `<p class="aph">${b.lines.map((l) => inline(l.trim())).join('<br>')}</p>`;
    return `<p>${b.lines.map((l) => inline(l.trim())).join(' ')}</p>`;
  }).join('\n');
}

// ---- search index ----
export function searchIndex(stacks) {
  return {
    works: stacks.works.map((w) => ({
      i: w.id, s: w.slug, h: w.shelf, y: w.year, l: w.lang, e2: eraOf(w), r: rightsKind(w),
      t: [w.title.orig, w.title.en, w.title.zh].filter((x, k, a) => x && a.indexOf(x) === k).join(' / '),
      a: [w.author.orig, w.author.en, w.author.zh].filter((x, k, a) => x && a.indexOf(x) === k).join(' / '),
      e: (w.excerpt && (w.excerpt.orig || '')).slice(0, 120), ez: isChineseText(w) && w.excerpt && w.excerpt.zh !== w.excerpt.orig ? (w.excerpt.zh || '').slice(0, 120) : '',
      p: w.pick ? 1 : 0, g: w.tags || [], tz: translationInto(w, 'zh') ? (translationInto(w, 'zh').full ? 2 : 1) : 0,
    })),
    plates: stacks.plates.map((p) => ({ i: p.id, s: p.slug, t: [p.title.orig, p.title.en, p.title.zh].filter(Boolean).join(' / '), a: [p.artist.orig, p.artist.en].filter(Boolean).join(' / '), y: p.year })),
  };
}
