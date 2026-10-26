// Hang an approved application on the wall.
//   DATABASE_URL=... node tools/publish-item.mjs list
//   DATABASE_URL=... node tools/publish-item.mjs publish S-xxxxxxxxxxxx [image]
// Writes catalog/items/<E|M>-NNNNNN-<slug>.json, records the lamp hash, and marks the application published.
// Review the public layer first: it must be the applicant's to share, and harm nobody. The locked layer cannot be read.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validWarden } from '../api/_lib/warden.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// Pure preparation also lets offline tests cover the same publishing path.
export function preparePublication(s, items, image, date = new Date()) {
  if (!['plaque', 'exhibit'].includes(s.kind)) throw new Error('invalid item kind');
  const it = s.item;
  const hasWarden = !!(it.has_warden || it.kdf || it.locked || it.lamp_hash || it.questions?.length);
  if (hasWarden && (!it.has_warden || !validWarden(it.kdf, it.locked) ||
      !Array.isArray(it.questions) || it.questions.length < 1 || it.questions.length > 3 ||
      !it.questions.every((q) => typeof q === 'string' && q.trim() && q.length <= 120) ||
      !/^[0-9a-f]{64}$/.test(it.lamp_hash || ''))) throw new Error('invalid warden envelope; ask the applicant to lock it again');
  const prefix = s.kind === 'plaque' ? 'M' : 'E';
  const n = Math.max(0, ...items.filter((i) => new RegExp(`^${prefix}-\\d{6}$`).test(i.id)).map((i) => Number(i.id.slice(2)))) + 1;
  if (n > 999999) throw new Error('catalogue numbers exhausted');
  const newId = `${prefix}-${String(n).padStart(6, '0')}`;
  const titleSlug = s.item.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').slice(0, 40).replace(/^-|-$/g, '');
  // Only new publications get this slug; existing public URLs stay untouched.
  const slug = newId.toLowerCase() + (titleSlug ? '-' + titleSlug : '');
  if (items.some((i) => i.id === newId || (i.kind === s.kind && i.slug === slug))) throw new Error('catalogue id or path already exists');
  const both = (v) => ({ en: v, zh: v });
  const out = {
    id: newId, slug, kind: s.kind, example: false, image: image || (s.kind === 'plaque' ? 'plaque-hall' : 'exhibit-hall'),
    title: both(s.item.title), subtitle: both(s.item.subtitle),
    public: { story: both(s.item.story), facts: [], links: s.item.links.map((u) => ({ label: both(u.replace(/^https:\/\//, '')), url: u })) },
    shelved: date.toISOString().slice(0, 10), spine: 'slate', dek: both(s.item.subtitle), consent: s.whose === 'other' ? 'given' : 'self',
    contents: s.item.has_warden ? { letters: 1 } : {},
    warden: s.item.has_warden ? { name: both(s.locale === 'zh' ? '守馆人' : 'The Warden'), greeting: both(s.locale === 'zh' ? '你好。回答下面的问题，就能看到留给你的东西。' : 'Hello. Answer the questions below to see what was left for you.'), questions: s.item.questions.map((q) => ({ q: both(q) })), kdf: s.item.kdf } : null,
    locked: s.item.has_warden ? s.item.locked : null,
  };
  return out;
}

async function main() {
  const [cmd, id, image] = process.argv.slice(2);
  if (cmd !== 'list' && !(cmd === 'publish' && id)) {
    console.log('usage: publish-item.mjs list | publish <submission id> [image]');
    return;
  }
  const { neon } = await import('@neondatabase/serverless');
  const sql = neon(process.env.DATABASE_URL);
  if (cmd === 'list') {
    const rows = await sql`select id, kind, whose, locale, item->>'title' as title, item->>'subtitle' as subtitle, created_at from submissions where status = 'pending' order by created_at`;
    console.table(rows);
    return;
  }
  const [s] = await sql`select * from submissions where id = ${id} and status = 'pending'`;
  if (!s) throw new Error('no pending application with that id');
  const dir = join(root, 'catalog/items');
  const items = readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => JSON.parse(readFileSync(join(dir, f), 'utf8')));
  const out = preparePublication(s, items, image);
  const { id: newId, slug } = out;
  const hp = join(root, 'api/_lib/lamp-hashes.json');
  const hashes = JSON.parse(readFileSync(hp, 'utf8'));
  if (hashes[newId]) throw new Error('catalogue number already has a lamp record');
  writeFileSync(join(dir, `${newId}-${slug}.json`), JSON.stringify(out, null, 2) + '\n', { flag: 'wx' });
  if (s.item.has_warden) { hashes[newId] = { hash: s.item.lamp_hash, notes_public: s.item.notes_public !== false }; writeFileSync(hp, JSON.stringify(hashes, null, 2) + '\n'); }
  await sql`update submissions set status = 'published' where id = ${id}`;
  console.log('prepared publication', newId, '— review the generated files before release');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
