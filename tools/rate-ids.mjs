#!/usr/bin/env node
// Writes api/_lib/rate-ids.json: the entries readers may rate and the people one may light a lamp for.
// Run after adding works, books or albums: node tools/rate-ids.mjs
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStacks } from '../site/src/stacks.mjs';
import { loadCatalog, rateIds } from '../site/src/catalog.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const open = loadStacks(root);
const ids = rateIds(loadCatalog(root, open), open);
writeFileSync(join(root, 'api/_lib/rate-ids.json'), JSON.stringify(ids) + '\n');
console.log(`rate-ids: ${ids.rate.length} rateable entries, ${ids.people.length} people`);
