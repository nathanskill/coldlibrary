#!/usr/bin/env python3
"""Subset IBM Plex (SIL OFL 1.1) to the Latin the site sets, as WOFF2 (design spec v5 §3.6).

Five files, with the names site/src/css/00-fonts.css already uses:
  Plex Sans 400 and 500, Plex Serif 400 and 400 italic, Plex Mono 400.

Ranges: Basic Latin, Latin-1, Latin Extended-A, the pinyin tone vowels U+01CD-01DC, general punctuation
U+2010-2027 and U+2030-203A, the arrows U+2190-2193 and U+2197, U+2116 (No.), U+2212 (minus), U+00B7, U+202F.
U+2042 (asterism) is not in Plex; the site draws it another way.

Sources: the pinned IBM Plex releases on GitHub (one package per family since 2024), downloaded once into
.cache/plex/ and checked against the SHA-256 below. Fonts are read straight from the zip; nothing is unpacked.

Usage:   python3 tools/plex-subset.py [--zips DIR] [--check]
         --zips DIR  read the release zips from DIR (searched recursively, matched by SHA-256) instead of downloading
         --check     only check the shipped files (size budget, cmap), write nothing
Requires: pip3 install --user fonttools brotli
"""
import argparse, hashlib, io, os, shutil, sys, urllib.request, zipfile
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'site/public/assets/fonts'
CACHE = ROOT / '.cache/plex'
STALE = ROOT / '.cache/plex-stale'
LICENSE_OUT = OUT / 'OFL-IBM-Plex.txt'
BUDGET = 30 * 1024  # bytes per file (spec §3.6)

RELEASES = {
    # family: (release tag, asset, sha256 of the asset)
    'sans': ('@ibm/plex-sans@1.1.0', 'ibm-plex-sans.zip', 'fb365d910566e6d199cc2c15579a7dd9a267128e18431a394ed81f1970c69200'),
    'serif': ('@ibm/plex-serif@2.0.0', 'ibm-plex-serif.zip', 'c006b095c47b919c6c8d78319e9e628745033f5db94507c1c9dfe4b35dd51f1e'),
    'mono': ('@ibm/plex-mono@2.5.0', 'ibm-plex-mono.zip', '6d23f01257663d8cc49a0d64c22ced630b79e0e2a0ac08a0da86e9a38bbc481c'),
}
URL = 'https://github.com/IBM/plex/releases/download/{tag}/{asset}'

OUTPUTS = [
    # output name, family, member inside the zip (hinted TrueType)
    ('ibm-plex-sans-latin-400-normal.woff2', 'sans', 'ibm-plex-sans/fonts/complete/ttf/IBMPlexSans-Regular.ttf'),
    ('ibm-plex-sans-latin-500-normal.woff2', 'sans', 'ibm-plex-sans/fonts/complete/ttf/IBMPlexSans-Medium.ttf'),
    ('ibm-plex-serif-latin-400-normal.woff2', 'serif', 'ibm-plex-serif/fonts/complete/ttf/IBMPlexSerif-Regular.ttf'),
    ('ibm-plex-serif-latin-400-italic.woff2', 'serif', 'ibm-plex-serif/fonts/complete/ttf/IBMPlexSerif-Italic.ttf'),
    ('ibm-plex-mono-latin-400-normal.woff2', 'mono', 'ibm-plex-mono/fonts/complete/ttf/IBMPlexMono-Regular.ttf'),
]
# Files earlier versions shipped; the v5 type system no longer uses them (spec §3.1). Moved, never deleted.
RETIRED = [
    'ibm-plex-sans-latin-300-normal.woff2', 'ibm-plex-sans-latin-600-normal.woff2', 'ibm-plex-serif-latin-500-normal.woff2',
    'ibm-plex-mono-latin-500-normal.woff2', 'ibm-plex-sans-condensed-latin-500-normal.woff2',
    'ibm-plex-sans-condensed-latin-600-normal.woff2', 'ibm-plex-sans-condensed-latin-700-normal.woff2',
]

RANGES = [(0x20, 0x7E), (0xA0, 0xFF), (0x100, 0x17F), (0x1CD, 0x1DC), (0x2010, 0x2027), (0x2030, 0x203A),
          (0x2190, 0x2193), (0x2197, 0x2197), (0x2116, 0x2116), (0x2212, 0x2212), (0xB7, 0xB7), (0x202F, 0x202F)]
UNICODES = sorted({c for a, b in RANGES for c in range(a, b + 1)})
MUST_HAVE = {0x2192: '→', 0x2190: '←', 0x2197: '↗', 0x2116: '№', 0x2212: '−', 0x202F: 'narrow no-break space', 0x01D4: 'ǔ'}


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def fetch(family, zips_dir):
    """The release zip for one family, from --zips, the cache, or GitHub; always checked against its SHA-256."""
    tag, asset, want = RELEASES[family]
    if zips_dir:
        for p in sorted(Path(zips_dir).rglob(asset)):
            data = p.read_bytes()
            if sha256(data) == want:
                return zipfile.ZipFile(io.BytesIO(data))
        sys.exit(f'no {asset} with the pinned SHA-256 of {tag} under {zips_dir}')
    cached = CACHE / tag.replace('/', '_') / asset
    if cached.exists():
        data = cached.read_bytes()
        if sha256(data) == want:
            return zipfile.ZipFile(io.BytesIO(data))
        print(f'{cached}: SHA-256 does not match {tag}; downloading again')
    url = URL.format(tag=urllib.request.quote(tag, safe=''), asset=asset)
    print(f'downloading {url}')
    with urllib.request.urlopen(url, timeout=120) as r:
        data = r.read()
    if sha256(data) != want:
        sys.exit(f'{asset}: SHA-256 {sha256(data)} does not match the pinned {want} ({tag}); not using it')
    cached.parent.mkdir(parents=True, exist_ok=True)
    cached.write_bytes(data)
    return zipfile.ZipFile(io.BytesIO(data))


def stash(path, move):
    """Copy (or move) a file we replace or retire into .cache/plex-stale/. Nothing is ever deleted: an existing
    stale copy is only replaced by identical bytes, otherwise the new copy gets a numbered name."""
    STALE.mkdir(parents=True, exist_ok=True)
    data = path.read_bytes()
    n, dst = 0, STALE / path.name
    while dst.exists() and dst.read_bytes() != data:
        n += 1
        dst = STALE / f'{path.name}.{n}'
    if move:
        os.replace(path, dst)
    elif not dst.exists():
        shutil.copy2(path, dst)
    return dst


def options():
    o = subset.Options()
    o.flavor = 'woff2'
    o.layout_features = subset.Options().layout_features + ['case']  # defaults (kern, liga, ccmp, mark, frac …) plus case
    o.hinting = True  # keep TrueType hinting: Plex is hinted, it helps Windows at 14-17px, and it fits the budget
    o.desubroutinize = True
    o.name_IDs = [0, 1, 2, 3, 4, 5, 6, 13, 14]  # copyright, names, version, licence and its URL
    o.notdef_outline = True
    o.drop_tables += ['meta']
    return o


def check(path):
    data = path.read_bytes()
    f = TTFont(io.BytesIO(data))
    cmap = f.getBestCmap()
    missing = [name for cp, name in MUST_HAVE.items() if cp not in cmap]
    lacking = [cp for cp in UNICODES if cp not in cmap]
    problems = []
    if len(data) > BUDGET:
        problems.append(f'{len(data)} bytes is over the {BUDGET} budget')
    if missing:
        problems.append('cmap lacks ' + ', '.join(missing))
    return len(data), len(cmap), lacking, problems, f['name'].getDebugName(5)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split('\n')[0])
    ap.add_argument('--zips', help='folder holding the release zips (skips the download)')
    ap.add_argument('--check', action='store_true', help='only check the shipped files')
    a = ap.parse_args()
    failed = False
    if not a.check:
        zips = {fam: fetch(fam, a.zips) for fam in RELEASES}
        licences = set()
        for fam, z in zips.items():
            member = next(n for n in z.namelist() if n.endswith('/LICENSE.txt') and n.count('/') == 1)
            licences.add(z.read(member).decode('utf-8'))
        OUT.mkdir(parents=True, exist_ok=True)
        for name, fam, member in OUTPUTS:
            font = TTFont(io.BytesIO(zips[fam].read(member)), recalcTimestamp=False)
            s = subset.Subsetter(options())
            s.populate(unicodes=UNICODES)
            s.subset(font)
            buf = io.BytesIO()
            font.flavor = 'woff2'
            font.save(buf)
            data = buf.getvalue()
            dst = OUT / name
            if not dst.exists() or dst.read_bytes() != data:
                if dst.exists():
                    stash(dst, move=False)
                dst.write_bytes(data)
        # One licence file for the three families (the releases carry the same OFL text, with IBM's copyright line).
        LICENSE_OUT.write_text('\n\n'.join(sorted(licences)), encoding='utf-8')
        for name in RETIRED:
            p = OUT / name
            if p.exists():
                dst = stash(p, move=True)
                print(f'retired {name} → {dst.relative_to(ROOT)}')
    for name, fam, _ in OUTPUTS:
        size, glyphs, lacking, problems, version = check(OUT / name)
        tag = RELEASES[fam][0]
        note = f'; not in Plex: {", ".join(f"U+{c:04X}" for c in lacking)}' if lacking else ''
        print(f'{name:42} {size / 1024:5.1f} KB  {glyphs} code points  {tag} ({version}){note}')
        for p in problems:
            failed = True
            print(f'  FAIL: {p}')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
