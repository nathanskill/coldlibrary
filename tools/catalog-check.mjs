#!/usr/bin/env node
// Checks the rated catalogue: albums (catalog/albums), book entries (catalog/books) and the scores on
// Open Stacks works (catalog/stacks/*/*/work.json). Run: node tools/catalog-check.mjs [--warn]
// Exits 1 on any error. Prints counts and the score distribution of each group (see catalog/SCORING.md).
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CAT = join(ROOT, 'catalog');
const GENRES = JSON.parse(readFileSync(join(CAT, 'albums/genres.json'), 'utf8'));
const CATEGORIES = JSON.parse(readFileSync(join(CAT, 'categories.json'), 'utf8'));
const errors = [], warnings = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const warn = (where, msg) => warnings.push(`${where}: ${msg}`);
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s || ''));
const tri = (o) => o && typeof o === 'object' && ['orig', 'en', 'zh'].every((k) => typeof o[k] === 'string' && o[k].trim());
const bi = (o) => o && typeof o === 'object' && typeof o.en === 'string' && o.en.trim() && typeof o.zh === 'string' && o.zh.trim();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const PRIVATE = /nathan|zhennan|yuzhennan|@gmail\.com/i;
const zhLen = (s) => [...String(s).replace(/\s/g, '')].length;
const words = (s) => String(s).trim().split(/\s+/).length;

function checkScore(where, x, { allowScripture = false } = {}) {
  if (x.score === null) {
    if (allowScripture && x.unscored === 'scripture') return null;
    err(where, 'score is null without "unscored": "scripture"');
    return null;
  }
  const v = x.score && x.score.value;
  if (typeof v !== 'number' || v < 5 || v > 9.9 || Math.round(v * 10) / 10 !== v) err(where, `score.value must be 5.0–9.9 with one decimal (got ${v})`);
  return v;
}
function checkReview(where, r) {
  if (!bi(r)) return err(where, 'review needs en and zh');
  if (/[!！]/.test(r.en + r.zh)) err(where, 'no exclamation marks in the review');
  const w = words(r.en), z = zhLen(r.zh);
  if (w < 30 || w > 110) warn(where, `review.en is ${w} words (aim 40–90)`);
  if (z < 45 || z > 190) warn(where, `review.zh is ${z} characters (aim 60–150)`);
  if (/\b(I|I've|I'd) (listened|heard|played|cried)\b|when I (first )?heard/i.test(r.en)) err(where, 'a review must not claim listening');
}
function stats(name, values) {
  const v = values.filter((x) => typeof x === 'number').sort((a, b) => a - b);
  if (!v.length) return `${name}: no scores`;
  const med = v[Math.floor(v.length / 2)];
  const hi = v.filter((x) => x >= 9.3).length, lo = v.filter((x) => x <= 8.0).length;
  return `${name}: ${v.length} scored, median ${med}, ≥9.3 ${hi} (${Math.round(hi / v.length * 100)}%), ≤8.0 ${lo} (${Math.round(lo / v.length * 100)}%), range ${v[0]}–${v[v.length - 1]}`;
}

// ---- Open Stacks works: ids for cross-reference, and their scores
const stackIds = new Set();
const workScores = [];
let works = 0, scored = 0;
for (const shelf of readdirSync(join(CAT, 'stacks'))) {
  const sdir = join(CAT, 'stacks', shelf);
  if (shelf.startsWith('_') || !existsSync(join(sdir))) continue;
  let entries; try { entries = readdirSync(sdir, { withFileTypes: true }); } catch { continue; }
  for (const e of entries) {
    if (!e.isDirectory() || !/^S-\d{6}-/.test(e.name)) continue;
    const p = join(sdir, e.name, 'work.json');
    if (!existsSync(p)) continue;
    const w = JSON.parse(readFileSync(p, 'utf8'));
    stackIds.add(w.id); works++;
    const where = `stacks/${shelf}/${e.name}`;
    if (w.category !== undefined && !CATEGORIES[w.category]) err(where, `category "${w.category}" is not in categories.json`);
    if (w.score === undefined) continue;
    scored++;
    const v = checkScore(where, w);
    workScores.push(v);
    if (!bi(w.score && w.score.note)) err(where, 'score.note needs en and zh');
    else if (/[!！]/.test(w.score.note.en + w.score.note.zh)) err(where, 'no exclamation marks in score.note');
    if (PRIVATE.test(JSON.stringify(w.score || {}))) err(where, 'private details in score');
  }
}

// ---- albums
const ids = new Set(), slugs = new Set();
const albumScores = [];
const albumFiles = existsSync(join(CAT, 'albums')) ? readdirSync(join(CAT, 'albums')).filter((f) => /^A-\d{6}-.+\.json$/.test(f)) : [];
const mbids = new Set();
for (const f of albumFiles) {
  const where = `albums/${f}`;
  let a; try { a = JSON.parse(readFileSync(join(CAT, 'albums', f), 'utf8')); } catch (e) { err(where, 'not valid JSON: ' + e.message); continue; }
  if (!/^A-\d{6}$/.test(a.id) || !f.startsWith(a.id + '-')) err(where, 'id must be A-NNNNNN and match the file name');
  if (ids.has(a.id)) err(where, `duplicate id ${a.id}`); ids.add(a.id);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug || '') || f !== `${a.id}-${a.slug}.json`) err(where, 'slug must be lowercase ASCII words joined by - and match the file name');
  if (slugs.has('a:' + a.slug)) err(where, `duplicate slug ${a.slug}`); slugs.add('a:' + a.slug);
  if (!tri(a.title)) err(where, 'title needs orig, en, zh');
  if (!tri(a.artist)) err(where, 'artist needs orig, en, zh');
  if (a.artist && a.artist.mbid != null && !UUID.test(a.artist.mbid)) err(where, 'artist.mbid must be an MBID');
  if (typeof a.year !== 'number' || a.year < 1900 || a.year > 2026) err(where, 'year must be a number 1900–2026');
  if (!/^\d{4}(-\d{2}(-\d{2})?)?$/.test(a.released || '') || String(a.released).slice(0, 4) !== String(a.year)) err(where, 'released must be YYYY[-MM[-DD]] and agree with year');
  if (!/^[A-Z]{2}$/.test(a.region || '')) err(where, 'region must be an ISO 3166-1 alpha-2 code');
  if (!/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(a.lang || '')) err(where, 'lang must be a BCP 47 code (zxx for instrumental)');
  if (!Array.isArray(a.genres) || !a.genres.length || a.genres.length > 3 || a.genres.some((g) => !GENRES[g])) err(where, 'genres: one to three keys from albums/genres.json');
  if (a.style != null && !bi(a.style)) err(where, 'style needs en and zh');
  if (!UUID.test(a.mbid || '')) err(where, 'mbid must be a release-group MBID');
  if (mbids.has(a.mbid)) err(where, `duplicate release group ${a.mbid}`); mbids.add(a.mbid);
  if (!a.links || a.links.musicbrainz !== `https://musicbrainz.org/release-group/${a.mbid}`) err(where, 'links.musicbrainz must be the release-group URL');
  for (const [k, u] of Object.entries(a.links || {})) if (u !== null && !/^https:\/\//.test(u)) err(where, `links.${k} must be https or null`);
  if (a.tracks != null && (!Number.isInteger(a.tracks) || a.tracks < 1)) err(where, 'tracks must be a positive integer');
  if (a.length != null && !/^\d{1,3}:\d{2}$/.test(a.length)) err(where, 'length must be m:ss');
  if (typeof a.start_with !== 'string' || !a.start_with.trim()) err(where, 'start_with needs a track title');
  albumScores.push(checkScore(where, a));
  checkReview(where, a.review);
  if (!isDate(a.checked)) err(where, 'checked must be YYYY-MM-DD');
  if (PRIVATE.test(JSON.stringify(a))) err(where, 'private details');
}

// ---- books
const bookScores = {};
const bookFiles = existsSync(join(CAT, 'books')) ? readdirSync(join(CAT, 'books')).filter((f) => /^B-\d{6}-.+\.json$/.test(f)) : [];
const qids = new Set();
for (const f of bookFiles) {
  const where = `books/${f}`;
  let b; try { b = JSON.parse(readFileSync(join(CAT, 'books', f), 'utf8')); } catch (e) { err(where, 'not valid JSON: ' + e.message); continue; }
  if (!/^B-\d{6}$/.test(b.id) || !f.startsWith(b.id + '-')) err(where, 'id must be B-NNNNNN and match the file name');
  if (ids.has(b.id)) err(where, `duplicate id ${b.id}`); ids.add(b.id);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(b.slug || '') || f !== `${b.id}-${b.slug}.json`) err(where, 'slug must be lowercase ASCII words joined by - and match the file name');
  if (slugs.has('b:' + b.slug)) err(where, `duplicate slug ${b.slug}`); slugs.add('b:' + b.slug);
  if (!CATEGORIES[b.category] || b.category === 'music') err(where, 'category must be a book category from categories.json');
  if (!tri(b.title)) err(where, 'title needs orig, en, zh');
  if (b.author !== null && (!tri(b.author) || !b.author.dates)) err(where, 'author is null or needs orig, en, zh and dates');
  if (b.author === null && b.category === 'faith' && !bi(b.tradition)) err(where, 'an authorless faith text needs tradition');
  if (typeof b.year !== 'number') err(where, 'year must be a number (negative for BCE)');
  if (!bi(b.year_display)) err(where, 'year_display needs en and zh');
  if (!/^[a-z]{2,3}(-[A-Za-z0-9]+)*$/.test(b.lang || '')) err(where, 'lang must be a BCP 47 code');
  if (!bi(b.origin)) err(where, 'origin needs en and zh');
  if (!['free', 'none', 'library'].includes(b.full_text)) err(where, 'full_text must be free, none or library');
  if (b.full_text === 'library') err(where, 'the Open Stacks already holds this whole work: no book entry is needed');
  if (b.full_text === 'free' && (!Array.isArray(b.read) || !b.read.length)) err(where, 'full_text "free" needs read links');
  if (b.full_text === 'none' && b.read && b.read.length) err(where, 'an in-copyright book has no read links');
  for (const r of b.read || []) if (!r.name || !/^https:\/\//.test(r.url || '') || !bi(r.note)) err(where, 'each read link needs name, https url and note en/zh');
  for (const s of b.stacks || []) if (!stackIds.has(s)) err(where, `stacks: ${s} is not an Open Stacks work`);
  if (!/^Q\d+$/.test(b.wikidata || '')) err(where, 'wikidata must be a Q-id');
  else { if (qids.has(b.wikidata)) err(where, `duplicate wikidata ${b.wikidata}`); qids.add(b.wikidata); }
  const v = checkScore(where, b, { allowScripture: b.category === 'faith' });
  (bookScores[b.category] = bookScores[b.category] || []).push(v);
  checkReview(where, b.review);
  if (!isDate(b.checked)) err(where, 'checked must be YYYY-MM-DD');
  if (PRIVATE.test(JSON.stringify(b))) err(where, 'private details');
}

console.log(`works ${works} (${scored} scored), albums ${albumFiles.length}, books ${bookFiles.length} (${Object.entries(bookScores).map(([k, v]) => `${k} ${v.length}`).join(', ')})`);
console.log('  ' + stats('works', workScores));
console.log('  ' + stats('albums', albumScores));
for (const [k, v] of Object.entries(bookScores)) console.log('  ' + stats('books/' + k, v) + (v.includes(null) ? `, unscored scripture ${v.filter((x) => x === null).length}` : ''));
if (process.argv.includes('--warn')) for (const w of warnings) console.log('warning ' + w);
for (const e of errors) console.log('error ' + e);
console.log(errors.length ? `${errors.length} error(s)` : `ok${warnings.length ? ` (${warnings.length} warning(s), --warn lists them)` : ''}`);
process.exit(errors.length ? 1 : 0);
