import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(m?js)$/.test(entry.name)) files.push(path);
  }
}
for (const dir of ['api', 'tools', 'tests', 'site/src', 'site/public/assets/js']) walk(dir);
files.push('site/build.mjs', 'site/dev.mjs', 'site/public/assets/site.js');
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { encoding: 'utf8' });
  if (result.status !== 0) { console.error(result.stderr); process.exit(result.status || 1); }
}
console.log(`${files.length} JavaScript modules passed syntax checks`);
