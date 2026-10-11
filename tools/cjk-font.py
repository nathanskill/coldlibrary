#!/usr/bin/env python3
"""Cold Serif SC: Noto Serif SC (SIL OFL 1.1) cut into small WOFF2 files per page (design spec v5 §3.5, §3.6).

Re-run, from the repository root, in this order:
  node site/build.mjs            1. writes site/cjk-manifest.json: per font key, the characters set in the serif
  python3 tools/cjk-font.py      2. cuts site/public/assets/fonts/cjk/ from it (sources: .cache/fonts/, below)
  node site/build.mjs            3. links the new files; the coverage gate then prints no "[fonts]" warning
Step 1 must run WITHOUT CL_NO_MANIFEST (that variable is for parallel builds that must not touch the manifest).
Check only, write nothing:  python3 tools/cjk-font.py --check      Plan only:  python3 tools/cjk-font.py --dry-run

Sources (never committed; .cache/ is git-ignored). Noto Serif CJK 2.003 (release Serif2.003), region subset SC,
notofonts/noto-cjk commit 9b0f1436e455d902de067a2501422e5dc71ad16b:
  .cache/fonts/NotoSerifSC-Regular.otf   sha256 e8f396decc1f0963a016a989c3d8852e863d1350996f573860a80767c83a1cd3
  .cache/fonts/NotoSerifSC-SemiBold.otf  sha256 517d9736136b3b4e9aea742a7e1acda1922aea91a4425bd8db79281934055bf5
  .cache/fonts/LICENSE-OFL.txt           sha256 6a73f9541c2de74158c0e7cf6b0a58ef774f5a780bf191f2d7ec9cc53efe2bf2
  URLs: https://github.com/notofonts/noto-cjk/raw/9b0f1436e455d902de067a2501422e5dc71ad16b/Serif/SubsetOTF/SC/<file>
        and …/Serif/LICENSE. --fetch downloads and checks all three; --regular/--semibold read copies elsewhere.
Requires python3 with fontTools and brotli (pip3 install --user fonttools brotli). About a minute with an empty
cache, 15-25 s otherwise (every cut is cached by recipe in .cache/cjk-build/; unchanged input gives identical files).
Other flags: --budget-mb 15 (all files here, in 1,000,000-byte MB; --budget-blocks counts 4 KB disk blocks instead),
--grid 1|2, --new-core, --refresh-common, --vertical, --fetch, --report FILE.json; see --help.

Writes, under site/public/assets/fonts/cjk/ (everything there is committed; the total stays under --budget-mb):
  common.<h>.woff2 + .css    the 120 characters on the most pages (tools/cjk-common.txt, frozen; change it only with
                             --refresh-common). Linked on every page that sets Cold Serif SC; no other file has them.
  k/<key>.<part>.<h>.woff2   per font key: base (both scripts, or the only one), hant / hans (one script only, so the
                             hidden script downloads nothing) and w600 (the characters inside <strong>, weight 600)
  k/<key>.<h>.css            one stylesheet per key: the key's own faces
  core/<n>.<h>.woff2 + .css  shared core slices, made only when per-key files alone would not fit the budget
  punct-serif-400.woff2      "CL Punct Serif" (spec §3.5); kept as it is while it covers its unicode-range
  map.json, coverage.json    read by site/src/fonts.mjs: links, preloads and the build's coverage gate
  OFL.txt                    the licence
A page links common.css, its key's CSS and the CSS of each core slice the key uses (site/src/fonts.mjs); a block a
script shows later, such as today-<id> on the lobby or grid:<slug> on a shelf, inserts its own key's CSS. No two
faces a page can load share a code point: common, each key part and each core slice are disjoint, a key's own files
leave out the slices it links, and a later block's files leave out what its page already covers (two alternative
blocks, say two days' picks, may share characters; the glyphs are identical). Byte-identical parts of two keys
share one file. Files no longer used, and earlier versions of map.json and coverage.json, go to .cache/cjk-stale/;
nothing is deleted.

Planning. Each key first gets its own files. When they do not fit the budget, the characters shared by the most
large keys form a core, cut into slices of a few hundred characters (by frequency, and within a frequency band by
which shelf uses them), and each large key links only the slices that pay off for it: the links that save the most
storage for the least extra download on a cold first visit are taken first. A link that would push a key over its
budget (works 256 KB, list pages 160 KB) is taken only if the storage budget cannot be met otherwise. Cores of
800-2000 characters in at most 4 slices of 300-500 are tried; the plan kept has the fewest bytes over page budgets
plus a quarter of all the extra bytes the core adds to cold first visits. The shipped core is kept while its plan
scores within 5 % of the best (--new-core plans afresh), so content changes do not move every long page's URLs.
Small keys (cold first visit at most 96 KB on their own), the lobby, its today-<id> blocks and any page with a
later block never link the core, so a short poem stays at common + its own files.

Outlines. Hints are dropped and charstrings desubroutinised. With --grid 2 (default) every outline point is moved
to the nearest even coordinate of the 1000-unit em (at most 1 unit = 0.001 em, 0.03 px at 26 px), which makes the
files about 10 % smaller while the fonts stay standard 1000-unit CFF. Every glyph is drawn back and compared with
the source: identical except zero-length or collinear line segments merged; anything else stops the tool.
(An earlier draft rescaled to 500 units per em; fontTools wrote those CID-keyed CFF files without a FontMatrix, so
the CFF data said 1000 units while head said 500. That is gone: --grid 1 keeps the exact source outlines.)
"""
import argparse, hashlib, heapq, io, json, math, os, random, re, sys, time, urllib.request
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import fontTools
from fontTools import subset
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'site/public/assets/fonts/cjk'
MANIFEST = ROOT / 'site/cjk-manifest.json'
COMMON_TXT = ROOT / 'tools/cjk-common.txt'
FONTS_CSS = ROOT / 'site/src/css/00-fonts.css'
OLD_CSS = ROOT / 'site/public/assets/cjk.css'
CACHE = ROOT / '.cache/cjk-build'
STALE = ROOT / '.cache/cjk-stale'
FONT_CACHE = ROOT / '.cache/fonts'
HREF = '/assets/fonts/cjk/'

FAMILY = 'Cold Serif SC'
TOOL = 'cjk-font 3'  # part of every cache recipe: bump it when an option below changes the output
COMMIT = '9b0f1436e455d902de067a2501422e5dc71ad16b'
RAW = 'https://github.com/notofonts/noto-cjk/raw/' + COMMIT + '/Serif/'
SOURCES = {
    '400': {'file': 'NotoSerifSC-Regular.otf', 'sha256': 'e8f396decc1f0963a016a989c3d8852e863d1350996f573860a80767c83a1cd3'},
    '600': {'file': 'NotoSerifSC-SemiBold.otf', 'sha256': '517d9736136b3b4e9aea742a7e1acda1922aea91a4425bd8db79281934055bf5'},
}
LICENSE_FILE = 'LICENSE-OFL.txt'
LICENSE_SHA = '6a73f9541c2de74158c0e7cf6b0a58ef774f5a780bf191f2d7ec9cc53efe2bf2'
PUNCT_FILE = 'punct-serif-400.woff2'
SPACE = '\u3000'  # the ideographic space needs no glyph from us

# Ideograph subsets keep only what horizontal text uses. The punctuation face keeps the spacing and vertical features
# (text-spacing-trim uses halt/chws). --vertical keeps the vertical tables in every file (vertical text is phase 2).
FEATURES = ['ccmp', 'locl']
FEATURES_VERTICAL = ['vert', 'vrt2']
PUNCT_FEATURES = ['ccmp', 'locl', 'kern', 'palt', 'halt', 'chws', 'vert', 'vrt2', 'vhal', 'vpal', 'vkrn', 'vchw']
VERTICAL_TABLES = ['vhea', 'vmtx', 'VORG']

OWN_ONLY = ('today-', 'page:lobby')  # the lobby and its per-pick blocks never pull in a core slice
PROTECT_KB = 96          # keys whose cold first visit on their own files is at most this never link the core
WORK_CAP_KB = 256        # spec §3.6: longest works, per visible script
LIST_CAP_KB = 160        # spec §3.6: shelf, index and author pages
SHORT_KB = 64            # spec §3.6: short poem, common file included
W600_WARN = 16 * 1024    # spec §3.5: a page's 600 file over 16 KB is an editorial problem (too much bold)
CORE_SIZES = (800, 1200, 1600, 2000)   # core sizes tried (characters)
SLICE_SIZES = (300, 400, 500)          # characters per core slice
MAX_SLICES = 4           # at most 4 core files, so a long page links at most 6 stylesheets and 7 font files
PENALTY_WEIGHT = 0.25    # plan score: bytes over page budgets + this × all extra cold bytes the core causes
PREV_SLACK = 1.05        # keep the shipped core while its plan scores within 5 % of the best new one
BLOCK = 4096             # file-system block, only for the "on disk" figure in the report


def rel(p):
    p = Path(p)
    try:
        return str(p.relative_to(ROOT))
    except ValueError:
        return str(p)


def log(*a):
    print(*a, flush=True)


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def kb(b):
    return f'{b / 1024:.0f} KB'


# ---------------------------------------------------------------- sources
def fetch_sources():
    FONT_CACHE.mkdir(parents=True, exist_ok=True)
    for s in SOURCES.values():
        dst = FONT_CACHE / s['file']
        if dst.exists() and sha256(dst.read_bytes()) == s['sha256']:
            continue
        url = RAW + 'SubsetOTF/SC/' + s['file']
        log(f'downloading {url}')
        with urllib.request.urlopen(url, timeout=600) as r:
            data = r.read()
        if sha256(data) != s['sha256']:
            sys.exit(f'{s["file"]}: SHA-256 {sha256(data)} is not the pinned {s["sha256"]}')
        dst.write_bytes(data)
    lic = FONT_CACHE / LICENSE_FILE
    if not lic.exists() or sha256(lic.read_bytes()) != LICENSE_SHA:
        with urllib.request.urlopen(RAW + 'LICENSE', timeout=60) as r:
            data = r.read()
        if sha256(data) != LICENSE_SHA:
            log(f'  note: the downloaded licence text has SHA-256 {sha256(data)}, not the pinned one')
        lic.write_bytes(data)
    return FONT_CACHE / SOURCES['400']['file'], FONT_CACHE / SOURCES['600']['file'], lic


def check_source(path, weight):
    got = sha256(Path(path).read_bytes())
    if got != SOURCES[weight]['sha256']:
        sys.exit(f'{path}: SHA-256 {got} is not the pinned {SOURCES[weight]["sha256"]} ({SOURCES[weight]["file"]}).\n'
                 'Use the pinned file (--fetch), or update SOURCES and TOOL together on purpose.')
    return got


# ---------------------------------------------------------------- characters
def css_ranges(text):
    out = set()
    for part in text.split(','):
        part = part.strip().upper().replace('U+', '')
        if not part:
            continue
        a, _, b = part.partition('-')
        for cp in range(int(a, 16), int(b or a, 16) + 1):
            out.add(chr(cp))
    return out


def punct_set():
    """The code points of the "CL Punct Serif" face, read from its @font-face in 00-fonts.css. Those characters are
    drawn by that face inside Chinese runs, so no Cold Serif SC file carries them."""
    css = FONTS_CSS.read_text(encoding='utf-8')
    m = re.search(r'font-family:\s*"CL Punct Serif"[^}]*?unicode-range:\s*([^;}]+)', css)
    if not m:
        sys.exit(f'{rel(FONTS_CSS)} has no "CL Punct Serif" @font-face with a unicode-range')
    return css_ranges(m.group(1))


class Key:
    __slots__ = ('name', 'base', 'hant', 'hans', 'w600', 'children', 'parents', 'ex400', 'ex600')

    def __init__(self, name, v, cmap400, cmap600, missing):
        self.name = name
        hant, hans = set(v.get('hant', '')), set(v.get('hans', ''))
        base = set(v.get('base', '')) | (hant & hans)
        w600 = set(v.get('w600', ''))
        for s, cmap in ((base, cmap400), (hant, cmap400), (hans, cmap400), (w600, cmap600)):
            lack = {c for c in s if ord(c) not in cmap}
            missing |= lack
            s -= lack
        self.base, self.hant, self.hans, self.w600 = base, hant - base, hans - base, w600
        self.children = sorted(v.get('with', []) or [])
        self.parents = []
        self.ex400 = self.ex600 = frozenset()

    @property
    def all400(self):
        return self.base | self.hant | self.hans

    def views(self):
        """What one visit renders: the base plus one script (the other script is display:none)."""
        if self.hant or self.hans:
            return [('hant', self.base | self.hant), ('hans', self.base | self.hans)]
        return [('', set(self.base))]


def load_manifest(cmap400, cmap600):
    if not MANIFEST.exists():
        sys.exit(f'{rel(MANIFEST)} is missing: run node site/build.mjs first')
    raw = json.loads(MANIFEST.read_text(encoding='utf-8'))
    missing = set()
    keys = {}
    for name in sorted(raw):
        k = Key(name, raw[name], cmap400, cmap600, missing)
        if k.all400 or k.w600 or k.children:
            keys[name] = k
    for k in keys.values():
        for c in k.children:
            if c in keys:
                keys[c].parents.append(k.name)
    return keys, missing


def set_exclusions(keys, common, punct):
    """What each key's own files leave out: the common set, the punctuation face, the ideographic space, and for a
    block a script shows later (today-<id>, grid:<slug>) whatever every page that shows it already covers."""
    free = frozenset(common) | frozenset(punct) | {SPACE}
    for k in keys.values():
        ex4, ex6 = set(free), set(punct) | {SPACE}
        if k.parents:
            ex4 |= set.intersection(*[keys[p].all400 for p in k.parents])
            ex6 |= set.intersection(*[keys[p].w600 for p in k.parents])
        k.ex400, k.ex600 = frozenset(ex4), frozenset(ex6)


def read_common():
    if not COMMON_TXT.exists():
        return None
    lines = [l for l in COMMON_TXT.read_text(encoding='utf-8').splitlines() if l and not l.startswith('#')]
    return ''.join(lines).replace(' ', '')


def refresh_common(keys, size, punct, cmap400):
    """The characters on the most keys (not counting the lobby's per-pick blocks, which repeat work pages)."""
    count = {}
    for k in keys.values():
        if k.name.startswith('today-'):
            continue
        for c in k.all400:
            if c not in punct and c != SPACE:
                count[c] = count.get(c, 0) + 1
    ranked = sorted((c for c in count if ord(c) in cmap400), key=lambda c: (-count[c], ord(c)))[:size]
    chars = ''.join(sorted(ranked))
    lines = [chars[i:i + 40] for i in range(0, len(chars), 40)]
    COMMON_TXT.write_text(
        f'# Cold Serif SC common set: the {len(chars)} characters on the most pages ({len(keys)} font keys counted).\n'
        '# Frozen so common.<hash>.woff2 stays cached across deploys; change it only with tools/cjk-font.py --refresh-common.\n'
        '# Every other 400 subset leaves these characters out, so no unicode-range overlaps this file.\n'
        + '\n'.join(lines) + '\n', encoding='utf-8')
    return chars


# ---------------------------------------------------------------- outlines
def snap_value(v, grid):
    return int(math.floor(v / grid + 0.5)) * grid


def canon(ops):
    """Contours as segment lists, for comparing outlines: zero-length lines dropped, consecutive collinear lines
    merged (going back along a line only removes a zero-area spike), the implicit closing line dropped."""
    contours, cur, start, pt = [], None, None, None
    for op, args in ops:
        if op == 'moveTo':
            if cur is not None:
                contours.append((start, cur))
            cur, start = [], tuple(args[0])
            pt = start
        elif op == 'lineTo':
            q = tuple(args[0])
            if q == pt:
                continue
            if cur and cur[-1][0] == 'L':
                a = cur[-1][1]
                if (pt[0] - a[0]) * (q[1] - pt[1]) - (pt[1] - a[1]) * (q[0] - pt[0]) == 0:
                    cur.pop()
                    if q != a:
                        cur.append(('L', a, q))
                    pt = q
                    continue
            cur.append(('L', pt, q))
            pt = q
        elif op == 'curveTo':
            pts = tuple(tuple(p) for p in args)
            cur.append(('C', pt) + pts)
            pt = pts[-1]
    if cur is not None:
        contours.append((start, cur))
    out = []
    for start, segs in contours:
        if segs and segs[-1][0] == 'L' and segs[-1][2] == start:
            segs = segs[:-1]
        if segs:
            out.append(segs)
    return out


def snap_outlines(font, grid):
    """Move every point to the grid and re-encode each charstring from its absolute outline (so rounding never piles
    up along a contour). Returns {glyph: (source ops, snapped ops)} for the check below."""
    gs = font.getGlyphSet()
    cs = font['CFF '].cff.topDictIndex[0].CharStrings
    hmtx = font['hmtx']
    record = {}
    for g in font.getGlyphOrder():
        p = RecordingPen()
        gs[g].draw(p)
        snapped = [(op, [(snap_value(x, grid), snap_value(y, grid)) for (x, y) in args]) for op, args in p.value]
        old, _ = cs.getItemAndSelector(g)
        priv = old.private
        adv = hmtx[g][0]
        dflt, nom = getattr(priv, 'defaultWidthX', 0), getattr(priv, 'nominalWidthX', 0)
        pen = T2CharStringPen(None if adv == dflt else adv - nom, None)
        for op, args in snapped:
            getattr(pen, op)(*args)
        cs[g] = pen.getCharString(private=priv, globalSubrs=old.globalSubrs)
        record[g] = (p.value, snapped)
    return record


def verify_snapped(data, record, grid, cmap):
    """Draw every glyph of the snapped font back: it must equal the snapped source outline (up to merged collinear or
    zero-length lines), and every source point must be within grid/2 of where it went."""
    f = TTFont(io.BytesIO(data))
    gs = f.getGlyphSet()
    worst, merged = 0, 0
    for g, (src, snapped) in record.items():
        p = RecordingPen()
        gs[g].draw(p)
        got = [(op, [(int(x), int(y)) for (x, y) in args]) for op, args in p.value]
        if got != snapped:
            if canon(got) != canon(snapped):
                sys.exit(f'snapped outline of {g} differs from the source beyond merged collinear lines; use --grid 1')
            merged += 1
        for (op, a), (_, b) in zip(src, snapped):
            for (x0, y0), (x1, y1) in zip(a, b):
                worst = max(worst, abs(x1 - x0), abs(y1 - y0))
    if worst > grid / 2:
        sys.exit(f'a point moved {worst} units on a {grid}-unit grid')
    # a few glyphs for the log: points and bounds before -> after
    samples = []
    for ch in '雪永道德經鬱':
        g = cmap.get(ord(ch))
        if g in record:
            src, _ = record[g]
            p = RecordingPen()
            gs[g].draw(p)
            def stats(ops):
                pts = [pt for _, args in ops for pt in args]
                xs, ys = [q[0] for q in pts], [q[1] for q in pts]
                return len(pts), (min(xs), min(ys), max(xs), max(ys)) if pts else ()
            (n0, b0), (n1, b1) = stats(src), stats(p.value)
            samples.append(f'{ch} {n0}→{n1} points, bounds {b0}→{tuple(int(v) for v in b1)}')
    return worst, merged, samples


def cut_options(vertical, punct=False):
    o = subset.Options()
    o.layout_features = PUNCT_FEATURES if punct else FEATURES + (FEATURES_VERTICAL if vertical else [])
    o.name_IDs = [0, 1, 2, 3, 4, 5, 6]  # copyright, family, style, unique ID, full name, version, PostScript name
    o.notdef_outline = punct
    o.hinting = False
    o.desubroutinize = True
    if not (vertical or punct):
        o.drop_tables += VERTICAL_TABLES + ['BASE']
    return o


def intermediate(path, chars, grid, label):
    """The source cut down to every character any file needs, hints dropped, outlines snapped: cuts start from this."""
    t0 = time.time()
    f = TTFont(path, recalcTimestamp=False)
    o = subset.Options()
    o.layout_features = sorted(set(PUNCT_FEATURES) | set(FEATURES) | set(FEATURES_VERTICAL))
    o.name_IDs = [0, 1, 2, 3, 4, 5, 6]
    o.notdef_outline = True
    o.hinting = False
    o.desubroutinize = True
    s = subset.Subsetter(o)
    s.populate(unicodes=sorted(ord(c) for c in chars))
    s.subset(f)
    buf = io.BytesIO()
    f.save(buf)
    data = buf.getvalue()
    note = 'exact outlines'
    if grid > 1:
        f = TTFont(io.BytesIO(data), recalcTimestamp=False)
        cmap = f.getBestCmap()
        record = snap_outlines(f, grid)
        buf = io.BytesIO()
        f.save(buf)
        data = buf.getvalue()
        worst, merged, samples = verify_snapped(data, record, grid, cmap)
        note = (f'outlines on a {grid}-unit grid: {len(record)} glyphs drawn back, every point within {worst} unit '
                f'({worst / 1000:g} em) of the source, {merged} with collinear or zero-length lines merged')
        if samples:
            note += '\n    ' + '; '.join(samples)
    f = TTFont(io.BytesIO(data), lazy=True)
    head_upem = f['head'].unitsPerEm
    log(f'  {label}: {len(chars)} characters, {len(data) / 1024:.0f} KB, {head_upem} units per em, {note} '
        f'({time.time() - t0:.0f}s)')
    return data


def glyph_weights(data):
    """Bytes of each character's charstring: the size model's input."""
    f = TTFont(io.BytesIO(data))
    cs = f['CFF '].cff.topDictIndex[0].CharStrings
    out = {}
    for cp, g in f.getBestCmap().items():
        c = cs[g]
        c.compile()
        out[chr(cp)] = len(c.bytecode)
    return out


_INTER = {}
_VERTICAL = False


def _init(inter, vertical):
    global _INTER, _VERTICAL
    _INTER, _VERTICAL = inter, vertical


def _cut(job):
    weight, chars = job
    f = TTFont(io.BytesIO(_INTER[weight]), recalcTimestamp=False)
    s = subset.Subsetter(cut_options(_VERTICAL))
    s.populate(unicodes=[ord(c) for c in chars])
    s.subset(f)
    f.flavor = 'woff2'
    buf = io.BytesIO()
    f.save(buf)
    return buf.getvalue()


class Cutter:
    """Content-addressed WOFF2 cache: recipe (tool, fontTools, source, grid, options, weight, characters) → file."""

    def __init__(self, sources, grid, vertical, jobs):
        self.sources, self.grid, self.vertical, self.jobs = sources, grid, vertical, jobs
        self.index_path = CACHE / 'index.json'
        try:
            self.index = json.loads(self.index_path.read_text()) if self.index_path.exists() else {}
        except ValueError:
            self.index = {}
        (CACHE / 'files').mkdir(parents=True, exist_ok=True)
        self.inter = None
        self.union = None

    def recipe(self, weight, chars):
        r = '|'.join([TOOL, fontTools.version, self.sources[weight]['sha'], f'grid{self.grid}',
                      'vertical' if self.vertical else 'horizontal', weight, chars])
        return sha256(r.encode('utf-8'))

    def have(self, weight, chars):
        e = self.index.get(self.recipe(weight, chars))
        return e if e and (CACHE / 'files' / (e['hash'] + '.woff2')).exists() else None

    def ensure_inter(self):
        if self.inter is None:
            self.inter = {w: intermediate(self.sources[w]['path'], self.union[w], self.grid, f'intermediate {w}')
                          for w in ('400', '600') if self.union[w]}
        return self.inter

    def cut(self, specs):
        """specs: [(weight, chars)] → {(weight, chars): {'hash', 'bytes'}}, cutting only what is not cached."""
        todo = sorted({s for s in specs if not self.have(*s)}, key=lambda s: -len(s[1]))
        if todo:
            inter = self.ensure_inter()
            t0 = time.time()
            log(f'  cutting {len(todo)} files ({sum(len(c) for _, c in todo)} glyphs) with {self.jobs} processes')
            with ProcessPoolExecutor(max_workers=self.jobs, initializer=_init, initargs=(inter, self.vertical)) as ex:
                for (w, chars), data in zip(todo, ex.map(_cut, todo, chunksize=1)):
                    h = sha256(data)[:10]
                    (CACHE / 'files' / (h + '.woff2')).write_bytes(data)
                    self.index[self.recipe(w, chars)] = {'hash': h, 'bytes': len(data), 'n': len(chars), 'w': w,
                                                         'grid': self.grid}
            tmp = self.index_path.with_suffix('.tmp')
            tmp.write_text(json.dumps(self.index, indent=0, sort_keys=True))
            os.replace(tmp, self.index_path)
            log(f'  cut in {time.time() - t0:.0f}s')
        return {s: self.have(*s) for s in specs}

    def bytes_of(self, h):
        return (CACHE / 'files' / (h + '.woff2')).read_bytes()


# ---------------------------------------------------------------- size model
class Model:
    """WOFF2 bytes of a subset ≈ S·(a + b·ln(n+1)) + c, where S is the summed charstring bytes of its n glyphs
    (brotli does better on bigger files, hence the log term). Fitted on cuts of fixed samples, within a few %."""

    def __init__(self, weights, coef):
        self.w, self.coef = weights, coef

    def __call__(self, chars):
        n, S = 0, 0
        for c in chars:
            if c in self.w:
                n += 1
                S += self.w[c]
        if not n:
            return 0.0
        a, b, c0 = self.coef
        return S * (a + b * math.log(n + 1)) + c0


def lstsq(rows, y):
    """Least squares with relative weights (minimises the relative error), by normal equations."""
    k = len(rows[0])
    M = [[0.0] * k for _ in range(k)]
    v = [0.0] * k
    for r, t in zip(rows, y):
        wt = 1.0 / (t * t)
        for i in range(k):
            v[i] += wt * r[i] * t
            for j in range(k):
                M[i][j] += wt * r[i] * r[j]
    for i in range(k):
        p = max(range(i, k), key=lambda r: abs(M[r][i]))
        M[i], M[p], v[i], v[p] = M[p], M[i], v[p], v[i]
        for r in range(k):
            if r != i:
                f = M[r][i] / M[i][i]
                for j in range(k):
                    M[r][j] -= f * M[i][j]
                v[r] -= f * v[i]
    return [v[i] / M[i][i] for i in range(k)]


def fit_model(cutter, weights, pool):
    rng = random.Random(20261011)
    pool = sorted(c for c in pool if c in weights)
    specs = []
    for n in (1, 3, 10, 30, 100, 300, 1000, 1800):
        for _ in range(3 if n < 300 else 2):
            if n <= len(pool):
                specs.append(('400', ''.join(sorted(rng.sample(pool, n)))))
    got = cutter.cut(specs)
    rows, y = [], []
    for s in specs:
        S = sum(weights[c] for c in s[1])
        rows.append([S, S * math.log(len(s[1]) + 1), 1.0])
        y.append(got[s]['bytes'])
    coef = lstsq(rows, y)
    err = max(abs(sum(a * b for a, b in zip(coef, r)) - t) / t for r, t in zip(rows, y))
    return Model(weights, coef), err, len(specs)


# ---------------------------------------------------------------- planning
def own_parts(k, linked=frozenset()):
    """The files one key needs: [(part, weight, chars)] for base, hant, hans (400) and w600."""
    out = []
    for part, chars in (('base', k.base), ('hant', k.hant), ('hans', k.hans)):
        cs = chars - k.ex400 - linked
        if cs:
            out.append((part, '400', ''.join(sorted(cs))))
    cs = k.w600 - k.ex600
    if cs:
        out.append(('w600', '600', ''.join(sorted(cs))))
    return out


def cold(k, parts, slices, linked, size, common, common_bytes):
    """Bytes a cold first visit downloads for one key, for its worst visible script (the other is display:none):
    common if the page uses it, the key's own files for that script, and every linked slice the page touches."""
    sizes = {part: size(chars) for part, _, chars in parts}
    worst = 0
    for view, vis in k.views():
        t = common_bytes if vis & common else 0
        t += sizes.get('base', 0) + (sizes.get(view, 0) if view else 0) + sizes.get('w600', 0)
        t += sum(size_slice for i, size_slice in linked if slices[i] & vis)
        worst = max(worst, t)
    return worst


def cap_of(name):
    return LIST_CAP_KB * 1024 if name.startswith(('page:', 'grid:')) else WORK_CAP_KB * 1024


def make_slices(keys, cand, N, L):
    """The N characters the most candidate keys share (each used by two keys at least), in slices of L: frequency
    bands of 2L characters, each sorted by the average position (in key order, so by shelf) of the keys using them."""
    pos = {n: i for i, n in enumerate(sorted(cand))}
    df, psum = {}, {}
    for n in cand:
        k = keys[n]
        for c in k.all400 - k.ex400:
            df[c] = df.get(c, 0) + 1
            psum[c] = psum.get(c, 0) + pos[n]
    ranked = sorted((c for c in df if df[c] >= 2), key=lambda c: (-df[c], ord(c)))[:N]
    out = []
    for b in range(0, len(ranked), 2 * L):
        band = sorted(ranked[b:b + 2 * L], key=lambda c: (psum[c] / df[c], ord(c)))
        out += [frozenset(band[i:i + L]) for i in range(0, len(band), L)]
    return out


def greedy(keys, cand, slices, size, common, common_bytes, base_store, target, passes=('capped', 'over', 'all')):
    """Link (key, slice) pairs, cheapest extra download per byte of storage saved first, until the store fits.
    Pass "capped" keeps every key within its budget (if it was within it alone); if the store still does not fit,
    pass "over" adds links only to keys that are over their budget anyway, and pass "all" to any key."""
    ssize = [size(s) for s in slices]
    links = {n: [] for n in cand}
    parts = {n: own_parts(keys[n]) for n in cand}
    stor = {n: sum(size(c) for _, _, c in parts[n]) for n in cand}
    ck = {n: cold(keys[n], parts[n], slices, [], size, common, common_bytes) for n in cand}
    own_cold = dict(ck)
    store = base_store + sum(ssize)
    used = [0] * len(slices)

    def trial(n, i):
        ls = links[n] + [i]
        linked = frozenset().union(*[slices[j] for j in ls])
        p = own_parts(keys[n], linked)
        st = sum(size(c) for _, _, c in p)
        c = cold(keys[n], p, slices, [(j, ssize[j]) for j in ls], size, common, common_bytes)
        return stor[n] - st, c - ck[n], p, st, c

    for mode in passes:
        if store <= target:
            break
        heap = []
        for n in cand:
            if mode == 'over' and ck[n] <= cap_of(n):
                continue
            for i in range(len(slices)):
                if i in links[n] or not (slices[i] & (keys[n].all400 - keys[n].ex400)):
                    continue
                sv, pen, *_ = trial(n, i)
                if sv > 0:
                    heapq.heappush(heap, (pen / sv, n, i))
        while store > target and heap:
            r, n, i = heapq.heappop(heap)
            if i in links[n]:
                continue
            sv, pen, p, st, c = trial(n, i)
            if sv <= 0:
                continue
            if abs(pen / sv - r) > 1e-12:
                heapq.heappush(heap, (pen / sv, n, i))
                continue
            if mode == 'capped' and c > cap_of(n) and own_cold[n] <= cap_of(n):
                continue
            links[n].append(i)
            parts[n], stor[n], ck[n] = p, st, c
            store -= sv
            used[i] += 1
    # a slice nobody links is not shipped
    for i, u in enumerate(used):
        if not u:
            store -= ssize[i]
    penalty = sum(ck[n] - own_cold[n] for n in cand)
    overage = sum(max(0, ck[n] - cap_of(n)) for n in cand)
    return links, store, penalty, overage, used


def make_plan(keys, common, size, target, prev=None):
    """{'slices': [chars], 'links': {key: [slice index]}, 'store': estimate, 'penalty': extra cold bytes}. With prev
    (the core slices shipped now), that core is kept while it still fits and scores within PREV_SLACK of the best, so
    a content change does not give every long page new font URLs."""
    common_bytes = size(common)
    own = {n: own_parts(k) for n, k in keys.items()}
    base_store = common_bytes + sum(size(c) for parts in own.values() for _, _, c in parts)
    plan = {'slices': [], 'links': {}, 'store': base_store, 'own_store': base_store, 'penalty': 0, 'N': 0, 'L': 0}
    if base_store <= target:
        return plan
    own_cold = {n: cold(k, own[n], [], [], size, common, common_bytes) for n, k in keys.items()}
    protected = {n for n, k in keys.items() if n.startswith(OWN_ONLY) or k.children or k.parents
                 or own_cold[n] <= PROTECT_KB * 1024}
    cand = sorted(n for n in keys if n not in protected)
    configs = [(N, L, make_slices(keys, cand, N, L)) for N in CORE_SIZES for L in SLICE_SIZES if -(-N // L) <= MAX_SLICES]
    if prev:
        usable = set().union(*[keys[n].all400 - keys[n].ex400 for n in cand]) if cand else set()
        kept = [frozenset(set(s) & usable) for s in prev]
        kept = [s for s in kept if s]
        if kept and len(kept) <= MAX_SLICES:
            configs.append(('previous', max(len(s) for s in kept), kept))
    best = kept_prev = None
    for N, L, slices in configs:
        if not slices:
            continue
        links, store, penalty, overage, used = greedy(keys, cand, slices, size, common, common_bytes, base_store, target)
        # bytes over the page budgets count four times as much as extra bytes within them
        cost = (overage + PENALTY_WEIGHT * penalty) if store <= target else store
        entry = ((store > target, cost, str(N), L), N, L, slices, links, store, penalty, used)
        if N == 'previous':
            kept_prev = entry
        elif best is None or entry[0] < best[0]:
            best = entry
    if kept_prev and not kept_prev[0][0] and (best is None or best[0][0] or kept_prev[0][1] <= best[0][1] * PREV_SLACK):
        best = kept_prev
    if best is None:
        return plan
    _, N, L, slices, links, store, penalty, used = best
    keep = [i for i, u in enumerate(used) if u]
    renum = {old: new for new, old in enumerate(keep)}
    plan.update(slices=[slices[i] for i in keep], N=N, L=L, store=store, penalty=penalty,
                links={n: sorted(renum[i] for i in ls) for n, ls in links.items() if ls})
    ss = [size(s) for s in plan['slices']]
    over, top = 0, 0
    for n, k in keys.items():
        ls = plan['links'].get(n, [])
        linked = frozenset().union(*[plan['slices'][i] for i in ls])
        c = cold(k, own_parts(k, linked), plan['slices'], [(i, ss[i]) for i in ls], size, common, common_bytes)
        over += c > cap_of(n)
        top = max(top, c)
    plan.update(over=over, top=top)
    return plan


# ---------------------------------------------------------------- output
def ranges(chars):
    cps = sorted({ord(c) for c in chars})
    out, i = [], 0
    while i < len(cps):
        j = i
        while j + 1 < len(cps) and cps[j + 1] == cps[j] + 1:
            j += 1
        out.append(f'U+{cps[i]:X}' if i == j else f'U+{cps[i]:X}-{cps[j]:X}')
        i = j + 1
    return ','.join(out)


def face(href, weight, chars):
    # 400 also serves 500 (strong and b are 500 in the base styles; font-synthesis is off for Chinese), 600 serves bold
    wr = '400 500' if weight == '400' else '600 700'
    return (f'@font-face{{font-family:"{FAMILY}";font-style:normal;font-weight:{wr};font-display:swap;'
            f'src:url({href}) format("woff2");unicode-range:{ranges(chars)}}}')


def css_doc(label, faces):
    label = re.sub(r'[^A-Za-z0-9:/._ ,()-]', '', label)
    return (f'/* {FAMILY} = Noto Serif SC 2.003 (SIL OFL 1.1, {HREF}OFL.txt), cut by tools/cjk-font.py. {label} */\n'
            + '\n'.join(faces) + '\n')


def safe_names(names):
    out, seen = {}, {}
    for n in names:
        s = re.sub(r'[^A-Za-z0-9_-]+', '-', n).strip('-') or 'key'
        seen.setdefault(s, []).append(n)
    for s, ns in seen.items():
        for n in ns:
            out[n] = s if len(ns) == 1 else s + '-' + sha256(n.encode())[:6]
    return out


def stash(path, root, move=True):
    """Move (or copy) a file out of the site into .cache/cjk-stale/, keeping its path below root. Never deletes: an
    existing stale file is only replaced by identical bytes; otherwise the new copy gets a numbered name."""
    try:
        r = path.relative_to(root)
    except ValueError:
        r = Path(path.name)
    dst = STALE / r
    dst.parent.mkdir(parents=True, exist_ok=True)
    data = path.read_bytes()
    n, base = 0, dst
    while dst.exists() and dst.read_bytes() != data:
        n += 1
        dst = base.with_name(f'{base.name}.{n}')
    if move:
        os.replace(path, dst)
    elif not dst.exists():
        dst.write_bytes(data)
    return dst


def write_if_changed(path, data):
    """Write a file unless it already holds these bytes; an older version is copied to .cache/cjk-stale/ first."""
    path.parent.mkdir(parents=True, exist_ok=True)
    b = data.encode('utf-8') if isinstance(data, str) else data
    if path.exists():
        if path.read_bytes() == b:
            return False
        stash(path, OUT, move=False)
    path.write_bytes(b)
    return True


def json_lines(obj):
    """Stable JSON with one line per top-level entry and per font key, so a re-run's diff stays readable."""
    one = lambda v: json.dumps(v, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    parts = []
    for k in obj:
        if k == 'keys':
            inner = ',\n'.join(f'{one(n)}:{one(v)}' for n, v in obj[k].items())
            parts.append(f'"keys":{{\n{inner}\n}}')
        else:
            parts.append(f'{one(k)}:{one(obj[k])}')
    return '{\n' + ',\n'.join(parts) + '\n}\n'


def cut_punct(path, chars):
    f = TTFont(path, recalcTimestamp=False)
    s = subset.Subsetter(cut_options(True, punct=True))
    s.populate(unicodes=sorted(ord(c) for c in chars))
    s.subset(f)
    f.flavor = 'woff2'
    buf = io.BytesIO()
    f.save(buf)
    return buf.getvalue()


def build_files(keys, plan, common, cutter, punct_bytes, lic_bytes, missing, punct, grid):
    """Every file under fonts/cjk/ as {relative path: bytes}, plus map.json and coverage.json."""
    files = {}
    specs = [('400', ''.join(sorted(common)))] if common else []
    slices = [''.join(sorted(s)) for s in plan['slices']]
    specs += [('400', s) for s in slices]
    parts = {}
    for n, k in keys.items():
        linked = frozenset().union(*[plan['slices'][i] for i in plan['links'].get(n, [])])
        parts[n] = own_parts(k, linked)
        specs += [(w, c) for _, w, c in parts[n]]
    got = cutter.cut(specs)

    shipped = {}  # content hash → path: keys whose part is byte-identical share one file

    def put(tmpl, weight, chars):
        e = got[(weight, chars)]
        r = shipped.get(e['hash'])
        if r is None:
            r = shipped[e['hash']] = tmpl.format(h=e['hash'])
            files[r] = cutter.bytes_of(e['hash'])
        return HREF + r, e['bytes']

    out_map = {'version': 3, 'family': FAMILY, 'source': 'Noto Serif SC 2.003', 'grid': grid}
    cover = {'version': 3, 'family': FAMILY, 'missing': ''.join(sorted(missing)), 'punct': ''.join(sorted(punct)),
             'space': SPACE, 'common': ''.join(sorted(common))}
    if common:
        href, b = put('common.{h}.woff2', '400', ''.join(sorted(common)))
        doc = css_doc('common', [face(href, '400', common)])
        r = f'common.{sha256(doc.encode())[:10]}.css'
        files[r] = doc.encode()
        out_map['common'] = {'css': HREF + r, 'href': href, 'bytes': b}
    out_map['core'], cover['core'] = [], []
    for i, chars in enumerate(slices):
        href, b = put(f'core/{i:02d}.{{h}}.woff2', '400', chars)
        doc = css_doc(f'shared core slice {i}', [face(href, '400', chars)])
        r = f'core/{i:02d}.{sha256(doc.encode())[:10]}.css'
        files[r] = doc.encode()
        out_map['core'].append({'css': HREF + r, 'href': href, 'bytes': b, 'n': len(chars)})
        cover['core'].append(chars)
    out_map['keys'], cover['keys'] = {}, {}
    names = safe_names(sorted(keys))
    for n in sorted(keys):
        safe = names[n]
        faces, entry, cv = [], {}, {}
        for part, w, chars in parts[n]:
            href, b = put(f'k/{safe}.{part}.{{h}}.woff2', w, chars)
            faces.append(face(href, w, chars))
            entry[part] = {'href': href, 'bytes': b}
            cv[part] = chars
        ls = plan['links'].get(n, [])
        if ls:
            entry['core'] = cv['core'] = ls
        if faces:
            label = n + (f' (pages also link core slice CSS {",".join(str(i) for i in ls)})' if ls else '')
            doc = css_doc(label, faces)
            r = f'k/{safe}.{sha256(doc.encode())[:10]}.css'
            files[r] = doc.encode()
            entry['css'] = HREF + r
        if keys[n].children:
            entry['with'] = [c for c in keys[n].children if c in keys]
        out_map['keys'][n] = entry
        cover['keys'][n] = cv
    files[PUNCT_FILE] = punct_bytes
    if lic_bytes is not None:
        files['OFL.txt'] = lic_bytes
    out_map['woff2_bytes'] = sum(len(b) for p, b in files.items() if p.endswith('.woff2'))
    files['coverage.json'] = json_lines(cover).encode()
    files['map.json'] = b''  # placeholder so the total below counts it; filled in by finish_map
    return files, out_map, parts


def finish_map(files, out_map):
    """map.json carries the total bytes of the folder it describes, itself included."""
    others = sum(len(b) for p, b in files.items() if p != 'map.json')
    for _ in range(3):
        doc = json_lines(dict(out_map, total_bytes=others + len(files['map.json'])))
        files['map.json'] = doc.encode()
    return out_map


# ---------------------------------------------------------------- report
def report_data(keys, out_map, cover, common, files):
    core = out_map.get('core', [])
    core_sets = [set(s) for s in cover.get('core', [])]
    cb = out_map.get('common', {}).get('bytes', 0)

    def visit(n, warm=False):
        k, e = keys[n], out_map['keys'][n]
        res = {}
        for view, vis in k.views():
            t = cb if vis & common else 0
            for part in ('base', view, 'w600'):
                if part and part in e:
                    t += e[part]['bytes']
            if not warm:
                t += sum(core[i]['bytes'] for i in e.get('core', []) if core_sets[i] & vis)
            res[view or 'only'] = t
        return res

    def later(n):
        """A block shown later (today-<id>, grid:<slug>): its own files only, for the view it shows."""
        k, e = keys[n], out_map['keys'][n]
        return {view or 'only': sum(e[p]['bytes'] for p in ('base', view, 'w600') if p and p in e) for view, _ in k.views()}

    visits = {n: visit(n) for n in keys}
    worst = {n: max(v.values()) for n, v in visits.items()}
    linked = [n for n in keys if out_map['keys'][n].get('core')]
    lobby = None
    if 'page:lobby' in keys:
        todays = [n for n in keys if n.startswith('today-')]
        add = {n: max(later(n).values()) for n in todays}
        big = max(todays, key=lambda n: add[n], default=None)
        lobby = {'lobby': worst['page:lobby'], 'largest_today': big, 'largest_today_bytes': add.get(big, 0),
                 'with_largest_today': worst['page:lobby'] + add.get(big, 0)}
    grids = {n: {'page': p, 'page_bytes': worst[p], 'grid_extra': max(later(n).values()),
                 'total': worst[p] + max(later(n).values())}
             for n in keys if n.startswith('grid:') for p in keys[n].parents[:1]}
    samples = {}
    for n in ('S-001001', 'S-002001', 'S-002002', 'S-002005', 'S-003001', 'S-005001', 'page:lobby', 'page:open-stacks',
              'page:open-stacks/poetry', 'page:open-stacks/claude', 'page:about'):
        if n in keys:
            samples[n] = {'core': out_map['keys'][n].get('core', []), 'visit': visits[n], 'warm': visit(n, True)}
    small_over = sorted(((worst[n], n) for n in keys if worst[n] > SHORT_KB * 1024 and not out_map['keys'][n].get('core')
                         and n.startswith('S-') and worst[n] <= PROTECT_KB * 1024), reverse=True)
    works_over = sorted(((worst[n], n) for n in keys if n.startswith('S-') and worst[n] > WORK_CAP_KB * 1024), reverse=True)
    lists_over = sorted(((worst[n], n) for n in keys if n.startswith('page:') and worst[n] > LIST_CAP_KB * 1024), reverse=True)
    total = sum(len(b) for b in files.values())
    blocks = sum(-(-len(b) // BLOCK) * BLOCK for b in files.values())
    return {
        'keys': len(keys), 'files': len(files), 'total_bytes': total, 'on_disk_bytes': blocks,
        'woff2_bytes': out_map['woff2_bytes'], 'woff2_files': sum(1 for p in files if p.endswith('.woff2')),
        'css_bytes': sum(len(b) for p, b in files.items() if p.endswith('.css')),
        'json_bytes': sum(len(b) for p, b in files.items() if p.endswith('.json')),
        'common_chars': len(common), 'common_bytes': cb,
        'core_slices': len(core), 'core_chars': sum(c['n'] for c in core), 'core_bytes': sum(c['bytes'] for c in core),
        'core_keys': len(linked), 'missing': cover['missing'],
        'samples': samples, 'lobby': lobby, 'grids': grids,
        'largest': [{'key': n, 'bytes': b, 'core': bool(out_map['keys'][n].get('core'))}
                    for b, n in sorted(((worst[n], n) for n in keys), reverse=True)[:12]],
        'small_over_64KB': [[n, b] for b, n in small_over], 'works_over_256KB': [[n, b] for b, n in works_over],
        'lists_over_160KB': [[n, b] for b, n in lists_over],
        'w600_over_16KB': {n: e['w600']['bytes'] for n, e in out_map['keys'].items() if 'w600' in e and e['w600']['bytes'] > W600_WARN},
        'worst': worst,
    }


def print_report(r):
    log(f'\n{FAMILY}: {r["keys"]} font keys, {r["files"]} files, {r["total_bytes"] / 1e6:.2f} MB '
        f'({r["woff2_files"]} WOFF2 {r["woff2_bytes"] / 1e6:.2f} MB, CSS {r["css_bytes"] / 1e6:.2f} MB, JSON {r["json_bytes"] / 1e6:.2f} MB); '
        f'on disk {r["on_disk_bytes"] / 2**20:.1f} MiB, as du -sh counts it (each file rounded up to a 4 KB block)')
    log(f'  common: {r["common_chars"]} characters, {kb(r["common_bytes"])}; core: {r["core_slices"]} slices, '
        f'{r["core_chars"]} characters, {kb(r["core_bytes"])}, linked by {r["core_keys"]} keys')
    log('  cold first visit, common file included (per visible script; "cached" = with the core slices already cached):')
    for n, s in r['samples'].items():
        warm = ('   cached: ' + '  '.join(f'{v} {kb(b)}' for v, b in s['warm'].items())) if s['core'] else ''
        log(f'    {n:28} ' + '  '.join(f'{v} {kb(b)}' for v, b in s['visit'].items()) + (f'  (core {len(s["core"])})' if s['core'] else '') + warm)
    if r['lobby']:
        l = r['lobby']
        log(f'    lobby + its largest today block ({l["largest_today"]}, {kb(l["largest_today_bytes"])}): {kb(l["with_largest_today"])}')
    for n, g in sorted(r['grids'].items()):
        log(f'    {g["page"]:28} {kb(g["page_bytes"])}; its grid view adds {kb(g["grid_extra"])} → {kb(g["total"])}')
    if r['small_over_64KB']:
        log(f'  works kept off the core but over the 64 KB short-poem budget ({len(r["small_over_64KB"])}): '
            + ', '.join(f'{n} {kb(b)}' for n, b in r['small_over_64KB']))
    if r['works_over_256KB']:
        log(f'  works over 256 KB cold ({len(r["works_over_256KB"])}): ' + ', '.join(f'{n} {kb(b)}' for n, b in r['works_over_256KB']))
    if r['lists_over_160KB']:
        log(f'  list pages over 160 KB: ' + ', '.join(f'{n} {kb(b)}' for n, b in r['lists_over_160KB']))
    for n, b in r['w600_over_16KB'].items():
        log(f'  WARNING: {n} sets {kb(b)} of bold Chinese (budget 16 KB); the fix is editorial (less bold)')
    if r['missing']:
        log(f'  not in Noto Serif SC, set in the system serif: {r["missing"]}')


# ---------------------------------------------------------------- check
def check(keys, missing, common, punct):
    """Verify the committed folder against the manifest: files exist and match their ranges, no two faces a page can
    load overlap, every character is covered. Writes nothing."""
    problems = []
    try:
        mp = json.loads((OUT / 'map.json').read_text(encoding='utf-8'))
        cv = json.loads((OUT / 'coverage.json').read_text(encoding='utf-8'))
    except (OSError, ValueError) as e:
        return [f'map.json / coverage.json unreadable: {e}'], None, None
    if mp.get('version') != 3 or cv.get('version') != 3:
        return ['map.json / coverage.json are not version 3: run python3 tools/cjk-font.py'], None, None
    face_re = re.compile(r'@font-face\{[^}]*font-weight:([0-9 ]+);[^}]*src:url\(([^)]+)\)[^}]*unicode-range:([^;}]+)\}')
    cmaps = {}

    def faces_of(href):
        p = OUT / href[len(HREF):]
        if not p.exists():
            problems.append(f'missing file {href}')
            return []
        out = []
        for w, src, rng in face_re.findall(p.read_text(encoding='utf-8')):
            chars = css_ranges(rng)
            fp = OUT / src[len(HREF):]
            if not fp.exists():
                problems.append(f'{href}: missing {src}')
                continue
            if src not in cmaps:
                cmaps[src] = {chr(c) for c in TTFont(fp, lazy=True).getBestCmap()}
            if chars - cmaps[src]:
                problems.append(f'{src}: unicode-range lists {len(chars - cmaps[src])} characters the file lacks')
            out.append((w.strip(), src, chars))
        return out

    common_faces = faces_of(mp['common']['css']) if 'common' in mp else []
    free = set(punct) | {SPACE}
    for n, k in keys.items():
        e = mp['keys'].get(n)
        if e is None:
            problems.append(f'{n}: in the manifest but not in map.json')
            continue
        def page_faces(entry):
            out = faces_of(entry['css']) if 'css' in entry else []
            for i in entry.get('core', []):
                out += faces_of(mp['core'][i]['css'])
            return out
        faces = common_faces + page_faces(e)
        for p in k.parents:
            faces = faces + page_faces(mp['keys'].get(p, {}))
        seen = {}
        for w, src, chars in faces:
            clash = None
            for c in chars:
                o = seen.setdefault((w, c), src)
                if o != src and clash is None:
                    clash = (c, o)
            if clash:
                problems.append(f'{n}: U+{ord(clash[0]):04X} is in two files a page loads ({clash[1]}, {src})')
        cov4 = {c for (w, c) in seen if w.startswith('400')} | free
        cov6 = {c for (w, c) in seen if w.startswith('600')} | free
        lack = (k.all400 - cov4) | (k.w600 - cov6)
        if lack:
            problems.append(f'{n}: {len(lack)} characters not covered: {"".join(sorted(lack))[:40]}')
    return problems, mp, cv


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser(description='Cut Noto Serif SC into per-page WOFF2 subsets (spec §3.6).',
                                 formatter_class=argparse.RawDescriptionHelpFormatter,
                                 epilog='Run order: node site/build.mjs && python3 tools/cjk-font.py && node site/build.mjs')
    ap.add_argument('--regular', help='NotoSerifSC-Regular.otf (default: .cache/fonts/)')
    ap.add_argument('--semibold', help='NotoSerifSC-SemiBold.otf (default: .cache/fonts/)')
    ap.add_argument('--fetch', action='store_true', help='download the pinned sources and licence into .cache/fonts/')
    ap.add_argument('--license', help='the OFL text to copy to OFL.txt (default: .cache/fonts/LICENSE-OFL.txt, else keep)')
    ap.add_argument('--refresh-common', action='store_true', help='recompute tools/cjk-common.txt from the manifest')
    ap.add_argument('--common-size', type=int, default=120)
    ap.add_argument('--budget-mb', type=float, default=15.0, help='all files under fonts/cjk/, in MB of 1,000,000 bytes')
    ap.add_argument('--budget-blocks', action='store_true',
                    help='count the budget in 4 KB file-system blocks (what du shows) instead of bytes (what git stores)')
    ap.add_argument('--grid', type=int, default=2, choices=(1, 2), help='outline grid in font units (1 = exact)')
    ap.add_argument('--new-core', action='store_true', help='plan the shared core afresh instead of keeping the shipped one')
    ap.add_argument('--vertical', action='store_true', help='keep the vertical tables and features (vertical text)')
    ap.add_argument('--jobs', type=int, default=max(1, (os.cpu_count() or 2) - 1))
    ap.add_argument('--dry-run', action='store_true', help='plan and estimate only; write nothing in the site')
    ap.add_argument('--check', action='store_true', help='verify the committed files against the manifest; write nothing')
    ap.add_argument('--report', help='also write the report as JSON to this path')
    ap.add_argument('--manifest', help='read this manifest instead of site/cjk-manifest.json (for trials)')
    ap.add_argument('--out', help='write the subsets here instead of site/public/assets/fonts/cjk (for trials)')
    ap.add_argument('--common-file', help='use this common-set file instead of tools/cjk-common.txt (for trials)')
    a = ap.parse_args()
    t_start = time.time()
    global OUT, MANIFEST, COMMON_TXT, STALE, OLD_CSS, HREF
    if a.manifest:
        MANIFEST = Path(a.manifest).resolve()
    if a.common_file:
        COMMON_TXT = Path(a.common_file).resolve()
    if a.out:
        OUT = Path(a.out).resolve()
        STALE = OUT.parent / (OUT.name + '-stale')
        OLD_CSS = OUT / '__none__'

    lic_src = None
    if a.fetch:
        reg, semi, lic_src = fetch_sources()
    else:
        reg = Path(a.regular) if a.regular else FONT_CACHE / SOURCES['400']['file']
        semi = Path(a.semibold) if a.semibold else FONT_CACHE / SOURCES['600']['file']
        for p in (reg, semi):
            if not p.exists():
                sys.exit(f'{p} not found. Pass --regular/--semibold, or --fetch to download the pinned files.')
        if (FONT_CACHE / LICENSE_FILE).exists():
            lic_src = FONT_CACHE / LICENSE_FILE
    if a.license:
        lic_src = Path(a.license)
    sources = {'400': {'path': str(reg), 'sha': check_source(reg, '400')},
               '600': {'path': str(semi), 'sha': check_source(semi, '600')}}
    cmap400 = TTFont(reg, lazy=True).getBestCmap()
    cmap600 = TTFont(semi, lazy=True).getBestCmap()
    punct = {c for c in punct_set() if ord(c) in cmap400}

    keys, missing = load_manifest(cmap400, cmap600)
    log(f'manifest: {len(keys)} font keys set Chinese in the serif; not in Noto Serif SC: {"".join(sorted(missing)) or "none"}')
    common = None if a.refresh_common else read_common()
    if common is None:
        if a.dry_run or a.check:
            common = ''
        else:
            common = refresh_common(keys, a.common_size, punct, cmap400)
            log(f'wrote {rel(COMMON_TXT)}: {len(common)} characters')
    common = frozenset(c for c in common if ord(c) in cmap400 and c not in punct and c != SPACE)
    set_exclusions(keys, common, punct)

    if a.check:
        problems, mp, cv = check(keys, missing, common, punct)
        if mp:
            files = {str(p.relative_to(OUT)): p.read_bytes() for p in OUT.rglob('*') if p.is_file() and p.name != '.DS_Store'}
            mp.setdefault('woff2_bytes', sum(len(b) for f, b in files.items() if f.endswith('.woff2')))
            for n in keys:
                mp['keys'].setdefault(n, {})
            r = report_data(keys, mp, cv, common, files)
            print_report(r)
            measured = r['on_disk_bytes'] if a.budget_blocks else r['total_bytes']
            if measured > a.budget_mb * 1e6:
                problems.append(f'{measured / 1e6:.2f} MB is over the {a.budget_mb} MB budget')
        for p in problems[:60]:
            log(f'  PROBLEM: {p}')
        if len(problems) > 60:
            log(f'  … and {len(problems) - 60} more')
        log('check: ' + ('ok' if not problems else f'{len(problems)} problem(s)'))
        return 1 if problems else 0

    cutter = Cutter(sources, a.grid, a.vertical, a.jobs)
    union400 = set(common)
    union600 = set()
    for k in keys.values():
        union400 |= k.all400 - punct - {SPACE}
        union600 |= k.w600 - punct - {SPACE}
    cutter.union = {'400': ''.join(sorted(union400)), '600': ''.join(sorted(union600))}
    inter = cutter.ensure_inter()
    weights = glyph_weights(inter['400'])
    if '600' in inter:
        for c, v in glyph_weights(inter['600']).items():
            weights.setdefault(c, v)
    model, err, ncal = fit_model(cutter, weights, sorted(union400 - common))
    log(f'  size model: bytes = S·({model.coef[0]:.3f} {model.coef[1]:+.4f}·ln(n+1)) + {model.coef[2]:.0f} '
        f'(S = summed charstring bytes of the n glyphs), within {err * 100:.1f}% on {ncal} calibration cuts')

    # Punctuation face (spec §3.5): keep the shipped file while it covers its unicode-range.
    punct_path = OUT / PUNCT_FILE
    if punct_path.exists() and punct <= {chr(c) for c in TTFont(punct_path, lazy=True).getBestCmap()}:
        punct_bytes = punct_path.read_bytes()
    else:
        punct_bytes = cut_punct(reg, punct)
        log(f'  cut {PUNCT_FILE} ({len(punct)} characters). Its name is not hashed and /assets/fonts/ is cached '
            'immutably, so browsers that cached the old file keep it.')
    lic_bytes = Path(lic_src).read_bytes() if lic_src else ((OUT / 'OFL.txt').read_bytes() if (OUT / 'OFL.txt').exists() else None)
    if lic_bytes is None:
        log('  WARNING: no licence text for OFL.txt; pass --license or --fetch')
    elif sha256(lic_bytes) != LICENSE_SHA:
        log('  note: OFL.txt is not the pinned Noto CJK licence text')

    prev = None
    try:
        old = json.loads((OUT / 'coverage.json').read_text(encoding='utf-8'))
        if old.get('version') == 3 and old.get('core') and not a.new_core:
            prev = old['core']
    except (OSError, ValueError):
        pass
    budget = int(a.budget_mb * 1_000_000)
    target = budget * 0.93
    for attempt in range(5):
        plan = make_plan(keys, common, model, target, prev)
        nlinked = len(plan['links'])
        log(f'plan: own files {plan["own_store"] / 1e6:.2f} MB (estimate) for a WOFF2 target of {target / 1e6:.2f} MB; '
            + (f'core of {sum(len(s) for s in plan["slices"])} characters in {len(plan["slices"])} slices '
               + (f'(the shipped core, kept) ' if plan['N'] == 'previous' else f'(best of the sizes tried: {plan["N"]} in slices of {plan["L"]}) ')
               + f'linked by {nlinked} keys, '
               f'about {plan["penalty"] / 1e6:.2f} MB of extra cold downloads in all; estimate {plan["store"] / 1e6:.2f} MB; '
               f'{plan["over"]} keys over their budget, largest cold visit {kb(plan["top"])}'
               if plan['slices'] else 'no core needed'))
        if a.dry_run:
            return 0
        files, out_map, parts = build_files(keys, plan, common, cutter, punct_bytes, lic_bytes, missing, punct, a.grid)
        finish_map(files, out_map)
        total = sum((-(-len(b) // BLOCK) * BLOCK) if a.budget_blocks else len(b) for b in files.values())
        if total <= budget:
            break
        target -= (total - budget) * 1.05 + 20_000
        log(f'  {total / 1e6:.2f} MB is over the {a.budget_mb} MB budget: planning again for {target / 1e6:.2f} MB of WOFF2')
    else:
        log(f'  WARNING: {total / 1e6:.2f} MB is still over the {a.budget_mb} MB budget')

    OUT.mkdir(parents=True, exist_ok=True)
    for r, data in sorted(files.items()):
        write_if_changed(OUT / r, data)
    keep = set(files)
    moved = 0
    for p in sorted(OUT.rglob('*')):
        if p.is_file() and str(p.relative_to(OUT)) not in keep and p.name != '.DS_Store':
            stash(p, OUT)
            moved += 1
    if OLD_CSS.exists():
        stash(OLD_CSS, OLD_CSS.parent)
        moved += 1
    if moved:
        log(f'  moved {moved} files that are no longer used to {rel(STALE)}/')

    cover = json.loads(files['coverage.json'])
    r = report_data(keys, out_map, cover, common, files)
    print_report(r)
    if a.report:
        Path(a.report).write_text(json.dumps({k: v for k, v in r.items() if k != 'worst'}, ensure_ascii=False, indent=1))
    log(f'done in {time.time() - t_start:.0f}s')
    return 0


if __name__ == '__main__':
    sys.exit(main())
