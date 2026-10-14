// The rated catalogue (2026-10-15): what the library scores and remembers.
// Three kinds of entry share one shape: Open Stacks works (full text, catalog/stacks), book entries without
// full text (catalog/books) and albums (catalog/albums). Scores: catalog/SCORING.md.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { href, t, tagOf } from './lib.mjs';
import { workHref, titles, authorLabel, yearShort } from './stacks.mjs';

const readAll = (root, dir, re) => (existsSync(join(root, dir))
  ? readdirSync(join(root, dir)).filter((f) => re.test(f)).sort().map((f) => JSON.parse(readFileSync(join(root, dir, f), 'utf8')))
  : []);

// A person's key for tribute lamps: the English name as a slug, the same rule as the Open Stacks author pages.
export const personSlug = (p) => String((p && (p.en || p.orig)) || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export function loadCatalog(root, open) {
  const categories = JSON.parse(readFileSync(join(root, 'catalog/categories.json'), 'utf8'));
  const genres = JSON.parse(readFileSync(join(root, 'catalog/albums/genres.json'), 'utf8'));
  const albums = readAll(root, 'catalog/albums', /^A-\d{6}-.+\.json$/);
  const books = readAll(root, 'catalog/books', /^B-\d{6}-.+\.json$/);
  const shelfCat = {};
  for (const [k, c] of Object.entries(categories)) for (const s of c.shelves || []) shelfCat[s] = k;
  const entries = [
    ...open.works.map((w) => ({ kind: 'work', id: w.id, slug: w.slug, cat: w.category || shelfCat[w.shelf] || 'literature', score: w.score ? w.score.value : null, year: w.year, ref: w })),
    ...books.map((b) => ({ kind: 'book', id: b.id, slug: b.slug, cat: b.category, score: b.score ? b.score.value : null, scripture: b.unscored === 'scripture', year: b.year, ref: b })),
    ...albums.map((a) => ({ kind: 'album', id: a.id, slug: a.slug, cat: 'music', score: a.score ? a.score.value : null, year: a.year, ref: a })),
  ];
  const byId = new Map(entries.map((e) => [e.id, e]));
  const workEntry = new Map(entries.filter((e) => e.kind === 'work').map((e) => [e.ref.id, e]));
  return { categories, genres, albums, books, entries, byId, workEntry };
}

// Ranked entries of one category: scored ones by score, then older first, then catalogue number.
export function ranked(cat, key) {
  return cat.entries.filter((e) => e.cat === key && typeof e.score === 'number')
    .sort((a, b) => b.score - a.score || a.year - b.year || a.id.localeCompare(b.id));
}
export const catName = (lang, cat, key) => { const c = cat.categories[key]; return c ? (lang === 'zh' ? c.zh : c.en) : key; };
export const CHART_ORDER = ['literature', 'faith', 'history', 'thought', 'aesthetics', 'music', 'science', 'computing'];

export function entryHref(lang, e) {
  if (e.kind === 'work') return workHref(lang, e.ref);
  return href(lang, (e.kind === 'album' ? 'music/' : 'books/') + e.slug);
}

// Title for lists and headings: the original title, with the page-language title beside it when it differs.
export function entryTitle(lang, e) {
  if (e.kind === 'work') { const tt = titles(e.ref, lang); return { main: tt.main, tag: tt.mainLang, sub: tt.sub }; }
  const ti = e.ref.title;
  const page = ti[lang] || ti.en;
  const tag = e.kind === 'album' ? albumTitleLang(e.ref) : bookLang(e.ref);
  const sub = page && page !== ti.orig ? page : '';
  return { main: ti.orig, tag, sub };
}
const bookLang = (b) => tagOf(b.lang || 'en');
function albumTitleLang(a) {
  if (a.lang === 'zxx') return /[぀-ヿ]/.test(a.title.orig) ? 'ja' : /[㐀-鿿]/.test(a.title.orig) ? (a.region === 'HK' || a.region === 'TW' ? 'zh-Hant' : 'zh-Hans') : 'en';
  if (/^zh|^yue|^nan/.test(a.lang)) return a.region === 'HK' || a.region === 'TW' ? 'zh-Hant' : 'zh-Hans';
  return a.lang;
}
export const titleTag = (e) => entryTitle('en', e).tag;

// Who made it: { name, orig, tag } in the page language.
export function entryBy(lang, e) {
  if (e.kind === 'work') { const a = authorLabel(e.ref, lang); return { name: a.name, orig: a.orig, tag: tagOf(e.ref.orig_lang || e.ref.lang) }; }
  const p = e.kind === 'album' ? e.ref.artist : e.ref.author;
  if (!p) {
    const tr = e.ref.tradition;
    return { name: tr ? (tr[lang] || tr.en) : t(lang)('Anonymous', '佚名'), orig: '', tag: lang === 'zh' ? 'zh-CN' : 'en' };
  }
  const name = p[lang] || p.en;
  return { name, orig: p.orig && p.orig !== name && !String(name).includes(p.orig) ? p.orig : '', tag: e.kind === 'album' ? albumTitleLang(e.ref) : bookLang(e.ref) };
}
export function entryYear(lang, e) {
  if (e.kind === 'work') return yearShort(e.ref, lang);
  if (e.kind === 'album') return String(e.ref.year);
  const y = e.ref.year;
  const disp = e.ref.year_display && (e.ref.year_display[lang] || e.ref.year_display.en);
  if (disp && disp.length <= 14) return disp;
  return y < 0 ? (lang === 'zh' ? `前 ${-y} 年` : `${-y} BCE`) : String(y);
}

// Score notes: the reason line for works, the review for books and albums.
export const scoreNote = (lang, e) => (e.kind === 'work' ? e.ref.score && e.ref.score.note : e.ref.review) || null;

// Region names from ICU, with the forms Chinese readers expect for HK, MO and TW.
const REGION_ZH = { HK: '香港', MO: '澳门', TW: '台湾' };
export function regionName(lang, code) {
  if (lang === 'zh' && REGION_ZH[code]) return REGION_ZH[code];
  try { return new Intl.DisplayNames([lang === 'zh' ? 'zh-Hans' : 'en'], { type: 'region' }).of(code) || code; } catch { return code; }
}
export function langLabel(lang, code) {
  if (code === 'zxx') return t(lang)('Instrumental', '器乐');
  try { return new Intl.DisplayNames([lang === 'zh' ? 'zh-Hans' : 'en'], { type: 'language' }).of(code) || code; } catch { return code; }
}

// A score as text: one decimal, always.
export const fmtScore = (v) => (typeof v === 'number' ? v.toFixed(1) : '');

// The ids readers may rate, and the people one may light a lamp for. Written to api/_lib/rate-ids.json by
// tools/rate-ids.mjs so the API accepts nothing else; the build warns when the committed file is stale.
export function rateIds(cat, open) {
  const rate = cat.entries.filter((e) => !e.scripture).map((e) => e.id).sort();
  const people = new Set();
  for (const rec of open.authors || []) people.add('author:' + rec.slug);
  for (const b of cat.books) if (b.author) people.add('author:' + personSlug(b.author));
  for (const a of cat.albums) people.add('artist:' + personSlug(a.artist));
  return { rate, people: [...people].filter((p) => !/:$/.test(p)).sort() };
}
