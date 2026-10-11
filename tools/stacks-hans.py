#!/usr/bin/env python3
"""Write text.zh-Hans.md next to every zh-Hant text.md in the Open Stacks (OpenCC t2s).

Usage: python3 tools/stacks-hans.py [work-folder ...]   (default: every work whose lang ends in -Hant)
Requires: pip3 install --user opencc-python-reimplemented
"""
import json, sys
from pathlib import Path
from opencc import OpenCC

root = Path(__file__).resolve().parent.parent / 'catalog' / 'stacks'
cc = OpenCC('t2s')
dirs = [Path(a) for a in sys.argv[1:]] or [p.parent for p in root.glob('*/*/work.json')]
for d in dirs:
    meta = json.loads((d / 'work.json').read_text(encoding='utf-8'))
    if not str(meta.get('lang', '')).endswith('-Hant'):
        continue
    src = (d / 'text.md').read_text(encoding='utf-8')
    (d / 'text.zh-Hans.md').write_text(cc.convert(src), encoding='utf-8')
    print('wrote', d / 'text.zh-Hans.md')
