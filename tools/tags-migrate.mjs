#!/usr/bin/env node
// Rewrite the `tags` of every work.json to the controlled vocabulary in catalog/stacks/tags.json (spec v5 §4.6).
// Each tag is looked up as a tag key or an alias (case, spaces and underscores ignored); repeats are dropped.
// Tags with no match are kept as they are (so nothing is lost) and listed, for Claude to map by hand.
//
// Usage: node tools/tags-migrate.mjs [--write] [--verbose] [--drop-unmapped] [--held] [--tags <file>]
//   (default)        dry run: say what would change, write nothing
//   --write          apply the changes (only the tags list changes; formatting is kept)
//   --verbose        list every work that changes
//   --drop-unmapped  remove tags that are not in the vocabulary instead of keeping them
//   --held           also rewrite works in catalog/stacks/_held/
//   --tags <file>    read the vocabulary from another file (for testing)
//   --root <dir>     work on another checkout's catalog/ (for testing)
// Exit code: 0 when every tag maps; 2 when some tags are unmapped; 1 on an error.
import { readFileSync, writeFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const opt = (f) => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const root = opt('--root') || join(dirname(fileURLToPath(import.meta.url)), '..');
const write = flag('--write');
const verbose = flag('--verbose');
const dropUnmapped = flag('--drop-unmapped');
const tagsFile = opt('--tags') || join(root, 'catalog/stacks/tags.json');

if (!existsSync(tagsFile)) {
  console.error(`no vocabulary at ${relative(root, tagsFile) || tagsFile}; write catalog/stacks/tags.json first (format: catalog/stacks/README.md, spec §4.6)`);
  process.exit(1);
}
let vocab;
try { vocab = JSON.parse(readFileSync(tagsFile, 'utf8')); } catch (e) { console.error(`${tagsFile}: not valid JSON: ${e.message}`); process.exit(1); }

// "Snow fall", "snow_fall" and "snow-fall" are the same tag.
const norm = (s) => String(s).normalize('NFKC').trim().toLowerCase().replace(/[\s_]+/g, '-').replace(/-+/g, '-');
const map = new Map();
const clash = [];
for (const [key, v] of Object.entries(vocab)) {
  for (const name of [key, ...((v && Array.isArray(v.aliases)) ? v.aliases : [])]) {
    const k = norm(name);
    if (map.has(k) && map.get(k) !== key) clash.push(`"${name}" → ${map.get(k)} and ${key}`);
    else map.set(k, key);
  }
}
if (clash.length) { console.error(`the vocabulary maps a name to two tags: ${clash.join('; ')}`); process.exit(1); }

const base = join(root, 'catalog/stacks');
const dirs = [];
for (const shelf of readdirSync(base).sort()) {
  const sdir = join(base, shelf);
  if (!statSync(sdir).isDirectory() || (shelf.startsWith('_') && !(shelf === '_held' && flag('--held')))) continue;
  for (const f of readdirSync(sdir).sort()) if (existsSync(join(sdir, f, 'work.json'))) dirs.push(join(sdir, f));
}

const unmapped = new Map();
const before = new Set(), after = new Set();
let changed = 0, written = 0, works = 0;
for (const d of dirs) {
  const file = join(d, 'work.json');
  const raw = readFileSync(file, 'utf8');
  let w;
  try { w = JSON.parse(raw); } catch (e) { console.error(`${relative(root, file)}: not valid JSON, skipped (${e.message})`); continue; }
  works++;
  const old = Array.isArray(w.tags) ? w.tags : [];
  const next = [];
  for (const t of old) {
    before.add(t);
    const k = map.get(norm(t));
    if (!k) {
      if (!unmapped.has(t)) unmapped.set(t, []);
      unmapped.get(t).push(w.id);
      if (dropUnmapped) continue;
    }
    const v = k || t;
    if (!next.includes(v)) next.push(v);
  }
  next.forEach((t) => after.add(t));
  if (JSON.stringify(next) === JSON.stringify(old)) continue;
  changed++;
  if (verbose) console.log(`${w.id}: ${old.join(', ') || '—'}  →  ${next.join(', ') || '—'}`);
  if (!write) continue;
  // Keep the file's own formatting: re-serialise when it is plain 2-space JSON, else replace the tags array in place.
  const trailing = raw.endsWith('\n') ? '\n' : '';
  const plain = JSON.stringify(w, null, 2) + trailing === raw;
  let out;
  if (plain) out = JSON.stringify({ ...w, tags: next }, null, 2) + trailing;
  else {
    const m = raw.match(/("tags"\s*:\s*)\[[^\]]*\]/);
    if (!m) { console.error(`${relative(root, file)}: could not find the tags list, skipped`); continue; }
    const indent = (raw.slice(0, m.index).match(/\n([ \t]*)$/) || ['', ''])[1];
    const arr = next.length ? `[\n${next.map((t) => `${indent}  ${JSON.stringify(t)}`).join(',\n')}\n${indent}]` : '[]';
    out = raw.slice(0, m.index) + m[1] + arr + raw.slice(m.index + m[0].length);
  }
  JSON.parse(out); // still valid
  writeFileSync(file, out);
  written++;
}

const list = [...unmapped.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
console.log(`${works} works · ${changed} ${write ? `changed · ${written} written` : 'would change (dry run; --write applies)'} · distinct tags ${before.size} → ${after.size} · vocabulary ${Object.keys(vocab).length}`);
if (list.length) {
  console.log(`${list.length} unmapped tag(s)${dropUnmapped ? ' (dropped)' : ' (kept as they are)'}; add each to a tag's aliases in tags.json, or to the vocabulary:`);
  for (const [t, ids] of list) console.log(`  ${t}  ${ids.length}  ${ids.slice(0, 6).join(' ')}${ids.length > 6 ? ' …' : ''}`);
  process.exit(2);
}
