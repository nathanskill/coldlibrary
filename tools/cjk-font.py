#!/usr/bin/env python3
"""Slice a Chinese serif into small WOFF2 files covering only the characters this site uses.

Browsers download a slice only when a page needs one of its characters (CSS unicode-range), so a
reader of one poem fetches a few dozen kilobytes, not a 10 MB font. Run it again whenever content
changes; build.mjs warns when a page uses a character that no slice covers.

Usage:
  python3 tools/cjk-font.py --regular NotoSerifSC-Regular.otf --semibold NotoSerifSC-SemiBold.otf
Requires: pip3 install --user fonttools brotli
Font: Noto Serif SC (SIL Open Font License 1.1); the licence is copied next to the slices.
"""
import argparse, json, re, shutil, sys
from collections import Counter
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'site/public/assets/fonts/cjk'
CSS = ROOT / 'site/public/assets/cjk.css'
FAMILY = 'Cold Serif SC'
SLICE = 120  # characters per slice: small enough that a short page loads a handful

# Han ideographs, CJK punctuation, fullwidth forms, kana are left to system fonts.
CJK = re.compile('[　-〿㐀-䶿一-鿿豈-﫿＀-￯\U00020000-\U0002ebef]')
SOURCES = [
    'catalog/stacks/**/*.md', 'catalog/stacks/**/*.json', 'catalog/plates/*.json', 'catalog/items/*.json',
    'catalog/open-stacks/*.md', 'catalog/log.json', 'site/src/*.mjs', 'site/public/assets/*.js',
]


def collect():
    count = Counter()
    for pattern in SOURCES:
        for p in ROOT.glob(pattern):
            if '/_held/' in str(p):
                continue
            count.update(CJK.findall(p.read_text(encoding='utf-8', errors='ignore')))
    return count


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--regular', required=True)
    ap.add_argument('--semibold', required=True)
    ap.add_argument('--license', default=None, help='path to the OFL licence text')
    a = ap.parse_args()
    count = collect()
    cmap = TTFont(a.regular).getBestCmap()
    chars = [c for c, _ in count.most_common() if ord(c) in cmap]
    missing = sorted({c for c in count if ord(c) not in cmap})
    slices = [chars[i:i + SLICE] for i in range(0, len(chars), SLICE)]
    OUT.mkdir(parents=True, exist_ok=True)
    css = [f'/* {FAMILY}: Noto Serif SC (SIL OFL 1.1), sliced by tools/cjk-font.py. {len(chars)} characters in {len(slices)} slices. */']
    total = 0
    for weight, src in (('400', a.regular), ('600', a.semibold)):
        for n, group in enumerate(slices):
            name = f'serif-sc-{weight}-{n:03d}.woff2'
            opts = subset.Options()
            opts.flavor = 'woff2'
            opts.layout_features = ['*']  # keep vert/vrt2 for vertical text and palt/halt for punctuation
            opts.name_IDs = ['*']
            opts.notdef_outline = True
            opts.hinting = False
            font = TTFont(src)
            s = subset.Subsetter(options=opts)
            s.populate(unicodes=[ord(c) for c in group])
            s.subset(font)
            font.flavor = 'woff2'
            font.save(OUT / name)
            total += (OUT / name).stat().st_size
            ranges = ','.join(f'U+{ord(c):X}' for c in sorted(group))
            css.append(f"@font-face{{font-family:'{FAMILY}';font-style:normal;font-weight:{weight};font-display:swap;src:url(/assets/fonts/cjk/{name}) format('woff2');unicode-range:{ranges}}}")
    # Slices left over from a larger earlier run are moved out of the site (never deleted).
    keep = {f'serif-sc-{w}-{n:03d}.woff2' for w in ('400', '600') for n in range(len(slices))}
    stale = ROOT / '.cache/cjk-stale'
    for old in OUT.glob('*.woff2'):
        if old.name not in keep:
            stale.mkdir(parents=True, exist_ok=True)
            old.rename(stale / old.name)
    CSS.write_text('\n'.join(css) + '\n', encoding='utf-8')
    (OUT / 'coverage.json').write_text(json.dumps({'family': FAMILY, 'characters': ''.join(sorted(chars)), 'missing': ''.join(missing)}, ensure_ascii=False), encoding='utf-8')
    if a.license:
        shutil.copyfile(a.license, OUT / 'OFL.txt')
    print(f'{len(chars)} characters, {len(slices)} slices x 2 weights, {total / 1024:.0f} KB total; not in font: {"".join(missing) or "none"}')


if __name__ == '__main__':
    sys.exit(main())
