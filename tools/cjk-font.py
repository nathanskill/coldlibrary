#!/usr/bin/env python3
"""Cold Serif SC: Noto Serif SC (SIL OFL 1.1) cut into small WOFF2 files per page (design spec v5 §3.6).

node site/build.mjs writes site/cjk-manifest.json: for every font key (a work ID, "page:<slug>", a block that
loads later such as "today-<id>" or "grid:<slug>"), the characters it sets in the serif, in four buckets:
base (both scripts, or the only one), hant, hans (only in the traditional / simplified text) and w600 (<strong>).
This tool reads it and writes, under site/public/assets/fonts/cjk/:

  common.<hash>.woff2 + .css   the ~120 characters on the most pages (frozen in tools/cjk-common.txt), one
                               file every page shares and caches; every other 400 file leaves these out
  k/<key>.<part>.<hash>.woff2  per key, up to four files: base, hant, hans (400) and w600 (600), and one
  k/<key>.<hash>.css           stylesheet per key. Hidden 繁 or 简 text (display:none) downloads nothing.
  core/<n>.<hash>.woff2        a shared core, only when every key's own files would not fit --budget-mb (15 MB):
                               the characters the biggest keys share most, taken out of the keys that use the
                               most of it until the total fits. Their CSS lists the core files next to their
                               own, smaller files, so a long read downloads the core once and every later long
                               page finds it cached. Every page still links exactly one key CSS (+ common), and
                               no two files a page links share a code point. (One set of shared slices for all
                               long keys, the first idea, made a long page download 2.5-3.5x its own subset:
                               about 950 KB for the Dao De Jing instead of about 360 KB with the core.)
  map.json                     key → mode, CSS and the preloadable base file (read by site/src/fonts.mjs)
  coverage.json                which characters each file covers (the build's coverage gate)
  punct-serif-400.woff2        "CL Punct Serif" (spec §3.5): kept when it already covers its unicode-range
  OFL.txt                      the licence

Outlines are scaled to 500 units per em with absolute rounding (≤ 1/1000 em error, verified for every glyph),
which saves about 16% against 1000. Files are content-hashed and cached in .cache/cjk-build/, so a re-run only
cuts what changed and gives identical files the same names. Files that are no longer used, the retired
frequency slices (serif-sc-*.woff2) and /assets/cjk.css are moved to .cache/cjk-stale/, never deleted.

Sources (not committed; Noto Serif CJK 2.003, release Serif2.003, commit 9b0f143 of notofonts/noto-cjk):
  https://github.com/notofonts/noto-cjk/raw/main/Serif/SubsetOTF/SC/NotoSerifSC-Regular.otf
  https://github.com/notofonts/noto-cjk/raw/main/Serif/SubsetOTF/SC/NotoSerifSC-SemiBold.otf
  (pinned: https://github.com/notofonts/noto-cjk/raw/9b0f1436e455d902de067a2501422e5dc71ad16b/Serif/SubsetOTF/SC/…)
  SHA-256 below. --fetch downloads them (and the licence) into .cache/fonts/.

Usage:
  node site/build.mjs                       # writes site/cjk-manifest.json
  python3 tools/cjk-font.py [--regular R.otf --semibold S.otf | --fetch] [--refresh-common] [--dry-run]
  node site/build.mjs                       # links the new files; warns about any character left uncovered
Requires: pip3 install --user fonttools brotli
"""
import argparse, hashlib, io, json, os, re, shutil, sys, time, urllib.request
from concurrent.futures import ProcessPoolExecutor
from pathlib import Path

import fontTools
from fontTools import subset
from fontTools.misc.roundTools import otRound
from fontTools.pens.recordingPen import RecordingPen
from fontTools.pens.t2CharStringPen import T2CharStringPen
from fontTools.pens.transformPen import TransformPen
from fontTools.ttLib import TTFont
from fontTools.ttLib.scaleUpem import scale_upem

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
TOOL = 'cjk-font 2'  # part of every cache recipe: bump it when an option below changes the output
COMMIT = '9b0f1436e455d902de067a2501422e5dc71ad16b'
RAW = 'https://github.com/notofonts/noto-cjk/raw/' + COMMIT + '/Serif/'
SOURCES = {
    '400': {'file': 'NotoSerifSC-Regular.otf', 'sha256': 'e8f396decc1f0963a016a989c3d8852e863d1350996f573860a80767c83a1cd3'},
    '600': {'file': 'NotoSerifSC-SemiBold.otf', 'sha256': '517d9736136b3b4e9aea742a7e1acda1922aea91a4425bd8db79281934055bf5'},
}
LICENSE_SHA = '6a73f9541c2de74158c0e7cf6b0a58ef774f5a780bf191f2d7ec9cc53efe2bf2'
PUNCT_FILE = 'punct-serif-400.woff2'

# The lobby and the per-pick blocks it swaps in stay off the shared core: a small block must never pull the core in.
OWN_ALWAYS = ('today-', 'page:lobby')
FEATURES = ['ccmp', 'locl', 'kern', 'palt', 'halt', 'chws', 'vert', 'vrt2', 'vhal', 'vpal', 'vkrn', 'vchw']
PRELOAD_MAX = 40 * 1024     # fonts.mjs preloads a key's base file only when it is at most this big
W600_WARN = 16 * 1024       # spec §3.5: a page's 600 file over 16KB is an editorial problem (too much bold)
CORE_SIZES = range(400, 2401, 100)  # core sizes tried when the budget needs a core
CORE_SLICE = 400                    # characters per core file
SEED_THRESHOLD = 600                # keys above this many characters seed the first guess at the core


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


# ---------------------------------------------------------------- sources
def fetch_sources():
    FONT_CACHE.mkdir(parents=True, exist_ok=True)
    for w, s in SOURCES.items():
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
    lic = FONT_CACHE / 'LICENSE-OFL.txt'
    if not lic.exists():
        with urllib.request.urlopen(RAW + 'LICENSE', timeout=60) as r:
            lic.write_bytes(r.read())
    return FONT_CACHE / SOURCES['400']['file'], FONT_CACHE / SOURCES['600']['file'], lic


def check_source(path, weight):
    data = Path(path).read_bytes()
    got = sha256(data)
    if got != SOURCES[weight]['sha256']:
        sys.exit(f'{path}: SHA-256 {got} is not the pinned {SOURCES[weight]["sha256"]} ({SOURCES[weight]["file"]}).\n'
                 'Use the pinned file (--fetch), or update SOURCES and TOOL together on purpose.')
    return got


# ---------------------------------------------------------------- characters
def punct_set():
    """The code points of the "CL Punct Serif" face, read from its @font-face in 00-fonts.css."""
    css = FONTS_CSS.read_text(encoding='utf-8')
    m = re.search(r'font-family:\s*"CL Punct Serif"[^}]*?unicode-range:\s*([^;}]+)', css)
    out = set()
    for part in (m.group(1).split(',') if m else []):
        part = part.strip().upper().replace('U+', '')
        a, _, b = part.partition('-')
        for cp in range(int(a, 16), int(b or a, 16) + 1):
            out.add(chr(cp))
    return out


class Key:
    __slots__ = ('name', 'base', 'hant', 'hans', 'w600', 'with_')

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
        self.with_ = sorted(v.get('with', []) or [])

    @property
    def all400(self):
        return self.base | self.hant | self.hans

    def views(self, common):
        """What one visit renders: the base plus one script (the other is display:none)."""
        if self.hant or self.hans:
            return [('hant', (self.base | self.hant) - common), ('hans', (self.base | self.hans) - common)]
        return [('', self.base - common)]


def load_manifest(cmap400, cmap600):
    if not MANIFEST.exists():
        sys.exit(f'{rel(MANIFEST)} is missing: run node site/build.mjs first')
    raw = json.loads(MANIFEST.read_text(encoding='utf-8'))
    missing = set()
    keys = {}
    for name in sorted(raw):
        k = Key(name, raw[name], cmap400, cmap600, missing)
        if k.all400 or k.w600:
            keys[name] = k
    return keys, missing


def read_common():
    if not COMMON_TXT.exists():
        return None
    lines = [l for l in COMMON_TXT.read_text(encoding='utf-8').splitlines() if l and not l.startswith('#')]
    return ''.join(lines).replace(' ', '')


def refresh_common(keys, size, punct, cmap400):
    """The characters on the most keys (not counting the lobby's per-pick keys, which repeat work pages)."""
    count = {}
    for k in keys.values():
        if k.name.startswith('today-'):
            continue
        for c in k.all400:
            if c not in punct and c != '　':
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


# ---------------------------------------------------------------- fonts
def inter_options():
    o = subset.Options()
    o.layout_features = FEATURES
    o.name_IDs = [0, 1, 2, 3, 4, 5, 6]
    o.notdef_outline = True
    o.hinting = False
    o.desubroutinize = True
    return o


def final_options():
    o = inter_options()
    o.flavor = 'woff2'
    return o


def rescale(font, upem):
    """scale_upem() rounds every relative CFF delta, so errors pile up along a contour (up to 17 units on 雪).
    Re-encode each charstring from its absolute outline instead, then check every point."""
    factor = upem / font['head'].unitsPerEm
    order = font.getGlyphOrder()
    gs = font.getGlyphSet()
    outlines = {}
    for g in order:
        p = RecordingPen()
        gs[g].draw(p)
        outlines[g] = p.value
    vorg = dict(font['VORG'].VOriginRecords) if 'VORG' in font else None
    scale_upem(font, upem)
    if vorg is not None:  # scale_upem leaves the per-glyph vertical origins alone
        font['VORG'].VOriginRecords = {g: otRound(v * factor) for g, v in vorg.items()}
    cs = font['CFF '].cff.topDictIndex[0].CharStrings
    hmtx = font['hmtx']
    for g in order:
        old, _ = cs.getItemAndSelector(g)
        priv = old.private
        adv = hmtx[g][0]
        dflt, nom = getattr(priv, 'defaultWidthX', 0), getattr(priv, 'nominalWidthX', 0)
        pen = T2CharStringPen(None if adv == dflt else adv - nom, None)
        tp = TransformPen(pen, (factor, 0, 0, factor, 0, 0))
        for op, args in outlines[g]:
            getattr(tp, op)(*args)
        cs[g] = pen.getCharString(private=priv, globalSubrs=old.globalSubrs)
    return factor, outlines


def verify_scaled(data, factor, outlines):
    """Read the scaled font back: every point it draws must be within half a unit of the exact scaled source point,
    in order. The charstring optimiser may drop points that rounding made redundant (a zero-length segment, or a
    point inside a straight run); nothing may be added, and each glyph's bounds must stay within a unit."""
    from fontTools.pens.boundsPen import ControlBoundsPen
    f = TTFont(io.BytesIO(data))
    gs = f.getGlyphSet()
    worst, dropped, eps = 0.0, 0, 1e-6
    for g, ops in outlines.items():
        p = RecordingPen()
        gs[g].draw(p)
        a = [(x * factor, y * factor) for _, args in ops for (x, y) in args]
        b = [pt for _, args in p.value for pt in args]
        i = 0
        for (x, y) in b:
            while i < len(a) and not (abs(a[i][0] - x) <= 0.5 + eps and abs(a[i][1] - y) <= 0.5 + eps):
                i += 1
                dropped += 1
            if i == len(a):
                sys.exit(f'scaled outline of {g} draws a point ({x}, {y}) the source does not have')
            worst = max(worst, abs(a[i][0] - x), abs(a[i][1] - y))
            i += 1
        dropped += len(a) - i
        if a:
            xs, ys = [q[0] for q in a], [q[1] for q in a]
            bp = ControlBoundsPen(gs)
            gs[g].draw(bp)
            if bp.bounds and max(abs(bp.bounds[0] - min(xs)), abs(bp.bounds[1] - min(ys)), abs(bp.bounds[2] - max(xs)), abs(bp.bounds[3] - max(ys))) > 1:
                sys.exit(f'scaled bounds of {g} moved by more than a unit')
    return worst, dropped


def intermediate(path, chars, upem):
    """The source cut down to every character any key needs, then scaled: per-file cuts start from this."""
    t0 = time.time()
    f = TTFont(path, recalcTimestamp=False)
    s = subset.Subsetter(inter_options())
    s.populate(unicodes=sorted(ord(c) for c in chars))
    s.subset(f)
    buf = io.BytesIO()
    f.save(buf)
    f = TTFont(io.BytesIO(buf.getvalue()), recalcTimestamp=False)
    worst, dropped = 0.0, 0
    if upem and upem != f['head'].unitsPerEm:
        factor, outlines = rescale(f, upem)
        buf = io.BytesIO()
        f.save(buf)
        worst, dropped = verify_scaled(buf.getvalue(), factor, outlines)
    log(f'  intermediate {Path(path).name}: {len(chars)} characters, {len(buf.getvalue()) / 1024:.0f} KB, {upem} upem, '
        f'every point within {worst:.2f} unit ({dropped} redundant points dropped), {time.time() - t0:.0f}s')
    return buf.getvalue()


_INTER = {}


def _init(inter):
    global _INTER
    _INTER = inter


def _cut(job):
    weight, chars = job
    f = TTFont(io.BytesIO(_INTER[weight]), recalcTimestamp=False)
    s = subset.Subsetter(final_options())
    s.populate(unicodes=[ord(c) for c in chars])
    s.subset(f)
    f.flavor = 'woff2'
    buf = io.BytesIO()
    f.save(buf)
    return buf.getvalue()


class Cutter:
    """Content-addressed WOFF2 cache: recipe (tool, fontTools, source, upem, weight, characters) → file."""

    def __init__(self, sources, upem, jobs):
        self.sources, self.upem, self.jobs = sources, upem, jobs
        self.index_path = CACHE / 'index.json'
        self.index = json.loads(self.index_path.read_text()) if self.index_path.exists() else {}
        (CACHE / 'files').mkdir(parents=True, exist_ok=True)
        self.inter = None
        self.union = None

    def recipe(self, weight, chars):
        r = '|'.join([TOOL, fontTools.version, self.sources[weight]['sha'], str(self.upem), weight, chars])
        return sha256(r.encode('utf-8'))

    def have(self, weight, chars):
        e = self.index.get(self.recipe(weight, chars))
        return e if e and (CACHE / 'files' / (e['hash'] + '.woff2')).exists() else None

    def cut(self, specs):
        """specs: [(weight, chars)] → {(weight, chars): {'hash', 'bytes'}}, cutting only what is not cached."""
        todo = sorted({s for s in specs if not self.have(*s)}, key=lambda s: -len(s[1]))
        if todo:
            if self.inter is None:
                self.inter = {w: intermediate(self.sources[w]['path'], self.union[w], self.upem)
                              for w in ('400', '600') if self.union[w]}
            t0 = time.time()
            log(f'  cutting {len(todo)} files ({sum(len(c) for _, c in todo)} glyphs) with {self.jobs} processes')
            with ProcessPoolExecutor(max_workers=self.jobs, initializer=_init, initargs=(self.inter,)) as ex:
                for (w, chars), data in zip(todo, ex.map(_cut, todo, chunksize=1)):
                    h = sha256(data)[:10]
                    (CACHE / 'files' / (h + '.woff2')).write_bytes(data)
                    self.index[self.recipe(w, chars)] = {'hash': h, 'bytes': len(data), 'n': len(chars), 'w': w,
                                                         'src': self.sources[w]['sha'][:12], 'upem': self.upem}
            self.index_path.write_text(json.dumps(self.index, indent=0, sort_keys=True))
            log(f'  cut in {time.time() - t0:.0f}s')
        return {s: self.have(*s) for s in specs}

    def calibrate(self, pool):
        """Bytes per glyph (G) and per file (O), from two cuts of a sample spread evenly over the characters in use:
        1 glyph and 600 glyphs. Both depend only on the manifest, so the plan is the same on every run."""
        step = max(1, len(pool) // 600)
        sample = ''.join(pool[::step][:600])
        got = self.cut([('400', sample[:1]), ('400', sample)])
        O = got[('400', sample[:1])]['bytes']
        G = (got[('400', sample)]['bytes'] - O) / max(1, len(sample) - 1)
        return max(50.0, G), float(O)

    def bytes_of(self, h):
        return (CACHE / 'files' / (h + '.woff2')).read_bytes()


# ---------------------------------------------------------------- planning
def safe_names(names):
    out, seen = {}, {}
    for n in names:
        s = re.sub(r'[^A-Za-z0-9_-]+', '-', n).strip('-') or 'key'
        seen.setdefault(s, []).append(n)
    for s, ns in seen.items():
        for n in ns:
            out[n] = s if len(ns) == 1 else s + '-' + sha256(n.encode())[:6]
    return out


def own_parts(k, common, core=frozenset()):
    """The files one key needs: (part, weight, chars) for base, hant, hans (400) and w600."""
    out = []
    for part, chars, w in (('base', k.base - common - core, '400'), ('hant', k.hant - common - core, '400'),
                           ('hans', k.hans - common - core, '400'), ('w600', k.w600, '600')):
        if chars:
            out.append((part, w, ''.join(sorted(chars))))
    return out


def files_bytes(parts, G, O):
    return sum(len(c) * G + O for _, _, c in parts)


def core_slices(chars_ranked):
    """The core in frequency order, cut into slices of at most CORE_SLICE characters (each sorted)."""
    n = -(-len(chars_ranked) // CORE_SLICE) if chars_ranked else 0
    step = -(-len(chars_ranked) // n) if n else 0
    return [''.join(sorted(chars_ranked[i:i + step])) for i in range(0, len(chars_ranked), step)] if n else []


def first_visit(k, common, slices, G, O, common_bytes, in_core):
    """Bytes a cold first visit downloads for one key, for its worst visible script (the other is display:none)."""
    core = set().union(*map(set, slices)) if (in_core and slices) else set()
    worst = 0
    for view, cs in k.views(common):
        script = k.hant if view == 'hant' else k.hans if view == 'hans' else set()
        total = common_bytes if ((k.base | script) & common) else 0
        for part in (k.base, script):
            rest = part - common - core
            if rest:
                total += len(rest) * G + O
        if k.w600:
            total += len(k.w600) * G + O
        if core:
            total += sum(len(sl) * G + O for sl in slices if cs & set(sl))
        worst = max(worst, total)
    return worst


def make_plan(keys, common, budget, G, O, sizes=None):
    """Every key gets its own files. If they do not fit the storage budget, a shared core (the characters the
    biggest keys share most) is taken out of the keys that use the most of it, until the total fits. Those keys'
    CSS lists the core slices next to their own (now smaller) files, so a page still links one key CSS, and the
    core is downloaded once and cached across every page that uses it. Core size: the one that costs cold first
    visits least in total (each core key downloads the core characters it does not use)."""
    names = sorted(keys)
    common_bytes = len(common) * G + O
    own = {n: own_parts(keys[n], common) for n in names}
    base_store = common_bytes + sum(files_bytes(own[n], G, O) for n in names)
    plan = {'core': [], 'group': [], 'own': own, 'store': base_store, 'penalty': 0, 'ncore': 0}
    if base_store <= budget:
        return plan
    eligible = [keys[n] for n in names if not n.startswith(OWN_ALWAYS)]
    best = None
    for N in CORE_SIZES:
        group = [k for k in eligible if len(k.all400 - common) > SEED_THRESHOLD] or sorted(eligible, key=lambda k: -len(k.all400))[:20]
        ok = False
        for _ in range(4):
            df = {}
            for k in group:
                for c in k.all400 - common:
                    df[c] = df.get(c, 0) + 1
            ranked = sorted(df, key=lambda c: (-df[c], ord(c)))[:N]
            core = frozenset(ranked)
            slices = core_slices(ranked)
            store = base_store + sum(len(sl) * G + O for sl in slices)
            order = sorted(eligible, key=lambda k: (-len(k.all400 & core), k.name))
            group = []
            for k in order:
                if store <= budget:
                    break
                store += files_bytes(own_parts(k, common, core), G, O) - files_bytes(own[k.name], G, O)
                group.append(k)
            ok = store <= budget
        penalty = sum(first_visit(k, common, slices, G, O, common_bytes, True) - first_visit(k, common, [], G, O, common_bytes, False) for k in group)
        cand = (not ok, penalty if ok else store, N, ranked, slices, group, store)
        if best is None or cand[:3] < best[:3]:
            best = cand
    _, penalty, N, ranked, slices, group, store = best
    core = frozenset(ranked)
    for k in group:
        own[k.name] = own_parts(k, common, core)
    plan.update(core=slices, group=sorted(k.name for k in group), store=store, penalty=penalty, ncore=N)
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
    wr = '400 500' if weight == '400' else '600 700'
    return (f'@font-face{{font-family:"{FAMILY}";font-style:normal;font-weight:{wr};font-display:swap;'
            f'src:url({href}) format("woff2");unicode-range:{ranges(chars)}}}')


def css_doc(label, faces):
    label = re.sub(r'[^A-Za-z0-9:/._ -]', '', label)
    return (f'/* {FAMILY} = Noto Serif SC 2.003 (SIL OFL 1.1, {HREF}OFL.txt), cut by tools/cjk-font.py. {label} */\n'
            + '\n'.join(faces) + '\n')


def stash(path):
    """Move a file out of the site into .cache/cjk-stale/, keeping its relative path. Never deletes: an existing
    stale file is only replaced by identical bytes; otherwise the new copy gets a numbered name."""
    try:
        r = path.relative_to(OUT)
    except ValueError:
        r = Path(path.name)
    dst = STALE / r
    dst.parent.mkdir(parents=True, exist_ok=True)
    data = path.read_bytes()
    n, base = 0, dst
    while dst.exists() and dst.read_bytes() != data:
        n += 1
        dst = base.with_name(f'{base.name}.{n}')
    os.replace(path, dst)
    return dst


def write_if_changed(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    b = data.encode('utf-8') if isinstance(data, str) else data
    if not path.exists() or path.read_bytes() != b:
        path.write_bytes(b)


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


def main():
    ap = argparse.ArgumentParser(description='Cut Noto Serif SC into per-page WOFF2 subsets (spec §3.6).')
    ap.add_argument('--regular', help='NotoSerifSC-Regular.otf (default: .cache/fonts/)')
    ap.add_argument('--semibold', help='NotoSerifSC-SemiBold.otf (default: .cache/fonts/)')
    ap.add_argument('--fetch', action='store_true', help='download the pinned sources into .cache/fonts/')
    ap.add_argument('--license', help='the OFL text to copy to OFL.txt (default: keep the one there)')
    ap.add_argument('--refresh-common', action='store_true', help='recompute tools/cjk-common.txt from the manifest')
    ap.add_argument('--common-size', type=int, default=120)
    ap.add_argument('--budget-mb', type=float, default=15.0, help='total committed CJK WOFF2 (a shared core is used only to fit it)')
    ap.add_argument('--upem', type=int, default=500)
    ap.add_argument('--jobs', type=int, default=max(1, (os.cpu_count() or 2) - 1))
    ap.add_argument('--dry-run', action='store_true', help='plan and estimate only; write nothing in the site')
    ap.add_argument('--report', help='also write the report as JSON to this path')
    ap.add_argument('--manifest', help='read this manifest instead of site/cjk-manifest.json (for trials)')
    ap.add_argument('--out', help='write the subsets here instead of site/public/assets/fonts/cjk (for trials)')
    ap.add_argument('--common-file', help='use this common-set file instead of tools/cjk-common.txt (for trials)')
    a = ap.parse_args()
    t_start = time.time()
    global OUT, MANIFEST, COMMON_TXT, STALE, OLD_CSS
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
    if a.license:
        lic_src = Path(a.license)
    sources = {'400': {'path': str(reg), 'sha': check_source(reg, '400')},
               '600': {'path': str(semi), 'sha': check_source(semi, '600')}}
    cmap400 = TTFont(reg, lazy=True).getBestCmap()
    cmap600 = TTFont(semi, lazy=True).getBestCmap()
    punct = punct_set()

    keys, missing = load_manifest(cmap400, cmap600)
    log(f'manifest: {len(keys)} keys set Chinese in the serif; not in Noto Serif SC: {"".join(sorted(missing)) or "none"}')
    common = None if a.refresh_common else read_common()
    if common is None:
        if a.dry_run:
            common = ''
        else:
            common = refresh_common(keys, a.common_size, punct, cmap400)
            log(f'wrote {rel(COMMON_TXT)}: {len(common)} characters')
    common = frozenset(c for c in common if ord(c) in cmap400)

    cutter = Cutter(sources, a.upem, a.jobs)
    union400 = set(common) | {c for c in punct if ord(c) in cmap400}
    union600 = set()
    for k in keys.values():
        union400 |= k.all400
        union600 |= k.w600
    cutter.union = {'400': ''.join(sorted(union400)), '600': ''.join(sorted(union600))}
    G, O = cutter.calibrate(sorted(union400 - common) or sorted(union400))
    log(f'size model: about {G:.0f} bytes per glyph and {O:.0f} bytes per file')

    budget = int(a.budget_mb * 1_000_000)
    target = budget * 0.96
    for attempt in range(4):
        plan = make_plan(keys, common, target, G, O)
        log(f'plan: {len(keys) - len(plan["group"])} keys with their own files only, {len(plan["group"])} also on a shared core of '
            f'{plan["ncore"]} characters ({len(plan["core"])} slices); estimate {plan["store"] / 1e6:.2f} MB')
        if a.dry_run:
            return 0
        specs = [('400', ''.join(sorted(common)))] if common else []
        for parts in plan['own'].values():
            specs += [(w, c) for _, w, c in parts]
        specs += [('400', c) for c in plan['core']]
        got = cutter.cut(specs)
        woff = sum(got[s]['bytes'] for s in set(specs))
        text = text_estimate(keys, plan, common)
        if woff + text <= budget:
            break
        target *= budget / (woff + text) * 0.99
        log(f'  {woff / 1e6:.2f} MB of WOFF2 + about {text / 1e6:.2f} MB of CSS and JSON is over the {a.budget_mb} MB budget: planning again')

    # ---- the site files
    files = {}  # relative path → bytes

    def put(rel_tmpl, weight, chars):
        e = got[(weight, chars)]
        r = rel_tmpl.format(h=e['hash'])
        files[r] = cutter.bytes_of(e['hash'])
        return HREF + r, e['bytes']

    out_map = {'version': 2, 'family': FAMILY, 'source': 'Noto Serif SC 2.003', 'upem': a.upem}
    cover = {'version': 2, 'family': FAMILY, 'missing': ''.join(sorted(missing)), 'common': ''.join(sorted(common))}
    common_bytes = 0
    if common:
        c_href, common_bytes = put('common.{h}.woff2', '400', ''.join(sorted(common)))
        doc = css_doc('common', [face(c_href, '400', common)])
        r = f'common.{sha256(doc.encode())[:10]}.css'
        files[r] = doc.encode()
        out_map['common'] = {'css': HREF + r, 'woff2': c_href, 'bytes': common_bytes}
    core_faces, core_bytes, core_import = [], [], ''
    for i, chars in enumerate(plan['core']):
        href, b = put(f'core/{i:02d}.{{h}}.woff2', '400', chars)
        core_faces.append(face(href, '400', chars))
        core_bytes.append(b)
    if plan['core']:
        doc = css_doc(f'shared core, {plan["ncore"]} characters', core_faces)
        r = f'core.{sha256(doc.encode())[:10]}.css'
        files[r] = doc.encode()
        # A core key's CSS imports the core, so a block a script inserts later needs one href; pages also link the
        # core CSS directly (fonts.mjs), so the import finds it already loading and costs no extra round trip.
        core_import = f'@import url({HREF + r});'
        out_map['core'] = {'css': HREF + r, 'files': [HREF + k for k in sorted(files) if k.startswith('core/')], 'bytes': sum(core_bytes), 'characters': plan['ncore']}
        cover['core'] = ''.join(sorted(''.join(plan['core'])))
    group = set(plan['group'])
    out_map['keys'], cover['keys'], per_file = {}, {}, {}
    names = safe_names(sorted(keys))
    for name in sorted(keys):
        safe = names[name]
        faces, entry, cv = [], {'mode': 'core' if name in group else 'own'}, {}
        for part, w, chars in plan['own'][name]:
            href, b = put(f'k/{safe}.{part}.{{h}}.woff2', w, chars)
            faces.append(face(href, w, chars))
            per_file[(name, part)] = b
            cv[part] = chars
            if part == 'base':
                entry['base'] = {'href': href, 'bytes': b}
        if name in group:
            faces = [core_import] + faces
            cv['core'] = True
        if faces:
            doc = css_doc(name + (' (with the shared core)' if name in group else ''), faces)
            r = f'k/{safe}.{sha256(doc.encode())[:10]}.css'
            files[r] = doc.encode()
            entry['css'] = HREF + r
        out_map['keys'][name] = entry
        cover['keys'][name] = cv
    out_map['bytes'] = sum(len(b) for p, b in files.items() if p.endswith('.woff2'))

    # Punctuation face (spec §3.5): keep the shipped file while it covers its unicode-range.
    punct_path = OUT / PUNCT_FILE
    need = {c for c in punct if ord(c) in cmap400}
    if not punct_path.exists() or not need <= {chr(c) for c in TTFont(punct_path).getBestCmap()}:
        files[PUNCT_FILE] = _cut_direct(reg, need)
        log(f'  wrote {PUNCT_FILE} ({len(need)} characters)')
    else:
        files[PUNCT_FILE] = punct_path.read_bytes()
    out_map['bytes'] += len(files[PUNCT_FILE])

    OUT.mkdir(parents=True, exist_ok=True)
    old_cov = OUT / 'coverage.json'
    if old_cov.exists() and '"version"' not in old_cov.read_text(encoding='utf-8')[:200]:
        log(f'  moved the v1 coverage.json → {rel(stash(old_cov))}')
    for r, data in sorted(files.items()):
        write_if_changed(OUT / r, data)
    write_if_changed(OUT / 'map.json', json_lines(out_map))
    write_if_changed(OUT / 'coverage.json', json_lines(cover))
    if lic_src:
        data = Path(lic_src).read_bytes()
        if sha256(data) != LICENSE_SHA:
            log(f'  note: {lic_src} is not the pinned Noto CJK licence text')
        write_if_changed(OUT / 'OFL.txt', data)
    elif not (OUT / 'OFL.txt').exists():
        log('  WARNING: OFL.txt is missing; pass --license or --fetch')

    keep = set(files) | {'map.json', 'coverage.json', 'OFL.txt'}
    moved = 0
    for p in sorted(OUT.rglob('*')):
        if p.is_file() and str(p.relative_to(OUT)) not in keep and p.name != '.DS_Store':
            stash(p)
            moved += 1
    if OLD_CSS.exists():
        stash(OLD_CSS)
        moved += 1
    if moved:
        log(f'  moved {moved} files that are no longer used to {rel(STALE)}/')

    total = sum(p.stat().st_size for p in OUT.rglob('*') if p.is_file())
    report = build_report(keys, plan, common, common_bytes, core_bytes, per_file, missing, out_map['bytes'], total)
    print_report(report)
    if a.report:
        Path(a.report).write_text(json.dumps(report, ensure_ascii=False, indent=1))
    log(f'done in {time.time() - t_start:.0f}s')
    return 0


def text_estimate(keys, plan, common):
    """CSS and JSON bytes: each code point costs about 7 bytes in a unicode-range and 3 in coverage.json, plus
    per-face and per-key overhead (measured on the 2026-10-11 catalogue: within 10%)."""
    cps = sum(len(c) for parts in plan['own'].values() for _, _, c in parts) + sum(len(c) for c in plan['core']) + len(common)
    faces = sum(len(parts) for parts in plan['own'].values()) + len(plan['core']) + 1
    return cps * 10 + faces * 260 + len(keys) * 450


def _cut_direct(path, chars):
    f = TTFont(path, recalcTimestamp=False)
    s = subset.Subsetter(final_options())
    s.populate(unicodes=sorted(ord(c) for c in chars))
    s.subset(f)
    f.flavor = 'woff2'
    buf = io.BytesIO()
    f.save(buf)
    return buf.getvalue()


# ---------------------------------------------------------------- report
def build_report(keys, plan, common, common_bytes, core_bytes, per_file, missing, woff2_bytes, all_bytes):
    group = set(plan['group'])
    slices = [set(s) for s in plan['core']]

    def visit(name, warm_core=False):
        """Real bytes a first visit downloads, per visible script (the other script is display:none)."""
        k = keys[name]
        out = {}
        for view, cs in k.views(common):
            script = k.hant if view == 'hant' else k.hans if view == 'hans' else set()
            total = common_bytes if ((k.base | script) & common) else 0
            total += per_file.get((name, 'base'), 0) + (per_file.get((name, view), 0) if view else 0) + per_file.get((name, 'w600'), 0)
            if name in group and not warm_core:
                total += sum(b for sl, b in zip(slices, core_bytes) if cs & sl)
            out[view or 'only'] = total
        return out

    visits = {n: visit(n) for n in keys}
    worst = {n: max(v.values()) for n, v in visits.items()}
    own_w = sorted(worst[n] for n in keys if n not in group)
    core_w = sorted(worst[n] for n in group)
    lobby = None
    if 'page:lobby' in keys:
        todays = [n for n in keys if n.startswith('today-')]
        extra = lambda n: worst[n] - (common_bytes if keys[n].all400 & common else 0)
        biggest = max(todays, key=extra, default=None)
        lobby = {'lobby': worst['page:lobby'], 'largest_today': biggest,
                 'with_largest_today': worst['page:lobby'] + (extra(biggest) if biggest else 0) + (0 if keys['page:lobby'].all400 & common else common_bytes)}
    samples = {}
    for n in ('S-001001', 'S-002001', 'S-005001', 'page:lobby', 'page:open-stacks', 'page:open-stacks/poetry', 'grid:open-stacks/poetry'):
        if n in keys:
            samples[n] = {'mode': 'core' if n in group else 'own', 'visit': visits[n]}
            if n in group:
                samples[n]['warm'] = visit(n, warm_core=True)
    return {
        'keys': len(keys), 'own_keys': len(own_w), 'core_keys': len(core_w), 'core_chars': plan['ncore'],
        'core_bytes': sum(core_bytes), 'common_chars': len(common), 'common_bytes': common_bytes,
        'woff2_bytes': woff2_bytes, 'all_bytes': all_bytes, 'missing': ''.join(sorted(missing)),
        'own_first_visit_median': own_w[len(own_w) // 2] if own_w else 0, 'own_first_visit_max': own_w[-1] if own_w else 0,
        'core_first_visit_median': core_w[len(core_w) // 2] if core_w else 0, 'core_first_visit_max': core_w[-1] if core_w else 0,
        'samples': samples, 'lobby': lobby,
        'largest': sorted(({'key': n, 'mode': 'core' if n in group else 'own', 'bytes': worst[n]} for n in keys), key=lambda x: -x['bytes'])[:10],
        'w600_over_16KB': {n: b for (n, part), b in per_file.items() if part == 'w600' and b > W600_WARN},
        'core_group': plan['group'],
    }


def print_report(r):
    kb = lambda b: f'{b / 1024:.0f} KB'
    log(f'\n{FAMILY}: {r["keys"]} keys; {r["own_keys"]} with their own files only, {r["core_keys"]} with the shared core')
    log(f'  common: {r["common_chars"]} characters, {kb(r["common_bytes"])}; core: {r["core_chars"]} characters, {kb(r["core_bytes"])}')
    log(f'  committed WOFF2: {r["woff2_bytes"] / 1e6:.2f} MB (all files under fonts/cjk: {r["all_bytes"] / 1e6:.2f} MB)')
    log(f'  cold first visit, common included, worst script: own keys median {kb(r["own_first_visit_median"])}, max {kb(r["own_first_visit_max"])}; '
        f'core keys median {kb(r["core_first_visit_median"])}, max {kb(r["core_first_visit_max"])}')
    for n, s in r['samples'].items():
        warm = ('   core cached: ' + '  '.join(f'{v} {kb(b)}' for v, b in s['warm'].items())) if 'warm' in s else ''
        log(f'  {n:26} {s["mode"]:4}  ' + '  '.join(f'{v} {kb(b)}' for v, b in s['visit'].items()) + warm)
    if r['lobby']:
        log(f'  lobby with its largest today block ({r["lobby"]["largest_today"]}): {kb(r["lobby"]["with_largest_today"])}')
    for n, b in r['w600_over_16KB'].items():
        log(f'  WARNING: {n} sets {kb(b)} of bold Chinese (budget 16 KB); the fix is editorial (less bold)')
    if r['missing']:
        log(f'  not in Noto Serif SC, set in the system serif: {r["missing"]}')


if __name__ == '__main__':
    sys.exit(main())
