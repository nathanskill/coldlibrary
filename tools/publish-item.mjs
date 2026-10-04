// Hang an approved application on the wall.
//   DATABASE_URL=... node tools/publish-item.mjs list
//   DATABASE_URL=... node tools/publish-item.mjs publish S-xxxxxxxxxxxx [image]
// Writes catalog/items/<E|M>-NNNNNN-<slug>.json, records the lamp hash, and marks the application published.
// Review the public layer first: it must be the applicant's to share, and harm nobody. The locked layer cannot be read.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { neon } from '@neondatabase/serverless';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sql = neon(process.env.DATABASE_URL);
const [cmd, id, image] = process.argv.slice(2);

if (cmd === 'list') {
  const rows = await sql`select id, kind, whose, locale, item->>'title' as title, item->>'subtitle' as subtitle, created_at from submissions where status = 'pending' order by created_at`;
  console.table(rows);
} else if (cmd === 'publish' && id) {
  const [s] = await sql`select * from submissions where id = ${id} and status = 'pending'`;
  if (!s) throw new Error('no pending application with that id');
  const prefix = s.kind === 'plaque' ? 'M' : 'E';
  const n = readdirSync(join(root, 'catalog/items')).filter((f) => f.startsWith(prefix + '-')).length + 1;
  const newId = `${prefix}-${String(n).padStart(6, '0')}`;
  const slug = (s.item.title.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || newId.toLowerCase()).slice(0, 40);
  const both = (v) => ({ en: v, zh: v });
  const out = {
    id: newId, slug, kind: s.kind, example: false, image: image || (s.kind === 'plaque' ? 'plaque-hall' : 'exhibit-hall'),
    title: both(s.item.title), subtitle: both(s.item.subtitle),
    public: { story: both(s.item.story), facts: [], links: s.item.links.map((u) => ({ label: both(u.replace(/^https:\/\//, '')), url: u })) },
    warden: { name: both(s.locale === 'zh' ? '守馆人' : 'The Warden'), greeting: both(s.locale === 'zh' ? '你好。回答下面的问题，就能看到留给你的东西。' : 'Hello. Answer the questions below to see what was left for you.'), questions: s.item.questions.map((q) => ({ q: both(q) })), kdf: s.item.kdf },
    locked: s.item.locked,
  };
  writeFileSync(join(root, 'catalog/items', `${newId}-${slug}.json`), JSON.stringify(out, null, 2) + '\n');
  const hp = join(root, 'api/_lib/lamp-hashes.json');
  const hashes = JSON.parse(readFileSync(hp, 'utf8'));
  hashes[newId] = { hash: s.item.lamp_hash, notes_public: s.item.notes_public !== false };
  writeFileSync(hp, JSON.stringify(hashes, null, 2) + '\n');
  await sql`update submissions set status = 'published' where id = ${id}`;
  console.log('published as', newId, '— commit and push to deploy');
} else {
  console.log('usage: publish-item.mjs list | publish <submission id> [image]');
}
