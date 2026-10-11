// Chinese serif ("Cold Serif SC" = Noto Serif SC, SIL OFL 1.1), sliced offline by tools/cjk-font.py.
// fontHead(key, glyphs, lang) returns the <link>s a page needs; writeManifest() records which characters each key sets in serif.
// Interim implementation: one global set of frequency slices (/assets/cjk.css). To be replaced by per-key subsets (spec §3.6).
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

export function fontHead(key, glyphs) {
  const any = glyphs && (glyphs.base || glyphs.hant || glyphs.hans || glyphs.w600);
  return any ? '<link rel="stylesheet" href="/assets/cjk.css">\n' : '';
}

// The CSS that declares the faces for one key (used by scripts that reveal text later, e.g. today's reading).
export function fontCssHref() { return '/assets/cjk.css'; }

export function writeManifest(manifest, root) {
  const sorted = Object.fromEntries(Object.keys(manifest).sort().map((k) => [k, Object.fromEntries(Object.entries(manifest[k]).map(([b, s]) => [b, [...s].sort().join('')]))]));
  writeFileSync(join(root, 'site/cjk-manifest.json'), JSON.stringify(sorted, null, 0).replace(/},"/g, '},\n"') + '\n');
}
