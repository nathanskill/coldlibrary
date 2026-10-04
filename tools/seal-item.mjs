// Lock the recognised layer of an exhibit or plaque.
//   node tools/seal-item.mjs catalog/items-src/E-000001.json
// Writes catalog/items/<id>-<slug>.json (no answers, no plaintext) and records the lamp token hash
// in api/_lib/lamp-hashes.json. The key is PBKDF2-SHA256 over the normalised answers; the layer is AES-256-GCM.
// The same scheme runs in the browser (site.js), so visitors unlock locally and nothing is sent to us.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const ITER = 210000;
export const norm = (s) => String(s).normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
const b64 = (u8) => Buffer.from(u8).toString('base64');

export async function lock(answers, payload) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(answers.map(norm).join('␞')), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(JSON.stringify(payload))));
  return { kdf: { alg: 'PBKDF2-SHA256', salt: b64(salt), iter: ITER }, locked: { alg: 'AES-256-GCM', iv: b64(iv), ct: b64(ct) } };
}

const hex = (u8) => Buffer.from(u8).toString('hex');
async function sha256hex(s) { return hex(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))); }

if (process.argv[2]) {
  const src = JSON.parse(readFileSync(process.argv[2], 'utf8'));
  const answers = src.warden.questions.map((q) => q.answer);
  if (answers.some((a) => !norm(a))) throw new Error('every question needs an answer that survives normalisation');
  const lampToken = hex(crypto.getRandomValues(new Uint8Array(16)));
  const badgeCode = src.locked.badge ? `${src.id}-${hex(crypto.getRandomValues(new Uint8Array(3))).toUpperCase()}` : null;
  const payload = { ...src.locked, badge_code: badgeCode, lamp_token: lampToken };
  const { kdf, locked } = await lock(answers, payload);
  const out = { ...src, warden: { ...src.warden, kdf, questions: src.warden.questions.map(({ answer, ...q }) => q) }, locked };
  const file = join(root, 'catalog/items', `${src.id}-${src.slug}.json`);
  writeFileSync(file, JSON.stringify(out, null, 2) + '\n');
  const hp = join(root, 'api/_lib/lamp-hashes.json');
  const hashes = existsSync(hp) ? JSON.parse(readFileSync(hp, 'utf8')) : {};
  hashes[src.id] = { hash: await sha256hex(lampToken), notes_public: src.notes_public !== false };
  writeFileSync(hp, JSON.stringify(hashes, null, 2) + '\n');
  console.log('sealed', file);
}
