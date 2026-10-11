// The reading renderer for work pages (spec §5.3.3–5.3.7, §6.16).
// It parses a catalogue text, aligns it with its translation, places glosses and Claude's marginalia,
// and returns the reading layers. Page assembly (header, toolbar, frames, end matter) lives in work.mjs.
//
// Markup contract (40-reading.css reads it; the checked radio is the only view state):
//   .o / .tr      the original / the paired translation; .o-hant / .o-hans are the two scripts of a Chinese text
//   .keep         original text in a part a partial translation leaves out (shown in every view)
//   .nt           "Not yet translated", above such a part
//   .layer-o      verse as written (orig view)          .layer-p   verse rows aligned line by line (par and tr views)
//   .layer-t2     a second translation, shown on its own (tr2 view)
//   .blk          a paragraph (or a group) with notes; the notes come first and float into the margin
//   .stanza       a verse stanza as written; a note sits just before the line it belongs to
//   .vrows / .vr  one stanza of layer P / one row of it (original and translation side by side); a .w<n> class
//                 gives a Chinese original's first column its width in em; each note sits just before its row
//   .gl / .gk     a glossed phrase / its last character, which draws the number (CSS ::after, so it is never copied)
//   .gn / .mn     a gloss (注释, the page language) / a marginal note by Claude
// The text exists once per layer; a hidden script or layer is display:none, so find-in-page never meets duplicates.
import { esc, addGlyphs } from '../lib.mjs';
import { splitCaesura, anchorText } from '../stacks.mjs';

const HAN = /[㐀-鿿豈-﫿]/;
const HAN_G = /[㐀-鿿豈-﫿]/g;
const CJK_G = /[　-〿㐀-䶿一-鿿豈-﫿＀-￯]|[\u{20000}-\u{2ebef}]/gu;
const HAN_RUN = /[㐀-鿿豈-﫿　-〿＀-￯“”‘’—…·]+/g;
export const hasHan = (s) => HAN.test(String(s || ''));
// Han runs inside non-Chinese copy get their own lang, so they take Chinese glyph forms (spec §3.5.2).
// Input is escaped text; tag is the script of the work (zh-Hant for a traditional text).
const HAN_RUN_T = /(?:[　-〿＀-￯]*(?:[㐀-鿿豈-﫿]|[\u{20000}-\u{2ebef}])[　-〿＀-￯]*)+/gu;
export const hanRuns = (escaped, tag = 'zh-Hans') => String(escaped).replace(HAN_RUN_T, (m) => `<span lang="${tag}">${m}</span>`);
const charSet = (s) => new Set(String(s || '').match(CJK_G) || []);
const tagOfPage = (l) => (l === 'zh' ? 'zh-Hans' : 'en');

// ---------------------------------------------------------------- parsing
// Blocks follow stacks.mjs blocks()/toc() exactly (the checker numbers paragraphs and sections with them):
// section ids count every ## and ### heading, and "p:12-18" counts every block that is not a heading or code.
const anchor = (s, n) => {
  const a = s.toLowerCase().normalize('NFKD').replace(/[^\w㐀-鿿]+/g, '-').replace(/^-+|-+$/g, '');
  return (a && a.length < 60 ? a : 'part') + '-' + n;
};
const BREAK = /^\s*(?:(?:\*\s*){3,}|⁂|(?:-\s*){3,})\s*$/;

function classify(lines) {
  if (lines.length === 1 && BREAK.test(lines[0])) return { t: 'hr' };
  if (lines.every((l) => /^\s*>/.test(l))) return { t: 'q', lines: lines.map((l) => l.replace(/^\s*> ?/, '')) };
  return { t: 'p', lines };
}

// Blocks: { t: 'h', level, text, id } | { t: 'p' | 'q', lines } | { t: 'code', info, text } | { t: 'hr' }.
// p, q and hr carry pn, their 1-based paragraph number (used by "p:12-18" segments).
export function parse(src) {
  const out = [];
  let h = 0, pn = 0;
  const parts = ('\n' + String(src || '').replace(/\r\n?/g, '\n')).split(/\n```([^\n]*)\n([\s\S]*?)\n```\n?/);
  for (let i = 0; i < parts.length; i += 3) {
    for (const chunk of parts[i].replace(/\n{3,}/g, '\n\n').split(/\n\s*\n/)) {
      const lines = chunk.split('\n').filter((l) => l.trim() !== '');
      if (!lines.length) continue;
      const m = lines[0].match(/^(#{2,3})\s+(.+)$/);
      if (m) {
        out.push({ t: 'h', level: m[1].length, text: m[2].trim(), id: anchor(m[2], ++h) });
        if (lines.length > 1) out.push(classify(lines.slice(1)));
      } else out.push(classify(lines));
    }
    if (i + 2 < parts.length) out.push({ t: 'code', info: parts[i + 1].trim().toLowerCase(), text: parts[i + 2] });
  }
  for (const b of out) if (b.t !== 'h' && b.t !== 'code') b.pn = ++pn;
  return out;
}

// Split blocks at ## headings. The run before the first heading is a section with h = null.
export function sectionsOf(blocks) {
  const out = [{ h: null, id: null, blocks: [] }];
  for (const b of blocks) {
    if (b.t === 'h' && b.level === 2) out.push({ h: b, id: b.id, blocks: [] });
    else out[out.length - 1].blocks.push(b);
  }
  if (!out[0].blocks.length && out.length > 1) out.shift();
  return out;
}

// Pair the sections of an original with those of a full translation: the untitled opening with the untitled
// opening, then headed section with headed section. Returns one translation section (or null) per original section.
function pairSections(oSecs, tSecs, warn) {
  const oh = oSecs.filter((s) => s.h), th = tSecs.filter((s) => s.h);
  const t0 = tSecs.length && !tSecs[0].h ? tSecs[0] : null;
  if (oh.length === th.length) {
    let k = 0;
    const out = oSecs.map((s) => (s.h ? th[k++] : t0));
    // A translation that opens with text the original lacks: keep it with the first section.
    if (t0 && oSecs[0].h) out[0] = { h: out[0].h, blocks: [...t0.blocks, ...out[0].blocks] };
    return out;
  }
  warn(`the translation has ${th.length} ## sections for the original's ${oh.length}; sections are paired in order`);
  return oSecs.map((s, i) => tSecs[i] || null);
}

// The simplified copy of a Hant text mirrors it block for block (tools/stacks-hans.py); attach each block's twin.
function attachHans(ob, hb) {
  if (!hb || hb.length !== ob.length) return false;
  for (let i = 0; i < ob.length; i++) {
    if (ob[i].t !== hb[i].t) return false;
    if (ob[i].lines && (!hb[i].lines || hb[i].lines.length !== ob[i].lines.length)) return false;
  }
  ob.forEach((b, i) => { b.hans = hb[i]; });
  return true;
}

const joinLines = (lines) => lines.map((l) => l.trim()).reduce((a, l) => (!a ? l : a + (HAN.test(a.slice(-1)) || /^[，。、；：？！」』）]/.test(l) ? '' : ' ') + l), '');
const joinBreaks = (lines) => lines.map((l) => l.trim()).join('\n');
const weight = (s) => { const t = String(s || ''); const han = (t.match(HAN_G) || []).length; return han * 2.6 + t.replace(HAN_G, '').length; };
export const minutesOf = (s) => {
  const t = String(s || '');
  const han = (t.match(HAN_G) || []).length;
  const words = t.replace(HAN_G, ' ').split(/\s+/).filter((x) => /[A-Za-z0-9À-ɏͰ-ϿЀ-ӿ]/.test(x)).length;
  return han / 400 + words / 230;
};
const blockText = (b) => (b.t === 'code' ? b.text : b.lines ? b.lines.join('\n') : b.text || '');
const isStanza = (b) => b.t === 'p' || b.t === 'q';

// ---------------------------------------------------------------- inline text
// Light Markdown inside a line: **strong**, *em*, _em_. Chinese inside <strong> is registered for the 600 subset.
const STRONG = /\*\*(.+?)\*\*/g;
const EM_STAR = /(^|[^*\w])\*([^*\s][^*]*?)\*(?![*\w])/g;
const EM_LOW = /(^|[^\w])_([^_\s][^_]*?)_(?![\w])/g;
function rich(s) {
  return esc(s)
    .replace(STRONG, (_, x) => { if (HAN.test(x)) addGlyphs(x, 'w600'); return `<strong>${x}</strong>`; })
    .replace(EM_STAR, '$1<em>$2</em>')
    .replace(EM_LOW, '$1<em>$2</em>');
}
// Emphasis runs in raw text, as rich() reads them: [start, end, marker length].
function emphasisRuns(raw) {
  const runs = [];
  for (const m of raw.matchAll(STRONG)) runs.push([m.index, m.index + m[0].length, 2]);
  for (const re of [EM_STAR, EM_LOW]) for (const m of raw.matchAll(re)) { const a = m.index + m[1].length; runs.push([a, a + m[2].length + 2, 1]); }
  return runs;
}
// The text as the checker reads it (anchorText: emphasis markers removed), with a map back to the raw text.
function plainMap(raw) {
  const plain = anchorText(raw);
  const map = new Array(plain.length + 1);
  let j = 0;
  for (let i = 0; i < raw.length && j < plain.length; i++) if (raw[i] === plain[j]) map[j++] = i;
  map[plain.length] = raw.length;
  return { plain, map };
}
// A gloss mark on raw text [s, e), widened so it never cuts an emphasis run in half. The last visible character
// (k … kEnd) carries the number, so phrase and number never part at a line end and a long phrase can still wrap.
function markOf(raw, s, e, n) {
  const runs = emphasisRuns(raw);
  for (let again = true; again;) {
    again = false;
    for (const [a, b, k] of runs) {
      if (s < b && e > a && !(s >= a + k && e <= b - k) && !(s <= a && e >= b)) { s = Math.min(s, a); e = Math.max(e, b); again = true; }
    }
  }
  const markers = new Set();
  for (const [a, b, k] of runs) if (a >= s && b <= e) for (let i = 0; i < k; i++) { markers.add(a + i); markers.add(b - 1 - i); }
  let k = e - 1;
  while (k > s && markers.has(k)) k--;
  if (k > s && /[\uDC00-\uDFFF]/.test(raw[k]) && /[\uD800-\uDBFF]/.test(raw[k - 1])) k--;
  const kEnd = k + (raw.codePointAt(k) > 0xffff ? 2 : 1);
  return { start: s, end: e, k, kEnd, n };
}
// A line with gloss marks: private-use placeholders survive escaping and emphasis, then become the spans.
function marked(text, marks, prefix) {
  if (!marks || !marks.length) return rich(text);
  let s = '', pos = 0;
  for (const m of [...marks].sort((a, b) => a.start - b.start)) {
    if (m.start < pos || m.end > text.length) continue;
    s += text.slice(pos, m.start) + '\uE000' + m.n + '\uE001' + text.slice(m.start, m.k) + '\uE003' + m.n + '\uE004' + text.slice(m.k, m.kEnd) + '\uE005' + text.slice(m.kEnd, m.end) + '\uE002';
    pos = m.end;
  }
  s += text.slice(pos);
  return rich(s)
    .replace(/\uE000(\d+)\uE001/g, (_, n) => `<span class="gl" aria-describedby="${prefix}${n}">`)
    .replace(/\uE003(\d+)\uE004/g, (_, n) => `<span class="gk" data-n="${n}">`)
    .replace(/[\uE002\uE005]/g, '</span>');
}
const indentOf = (l) => Math.min((String(l).match(/^[ 　]*/)[0].replace(/　/g, '  ').length) >> 1, 4);
const cls = (...xs) => xs.filter(Boolean).join(' ');
// First-column widths of side-by-side Chinese verse, in em (40-reading.css has a .w<n> rule for each).
export const WIDTHS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 16, 18, 20, 24];

// ---------------------------------------------------------------- notes: glosses and marginalia
// Units are where a note can attach: a verse line ("bi:li"), a paragraph ("bi") or a code block ("c<bi>").
// Headings count occurrences, as the checker does (it searches the whole text), but take no notes.
function unitsOf(ob, verse, multiLine) {
  const units = [];
  const unit = (key, raw, hans, extra = {}) => ({ key, raw, ...plainMap(raw), hans: hans == null ? null : { raw: hans, ...plainMap(hans) }, ...extra });
  ob.forEach((b, bi) => {
    if (b.t === 'h') { units.push(unit('h' + bi, b.text, null, { heading: true })); return; }
    if (b.t === 'code') { units.push(unit('c' + bi, b.text, null, { code: true })); return; }
    if (!isStanza(b)) return;
    const hb = b.hans;
    if (verse) b.lines.forEach((l, li) => units.push(unit(bi + ':' + li, l.trim(), hb ? hb.lines[li].trim() : null)));
    else { const j = multiLine(b) ? joinBreaks : joinLines; units.push(unit(String(bi), j(b.lines), hb ? j(hb.lines) : null)); }
  });
  return units;
}
function locate(units, at, occ) {
  let seen = 0;
  for (const u of units) {
    let from = 0, i, local = 0;
    while ((i = u.plain.indexOf(at, from)) !== -1) {
      seen++; local++;
      if (seen === occ) return { u, ps: i, pe: i + at.length, local };
      from = i + 1;
    }
  }
  return null;
}
function nthIndex(s, sub, n) { let i = -1; for (let k = 0; k < n; k++) { i = s.indexOf(sub, i + 1); if (i === -1) return -1; } return i; }
const rawRange = (t, ps, pe) => [t.map[ps], t.map[pe - 1] + 1];

// Glosses (any work) and marginalia (picks only, at most 3), each placed at the line or paragraph it anchors to.
// Gloss numbers follow the order of the text.
export function placeNotes(w, ob, verse, multiLine, warn = () => {}) {
  const units = unitsOf(ob, verse, multiLine);
  const byKey = new Map(units.map((u) => [u.key, u]));
  const notes = new Map();
  const found = [];
  const find = (x, kind) => {
    const occ = x.occ || 1;
    const hit = locate(units, x.at, occ);
    if (!hit) { warn(`${kind} anchor "${x.at}" (occurrence ${occ}) not found in the text`); return null; }
    if (hit.u.heading) { warn(`${kind} anchor "${x.at}" falls in a heading; not shown`); return null; }
    return hit;
  };
  for (const g of Array.isArray(w.gloss) ? w.gloss : []) {
    if (!g || !g.at) continue;
    const hit = find(g, 'gloss');
    if (!hit) continue;
    const u = hit.u;
    const [s, e] = rawRange(u, hit.ps, hit.pe);
    const f = { type: 'gn', g, key: u.key, order: units.indexOf(u), start: s, end: e, code: !!u.code, hansAt: null };
    if (u.hans) {
      const H = u.hans;
      let hp = null;
      if (H.plain.length === u.plain.length) hp = [hit.ps, hit.pe];
      else { const a = g.at_hans || g.at; const i = nthIndex(H.plain, a, hit.local); if (i >= 0) hp = [i, i + a.length]; }
      if (hp) { f.hrange = rawRange(H, hp[0], hp[1]); f.hansAt = H.plain.slice(hp[0], hp[1]); }
      else warn(`gloss "${g.at}": the simplified spelling is not in text.zh-Hans.md; add at_hans`);
    }
    found.push(f);
  }
  const mlist = Array.isArray(w.marginalia) ? w.marginalia : [];
  if (mlist.length && !w.pick) warn('marginalia on a work that is not on Claude’s shelf; not shown');
  if (w.pick && mlist.length > 3) warn('more than 3 marginal notes; only the first 3 are shown');
  for (const m of w.pick ? mlist.slice(0, 3) : []) {
    if (!m || !m.at) continue;
    const hit = find(m, 'marginal note');
    if (hit) found.push({ type: 'mn', m, key: hit.u.key, order: units.indexOf(hit.u), start: rawRange(hit.u, hit.ps, hit.pe)[0] });
  }
  found.sort((a, b) => a.order - b.order || a.start - b.start);
  const marks = new Map(), hmarks = new Map();
  const push = (map, k, v) => { if (!map.has(k)) map.set(k, []); map.get(k).push(v); };
  let n = 0, lastEnd = new Map();
  for (const f of found) {
    if (f.type === 'gn') {
      f.n = ++n;
      if (!f.code) {
        if (f.start < (lastEnd.get(f.key) || 0)) warn(`gloss "${f.g.at}" overlaps the gloss before it; its phrase is not marked`);
        else {
          lastEnd.set(f.key, f.end);
          const u = byKey.get(f.key);
          push(marks, f.key, markOf(u.raw, f.start, f.end, f.n));
          if (f.hrange) push(hmarks, f.key, markOf(u.hans.raw, f.hrange[0], f.hrange[1], f.n));
        }
      }
    }
    push(notes, f.key, f);
  }
  return { byKey, marks, hmarks, notes, count: found.length, glosses: found.filter((f) => f.type === 'gn').length, margins: found.filter((f) => f.type === 'mn').length };
}
// Marks that fall in [from, to) of a line, rebased to that half (half-line rows).
function marksIn(raw, marks, from, to) {
  return (marks || []).filter((m) => m.start >= from && m.start < to).map((m) => markOf(raw.slice(from, to), m.start - from, Math.min(m.end, to) - from, m.n));
}

// ---------------------------------------------------------------- verse pairing
// Pair the stanzas of one section with the translation's. Equal stanza counts pair stanza with stanza;
// otherwise the translation is re-cut by the original's stanza sizes when the line totals allow it;
// otherwise the whole section pairs as one block.
const splittable = (b) => b.lines.every((l, li) => splitCaesura(l) && (!b.hans || splitCaesura(b.hans.lines[li])));
export function pairVerse(O, Tb, cjk) {
  const os = O.filter(isStanza), ts = (Tb || []).filter(isStanza);
  if (!ts.length || !os.length) return null;
  if (os.length === ts.length) return os.map((b, i) => ({ o: b, t: ts[i] }));
  const ol = os.reduce((a, b) => a + b.lines.length, 0);
  const tl = ts.reduce((a, b) => a + b.lines.length, 0);
  const flat = ts.flatMap((b) => b.lines);
  if (tl === ol || (cjk && tl === 2 * ol && os.every(splittable))) {
    const f = tl === ol ? 1 : 2;
    let k = 0;
    return os.map((b) => { const t = { t: 'p', lines: flat.slice(k, k + b.lines.length * f) }; k += b.lines.length * f; return { o: b, t }; });
  }
  return [{ o: null, all: os, t: null, tall: ts }];
}
// line: rows pair line to line · half: each original line splits at its caesura · stanza: the stanza pairs as a block
export const rowMode = (o, t, cjk, preface) => (preface ? 'prose' : o.lines.length === t.lines.length ? 'line' : cjk && t.lines.length === 2 * o.lines.length && splittable(o) ? 'half' : 'stanza');

// ---------------------------------------------------------------- prose alignment
// Equal counts pair one to one. Otherwise split at code blocks when both sides have the same number,
// then align by length (beads of up to 1:4, Gale–Church style). A very uneven run becomes one group.
export function align(O, Tb) {
  if (!Tb || !Tb.length) return O.map((b) => ({ o: [b], t: null }));
  if (!O.length) return [{ o: [], t: Tb }];
  if (O.length === Tb.length) return O.map((b, i) => ({ o: [b], t: [Tb[i]] }));
  const ao = O.filter((b) => b.t === 'code').length, at = Tb.filter((b) => b.t === 'code').length;
  if (ao && ao === at) {
    const cut = (arr) => { const runs = [[]]; for (const b of arr) { if (b.t === 'code') { runs.push([b]); runs.push([]); } else runs[runs.length - 1].push(b); } return runs; };
    const ro = cut(O), rt = cut(Tb);
    return ro.flatMap((r, i) => (r.length || rt[i].length ? align(r, rt[i]) : []));
  }
  if (O.length > Tb.length * 4 || Tb.length > O.length * 4 || O.length * Tb.length > 250000) return [{ o: O, t: Tb }];
  const lo = O.map((b) => weight(blockText(b))), lt = Tb.map((b) => weight(blockText(b)));
  const c = lt.reduce((a, x) => a + x, 0) / Math.max(1, lo.reduce((a, x) => a + x, 0));
  const BEADS = [[1, 1, 0], [1, 2, 1.2], [2, 1, 1.2], [1, 3, 2.4], [3, 1, 2.4], [2, 2, 2], [2, 3, 3], [3, 2, 3], [1, 4, 3.5], [4, 1, 3.5]];
  const n = O.length, m = Tb.length;
  const D = Array.from({ length: n + 1 }, () => new Float64Array(m + 1).fill(Infinity));
  const B = Array.from({ length: n + 1 }, () => new Int8Array(m + 1).fill(-1));
  D[0][0] = 0;
  for (let i = 0; i <= n; i++) for (let j = 0; j <= m; j++) {
    if (D[i][j] === Infinity) continue;
    BEADS.forEach(([a, b, pen], k) => {
      if (i + a > n || j + b > m) return;
      let so = 0, st = 0;
      for (let x = 0; x < a; x++) so += lo[i + x];
      for (let y = 0; y < b; y++) st += lt[j + y];
      const cost = D[i][j] + Math.abs(st - c * so) / Math.sqrt(c * so + st + 1) + pen;
      if (cost < D[i + a][j + b]) { D[i + a][j + b] = cost; B[i + a][j + b] = k; }
    });
  }
  if (D[n][m] === Infinity) return [{ o: O, t: Tb }];
  const out = [];
  for (let i = n, j = m; i > 0 || j > 0;) { const [a, b] = BEADS[B[i][j]]; out.unshift({ o: O.slice(i - a, i), t: Tb.slice(j - b, j) }); i -= a; j -= b; }
  return out;
}

// Partial translations: map each translation segment (one ## section of translation.<lang>.md per segment)
// to a ## section of the original (by id, heading text or number) or to a paragraph range "p:12-18".
function mapSegments(info, ob, oSecs, tParsed, warn) {
  const segs = Array.isArray(info.segments) ? info.segments : [];
  if (!segs.length) return null;
  let tS = sectionsOf(tParsed);
  if (segs.length === 1) tS = [{ h: tS.length === 1 ? tS[0].h : null, blocks: tParsed.filter((b) => !(b.t === 'h' && b.level === 2)) }];
  else if (tS.length === segs.length + 1 && !tS[0].h) tS = [{ ...tS[1], blocks: [...tS[0].blocks, ...tS[1].blocks] }, ...tS.slice(2)];
  if (tS.length !== segs.length) { warn(`partial translation has ${tS.length} sections for ${segs.length} segments`); return null; }
  const segOf = new Map(), secSeg = new Map();
  const headed = oSecs.filter((s) => s.h);
  for (let k = 0; k < segs.length; k++) {
    const src = String((segs[k] && segs[k].src) || '').trim();
    const pm = src.match(/^p:\s*(\d+)\s*(?:[-–]\s*(\d+))?$/);
    if (pm) {
      const a = +pm[1], b = +(pm[2] || pm[1]);
      let any = false;
      for (const bl of ob) if (bl.pn >= a && bl.pn <= b) { segOf.set(bl, k); any = true; }
      if (!any) { warn(`segment ${src} matches no paragraph`); return null; }
    } else {
      const lc = src.toLowerCase();
      const sec = headed.find((s) => s.id === src) || headed.find((s) => s.h.text.toLowerCase() === lc) || (/^(?:s:)?\d+$/.test(src) ? headed[+src.replace(/^s:/, '') - 1] : null);
      if (!sec) { warn(`segment "${src}" matches no section`); return null; }
      secSeg.set(sec, k);
      for (const bl of sec.blocks) segOf.set(bl, k);
    }
  }
  return { segOf, secSeg, tS };
}

// ---------------------------------------------------------------- the renderer
// opts: { lang, textTag, cjk, aph, parts, cv,
//         P:  paired translation { lang, tag, text, info } | null,
//         T2: translation on its own { lang, tag, text, partial } | null }
export function renderReading(w, opts) {
  const { lang, cjk } = opts;
  const T = (en, zh) => (lang === 'zh' ? zh : en);
  const warns = [];
  const warn = (m) => warns.push(m);
  const verse = w.form === 'verse';
  const textTag = opts.textTag;
  const ob = parse(w.text);
  const hasHans = !!w.textHans && attachHans(ob, parse(w.textHans));
  if (w.textHans && !hasHans) warn('text.zh-Hans.md does not mirror text.md block for block; the script toggle is off');
  const multiLine = (b) => (b.t === 'q' || opts.aph) && b.lines.length > 1 && (opts.aph || b.lines.every((l) => l.trim().length < 60));
  const N = placeNotes(w, ob, verse, multiLine, warn);
  const HANS = ' lang="zh-Hans"';
  const bi0 = new Map(ob.map((b, i) => [b, i]));
  const P = opts.P;
  const PL = P ? ` lang="${P.tag}"` : '';

  // ---- glyphs: characters in both scripts go to base, the rest to hant / hans; translations into Chinese to base
  if (cjk || hasHan(w.text)) {
    const a = charSet(w.text);
    if (hasHans) {
      const b = charSet(w.textHans);
      addGlyphs([...a].filter((c) => b.has(c)).join(''), 'base');
      addGlyphs([...a].filter((c) => !b.has(c)).join(''), 'hant');
      addGlyphs([...b].filter((c) => !a.has(c)).join(''), 'hans');
    } else addGlyphs([...a].join(''), 'base');
  }
  for (const tx of [P, opts.T2]) if (tx && hasHan(tx.text)) addGlyphs(tx.text.replace(/```[\s\S]*?```/g, ''), 'base');

  // ---- notes. Glosses are in the page language (sans); marginalia are in Claude's hand (serif), signed once per layer.
  const signed = { o: false, p: false };
  const own = (x) => (x[lang] ? lang : x.en ? 'en' : 'zh');
  const hanTag = /-Hant$/.test(textTag) ? 'zh-Hant' : 'zh-Hans';
  const body = (s, l) => (l === 'zh' ? esc(s) : hanRuns(esc(s), hanTag));
  const gAnchor = (f) => {
    if (!hasHans || f.hansAt == null || f.hansAt === f.g.at) return `<span class="ga" lang="${textTag}">${esc(f.g.at)}</span>`;
    return `<span class="ga o-hant" lang="${textTag}">${esc(f.g.at)}</span><span class="ga o-hans"${HANS}>${esc(f.hansAt)}</span>`;
  };
  const noteHTML = (f, prefix, layer) => {
    if (f.type === 'gn') {
      const l = own(f.g);
      return `<aside class="gn" id="${prefix}${f.n}" role="note" lang="${tagOfPage(l)}"><b class="gnum">${f.n}</b> ${gAnchor(f)} ${body(f.g[l] || '', l)}</aside>`;
    }
    const l = own(f.m);
    const text = f.m[l] || '';
    addGlyphs(text, 'base'); // marginalia are set in the serif, Han quoted in English ones included
    const sig = signed[layer] ? '' : `<span class="mn-sig meta">— Claude</span>`;
    signed[layer] = true;
    return `<aside class="mn" role="note" aria-label="${T('Claude, in the margin', 'Claude 的页边批注')}" lang="${tagOfPage(l)}">${body(text, l)}${sig}</aside>`;
  };
  const notesFor = (keys, prefix, layer) => keys.flatMap((k) => N.notes.get(k) || []).map((f) => noteHTML(f, prefix, layer)).join('');

  // ---- blocks of the original
  const K = (keep) => (keep ? 'keep' : '');
  const lines2 = (b, lines, marks, prefix) => (multiLine(b) ? marked(joinBreaks(lines), marks, prefix).replace(/\n/g, '<br>') : marked(joinLines(lines), marks, prefix));
  const paraHTML = (b, bi, keep, prefix) => {
    const k = String(bi);
    const tag = b.t === 'q' ? 'blockquote' : 'p';
    const kind = b.t === 'q' ? 'q' : opts.aph ? 'aph' : '';
    const hant = `<${tag} class="${cls('o', hasHans && 'o-hant', K(keep), kind)}">${lines2(b, b.lines, N.marks.get(k), prefix)}</${tag}>`;
    const hans = hasHans ? `<${tag} class="${cls('o o-hans', K(keep), kind)}"${HANS}>${lines2(b, b.hans.lines, N.hmarks.get(k), prefix)}</${tag}>` : '';
    return hant + hans;
  };
  const isPreface = (b) => verse && cjk && b.t === 'p' && b.lines.length === 1 && b.lines[0].trim().length > 34;
  const lineSpan = (l, c, marks, prefix, attrs = '') => { const lead = indentOf(l); return `<span class="${cls(c, 'line', lead && 'i' + lead)}"${attrs}>${marked(l.trim(), marks, prefix)}</span>`; };

  const LC = { py: '#', python: '#', sh: '#', bash: '#', shell: '#', zsh: '#', rb: '#', ruby: '#', r: '#', perl: '#', yaml: '#', toml: '#', make: '#', makefile: '#', asm: '#;', c: '//', cpp: '//', 'c++': '//', js: '//', javascript: '//', ts: '//', typescript: '//', java: '//', go: '//', rust: '//', swift: '//', kotlin: '//', cs: '//', csharp: '//', php: '//' };
  const codeHTML = (b, extra = '', attrs = '') => {
    const lc = LC[b.info] || '';
    const isCm = (l) => { const s = l.trim(); return lc === '#' ? s.startsWith('#') : lc === '//' ? s.startsWith('//') : lc === '#;' ? /^[#;]/.test(s) : false; };
    const lines = b.text.replace(/\n+$/, '').split('\n').map((l) => `<span class="${isCm(l) ? 'cl cm' : 'cl'}">${esc(l).replace(HAN_RUN, (m) => `<span class="han">${m}</span>`)}</span>`).join('\n');
    return `<div class="${cls('code-wrap wide', extra)}"${attrs}><p class="code-tools needs-js"><button class="linkish" type="button" data-copy>${T('Copy', '复制')}</button><span class="copy-status" aria-live="polite"></span></p><div class="code-box"><pre class="code"${b.info ? ` data-lang="${esc(b.info)}"` : ''} tabindex="0" aria-label="${T('Code', '代码')}"><code>${lines}</code></pre></div></div>`;
  };
  const oBlockHTML = (b, bi, keep, prefix = 'gl-') => {
    if (b.t === 'code') return codeHTML(b, cls('o', K(keep)));
    if (b.t === 'hr') return `<hr class="${cls('break o', K(keep))}">`;
    if (b.t === 'h') return `<h3 class="${cls('read-h3 o', hasHans && 'o-hant', K(keep))}">${rich(b.text)}</h3>${hasHans ? `<h3 class="${cls('read-h3 o o-hans', K(keep))}"${HANS}>${rich(b.hans.text)}</h3>` : ''}`;
    return paraHTML(b, bi, keep, prefix);
  };
  const trBlockHTML = (b) => {
    if (b.t === 'code') return codeHTML(b, 'tr', PL);
    if (b.t === 'hr') return '<hr class="break tr">';
    if (b.t === 'h') return `<h3 class="read-h3 tr"${PL}>${rich(b.text)}</h3>`;
    const tag = b.t === 'q' ? 'blockquote' : 'p';
    return `<${tag} class="${cls('tr', b.t === 'q' ? 'q' : opts.aph && 'aph')}"${PL}>${multiLine(b) ? b.lines.map((l) => rich(l.trim())).join('<br>') : rich(joinLines(b.lines))}</${tag}>`;
  };

  // ---- prose beads: one original block (or a group) with its translation, notes first
  const beadHTML = (bead, keep = false) => {
    const keys = bead.o.filter(isStanza).map((b) => String(bi0.get(b)));
    const notes = notesFor(keys, 'gl-', 'p');
    // notes anchored in code follow the block in the text column (code reaches across the margin)
    const cn = notesFor(bead.o.filter((b) => b.t === 'code').map((b) => 'c' + bi0.get(b)), 'gl-', 'p');
    const codeNotes = cn ? `<div class="code-notes">${cn}</div>` : '';
    if (bead.t && bead.o.length === 1 && bead.t.length === 1 && bead.o[0].t === 'code' && bead.t[0].t === 'code' && bead.o[0].text === bead.t[0].text) return codeHTML(bead.o[0]) + codeNotes;
    const one = bead.o.length === 1 && (!bead.t || bead.t.length <= 1);
    const html = one
      ? oBlockHTML(bead.o[0], bi0.get(bead.o[0]), keep) + (bead.t && bead.t[0] ? trBlockHTML(bead.t[0]) : '')
      : `<div class="grp-o">${bead.o.map((b) => oBlockHTML(b, bi0.get(b), keep)).join('')}</div>${bead.t && bead.t.length ? `<div class="grp-t">${bead.t.map(trBlockHTML).join('')}</div>` : ''}`;
    if (!notes && one) return html + codeNotes;
    return `<div class="${cls('blk', notes && 'has-n', !one && 'grp')}">${notes}${html}</div>${codeNotes}`;
  };

  // ---- verse, layer O: the stanza as written, each note just before its line
  const stanzaO = (b, keep = false) => {
    const bi = bi0.get(b);
    if (isPreface(b)) {
      const k = bi + ':0';
      const nts = notesFor([k], 'glo-', 'o');
      const ps = `<p class="${cls('o preface', hasHans && 'o-hant', K(keep))}">${marked(b.lines[0].trim(), N.marks.get(k), 'glo-')}</p>` + (hasHans ? `<p class="${cls('o o-hans preface', K(keep))}"${HANS}>${marked(b.hans.lines[0].trim(), N.hmarks.get(k), 'glo-')}</p>` : '');
      return nts ? `<div class="blk has-n">${nts}${ps}</div>` : ps;
    }
    let anyN = false;
    const lines = b.lines.map((l, li) => {
      const k = bi + ':' + li;
      const nts = notesFor([k], 'glo-', 'o');
      if (nts) anyN = true;
      return nts + lineSpan(l, cls('o', hasHans && 'o-hant', K(keep)), N.marks.get(k), 'glo-') + (hasHans ? lineSpan(b.hans.lines[li], cls('o o-hans', K(keep)), N.hmarks.get(k), 'glo-', HANS) : '');
    }).join('');
    return `<div class="${cls('stanza', anyN && 'has-n', K(keep))}">${lines}</div>`;
  };
  // ---- verse, layer P: one row (.vr) per line or half-line, original and translation side by side. Every row of
  // a stanza shares the first column's width: for Chinese it is computed here in em (each character is 1em), so
  // rows line up without one grid per stanza, and each note can sit just before its row and float into the margin.
  const modes = [];
  const notesP = (fs) => fs.map((f) => noteHTML(f, 'gl-', 'p')).join('');
  const widthCls = (cells) => {
    if (!cjk) return '';
    const em = Math.max(1, ...cells.map((s) => [...anchorText(s)].reduce((a, c) => a + (/[　-〿㐀-鿿豈-﫿＀-￯]|[\u{20000}-\u{2ebef}]/u.test(c) ? 1 : 0.6), 0)));
    return 'w' + (WIDTHS.find((x) => x >= Math.ceil(em - 0.05)) || WIDTHS[WIDTHS.length - 1]);
  };
  const rowsHTML = (pair) => {
    const o = pair.o, t = pair.t;
    if (!o) {
      // the section's stanzas pair as one block: original and translation side by side, each as written
      const cell = (arr, c, attrs, src) => `<div class="${c}"${attrs}>${arr.map((b) => `<span class="st">${src(b).map((l, li) => lineSpan(l, '', src === tLines ? null : (src === hLines ? N.hmarks : N.marks).get(bi0.get(b) + ':' + li), 'gl-')).join('')}</span>`).join('')}</div>`;
      const oLines = (b) => b.lines, hLines = (b) => b.hans.lines, tLines = (b) => b.lines;
      const keys = pair.all.flatMap((b) => b.lines.map((_, li) => bi0.get(b) + ':' + li));
      modes.push('stanza');
      const nts = notesP(keys.flatMap((k) => N.notes.get(k) || []));
      return `<div class="${cls('vrows', nts && 'has-n', widthCls(pair.all.flatMap((b) => b.lines)))}">${nts}<div class="vr st">${cell(pair.all, cls('o', hasHans && 'o-hant'), '', oLines)}${hasHans ? cell(pair.all, 'o o-hans', HANS, hLines) : ''}${cell(pair.tall, 'tr', PL, tLines)}</div></div>`;
    }
    const bi = bi0.get(o);
    const mode = rowMode(o, t, cjk, isPreface(o));
    modes.push(mode);
    if (mode === 'prose') {
      const k = bi + ':0';
      const nts = notesFor([k], 'gl-', 'p');
      const ps = `<p class="${cls('o preface', hasHans && 'o-hant')}">${marked(o.lines[0].trim(), N.marks.get(k), 'gl-')}</p>` + (hasHans ? `<p class="o o-hans preface"${HANS}>${marked(o.hans.lines[0].trim(), N.hmarks.get(k), 'gl-')}</p>` : '') + `<p class="tr"${PL}>${rich(joinLines(t.lines))}</p>`;
      return nts ? `<div class="blk has-n">${nts}${ps}</div>` : ps;
    }
    let html = '', cells = [];
    const row = (inner) => `<div class="vr">${inner}</div>`;
    if (mode === 'line') {
      o.lines.forEach((l, li) => {
        const k = bi + ':' + li;
        cells.push(l.trim());
        html += notesP(N.notes.get(k) || []) + row(lineSpan(l, cls('o', hasHans && 'o-hant'), N.marks.get(k), 'gl-') + (hasHans ? lineSpan(o.hans.lines[li], 'o o-hans', N.hmarks.get(k), 'gl-', HANS) : '') + lineSpan(t.lines[li], 'tr', null, '', PL));
      });
    } else if (mode === 'half') {
      o.lines.forEach((l, li) => {
        const k = bi + ':' + li;
        const s = l.trim(), hs = hasHans ? o.hans.lines[li].trim() : '';
        const [a, b] = splitCaesura(s), cut = a.length;
        const [ha, hb] = hasHans ? splitCaesura(hs) : ['', ''];
        const hcut = ha.length;
        const fs = N.notes.get(k) || [];
        cells.push(a, b);
        const half = (txt, htxt, from, to, hfrom, hto, tl, nts) => notesP(nts) + row(`<span class="${cls('o', hasHans && 'o-hant', 'line')}">${marked(txt, marksIn(s, N.marks.get(k), from, to), 'gl-')}</span>`
          + (hasHans ? `<span class="o o-hans line"${HANS}>${marked(htxt, marksIn(hs, N.hmarks.get(k), hfrom, hto), 'gl-')}</span>` : '')
          + lineSpan(tl || '', 'tr', null, '', PL));
        html += half(a, ha, 0, cut, 0, hcut, t.lines[2 * li], fs.filter((f) => f.start < cut))
          + half(b, hb, cut, s.length, hcut, hs.length, t.lines[2 * li + 1], fs.filter((f) => f.start >= cut));
      });
    } else {
      const keys = o.lines.map((_, li) => bi + ':' + li);
      cells = o.lines.map((l) => l.trim());
      const cell = (lines, c, attrs, marksOf) => `<div class="${c}"${attrs}>${lines.map((l, li) => lineSpan(l, '', marksOf ? marksOf.get(bi + ':' + li) : null, 'gl-')).join('')}</div>`;
      html = notesP(keys.flatMap((k) => N.notes.get(k) || [])) + `<div class="vr st">${cell(o.lines, cls('o', hasHans && 'o-hant'), '', N.marks) + (hasHans ? cell(o.hans.lines, 'o o-hans', HANS, N.hmarks) : '') + cell(t.lines, 'tr', PL, null)}</div>`;
    }
    return `<div class="${cls('vrows', /class="(gn|mn)"/.test(html) && 'has-n', widthCls(cells))}">${html}</div>`;
  };
  // A run of verse with its translation: layer O as written, layer P aligned. Verse a translation leaves out
  // is shown as written in every view (keep).
  const verseRun = (blocks, tb, keep = false) => {
    const pairs = tb ? pairVerse(blocks, tb, cjk) : null;
    const layerO = blocks.map((b) => (isStanza(b) ? stanzaO(b, keep && !pairs) : oBlockHTML(b, bi0.get(b), keep && !pairs, 'glo-'))).join('');
    if (!pairs) return layerO;
    return `<div class="layer-o">${layerO}</div><div class="layer-p">${pairs.map(rowsHTML).join('')}</div>`;
  };

  // ---------------------------------------------------------------- sections
  const oSecs = sectionsOf(ob);
  const tParsed = P ? parse(P.text) : null;
  const full = P && (!P.info || P.info.full !== false);
  const seg = P && !full ? mapSegments(P.info, ob, oSecs, tParsed, warn) : null;
  const paired = !!P && (full || !!seg);
  const tPair = full ? pairSections(oSecs, sectionsOf(tParsed), warn) : null;
  const ntNote = () => `<p class="nt meta">${P && P.lang === 'zh' ? T('Not yet translated into Chinese', '本节暂无中文译文') : T('Not yet translated', '本节暂无译文')}</p>`;
  let anchored = false;
  const trAnchor = () => (anchored ? '' : ((anchored = true), '<span class="tr-anchor" id="translated"></span>'));

  const secs = oSecs.map((sec, si) => {
    const entry = { id: sec.id, h: sec.h, items: [], translated: false, tHead: null };
    const B = sec.blocks;
    const add = (html, min = 0) => entry.items.push({ html, min });
    if (seg) {
      // partial: runs of blocks by segment; untranslated runs carry a one-line note and stay visible in every view
      const runs = [];
      for (const b of B) {
        const k = seg.segOf.has(b) ? seg.segOf.get(b) : -1;
        if (runs.length && runs[runs.length - 1].k === k) runs[runs.length - 1].blocks.push(b); else runs.push({ k, blocks: [b] });
      }
      const secK = seg.secSeg.has(sec) ? seg.secSeg.get(sec) : null;
      entry.translated = runs.some((r) => r.k >= 0);
      if (secK != null && seg.tS[secK].h) entry.tHead = seg.tS[secK].h.text;
      const used = new Set();
      for (const r of runs) {
        const min = minutesOf(r.blocks.map(blockText).join('\n'));
        if (r.k < 0) {
          add(ntNote());
          for (const b of r.blocks) add(verse && isStanza(b) ? stanzaO(b, true) : beadHTML({ o: [b], t: null }, true), minutesOf(blockText(b)));
          continue;
        }
        const first = !used.has(r.k);
        used.add(r.k);
        const tb = first ? seg.tS[r.k].blocks.filter((b) => !(b.t === 'h' && b.level === 2)) : [];
        if (first) add(trAnchor());
        if (first && secK == null && seg.tS[r.k].h) add(`<p class="tr seg-h meta"${PL}>${esc(seg.tS[r.k].h.text)}</p>`);
        if (verse) add(verseRun(r.blocks, tb), min);
        else for (const bead of align(r.blocks, tb)) add(beadHTML(bead), minutesOf(bead.o.map(blockText).join('\n')));
      }
    } else {
      const tsec = tPair ? tPair[si] : null;
      const keep = paired && !tsec;
      entry.tHead = tsec && tsec.h ? tsec.h.text : null;
      entry.translated = !!tsec;
      if (verse) add(verseRun(B, tsec ? tsec.blocks : null, keep), minutesOf(B.map(blockText).join('\n')));
      else for (const bead of tsec ? align(B, tsec.blocks) : B.map((b) => ({ o: [b], t: null }))) add(beadHTML(bead, keep), minutesOf(bead.o.map(blockText).join('\n')));
    }
    return entry;
  });

  // ---------------------------------------------------------------- parts
  // Every ## section is a <section class="part">. Long works with no headings are cut into unnamed parts
  // (about 3–5 minutes each) so progress and content-visibility have something to count.
  const h2HTML = (s) => {
    const keep = K(paired && !s.tHead);
    const o = `<span class="${cls('o', hasHans && 'o-hant', keep)}">${rich(s.h.text)}</span>${hasHans ? `<span class="${cls('o o-hans', keep)}"${HANS}>${rich(s.h.hans.text)}</span>` : ''}`;
    const tr = s.tHead ? `<span class="tr"${PL}>${rich(s.tHead)}</span>` : '';
    return `<h2 class="read-h">${o}${tr}<a class="pl" href="#${s.id}" aria-label="${T('Link to this section', '链接到这一节')}">#</a></h2>`;
  };
  const named = secs.some((s) => s.h);
  let parts = secs;
  if (opts.parts && !named) {
    const target = cjk ? 5 : 3.5;
    parts = [];
    let cur = null;
    for (const it of secs.flatMap((s) => s.items)) {
      if (!cur || (cur.min >= target && it.min > 0)) { cur = { id: null, h: null, items: [], min: 0 }; parts.push(cur); }
      cur.items.push(it); cur.min += it.min;
    }
  }
  let chunk = 0;
  const html = parts.map((s) => {
    const min = s.items.reduce((a, it) => a + it.min, 0);
    const inner = (s.h ? h2HTML(s) : '') + s.items.map((it) => it.html).join('');
    if (!opts.parts && !s.h) return inner;
    const id = s.id || 'text-part-' + ++chunk;
    return `<section class="${cls('part', opts.cv && 'cv')}" id="${id}" data-min="${min.toFixed(1)}">${inner}</section>`;
  }).join('\n');
  const toc = secs.filter((s) => s.h).map((s) => ({ id: s.id, text: s.h.text, hans: hasHans && s.h.hans ? s.h.hans.text : null, tr: s.tHead, translated: s.translated, min: s.items.reduce((a, it) => a + it.min, 0) }));

  // ---------------------------------------------------------------- a translation on its own (layer t2)
  let t2 = '';
  if (opts.T2) {
    const tx = opts.T2;
    const body = parse(tx.text).map((b) => {
      if (b.t === 'h') return b.level === 2 ? `<h2 class="read-h" id="t2-${b.id}">${rich(b.text)}<a class="pl" href="#t2-${b.id}" aria-label="${T('Link to this section', '链接到这一节')}">#</a></h2>` : `<h3 class="read-h3">${rich(b.text)}</h3>`;
      if (b.t === 'code') return codeHTML(b);
      if (b.t === 'hr') return '<hr class="break">';
      if (verse && b.t === 'p') return `<div class="stanza">${b.lines.map((l) => { const lead = indentOf(l); return `<span class="${cls('line', lead && 'i' + lead)}">${rich(l.trim())}</span>`; }).join('')}</div>`;
      const tag = b.t === 'q' ? 'blockquote' : 'p';
      return `<${tag}${b.t === 'q' ? ' class="q"' : opts.aph ? ' class="aph"' : ''}>${multiLine(b) ? b.lines.map((l) => rich(l.trim())).join('<br>') : rich(joinLines(b.lines))}</${tag}>`;
    }).join('');
    const intro = tx.partial ? `<p class="meta t2-note">${tx.lang === 'zh' ? T('Claude has translated only the passages below into Chinese. The whole original is under “Original”.', 'Claude 只把下面这些段落译成了中文。全文原文见“原文”。') : T('Claude has translated only the passages below. The whole original is under “Original”.', 'Claude 只译了下面这些段落。全文原文见“原文”。')}</p>` : '';
    t2 = `<div class="layer-t2" lang="${tx.tag}">${intro}${body}</div>`;
  }

  const vmode = !modes.length ? null : modes.every((m) => m === 'line' || m === 'prose') ? 'line' : modes.every((m) => m !== 'stanza') ? 'half' : modes.some((m) => m !== 'stanza') ? 'mixed' : 'stanza';
  return {
    html: html + t2, toc, parts: opts.parts ? parts.length : 0,
    hasHans, notes: N.count, glossCount: N.glosses, margins: N.margins,
    verseMode: vmode, paired, partial: !!seg, unmapped: !!P && !full && !seg, warns,
  };
}
