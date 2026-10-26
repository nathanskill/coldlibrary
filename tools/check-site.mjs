// Read-only checks of a completed static build. No browser or network required.
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

const root = resolve(process.argv[2] || 'site/dist');
const pages = new Map();
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
function walk(dir) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, e.name);
    if (e.isDirectory()) walk(path);
    else if (e.name.endsWith('.html')) {
      const html = readFileSync(path, 'utf8');
      pages.set(path, { html, ids: new Set([...html.matchAll(/\bid="([^"]*)"/g)].map((m) => decode(m[1]))) });
    }
  }
}
walk(root);
const redirects = JSON.parse(readFileSync('vercel.json', 'utf8')).redirects || [];
let references = 0;
const failures = [];
for (const [path, page] of pages) {
  const local = '/' + relative(root, path).replace(/index\.html$/, '').replace(/\.html$/, '');
  for (const m of page.html.matchAll(/\b(?:href|src)="([^"]*)"/g)) {
    const value = decode(m[1]);
    if (!value || /^(?:mailto:|tel:|data:|javascript:)/i.test(value)) continue;
    const url = new URL(value, 'https://coldlibrary.com' + local);
    if (url.origin !== 'https://coldlibrary.com') continue;
    references++;
    const plain = join(root, decodeURIComponent(url.pathname));
    const target = [plain, plain + '.html', join(plain, 'index.html')].find((f) => pages.has(f) || (existsSync(f) && statSync(f).isFile()));
    const redirected = redirects.some((r) => r.source === url.pathname);
    if (!target && !redirected) failures.push(`${local}: missing ${url.pathname}`);
    if (target && url.hash && pages.has(target) && !pages.get(target).ids.has(decodeURIComponent(url.hash.slice(1)))) failures.push(`${local}: missing anchor ${url.pathname}${url.hash}`);
  }
}
for (const problem of failures.slice(0, 30)) console.error(problem);
assert.equal(failures.length, 0, 'broken internal references');
console.log(`${pages.size} HTML files, ${references} internal references: all targets and anchors resolve`);
