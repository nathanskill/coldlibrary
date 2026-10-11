#!/usr/bin/env node
// Validate the Open Stacks against catalog/stacks/README.md and design spec v5 §4.6:
// every work, plate, shelf.json, claude-shelf.json, trail and tags.json.
// Usage: node tools/stacks-check.mjs [--quiet] [--warn]
//   --quiet  no summary line        --warn  list the warnings too (they never change the exit code)
// Exit code 1 if anything is wrong. The rules are also exported: checkStacks(root) → { errors, warnings, stats }.
import { readFileSync, readdirSync, existsSync, statSync, openSync, readSync, closeSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { RESERVED, measure, blocks, toc, rightsKind } from '../site/src/stacks.mjs';

const SHELVES = ['poetry', 'prose', 'thought', 'science', 'computing', 'records'];
const FORMS = ['verse', 'prose', 'code', 'aphorisms'];
const STATUS = ['public-domain', 'open-license'];
const RIGHTS_KINDS = ['age', 'us-gov', 'dedicated', 'license'];
const PLATE_RIGHTS_KINDS = [...RIGHTS_KINDS, 'cc0'];
const PLATE_KINDS = ['artwork', 'photograph', 'object'];
const TONES = ['snow', 'night', 'ink', 'warm', 'sea', 'green', 'dusk', ...SHELVES, 'lake', 'rust', 'spruce', 'slate', 'birch', 'brass'];
const WHERE = ['AU', 'EU', 'UK', 'CN', 'US'];
// Plate files (spec §2.6): suffix, long side, budget.
const PLATE_FILES = [['', 1600, 450 * 1024], ['-sm', 800, 120 * 1024], ['-480', 480, 40 * 1024]];

const bi = (o) => !!(o && typeof o.en === 'string' && o.en.trim() && typeof o.zh === 'string' && o.zh.trim());
const tri = (o) => bi(o) && typeof o.orig === 'string' && !!o.orig.trim();
const isDate = (s) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const isBcp47 = (s) => typeof s === 'string' && /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(s);
const isChinese = (lang) => /^(lzh|zh)/.test(String(lang || ''));
const jsonOf = (file) => JSON.parse(readFileSync(file, 'utf8'));
const textOf = (file) => readFileSync(file, 'utf8').replace(/\r\n?/g, '\n');

// Width, height and progressiveness from a JPEG's SOF marker (reads the head of the file only).
function jpegInfo(file) {
  const scan = (buf) => {
    if (buf[0] !== 0xff || buf[1] !== 0xd8) return null;
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const m = buf[i + 1];
      if (m === 0xff) { i++; continue; }
      if (m === 0xd8 || m === 0x01 || (m >= 0xd0 && m <= 0xd7)) { i += 2; continue; }
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7), progressive: m === 0xc2 || m === 0xc6 || m === 0xca || m === 0xce };
      i += 2 + buf.readUInt16BE(i + 2);
    }
    return null;
  };
  const fd = openSync(file, 'r');
  try {
    const head = Buffer.alloc(256 * 1024);
    const n = readSync(fd, head, 0, head.length, 0);
    return scan(head.subarray(0, n)) || scan(readFileSync(file));
  } finally { closeSync(fd); }
}

// Anchors are matched against the text without emphasis markers (the reader never sees them).
const plainText = (s) => String(s || '').replace(/\*\*|\*/g, '');
function nth(hay, needle, occ) {
  let i = -1;
  for (let k = 0; k < occ; k++) { i = hay.indexOf(needle, i + 1); if (i < 0) return -1; }
  return i;
}
const countOf = (hay, needle) => { let n = 0, i = -1; while (needle && (i = hay.indexOf(needle, i + 1)) >= 0) n++; return n; };
// The span of the simplified text that corresponds to hant[pos, pos + len). OpenCC converts character by character,
// so the texts align by code point (a character may become an astral one, e.g. 騞 → 𬴃), as a whole or line by line.
// Returns { text, at } (at: the code-unit position in hans) or null when the texts do not align.
function hansSpan(hant, hans, pos, len) {
  const cut = (s, i) => [...s.slice(0, i)].length;
  const span = (a, b, p) => {
    const A = [...a], B = [...b];
    if (A.length !== B.length) return null;
    const i = cut(a, p), n = [...a.slice(p, p + len)].length;
    return { text: B.slice(i, i + n).join(''), at: B.slice(0, i).join('').length };
  };
  const whole = span(hant, hans, pos);
  if (whole) return whole;
  const la = hant.split('\n'), lb = hans.split('\n');
  if (la.length !== lb.length) return null;
  let off = 0, offB = 0;
  for (let k = 0; k < la.length; k++) {
    if (pos < off + la[k].length + 1) {
      if (pos + len > off + la[k].length) return null;
      const r = span(la[k], lb[k], pos - off);
      return r ? { text: r.text, at: offB + r.at } : null;
    }
    off += la[k].length + 1; offB += lb[k].length + 1;
  }
  return null;
}

export function checkStacks(root) {
  const stacksDir = join(root, 'catalog/stacks');
  const platesDir = join(root, 'catalog/plates');
  const imgDir = join(root, 'site/public/assets/plates');
  const errors = [];
  const warnings = [];
  const byRule = {};
  const err = (where, rule, msg) => { errors.push(`${where}: ${msg}`); byRule[rule] = (byRule[rule] || 0) + 1; };
  const warn = (where, msg) => warnings.push(`${where}: ${msg}`);
  const seen = new Map();
  const slugs = new Map();
  const works = new Map();
  const stats = { works: 0, plates: 0, chars: 0, shelves: {}, partial: 0, gloss: 0, marginalia: 0 };

  // ---- vocabularies first, so works can be checked against them ----
  const tagsFile = join(stacksDir, 'tags.json');
  let tags = null;
  if (existsSync(tagsFile)) {
    try { tags = jsonOf(tagsFile); } catch (e) { err('tags.json', 'tags', 'not valid JSON: ' + e.message); }
    if (tags && (typeof tags !== 'object' || Array.isArray(tags))) { err('tags.json', 'tags', 'must be an object of { "<tag>": { en, zh, aliases } }'); tags = null; }
    if (tags) {
      const aliasOf = new Map();
      for (const [k, v] of Object.entries(tags)) {
        if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(k)) err('tags.json', 'tags', `tag "${k}" must be lowercase ascii with hyphens`);
        if (!bi(v)) err('tags.json', 'tags', `tag "${k}" needs en and zh labels`);
        if (['essay', 'poem', 'poems', 'poetry', 'prose', 'verse', 'aphorisms'].includes(k)) err('tags.json', 'tags', `"${k}" is a form word, not a tag (spec §4.6)`);
        if (v && v.aliases !== undefined && !(Array.isArray(v.aliases) && v.aliases.every((a) => typeof a === 'string' && a.trim()))) err('tags.json', 'tags', `tag "${k}": aliases must be a list of strings`);
        for (const a of (v && Array.isArray(v.aliases) ? v.aliases : [])) {
          if (a !== k && tags[a]) err('tags.json', 'tags', `alias "${a}" of "${k}" is itself a tag`);
          if (aliasOf.has(a) && aliasOf.get(a) !== k) err('tags.json', 'tags', `alias "${a}" is claimed by both "${aliasOf.get(a)}" and "${k}"`);
          aliasOf.set(a, k);
        }
      }
    }
  }
  const plateIds = new Set();
  for (const f of existsSync(platesDir) ? readdirSync(platesDir).filter((x) => x.endsWith('.json') && !x.startsWith('_')) : []) {
    try { const id = jsonOf(join(platesDir, f)).id; if (id) plateIds.add(id); } catch { /* reported below */ }
  }
  const plateRef = (where, rule, id, what = 'plate') => { if (id !== null && id !== undefined && !plateIds.has(id)) err(where, rule, `${what} ${id} is not in catalog/plates`); };

  // ---- works ----
  const unknownTags = new Map();
  for (const shelf of existsSync(stacksDir) ? readdirSync(stacksDir).sort() : []) {
    const sdir = join(stacksDir, shelf);
    if (!statSync(sdir).isDirectory() || shelf.startsWith('_')) continue;
    if (!SHELVES.includes(shelf)) { err(shelf, 'layout', 'unknown shelf folder'); continue; }
    for (const f of readdirSync(sdir).sort()) {
      const d = join(sdir, f);
      if (!statSync(d).isDirectory()) continue;
      const where = `${shelf}/${f}`;
      const wj = join(d, 'work.json');
      if (!existsSync(wj)) { err(where, 'layout', 'missing work.json'); continue; }
      let w;
      try { w = jsonOf(wj); } catch (e) { err(where, 'json', 'work.json is not valid JSON: ' + e.message); continue; }
      stats.works++; stats.shelves[shelf] = (stats.shelves[shelf] || 0) + 1;
      if (!/^S-\d{6}$/.test(w.id || '')) err(where, 'id', 'id must look like S-001001');
      if (f !== `${w.id}-${w.slug}`) err(where, 'id', `folder name must be "${w.id}-${w.slug}"`);
      if (seen.has(w.id)) err(where, 'id', `duplicate id ${w.id} (also ${seen.get(w.id)})`); else seen.set(w.id, where);
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(w.slug || '')) err(where, 'slug', 'slug must be lowercase ascii with hyphens');
      if (RESERVED.includes(w.slug)) err(where, 'slug', `slug "${w.slug}" is reserved for an Open Stacks page (${RESERVED.join(', ')})`);
      if (slugs.has(w.slug)) err(where, 'slug', `duplicate slug ${w.slug}`); else slugs.set(w.slug, where);
      if (w.shelf !== shelf) err(where, 'layout', `shelf "${w.shelf}" does not match folder "${shelf}"`);
      if (!FORMS.includes(w.form)) err(where, 'fields', `form must be one of ${FORMS.join(', ')}`);
      if (!w.lang) err(where, 'fields', 'lang is required');
      if (!tri(w.title)) err(where, 'fields', 'title needs orig, en and zh');
      if (!tri(w.author) || !w.author.dates) err(where, 'fields', 'author needs orig, en, zh and dates');
      if (typeof w.year !== 'number') err(where, 'fields', 'year must be a number (negative for BCE)');
      if (!bi(w.year_display)) err(where, 'fields', 'year_display needs en and zh');
      if (!bi(w.edition)) err(where, 'fields', 'edition needs en and zh');
      if (!w.source || !/^https:\/\//.test(w.source.url || '') || !w.source.name || !w.source.retrieved) err(where, 'fields', 'source needs name, https url and retrieved date');
      else if (!isDate(w.source.retrieved)) err(where, 'fields', 'source.retrieved must be YYYY-MM-DD');
      const r = w.rights || {};
      if (!STATUS.includes(r.status)) err(where, 'rights', `rights.status must be ${STATUS.join(' or ')}`);
      if (!bi(r.basis)) err(where, 'rights', 'rights.basis needs en and zh');
      if (r.status === 'open-license' && (!r.license || !r.license_url)) err(where, 'rights', 'an open licence needs rights.license and rights.license_url');
      if (r.verbatim_only && !String(r.notice || '').trim()) err(where, 'rights', 'verbatim_only needs rights.notice, shown word for word');
      if (r.kind !== undefined && r.kind !== null && !RIGHTS_KINDS.includes(r.kind)) err(where, 'rights', `rights.kind must be one of ${RIGHTS_KINDS.join(', ')}`);
      if (r.kind === 'license' && r.status !== 'open-license') err(where, 'rights', 'rights.kind "license" needs rights.status "open-license"');
      if (r.checked !== undefined && r.checked !== null) {
        const c = r.checked;
        if (!c || !Array.isArray(c.where) || !c.where.length || c.where.some((x) => !WHERE.includes(x))) err(where, 'rights', `rights.checked.where must list some of ${WHERE.join(', ')}`);
        if (!c || !isDate(c.date)) err(where, 'rights', 'rights.checked.date must be YYYY-MM-DD');
      } else if (['age', 'us-gov'].includes(rightsKind(w))) warn(where, 'no rights.checked yet (the jurisdiction sentence is left out)');
      // a dedication or a licence holds everywhere it is granted; only age and US-government claims depend on the country
      if (w.translator && (!w.translator.name || !w.translator.dates || typeof w.translator.year !== 'number')) err(where, 'fields', 'translator needs name, dates and year');
      if (w.translator && w.translator.year >= 1931 && r.status === 'public-domain' && !/government|gov|dedicat|CC0/i.test((r.basis && r.basis.en) || '')) err(where, 'rights', 'a public-domain translation must have been published before 1931');
      if (w.translator && !w.orig_lang) err(where, 'orig_lang', 'orig_lang (the language of the original, BCP 47) is required when translator is set');
      if (w.orig_lang !== undefined && w.orig_lang !== null && !isBcp47(w.orig_lang)) err(where, 'orig_lang', `orig_lang "${w.orig_lang}" is not a BCP 47 tag`);
      if (!bi(w.note)) err(where, 'fields', 'note needs en and zh');
      if (w.pick !== null && w.pick !== undefined && !bi(w.pick)) err(where, 'fields', 'pick must be null or have en and zh');
      if (!w.excerpt || !w.excerpt.orig) err(where, 'fields', 'excerpt.orig is required');
      if (w.period !== undefined && w.period !== null && !bi(w.period)) err(where, 'fields', 'period needs en and zh');
      if (w.accessioned !== undefined && w.accessioned !== null && !isDate(w.accessioned)) err(where, 'fields', 'accessioned must be YYYY-MM-DD');
      if (w.style !== undefined && w.style !== null) {
        if (w.style !== 'essay') err(where, 'fields', 'style may only be "essay"');
        else if (shelf !== 'prose') warn(where, 'style "essay" only changes the prose shelf');
      }
      if (w.inscription !== undefined && w.inscription !== null) {
        if (shelf !== 'records') err(where, 'fields', 'inscription is for the records shelf only');
        if (!w.inscription || !bi(w.inscription.where) || !bi(w.inscription.kind)) err(where, 'fields', 'inscription needs where {en, zh} and kind {en, zh}');
      }
      // tags: a list of strings; from tags.json once that file exists
      if (!Array.isArray(w.tags)) err(where, 'tags', 'tags must be an array');
      else {
        if (w.tags.some((t) => typeof t !== 'string' || !t.trim())) err(where, 'tags', 'tags must be non-empty strings');
        if (new Set(w.tags).size !== w.tags.length) err(where, 'tags', 'tags repeat');
        if (tags) {
          const bad = w.tags.filter((t) => typeof t === 'string' && !tags[t]);
          for (const t of bad) unknownTags.set(t, (unknownTags.get(t) || 0) + 1);
          if (bad.length) err(where, 'tags', `tags not in tags.json: ${bad.join(', ')} (node tools/tags-migrate.mjs)`);
        }
      }
      if (w.plate) plateRef(where, 'plate', w.plate);
      if (w.plate && !existsSync(join(imgDir, w.plate + '.jpg'))) err(where, 'plate', `plate ${w.plate} has no image`);

      // text files
      const tf = join(d, 'text.md');
      if (!existsSync(tf)) { err(where, 'layout', 'missing text.md'); continue; }
      const text = textOf(tf);
      stats.chars += text.length;
      if (text.trim().length < 20) err(where, 'text', 'text.md is nearly empty');
      if (/<\/?[a-z][^>]*>/i.test(text)) err(where, 'text', 'text.md contains HTML tags');
      if (/Project Gutenberg|\*\*\* ?START OF|\*\*\* ?END OF/i.test(text)) err(where, 'text', 'text.md still contains Gutenberg boilerplate');
      const hansFile = join(d, 'text.zh-Hans.md');
      const hans = existsSync(hansFile) ? textOf(hansFile) : null;
      if (/-Hant$/.test(w.lang) && hans === null) err(where, 'text', `${w.lang} text needs text.zh-Hans.md (python3 tools/stacks-hans.py)`);

      // translations: "Claude" (full) or { by, coverage, label, segments }
      const trs = w.translations || {};
      if (typeof trs !== 'object' || Array.isArray(trs)) err(where, 'translations', 'translations must be an object');
      if (r.verbatim_only && Object.keys(trs).length) err(where, 'translations', `verbatim_only works never offer a translation, but translations lists ${Object.keys(trs).join(', ')}`);
      const src = measure(text);
      const sections = toc(text).map((s) => s.id);
      // Segments are ordered and may not overlap: each is a span of block positions in text.md.
      const bl = blocks(text);
      const paraAt = bl.map((b, i) => (b.type === 'p' ? i : -1)).filter((i) => i >= 0);
      const paraCount = paraAt.length;
      const h2At = bl.map((b, i) => (b.type === 'h' && b.level === 2 ? i : -1)).filter((i) => i >= 0);
      const sectionSpan = (id) => { const k = sections.indexOf(id); return [h2At[k], k + 1 < h2At.length ? h2At[k + 1] - 1 : bl.length - 1]; };
      for (const [lang, v] of Object.entries(trs)) {
        const file = join(d, `translation.${lang}.md`);
        if (!existsSync(file)) { err(where, 'translations', `translations lists ${lang} but translation.${lang}.md is missing`); continue; }
        let full = true;
        if (typeof v === 'string') { if (!v.trim()) err(where, 'translations', `translations.${lang} must name the translator`); }
        else if (v && typeof v === 'object') {
          if (!v.by || typeof v.by !== 'string') err(where, 'translations', `translations.${lang}.by must name the translator`);
          if (!['full', 'partial'].includes(v.coverage)) err(where, 'translations', `translations.${lang}.coverage must be "full" or "partial"`);
          full = v.coverage !== 'partial';
          if (v.label !== undefined && v.label !== null && !bi(v.label)) err(where, 'translations', `translations.${lang}.label needs en and zh`);
          if (!full) {
            stats.partial++;
            if (!bi(v.label)) err(where, 'translations', `a partial translation needs translations.${lang}.label {en, zh}, e.g. "Story 7" / "第七个故事"`);
            const segs = Array.isArray(v.segments) ? v.segments : null;
            if (!segs || !segs.length) err(where, 'translations', `a partial translation needs translations.${lang}.segments`);
            let lastEnd = -1;
            for (const s of segs || []) {
              const ref = s && s.src;
              const pm = typeof ref === 'string' && ref.match(/^p:(\d+)(?:-(\d+))?$/);
              let span = null;
              if (pm) {
                const a = +pm[1], b = pm[2] ? +pm[2] : a;
                if (a < 1 || b < a || b > paraCount) err(where, 'translations', `segment "${ref}" is outside the original's paragraphs 1–${paraCount}`);
                else span = [paraAt[a - 1], paraAt[b - 1]];
              } else if (typeof ref === 'string' && sections.includes(ref)) span = sectionSpan(ref);
              else err(where, 'translations', `segment src "${ref}" is neither a ## section id of text.md (${sections.slice(0, 4).join(', ')}${sections.length > 4 ? ', …' : ''}${sections.length ? '' : 'none'}) nor a paragraph range like "p:12-18"`);
              if (span && span[0] <= lastEnd) err(where, 'translations', `segment "${ref}" is out of order or overlaps the segment before it`);
              if (span) lastEnd = Math.max(lastEnd, span[1]);
            }
            const heads = (textOf(file).match(/^## /gm) || []).length;
            if (segs && segs.length && !(heads === segs.length || (segs.length === 1 && heads === 0))) err(where, 'translations', `translation.${lang}.md has ${heads} "## " heading(s) for ${segs.length} segment(s); it needs one per segment, in order`);
          }
        } else err(where, 'translations', `translations.${lang} must be "Claude" or { by, coverage, label, segments }`);
        // Length test: a translation declared full that is under half the expected length is really partial.
        const t = measure(textOf(file));
        const into = lang === 'zh' ? t.han : t.words;
        const from = isChinese(w.lang) ? src.han : src.words;
        const floor = lang === 'zh' ? 0.5 : isChinese(w.lang) ? 0.35 : 0.5;
        const ratio = from ? into / from : 1;
        if (full && ratio < floor) err(where, 'translations', `translation.${lang}.md is declared full but is ${Math.round(ratio * 100)}% of the original's length (${into} ${lang === 'zh' ? 'Han characters' : 'words'} for ${from} ${isChinese(w.lang) ? 'Han characters' : 'words'}); declare it { "coverage": "partial", "label", "segments" } or finish it`);
        if (!full && ratio >= floor * 2) warn(where, `translation.${lang}.md is declared partial but is ${Math.round(ratio * 100)}% of the original's length; is it full now?`);
      }
      for (const g of readdirSync(d)) if (/^translation\.(.+)\.md$/.test(g) && !trs[g.match(/^translation\.(.+)\.md$/)[1]]) err(where, 'translations', `${g} exists but is not listed in translations`);

      // glosses and marginalia: anchors found exactly where occ says, in the source script and in Hans
      const hay = plainText(text), hayHans = hans === null ? null : plainText(hans);
      const anchors = (list, kind) => {
        for (const [k, g] of list.entries()) {
          const label = `${kind}[${k}]`;
          if (!g || typeof g.at !== 'string' || !g.at.trim()) { err(where, kind, `${label} needs an anchor "at"`); continue; }
          if (!(typeof g.en === 'string' && g.en.trim() && typeof g.zh === 'string' && g.zh.trim())) err(where, kind, `${label} ("${g.at}") needs en and zh`);
          const occ = g.occ === undefined || g.occ === null ? 1 : g.occ;
          if (!Number.isInteger(occ) || occ < 1) { err(where, kind, `${label} occ must be a whole number from 1`); continue; }
          const pos = nth(hay, g.at, occ);
          if (pos < 0) { err(where, kind, `${label} anchor "${g.at}" occurrence ${occ} is not in text.md (found ${countOf(hay, g.at)} time(s))`); continue; }
          if (g.at_hans !== undefined && g.at_hans !== null && typeof g.at_hans !== 'string') err(where, kind, `${label} at_hans must be a string`);
          if (hayHans === null) { if (g.at_hans) warn(where, `${label} has at_hans but the work has no text.zh-Hans.md`); continue; }
          // The simplified anchor: at_hans, else the same span of the converted text, else "at" itself.
          const span = hansSpan(hay, hayHans, pos, g.at.length);
          const hansAt = g.at_hans || (span ? span.text : g.at);
          const hpos = nth(hayHans, hansAt, occ);
          if (hpos < 0) err(where, kind, `${label} simplified anchor "${hansAt}" occurrence ${occ} is not in text.zh-Hans.md${g.at_hans ? '' : span ? '' : '; add at_hans with its simplified spelling'}`);
          else if (span && hpos !== span.at) err(where, kind, `${label} simplified anchor "${hansAt}" occurrence ${occ} falls in another place in text.zh-Hans.md (the simplified spelling also occurs earlier); use a longer anchor`);
        }
      };
      if (w.gloss !== undefined && w.gloss !== null) {
        if (!Array.isArray(w.gloss)) err(where, 'gloss', 'gloss must be a list');
        else { anchors(w.gloss, 'gloss'); stats.gloss += w.gloss.length; }
      }
      if (w.marginalia !== undefined && w.marginalia !== null) {
        if (!Array.isArray(w.marginalia)) err(where, 'marginalia', 'marginalia must be a list');
        else {
          if (w.marginalia.length && !w.pick) err(where, 'marginalia', 'marginalia are only for works on Claude\'s shelf (pick)');
          if (w.marginalia.length > 3) err(where, 'marginalia', `at most 3 marginalia, found ${w.marginalia.length}`);
          anchors(w.marginalia, 'marginalia');
          stats.marginalia += w.marginalia.length;
        }
      }
      works.set(w.id, { w, shelf, where });
    }
  }
  // pairs: Claude's own "pairs with" list
  for (const { w, where } of works.values()) {
    if (w.pairs === undefined || w.pairs === null) continue;
    if (!Array.isArray(w.pairs)) { err(where, 'pairs', 'pairs must be a list of work ids'); continue; }
    for (const id of w.pairs) {
      if (id === w.id) err(where, 'pairs', 'pairs lists the work itself');
      else if (!works.has(id)) err(where, 'pairs', `pairs: ${id} is not on the shelves`);
    }
    if (new Set(w.pairs).size !== w.pairs.length) err(where, 'pairs', 'pairs repeats an id');
  }

  // ---- house papers: their slugs share /open-stacks/ with the works ----
  const papersDir = join(root, 'catalog/open-stacks');
  for (const f of existsSync(papersDir) ? readdirSync(papersDir).filter((x) => x.endsWith('.en.md')) : []) {
    const slug = f.replace(/\.en\.md$/, '').replace(/^S-\d+-/, '');
    if (slugs.has(slug)) err('open-stacks/' + f, 'slug', `house paper slug "${slug}" is also the slug of ${slugs.get(slug)}`);
    if (RESERVED.includes(slug)) err('open-stacks/' + f, 'slug', `house paper slug "${slug}" is reserved`);
  }

  // ---- shelf.json ----
  for (const shelf of SHELVES) {
    const file = join(stacksDir, shelf, 'shelf.json');
    const where = `${shelf}/shelf.json`;
    if (!existsSync(join(stacksDir, shelf))) continue;
    if (!existsSync(file)) { warn(where, 'missing (no shelf essay or "Start here" yet)'); continue; }
    let s;
    try { s = jsonOf(file); } catch (e) { err(where, 'shelf', 'not valid JSON: ' + e.message); continue; }
    if (s.essay !== null && s.essay !== undefined && !bi(s.essay)) err(where, 'shelf', 'essay must be null or have en and zh');
    if (!Array.isArray(s.start)) err(where, 'shelf', 'start must be a list of work ids');
    else {
      if (s.start.length > 3) err(where, 'shelf', `start lists ${s.start.length} works; "Start here" shows three`);
      if (new Set(s.start).size !== s.start.length) err(where, 'shelf', 'start repeats an id');
      for (const id of s.start) {
        if (!works.has(id)) err(where, 'shelf', `start: ${id} is not on the shelves`);
        else if (works.get(id).shelf !== shelf) err(where, 'shelf', `start: ${id} is on the ${works.get(id).shelf} shelf, not ${shelf}`);
      }
      if (s.essay && s.start.length < 3) warn(where, `only ${s.start.length} "Start here" work(s)`);
    }
    plateRef(where, 'shelf', s.plate);
  }

  // ---- claude-shelf.json: permanent accession numbers ----
  const picks = [...works.values()].filter((x) => x.w.pick).map((x) => x.w.id);
  const csFile = join(stacksDir, 'claude-shelf.json');
  if (!existsSync(csFile)) warn('claude-shelf.json', `missing; the ${picks.length} picks are numbered provisionally in catalogue order`);
  else {
    let cs;
    try { cs = jsonOf(csFile); } catch (e) { err('claude-shelf.json', 'claude-shelf', 'not valid JSON: ' + e.message); }
    if (cs) {
      const where = 'claude-shelf.json';
      if (cs.intro !== null && cs.intro !== undefined && !bi(cs.intro)) err(where, 'claude-shelf', 'intro must be null or have en and zh');
      plateRef(where, 'claude-shelf', cs.plate);
      const entries = Array.isArray(cs.entries) ? cs.entries : (err(where, 'claude-shelf', 'entries must be a list'), []);
      const retired = cs.retired === undefined ? [] : Array.isArray(cs.retired) ? cs.retired : (err(where, 'claude-shelf', 'retired must be a list'), []);
      const nSeen = new Map();
      for (const [list, name, dateKey] of [[entries, 'entries', 'added'], [retired, 'retired', 'removed']]) {
        for (const e of list) {
          const tag = `${name} ${e && e.id}`;
          if (!e || !Number.isInteger(e.n) || e.n < 1) { err(where, 'claude-shelf', `${tag}: n must be a whole number from 1`); continue; }
          if (nSeen.has(e.n)) err(where, 'claude-shelf', `No. ${e.n} is used twice (${nSeen.get(e.n)} and ${tag}); numbers are permanent and never reused`);
          else nSeen.set(e.n, tag);
          if (!/^S-\d{6}$/.test(e.id || '')) err(where, 'claude-shelf', `${tag}: id must look like S-001001`);
          if (e[dateKey] !== undefined && !isDate(e[dateKey])) err(where, 'claude-shelf', `${tag}: ${dateKey} must be YYYY-MM-DD`);
        }
      }
      const active = new Map();
      for (const e of entries) {
        if (!e || !e.id) continue;
        if (active.has(e.id)) err(where, 'claude-shelf', `${e.id} has two active entries (No. ${active.get(e.id)} and No. ${e.n})`);
        else active.set(e.id, e.n);
        if (!works.has(e.id)) err(where, 'claude-shelf', `entry No. ${e.n}: ${e.id} is not on the shelves; move it to retired`);
        else if (!works.get(e.id).w.pick) err(where, 'claude-shelf', `entry No. ${e.n}: ${e.id} is not a pick; move it to retired or give it a pick`);
      }
      for (const id of picks) if (!active.has(id)) err(where, 'claude-shelf', `pick ${id} has no entry (give it the next free number)`);
      if (cs.order !== undefined) {
        if (!Array.isArray(cs.order)) err(where, 'claude-shelf', 'order must be a list of ids');
        else {
          const o = new Set(cs.order);
          if (o.size !== cs.order.length) err(where, 'claude-shelf', 'order repeats an id');
          for (const id of cs.order) if (!active.has(id)) err(where, 'claude-shelf', `order lists ${id}, which has no active entry`);
          for (const id of active.keys()) if (!o.has(id)) err(where, 'claude-shelf', `order leaves out ${id}`);
        }
      }
    }
  }

  // ---- trails ----
  const tdir = join(stacksDir, '_trails');
  const trailSlugs = new Set();
  for (const f of existsSync(tdir) ? readdirSync(tdir).filter((x) => x.endsWith('.json')).sort() : []) {
    const where = `_trails/${f}`;
    let tr;
    try { tr = jsonOf(join(tdir, f)); } catch (e) { err(where, 'trails', 'not valid JSON: ' + e.message); continue; }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(tr.slug || '')) err(where, 'trails', 'slug must be lowercase ascii with hyphens');
    if (f !== `${tr.slug}.json`) err(where, 'trails', `file name must be "${tr.slug}.json"`);
    if (trailSlugs.has(tr.slug)) err(where, 'trails', `duplicate trail slug ${tr.slug}`); else trailSlugs.add(tr.slug);
    if (!bi(tr.title)) err(where, 'trails', 'title needs en and zh');
    if (tr.dek !== undefined && tr.dek !== null && !bi(tr.dek)) err(where, 'trails', 'dek needs en and zh');
    plateRef(where, 'trails', tr.plate);
    const steps = Array.isArray(tr.steps) ? tr.steps : [];
    if (steps.length < 5 || steps.length > 8) err(where, 'trails', `a trail has 5–8 steps, this one has ${steps.length}`);
    const ids = new Set();
    for (const [k, s] of steps.entries()) {
      if (!s || !works.has(s.id)) err(where, 'trails', `step ${k + 1}: ${s && s.id} is not on the shelves`);
      if (s && ids.has(s.id)) err(where, 'trails', `step ${k + 1}: ${s.id} is already on this trail`);
      if (s) ids.add(s.id);
      if (!s || !bi(s.line)) err(where, 'trails', `step ${k + 1}: line needs en and zh`);
    }
  }
  if (!existsSync(tdir) || !trailSlugs.size) warn('_trails', 'no trails yet');

  // ---- plates ----
  for (const f of existsSync(platesDir) ? readdirSync(platesDir).filter((x) => x.endsWith('.json') && !x.startsWith('_')).sort() : []) {
    const where = 'plates/' + f;
    let p;
    try { p = jsonOf(join(platesDir, f)); } catch (e) { err(where, 'json', 'not valid JSON: ' + e.message); continue; }
    stats.plates++;
    if (!/^G-\d{6}$/.test(p.id || '')) err(where, 'id', 'id must look like G-008001');
    if (f !== `${p.id}-${p.slug}.json`) err(where, 'id', `file name must be "${p.id}-${p.slug}.json"`);
    if (seen.has(p.id)) err(where, 'id', `duplicate id ${p.id}`); else seen.set(p.id, where);
    if (!tri(p.title)) err(where, 'fields', 'title needs orig, en and zh');
    if (!tri(p.artist) || !p.artist.dates) err(where, 'fields', 'artist needs orig, en, zh and dates');
    if (typeof p.year !== 'number' || !bi(p.year_display)) err(where, 'fields', 'year and year_display are required');
    if (!bi(p.medium)) err(where, 'fields', 'medium needs en and zh');
    if (!p.institution || !p.institution.name || !/^https:\/\//.test(p.institution.object_url || '')) err(where, 'fields', 'institution needs name and https object_url');
    if (!p.image || !/^https:\/\//.test(p.image.source_url || '') || !p.image.width || !p.image.height) err(where, 'fields', 'image needs source_url, width, height');
    if (!p.rights || !STATUS.includes(p.rights.status) || !bi(p.rights.basis)) err(where, 'rights', 'rights needs status and basis');
    if (p.rights && p.rights.kind !== undefined && p.rights.kind !== null && !PLATE_RIGHTS_KINDS.includes(p.rights.kind)) err(where, 'rights', `rights.kind must be one of ${PLATE_RIGHTS_KINDS.join(', ')}`);
    if (!bi(p.alt) || !bi(p.note)) err(where, 'fields', 'alt and note need en and zh');
    if (p.kind === undefined || p.kind === null) warn(where, 'no kind yet (artwork, photograph or object)');
    else if (!PLATE_KINDS.includes(p.kind)) err(where, 'fields', `kind must be one of ${PLATE_KINDS.join(', ')}`);
    if (p.tone !== undefined && p.tone !== null && !TONES.includes(p.tone)) err(where, 'fields', `tone must be one of ${TONES.join(', ')}`);
    for (const k of ['title', 'artist']) if (p[k] && p[k].lang !== undefined && !isBcp47(p[k].lang)) err(where, 'fields', `${k}.lang "${p[k].lang}" is not a BCP 47 tag`);
    // the three image files, their size and budget; the JSON records the real size of the 1600 file
    for (const [s, edge, budget] of PLATE_FILES) {
      const file = join(imgDir, `${p.id}${s}.jpg`);
      if (!existsSync(file)) { err(where, 'plate-files', `missing site/public/assets/plates/${p.id}${s}.jpg (python3 tools/plate-images.py)`); continue; }
      const info = jpegInfo(file);
      const bytes = statSync(file).size;
      if (!info) { err(where, 'plate-files', `${p.id}${s}.jpg is not a readable JPEG`); continue; }
      if (Math.max(info.width, info.height) > edge) err(where, 'plate-files', `${p.id}${s}.jpg is ${info.width}×${info.height}; its long side must be at most ${edge}px (python3 tools/plate-images.py)`);
      if (bytes > budget) err(where, 'plate-files', `${p.id}${s}.jpg is ${Math.round(bytes / 1024)}KB, over its ${budget / 1024}KB budget (python3 tools/plate-images.py)`);
      if (!info.progressive) warn(where, `${p.id}${s}.jpg is not progressive`);
      if (s === '' && p.image && (p.image.width !== info.width || p.image.height !== info.height)) err(where, 'plate-files', `image.width/height say ${p.image.width}×${p.image.height} but ${p.id}.jpg is ${info.width}×${info.height}`);
    }
  }

  stats.unknownTags = [...unknownTags.entries()].sort((a, b) => b[1] - a[1]);
  stats.byRule = byRule;
  stats.tagsFile = !!tags;
  return { errors, warnings, stats };
}

// ---- command line ----
if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..');
  const { errors, warnings, stats } = checkStacks(root);
  if (!process.argv.includes('--quiet')) {
    console.log(`works ${stats.works} (${Object.entries(stats.shelves).map(([k, v]) => `${k} ${v}`).join(', ') || 'none'}), plates ${stats.plates}, text ${Math.round(stats.chars / 1000)}k chars, ${stats.partial} partial translation(s), ${stats.gloss} gloss(es), ${stats.marginalia} marginal note(s)${stats.tagsFile ? '' : ', no tags.json yet'}`);
  }
  if (process.argv.includes('--warn') && warnings.length) console.log(warnings.map((w) => 'warning ' + w).join('\n'));
  if (errors.length) {
    console.error(errors.join('\n'));
    if (stats.unknownTags.length) console.error(`tags not in tags.json (${stats.unknownTags.length}): ${stats.unknownTags.slice(0, 40).map(([t, n]) => `${t} ${n}`).join(', ')}${stats.unknownTags.length > 40 ? ', …' : ''}`);
    console.error(`${errors.length} problem(s): ${Object.entries(stats.byRule).map(([k, v]) => `${k} ${v}`).join(' · ')}${warnings.length ? `; ${warnings.length} warning(s)${process.argv.includes('--warn') ? '' : ' (--warn lists them)'}` : ''}`);
    process.exit(1);
  }
  console.log(`ok${warnings.length ? ` (${warnings.length} warning(s)${process.argv.includes('--warn') ? '' : ', --warn lists them'})` : ''}`);
}
