#!/usr/bin/env python3
"""Re-encode the plate images (spec v5 §2.6, §9.2) and record their real size in the plate JSON.

For every plate in catalog/plates/*.json this writes, from the largest image file we hold for it:

  site/public/assets/plates/<ID>.jpg      1600 px on the long side   <= 450 KB
  site/public/assets/plates/<ID>-sm.jpg    800 px on the long side   <= 120 KB
  site/public/assets/plates/<ID>-480.jpg   480 px on the long side   <=  40 KB

as progressive JPEG at quality 78 (lowered step by step only if a file is over its budget), converted to sRGB
when the source carries another colour profile (Adobe RGB, ProPhoto, camera profiles), never upscaled, with
EXIF orientation applied and metadata dropped. It then sets image.width / image.height in the plate JSON to
the real size of the 1600 file (only those two numbers change in the file).

Nothing is deleted: before a plate is re-encoded, its previous files are moved to .cache/plates-orig/
(git-ignored). If a file of that name is already there (a second run), the first copy is kept as the original
and the newer one goes to .cache/plates-orig/superseded/<time>/. The source is always the largest file we
hold, the cached original included, so a second run never re-encodes a re-encoded image.

Usage:
  python3 tools/plate-images.py               re-encode the plates that are not done yet
  python3 tools/plate-images.py --dry-run     report only
  python3 tools/plate-images.py --force       re-encode every plate again (from the cached originals)
  python3 tools/plate-images.py G-009001 …    only these plates
Needs Pillow (pip3 install --user pillow).
"""
import io
import json
import os
import re
import shutil
import sys
import time
from pathlib import Path

try:
    from PIL import Image, ImageCms, ImageOps
except ImportError:  # pragma: no cover
    sys.exit('Pillow is missing: pip3 install --user pillow')

ROOT = Path(__file__).resolve().parent.parent
PLATES_JSON = ROOT / 'catalog' / 'plates'
PLATES_IMG = ROOT / 'site' / 'public' / 'assets' / 'plates'
CACHE = ROOT / '.cache' / 'plates-orig'
SIZES = [('', 1600, 450 * 1024), ('-sm', 800, 120 * 1024), ('-480', 480, 40 * 1024)]
QUALITY = 78
MIN_QUALITY = 50
SRGB = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB'))
SRGB_BYTES = SRGB.tobytes()


def plates():
    for f in sorted(PLATES_JSON.glob('*.json')):
        if f.name.startswith('_'):
            continue
        try:
            p = json.loads(f.read_text(encoding='utf-8'))
        except ValueError as e:
            print(f'  skip {f.name}: not valid JSON ({e})')
            continue
        if re.fullmatch(r'G-\d{6}', str(p.get('id', ''))):
            yield f, p


def pixels(path):
    try:
        with Image.open(path) as im:
            return im.size[0] * im.size[1], im.size
    except Exception:
        return 0, (0, 0)


def candidates(pid):
    """Every image file we hold for a plate, largest first (pixels, then bytes)."""
    files = [PLATES_IMG / f'{pid}{s}.jpg' for s, _, _ in SIZES]
    if CACHE.exists():
        files += [f for f in CACHE.glob(f'{pid}*') if f.is_file()]
        sup = CACHE / 'superseded'
        if sup.exists():
            files += [f for f in sup.glob(f'*/{pid}*') if f.is_file()]
    files = [f for f in files if f.exists() and re.match(re.escape(pid) + r'(-sm|-480|-\d+)?\.(jpe?g|png|tiff?|webp)$', f.name, re.I)]
    # Most pixels first; at equal pixels a cached original beats a file this tool wrote, then the larger file wins.
    return sorted(files, key=lambda f: (pixels(f)[0], CACHE in f.parents and 'superseded' not in f.parts, f.stat().st_size), reverse=True)


def done(pid):
    """True when all three files exist, fit their size and budget, are progressive, and the original is cached."""
    if not (CACHE / f'{pid}.jpg').exists():
        return False
    for s, edge, budget in SIZES:
        f = PLATES_IMG / f'{pid}{s}.jpg'
        if not f.exists() or f.stat().st_size > budget:
            return False
        with Image.open(f) as im:
            if max(im.size) > edge or not im.info.get('progressive'):
                return False
    return True


def to_srgb(im):
    """Return (image, icc bytes to embed or None). Converts tagged non-sRGB RGB/CMYK sources to sRGB."""
    icc = im.info.get('icc_profile')
    if im.mode in ('P', 'PA', 'LA', 'RGBA', 'I;16', 'I', 'F'):
        im = im.convert('RGB')
    if im.mode == 'L':
        return im, icc  # a grey profile (gamma 2.2) is kept as it is
    if icc:
        try:
            src = ImageCms.ImageCmsProfile(io.BytesIO(icc))
            desc = (ImageCms.getProfileDescription(src) or '').strip()
            if re.search(r'\bsrgb\b|IEC ?61966', desc, re.I):
                return im.convert('RGB'), SRGB_BYTES
            return ImageCms.profileToProfile(im, src, SRGB, renderingIntent=ImageCms.Intent.PERCEPTUAL, outputMode='RGB'), SRGB_BYTES
        except Exception as e:  # an unreadable profile: keep the pixels, drop the profile
            print(f'    colour profile unreadable ({e}); treated as sRGB')
    return im.convert('RGB'), None


def encode(im, edge, budget, icc):
    w, h = im.size
    if max(w, h) > edge:
        k = edge / max(w, h)
        im = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS, reducing_gap=3.0)
    q = QUALITY
    while True:
        buf = io.BytesIO()
        opts = dict(format='JPEG', quality=q, progressive=True, optimize=True)
        if im.mode == 'RGB':
            opts['subsampling'] = 2  # 4:2:0
        if icc:
            opts['icc_profile'] = icc
        im.save(buf, **opts)
        data = buf.getvalue()
        if len(data) <= budget or q <= MIN_QUALITY:
            return data, im.size, q
        q -= 4


def move_aside(path, stamp):
    """Move a previous file into the cache. The first copy of a name stays the original."""
    CACHE.mkdir(parents=True, exist_ok=True)
    dest = CACHE / path.name
    if dest.exists():
        dest = CACHE / 'superseded' / stamp / path.name
        dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(path), str(dest))
    return dest


def set_size(json_path, width, height):
    """Change only image.width and image.height in the plate JSON text."""
    text = json_path.read_text(encoding='utf-8')
    m = re.search(r'"image"\s*:\s*\{[^{}]*\}', text)
    if not m:
        raise ValueError('no "image" object')
    block = m.group(0)
    new = re.sub(r'("width"\s*:\s*)\d+', lambda x: x.group(1) + str(width), block, count=1)
    new = re.sub(r'("height"\s*:\s*)\d+', lambda x: x.group(1) + str(height), new, count=1)
    if '"width"' not in new or '"height"' not in new:
        raise ValueError('image has no width/height to update')
    if new != block:
        json_path.write_text(text[:m.start()] + new + text[m.end():], encoding='utf-8')
        json.loads(json_path.read_text(encoding='utf-8'))  # still valid JSON
        return True
    return False


def main(argv):
    dry = '--dry-run' in argv
    force = '--force' in argv
    only = {a for a in argv if re.fullmatch(r'G-\d{6}', a)}
    stamp = time.strftime('%Y%m%d-%H%M%S')
    before = after = 0
    n = skipped = over = 0
    for json_path, p in plates():
        pid = p['id']
        if only and pid not in only:
            continue
        current = sum((PLATES_IMG / f'{pid}{s}.jpg').stat().st_size for s, _, _ in SIZES if (PLATES_IMG / f'{pid}{s}.jpg').exists())
        if not force and done(pid):
            skipped += 1
            before += current
            after += current
            continue
        cands = candidates(pid)
        if not cands:
            print(f'  {pid}: no image file found')
            continue
        src = cands[0]
        with Image.open(src) as im0:
            im0.load()
            im = ImageOps.exif_transpose(im0)
            im.info = dict(im0.info)
        im, icc = to_srgb(im)
        outs = [(s, *encode(im, edge, budget, icc), budget) for s, edge, budget in SIZES]
        size_line = ' · '.join(f'{s or "1600"} {sz[0]}×{sz[1]} {len(d) // 1024}K q{q}' for s, d, sz, q, _ in outs)
        flags = [f'{s or "1600"} over budget' for s, d, _, _, b in outs if len(d) > b]
        over += bool(flags)
        print(f'  {pid}: from {src.relative_to(ROOT)} {"(" + "; ".join(flags) + ") " if flags else ""}→ {size_line}')
        before += current
        after += sum(len(d) for _, d, _, _, _ in outs)
        n += 1
        if dry:
            continue
        for s, _, _ in SIZES:
            f = PLATES_IMG / f'{pid}{s}.jpg'
            if f.exists():
                move_aside(f, stamp)
        for s, data, _, _, _ in outs:
            (PLATES_IMG / f'{pid}{s}.jpg').write_bytes(data)
        w, h = outs[0][2]
        try:
            if set_size(json_path, w, h):
                print(f'    {json_path.name}: image is now {w}×{h}')
        except ValueError as e:
            print(f'    {json_path.name}: could not set the size ({e})')
    verb = 'would re-encode' if dry else 're-encoded'
    print(f'{verb} {n} plate(s), {skipped} already done, {over} with a file over budget; '
          f'plate files {before / 1048576:.1f} MB → {after / 1048576:.1f} MB')
    return 1 if over else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
