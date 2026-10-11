#!/usr/bin/env node
// Validate every work in catalog/stacks and every plate in catalog/plates against catalog/stacks/README.md.
// Usage: node tools/stacks-check.mjs [--quiet]     Exit code 1 if anything is wrong.
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const stacks = join(root, 'catalog/stacks');
const platesDir = join(root, 'catalog/plates');
const SHELVES = ['poetry', 'prose', 'thought', 'science', 'computing', 'records'];
const FORMS = ['verse', 'prose', 'code', 'aphorisms'];
const STATUS = ['public-domain', 'open-license'];
const errors = [];
const seen = new Map();
const slugs = new Map();
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const bi = (o) => o && typeof o.en === 'string' && o.en.trim() && typeof o.zh === 'string' && o.zh.trim();
const tri = (o) => bi(o) && typeof o.orig === 'string' && o.orig.trim();

let works = 0, plates = 0, chars = 0;
const shelfCount = {};

for (const shelf of existsSync(stacks) ? readdirSync(stacks) : []) {
  const sdir = join(stacks, shelf);
  if (!statSync(sdir).isDirectory() || shelf.startsWith('_')) continue;
  if (!SHELVES.includes(shelf)) { err(shelf, 'unknown shelf folder'); continue; }
  for (const f of readdirSync(sdir)) {
    const d = join(sdir, f);
    if (!statSync(d).isDirectory()) continue;
    const where = `${shelf}/${f}`;
    const wj = join(d, 'work.json');
    if (!existsSync(wj)) { err(where, 'missing work.json'); continue; }
    let w;
    try { w = JSON.parse(readFileSync(wj, 'utf8')); } catch (e) { err(where, 'work.json is not valid JSON: ' + e.message); continue; }
    works++; shelfCount[shelf] = (shelfCount[shelf] || 0) + 1;
    if (!/^S-\d{6}$/.test(w.id || '')) err(where, 'id must look like S-001001');
    if (f !== `${w.id}-${w.slug}`) err(where, `folder name must be "${w.id}-${w.slug}"`);
    if (seen.has(w.id)) err(where, `duplicate id ${w.id} (also ${seen.get(w.id)})`); else seen.set(w.id, where);
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(w.slug || '')) err(where, 'slug must be lowercase ascii with hyphens');
    if (slugs.has(w.slug)) err(where, `duplicate slug ${w.slug}`); else slugs.set(w.slug, where);
    if (w.shelf !== shelf) err(where, `shelf "${w.shelf}" does not match folder "${shelf}"`);
    if (!FORMS.includes(w.form)) err(where, `form must be one of ${FORMS.join(', ')}`);
    if (!w.lang) err(where, 'lang is required');
    if (!tri(w.title)) err(where, 'title needs orig, en and zh');
    if (!tri(w.author) || !w.author.dates) err(where, 'author needs orig, en, zh and dates');
    if (typeof w.year !== 'number') err(where, 'year must be a number (negative for BCE)');
    if (!bi(w.year_display)) err(where, 'year_display needs en and zh');
    if (!bi(w.edition)) err(where, 'edition needs en and zh');
    if (!w.source || !/^https:\/\//.test(w.source.url || '') || !w.source.name || !w.source.retrieved) err(where, 'source needs name, https url and retrieved date');
    const r = w.rights || {};
    if (!STATUS.includes(r.status)) err(where, `rights.status must be ${STATUS.join(' or ')}`);
    if (!bi(r.basis)) err(where, 'rights.basis needs en and zh');
    if (r.status === 'open-license' && (!r.license || !r.license_url)) err(where, 'an open licence needs rights.license and rights.license_url');
    if (w.translator && (!w.translator.name || !w.translator.dates || typeof w.translator.year !== 'number')) err(where, 'translator needs name, dates and year');
    if (w.translator && w.translator.year >= 1931 && r.status === 'public-domain' && !/government|gov|dedicat|CC0/i.test(r.basis.en)) err(where, 'a public-domain translation must have been published before 1931');
    if (!bi(w.note)) err(where, 'note needs en and zh');
    if (w.pick !== null && w.pick !== undefined && !bi(w.pick)) err(where, 'pick must be null or have en and zh');
    if (!Array.isArray(w.tags)) err(where, 'tags must be an array');
    if (!w.excerpt || !w.excerpt.orig) err(where, 'excerpt.orig is required');
    const tf = join(d, 'text.md');
    if (!existsSync(tf)) { err(where, 'missing text.md'); continue; }
    const text = readFileSync(tf, 'utf8');
    chars += text.length;
    if (text.trim().length < 20) err(where, 'text.md is nearly empty');
    if (/<\/?[a-z][^>]*>/i.test(text)) err(where, 'text.md contains HTML tags');
    if (/Project Gutenberg|\*\*\* ?START OF|\*\*\* ?END OF/i.test(text)) err(where, 'text.md still contains Gutenberg boilerplate');
    if (/-Hant$/.test(w.lang) && !existsSync(join(d, 'text.zh-Hans.md'))) err(where, `${w.lang} text needs text.zh-Hans.md (python3 tools/stacks-hans.py)`);
    for (const [lang, who] of Object.entries(w.translations || {})) {
      if (!existsSync(join(d, `translation.${lang}.md`))) err(where, `translations lists ${lang} but translation.${lang}.md is missing`);
      if (!who) err(where, `translations.${lang} must name the translator`);
    }
    for (const g of readdirSync(d)) if (/^translation\.(.+)\.md$/.test(g) && !(w.translations || {})[g.match(/^translation\.(.+)\.md$/)[1]]) err(where, `${g} exists but is not listed in translations`);
    if (w.plate && !existsSync(join(root, 'site/public/assets/plates', w.plate + '.jpg'))) err(where, `plate ${w.plate} has no image`);
  }
}

for (const f of existsSync(platesDir) ? readdirSync(platesDir).filter((x) => x.endsWith('.json')) : []) {
  const where = 'plates/' + f;
  let p;
  try { p = JSON.parse(readFileSync(join(platesDir, f), 'utf8')); } catch (e) { err(where, 'not valid JSON: ' + e.message); continue; }
  plates++;
  if (!/^G-\d{6}$/.test(p.id || '')) err(where, 'id must look like G-008001');
  if (f !== `${p.id}-${p.slug}.json`) err(where, `file name must be "${p.id}-${p.slug}.json"`);
  if (seen.has(p.id)) err(where, `duplicate id ${p.id}`); else seen.set(p.id, where);
  if (!tri(p.title)) err(where, 'title needs orig, en and zh');
  if (!tri(p.artist) || !p.artist.dates) err(where, 'artist needs orig, en, zh and dates');
  if (typeof p.year !== 'number' || !bi(p.year_display)) err(where, 'year and year_display are required');
  if (!bi(p.medium)) err(where, 'medium needs en and zh');
  if (!p.institution || !p.institution.name || !/^https:\/\//.test(p.institution.object_url || '')) err(where, 'institution needs name and https object_url');
  if (!p.image || !/^https:\/\//.test(p.image.source_url || '') || !p.image.width || !p.image.height) err(where, 'image needs source_url, width, height');
  if (!p.rights || !STATUS.includes(p.rights.status) || !bi(p.rights.basis)) err(where, 'rights needs status and basis');
  if (!bi(p.alt) || !bi(p.note)) err(where, 'alt and note need en and zh');
  for (const s of ['', '-sm']) if (!existsSync(join(root, 'site/public/assets/plates', `${p.id}${s}.jpg`))) err(where, `missing site/public/assets/plates/${p.id}${s}.jpg`);
}

if (!process.argv.includes('--quiet')) {
  console.log(`works ${works} (${Object.entries(shelfCount).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}), plates ${plates}, text ${Math.round(chars / 1000)}k chars`);
}
if (errors.length) { console.error(errors.join('\n')); console.error(`${errors.length} problem(s)`); process.exit(1); }
console.log('ok');
