#!/usr/bin/env node
// The Reference Room's weekly collector (资料室收录管线). Rules: docs/收录规则.md.
//
//   node tools/reference/collect.mjs harvest   find candidates from catalog/reference/sources.json (lists, topics, searches, seeds)
//   node tools/reference/collect.mjs meta      fetch GitHub metadata for every candidate and every shelved entry (GraphQL, 50 per call)
//   node tools/reference/collect.mjs score     apply the rules and the score; write the review queue catalog/reference/_queue.json
//   node tools/reference/collect.mjs refresh   update stars, licence, last commit and status of shelved entries in repos.json
//   node tools/reference/collect.mjs decide F… write decisions from JSON files ([{repo, decision, cat, kind, note, reason}]) into the queue
//   node tools/reference/collect.mjs apply     move decided queue entries into repos.json / _rejected.json
//   node tools/reference/collect.mjs weekly    harvest + meta + refresh + score (what the weekly run does)
//
// The token comes from GITHUB_TOKEN or `gh auth token` at run time and is never written anywhere.
// Working files live in tools/reference/.cache/ (git-ignored). Search is paced to stay under 30 requests a minute.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../..');
const CAT = join(root, 'catalog/reference');
const CACHE = join(here, '.cache');
mkdirSync(CACHE, { recursive: true });

const readJson = (p, d) => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : d);
const writeJson = (p, v) => writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const today = () => new Date().toISOString().slice(0, 10);
const key = (s) => String(s).toLowerCase();

export const CATS = ['literature', 'faith', 'history', 'aesthetics', 'music', 'tools'];
export const KINDS = ['text', 'dataset', 'api', 'font', 'tool', 'list'];

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try { return execFileSync('gh', ['auth', 'token'], { encoding: 'utf8' }).trim(); } catch { return ''; }
}
const TOKEN = token();
const UA = 'coldlibrary-reference-collector (+https://coldlibrary.com)';

// One REST call, waiting out the rate limit when GitHub asks.
async function rest(path, { raw = false } = {}) {
  for (let tries = 0; tries < 5; tries++) {
    const res = await fetch('https://api.github.com' + path, { headers: {
      'User-Agent': UA, Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28', ...(TOKEN ? { Authorization: 'Bearer ' + TOKEN } : {}),
    } });
    if (res.status === 403 || res.status === 429) {
      const reset = Number(res.headers.get('x-ratelimit-reset') || 0) * 1000;
      const wait = Math.max(Number(res.headers.get('retry-after') || 0) * 1000, reset - Date.now(), 10_000);
      console.log(`  rate limited, waiting ${Math.ceil(wait / 1000)}s`);
      await sleep(Math.min(wait + 1000, 15 * 60_000));
      continue;
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
    return raw ? res.text() : res.json();
  }
  throw new Error(`${path}: still rate limited`);
}

async function graphql(query) {
  for (let tries = 0; tries < 5; tries++) {
    const res = await fetch('https://api.github.com/graphql', { method: 'POST', headers: { 'User-Agent': UA, Authorization: 'Bearer ' + TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ query }) });
    if (res.status === 403 || res.status === 429 || res.status === 502) { await sleep(20_000 * (tries + 1)); continue; }
    const j = await res.json();
    if (j.errors && !j.data) throw new Error(JSON.stringify(j.errors).slice(0, 300));
    return j.data || {};
  }
  throw new Error('graphql: gave up');
}

// ---------------------------------------------------------------- harvest
const REPO_LINK = /https?:\/\/github\.com\/([A-Za-z0-9-]+)\/([A-Za-z0-9._-]+)/g;
const NOT_OWNER = new Set(['topics', 'orgs', 'sponsors', 'features', 'about', 'marketplace', 'collections', 'site', 'settings', 'apps', 'login', 'pricing', 'readme', 'trending', 'explore']);

function catFromHeading(hints, heading, fallback) {
  for (const h of hints) if (new RegExp(h.re, 'i').test(heading)) return h.cat;
  return fallback;
}

async function harvest() {
  const src = readJson(join(CAT, 'sources.json'));
  const found = new Map(); // key → { repo, cats: {cat: n}, via: [] }
  const add = (repo, cat, via) => {
    repo = repo.replace(/\.git$/, '').replace(/[.)]+$/, '');
    const [o, n] = repo.split('/');
    if (!o || !n || NOT_OWNER.has(o.toLowerCase())) return;
    const k = key(repo);
    const f = found.get(k) || { repo, cats: {}, via: [] };
    f.cats[cat] = (f.cats[cat] || 0) + 1;
    if (!f.via.includes(via)) f.via.push(via);
    found.set(k, f);
  };
  for (const s of src.seeds) add(s.repo, s.cat, 'seed');
  for (const l of src.lists) {
    process.stdout.write(`list ${l.repo} … `);
    const md = await rest(`/repos/${l.repo}/readme`, { raw: true });
    if (!md) { console.log('missing'); continue; }
    let heading = '', n = 0;
    for (const line of md.split('\n')) {
      const h = line.match(/^#{1,6}\s+(.*)/);
      if (h) { heading = h[1]; continue; }
      for (const m of line.matchAll(REPO_LINK)) {
        if (key(`${m[1]}/${m[2]}`) === key(l.repo)) continue;
        add(`${m[1]}/${m[2]}`, catFromHeading(src.heading_hints, heading + ' ' + line, l.cat), 'list:' + l.repo);
        n++;
      }
    }
    console.log(n);
    add(l.repo, l.cat, 'list-itself');
  }
  const search = async (q, cat, via, minStars, pages = 1) => {
    for (let p = 1; p <= pages; p++) {
      const r = await rest(`/search/repositories?q=${encodeURIComponent(q + (minStars ? ` stars:>=${minStars}` : ''))}&sort=stars&order=desc&per_page=50&page=${p}`);
      await sleep(2300);
      if (!r || !r.items) return;
      for (const it of r.items) add(it.full_name, cat, via);
      if (r.items.length < 50) return;
    }
  };
  for (const t of src.topics) { process.stdout.write(`topic ${t.topic} `); await search(`topic:${t.topic}`, t.cat, 'topic:' + t.topic, t.min_stars || 15, 2); }
  console.log();
  for (const q of src.queries) { process.stdout.write('.'); await search(q.q, q.cat, 'search:' + q.q, q.min_stars || 15, 1); }
  console.log();
  const list = [...found.values()].sort((a, b) => key(a.repo).localeCompare(key(b.repo)));
  writeJson(join(CACHE, 'harvest.json'), { at: new Date().toISOString(), repos: list });
  console.log(`harvest: ${list.length} candidate repositories`);
}

// ---------------------------------------------------------------- metadata
const FIELDS = `nameWithOwner description url homepageUrl stargazerCount forkCount pushedAt createdAt isArchived isFork isDisabled isEmpty isTemplate isMirror diskUsage
  primaryLanguage { name } licenseInfo { spdxId name key } owner { login __typename }
  repositoryTopics(first: 15) { nodes { topic { name } } }
  defaultBranchRef { target { ... on Commit { committedDate } } }`;

async function fetchMeta(repos) {
  const out = {};
  for (let i = 0; i < repos.length; i += 50) {
    const batch = repos.slice(i, i + 50);
    const q = '{ ' + batch.map((r, j) => {
      const [o, n] = r.split('/');
      return `r${j}: repository(owner: ${JSON.stringify(o)}, name: ${JSON.stringify(n)}) { ${FIELDS} }`;
    }).join('\n') + ' }';
    let data;
    try { data = await graphql(q); } catch (e) { console.warn(`  batch ${i}: ${e.message}`); data = {}; }
    batch.forEach((r, j) => {
      const d = data['r' + j];
      out[key(r)] = d ? {
        repo: d.nameWithOwner, url: d.url, desc: d.description || '', homepage: d.homepageUrl || '', stars: d.stargazerCount, forks: d.forkCount,
        pushed: (d.pushedAt || '').slice(0, 10), created: (d.createdAt || '').slice(0, 10),
        committed: ((d.defaultBranchRef && d.defaultBranchRef.target && d.defaultBranchRef.target.committedDate) || '').slice(0, 10),
        archived: d.isArchived, fork: d.isFork, disabled: d.isDisabled, empty: d.isEmpty, template: d.isTemplate, mirror: d.isMirror,
        size_kb: d.diskUsage, language: d.primaryLanguage ? d.primaryLanguage.name : '', owner_type: d.owner.__typename,
        license: d.licenseInfo ? { spdx: d.licenseInfo.spdxId, name: d.licenseInfo.name } : null,
        topics: d.repositoryTopics.nodes.map((x) => x.topic.name), fetched: today(),
      } : { missing: true, fetched: today() };
    });
    process.stdout.write(`${Math.min(i + 50, repos.length)}/${repos.length} `);
  }
  console.log();
  return out;
}

async function meta() {
  const h = readJson(join(CACHE, 'harvest.json'), { repos: [] });
  const shelved = readJson(join(CAT, 'repos.json'), { entries: [] }).entries.map((e) => e.repo);
  const all = [...new Set([...h.repos.map((r) => r.repo), ...shelved].map(key))];
  const old = readJson(join(CACHE, 'meta.json'), {});
  const fresh = all.filter((k) => !old[k] || old[k].fetched !== today());
  console.log(`meta: ${fresh.length} to fetch (${all.length - fresh.length} already fetched today)`);
  Object.assign(old, await fetchMeta(fresh));
  writeJson(join(CACHE, 'meta.json'), old);
}

// ---------------------------------------------------------------- rules and score (docs/收录规则.md §3–4)
const PD = new Set(['cc0-1.0', 'unlicense', '0bsd', 'wtfpl', 'cc-pddc']);
const PERMISSIVE = new Set(['mit', 'apache-2.0', 'bsd-2-clause', 'bsd-3-clause', 'isc', 'cc-by-4.0', 'cc-by-3.0', 'ofl-1.1', 'zlib', 'bsl-1.0', 'mit-0', 'artistic-2.0', 'python-2.0', 'odc-by-1.0', 'pddl-1.0', 'ncsa', 'postgresql', 'upl-1.0', 'cc-by-2.0']);
const COPYLEFT = new Set(['gpl-2.0', 'gpl-3.0', 'agpl-3.0', 'lgpl-2.1', 'lgpl-3.0', 'mpl-2.0', 'cc-by-sa-4.0', 'cc-by-sa-3.0', 'odbl-1.0', 'epl-2.0', 'eupl-1.2', 'epl-1.0', 'cecill-2.1', 'lppl-1.3c', 'gfdl-1.3', 'osl-3.0', 'eupl-1.1']);
// What the room says about a licence: open (public domain or permissive), share-alike (copyleft), limited (non-commercial,
// no-derivatives, custom), unstated (no licence: all rights reserved, the room lists name, note and link only).
export function rightsOf(license) {
  if (!license || !license.spdx) return 'unstated';
  const s = key(license.spdx);
  if (PD.has(s)) return 'public-domain';
  if (PERMISSIVE.has(s)) return 'permissive';
  if (COPYLEFT.has(s)) return 'share-alike';
  if (s === 'noassertion' || s === 'other') return 'custom';
  if (/-nc|-nd/.test(s)) return 'limited';
  return 'custom';
}

const CUTOFF = (() => { const d = new Date(); d.setFullYear(d.getFullYear() - 2); return d.toISOString().slice(0, 10); })();
const lastUpdate = (m) => m.committed || m.pushed || '';

function guessKind(m) {
  const t = `${m.repo} ${m.desc} ${m.topics.join(' ')}`.toLowerCase();
  if (/awesome|curated list|resources list|精选|资源列表|列表/.test(t)) return 'list';
  if (/\bfonts?\b|typeface|字体|字型|書體|黑体|宋体|楷/.test(t)) return 'font';
  if (/\bapi\b|接口/.test(t) && !/client|wrapper/.test(t)) return 'api';
  if (/dataset|corpus|corpora|database|data\b|语料|数据|資料庫/.test(t)) return 'dataset';
  if (/texts?\b|edition|scripture|poems|poetry|诗|词|文献|古籍|全文|tei/.test(t)) return 'text';
  return 'tool';
}

export function judge(m, h, src, decided) {
  if (m.missing) return { out: 'gone' };
  const block = new RegExp(src.block.re, 'i');
  const hay = `${m.repo} ${m.desc} ${m.topics.join(' ')}`;
  const seed = h && h.via.includes('seed');
  if (src.block.repos.map(key).includes(key(m.repo))) return { out: 'blocked by name' };
  if (m.disabled || m.empty) return { out: 'empty or disabled' };
  if (m.fork || m.mirror) return { out: 'fork or mirror' };
  if (m.template) return { out: 'template' };
  if (!seed && block.test(hay)) return { out: 'blocked word: ' + hay.match(block)[0] };
  if (!seed && !m.desc) return { out: 'no description' };
  if (!seed && m.size_kb < 20) return { out: 'too small to hold anything' };
  if (!seed && m.stars < 15) return { out: 'fewer than 15 stars' };
  const kind = guessKind(m);
  const fresh = lastUpdate(m) >= CUTOFF;
  const settled = (m.archived || ['text', 'dataset', 'font'].includes(kind)) && m.stars >= 100;
  if (!seed && !fresh && !settled) return { out: 'not maintained in two years' };
  // the score: stars count for a little, care counts for more
  const rights = rightsOf(m.license);
  let score = Math.min(40, 10 * Math.log10(m.stars + 1));
  const lu = lastUpdate(m);
  const months = lu ? (Date.now() - Date.parse(lu)) / (30.4 * 864e5) : 99;
  score += months <= 6 ? 20 : months <= 12 ? 15 : months <= 24 ? 10 : settled ? 6 : 0;
  score += { 'public-domain': 15, permissive: 15, 'share-alike': 12, limited: 6, custom: 5, unstated: 0 }[rights];
  score += Math.min(18, 6 * (h ? h.via.length : 0));
  if (seed) score += 10;
  if (m.archived && !settled) score -= 10;
  const cats = h ? Object.entries(h.cats).sort((a, b) => b[1] - a[1]) : [];
  return { in: true, score: Math.round(score), kind, rights, cat: cats.length ? cats[0][0] : 'tools', fresh, settled };
}

function score() {
  const src = readJson(join(CAT, 'sources.json'));
  const h = readJson(join(CACHE, 'harvest.json'), { repos: [] });
  const metaAll = readJson(join(CACHE, 'meta.json'), {});
  const shelf = readJson(join(CAT, 'repos.json'), { entries: [] });
  const rejected = readJson(join(CAT, '_rejected.json'), { entries: [] });
  const known = new Set([...shelf.entries.map((e) => key(e.repo)), ...rejected.entries.map((e) => key(e.repo))]);
  const rows = [], outs = {};
  for (const c of h.repos) {
    const m = metaAll[key(c.repo)];
    if (!m) continue;
    if (!m.missing && known.has(key(m.repo))) continue;
    if (known.has(key(c.repo))) continue;
    const j = judge(m, c, src);
    if (!j.in) { outs[j.out.replace(/:.*/, '')] = (outs[j.out.replace(/:.*/, '')] || 0) + 1; continue; }
    rows.push({ repo: m.repo, cat: j.cat, kind: j.kind, score: j.score, stars: m.stars, updated: lastUpdate(m), rights: j.rights,
      license: m.license ? m.license.spdx : null, desc: m.desc, topics: m.topics, via: c.via, cats: c.cats, decision: null });
  }
  const seen = new Set();
  const queue = rows.filter((r) => !seen.has(key(r.repo)) && seen.add(key(r.repo))).sort((a, b) => b.score - a.score);
  writeJson(join(CAT, '_queue.json'), { made: today(), note: 'Candidates waiting for a librarian. Set decision to "accept" (with note.en, note.zh, kind, cat) or "reject" (with reason), then run apply.', entries: queue });
  const by = {};
  for (const r of queue) by[r.cat] = (by[r.cat] || 0) + 1;
  console.log(`score: ${queue.length} in the queue`, by, '\nleft out:', outs);
}

// ---------------------------------------------------------------- refresh shelved entries
function refresh() {
  const metaAll = readJson(join(CACHE, 'meta.json'), {});
  const shelf = readJson(join(CAT, 'repos.json'), { entries: [] });
  let changed = 0;
  for (const e of shelf.entries) {
    const m = metaAll[key(e.repo)];
    if (!m) continue;
    if (m.missing) { if (e.status !== 'gone') { e.status = 'gone'; changed++; } continue; }
    const next = { repo: m.repo, stars: m.stars, updated: lastUpdate(m), archived: !!m.archived, license: m.license ? m.license.spdx : null, rights: rightsOf(m.license), desc: m.desc, topics: m.topics, homepage: m.homepage };
    if (e.license !== next.license) e.license_was = e.license; // a licence change is kept for the librarian to look at
    if (JSON.stringify(Object.fromEntries(Object.keys(next).map((k) => [k, e[k]]))) !== JSON.stringify(next)) { Object.assign(e, next); e.checked = today(); changed++; }
  }
  shelf.checked = today();
  writeJson(join(CAT, 'repos.json'), shelf);
  console.log(`refresh: ${changed} of ${shelf.entries.length} entries changed`);
}

// ---------------------------------------------------------------- decisions from files (one array per reviewer)
// A note is one sentence: English at most 20 words, Chinese at most 40 characters (docs/收录规则.md §5).
export function checkNote(n) {
  const out = [];
  if (!n || !n.en || !n.zh) return ['note.en and note.zh are both needed'];
  if (n.en.trim().split(/\s+/).length > 20) out.push('note.en is over 20 words');
  if ([...n.zh].reduce((w, c) => w + (c.charCodeAt(0) < 0x2e80 ? 0.5 : 1), 0) > 40) out.push('note.zh is over 40 characters'); // Latin letters count as half
  if (/[!！]/.test(n.en + n.zh)) out.push('no exclamation marks');
  return out;
}

function decide(files) {
  const q = readJson(join(CAT, '_queue.json'), { entries: [] });
  const byRepo = new Map(q.entries.map((e) => [key(e.repo), e]));
  const problems = [];
  let n = 0;
  for (const f of files) {
    for (const d of readJson(f, [])) {
      const e = byRepo.get(key(d.repo));
      if (!e) { problems.push(`${d.repo}: not in the queue`); continue; }
      if (d.decision === 'accept') {
        const bad = [...checkNote(d.note), ...(CATS.includes(d.cat) ? [] : ['bad cat']), ...(KINDS.includes(d.kind) ? [] : ['bad kind'])];
        if (bad.length) { problems.push(`${d.repo}: ${bad.join('; ')}`); continue; }
        Object.assign(e, { decision: 'accept', cat: d.cat, kind: d.kind, note: { en: d.note.en.trim(), zh: d.note.zh.trim() } });
      } else if (d.decision === 'reject') Object.assign(e, { decision: 'reject', reason: d.reason || 'not for this room' });
      else { problems.push(`${d.repo}: decision must be accept or reject`); continue; }
      n++;
    }
  }
  writeJson(join(CAT, '_queue.json'), q);
  console.log(`decide: ${n} decisions written, ${q.entries.filter((e) => !e.decision).length} still open`);
  if (problems.length) console.log('problems:\n  ' + problems.join('\n  '));
}

// ---------------------------------------------------------------- apply decisions
function apply() {
  const q = readJson(join(CAT, '_queue.json'), { entries: [] });
  const shelf = readJson(join(CAT, 'repos.json'), { entries: [] });
  const rejected = readJson(join(CAT, '_rejected.json'), { entries: [] });
  const metaAll = readJson(join(CACHE, 'meta.json'), {});
  let next = shelf.entries.reduce((n, e) => Math.max(n, Number(e.id.slice(2))), 0);
  const keep = [];
  let a = 0, r = 0;
  // new catalogue numbers run by category, then by stars, so a batch reads in order
  const order = [...q.entries].sort((x, y) => CATS.indexOf(x.cat) - CATS.indexOf(y.cat) || y.stars - x.stars);
  for (const c of order) {
    if (c.decision === 'accept') {
      if (!c.note || !c.note.en || !c.note.zh) throw new Error(`${c.repo}: an accepted entry needs note.en and note.zh`);
      if (!CATS.includes(c.cat) || !KINDS.includes(c.kind)) throw new Error(`${c.repo}: bad cat or kind`);
      const m = metaAll[key(c.repo)] || {};
      shelf.entries.push({ id: 'R-' + String(++next).padStart(6, '0'), repo: c.repo, cat: c.cat, kind: c.kind, note: c.note,
        desc: c.desc, license: c.license, rights: c.rights, stars: c.stars, updated: c.updated, archived: !!m.archived, topics: c.topics, homepage: m.homepage || '',
        ...(c.excerpt ? { excerpt: c.excerpt } : {}), added: today(), checked: today() });
      a++;
    } else if (c.decision === 'reject') {
      rejected.entries.push({ repo: c.repo, reason: c.reason || 'not for this room', on: today() });
      r++;
    } else keep.push(c);
  }
  shelf.entries.sort((x, y) => x.id.localeCompare(y.id));
  rejected.entries.sort((x, y) => key(x.repo).localeCompare(key(y.repo)));
  writeJson(join(CAT, 'repos.json'), shelf);
  writeJson(join(CAT, '_rejected.json'), rejected);
  writeJson(join(CAT, '_queue.json'), { ...q, entries: keep });
  console.log(`apply: ${a} shelved, ${r} rejected, ${keep.length} still waiting`);
}

const cmd = process.argv[2];
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  if (!TOKEN && ['harvest', 'meta', 'weekly'].includes(cmd)) { console.error('No GitHub token: set GITHUB_TOKEN or sign in with `gh auth login`.'); process.exit(1); }
  const run = { harvest, meta, score, refresh, apply, decide: () => decide(process.argv.slice(3)), weekly: async () => { await harvest(); await meta(); refresh(); score(); } }[cmd];
  if (!run) { console.log(readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').slice(1, 11).join('\n')); process.exit(1); }
  await run();
}
