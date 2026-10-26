import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { harness, request, response } from './offline.mjs';
import { validWarden } from '../api/_lib/warden.js';
import { preparePublication } from '../tools/publish-item.mjs';

const email = 'reader@example.test';
const registration = { email, penName: 'Offline reader', adult: true, oath: true };
const envelope = () => ({
  kdf: { alg: 'PBKDF2-SHA256', salt: Buffer.alloc(16, 1).toString('base64'), iter: 210000 },
  locked: { alg: 'AES-256-GCM', iv: Buffer.alloc(12, 2).toString('base64'), ct: Buffer.alloc(32, 3).toString('base64') },
});
const submission = () => ({ email, adult: true, consent: true, kind: 'exhibit',
  item: { title: 'Offline test', subtitle: 'A test item', story: '', links: [] } });

test('P1: both code endpoints share a rolling day and burst budget (864 requests)', async () => {
  const h = await harness();
  for (let window = 0; window < 144; window++) {
    for (let i = 0; i < 3; i++) {
      await h.call('api/librarians/register.js', registration);
      await h.call('api/items/submit.js', submission());
    }
    h.state.now += 600000;
  }
  assert.equal(h.state.delivered.length, 6);
  assert.equal(h.state.submissions.size, 2);
  // At 24h only the oldest reservations expire, not the entire day's allowance.
  assert.equal((await h.call('api/items/submit.js', submission())).statusCode, 200);
  assert.equal(h.state.delivered.length, 7);
});

test('P1: global budget is atomic across concurrent recipients', async () => {
  const h = await harness({ CL_MAIL_GLOBAL_PER_DAY: '20' });
  const { mail } = await h.load('api/_lib/util.js');
  let writes = 0;
  const results = await Promise.all(Array.from({ length: 60 }, (_, i) => mail({ sql: h.sql, to: `r${i}@example.test`, subject: 'offline', text: 'offline', beforeSend: async () => { writes++; } })));
  assert.equal(results.filter((x) => x.ok).length, 20);
  assert.equal(h.state.dispatches.length, 20);
  assert.equal(h.state.delivered.length, 20);
  assert.equal(writes, 20);
});

test('P1: budget denials preserve pending codes and do not add submissions', async () => {
  const h = await harness({ CL_MAIL_EMAIL_PER_DAY: '1' });
  assert.equal((await h.call('api/librarians/register.js', registration)).statusCode, 200);
  const original = { ...h.state.pending.get(email) };
  assert.equal((await h.call('api/librarians/register.js', registration)).statusCode, 429);
  assert.equal((await h.call('api/items/submit.js', submission())).statusCode, 429);
  assert.deepEqual(h.state.pending.get(email), original);
  assert.equal(h.state.submissions.size, 0);
});

test('P1: failed sends stay charged; pause prevents all providers and pending writes', async () => {
  for (const provider of ['resend', 'postmark']) {
    const h = await harness({ MAIL_PROVIDER: provider, POSTMARK_SERVER_TOKEN: 'offline-placeholder', CL_MAIL_EMAIL_PER_DAY: '1' });
    const { mail } = await h.load('api/_lib/util.js');
    h.state.failMail = true;
    assert.equal((await mail({ sql: h.sql, to: email, subject: 'offline', text: 'offline' })).ok, false);
    assert.equal((await mail({ sql: h.sql, to: email, subject: 'offline', text: 'offline' })).reason, 'limited');
    assert.equal(h.state.delivered.length, 1);
    const queryCount = h.state.queries.length;
    h.env.CL_MAIL_PAUSED = 'true';
    assert.equal((await mail({ sql: h.sql, to: 'other@example.test', subject: 'offline', text: 'offline', beforeSend: async () => assert.fail('paused write') })).reason, 'paused');
    assert.equal(h.state.queries.length, queryCount);
  }
});

test('P1: database failure cannot send mail', async () => {
  const h = await harness(); h.state.failDB = true;
  const { mail } = await h.load('api/_lib/util.js');
  await assert.rejects(mail({ sql: h.sql, to: email, subject: 'offline', text: 'offline' }));
  assert.equal(h.state.delivered.length, 0);
});

test('P1: welcome uses the same budget without preventing successful registration', async () => {
  for (const max of [1, 2]) {
    const h = await harness({ CL_MAIL_EMAIL_PER_DAY: String(max) });
    await h.call('api/librarians/register.js', registration);
    const { codeHash } = await h.load('api/_lib/util.js');
    h.state.pending.get(email).code_hash = codeHash('123456', email);
    const res = await h.call('api/librarians/confirm.js', { email, code: '123456' });
    assert.equal(res.statusCode, 200);
    assert.ok(res.body.uid);
    assert.equal(h.state.librarians.size, 1);
    assert.equal(h.state.delivered.length, max);
    assert.equal(h.state.dispatches.length, max);
  }
});

test('P2: health coalesces 100 probes and caches failures, without schema writes', async () => {
  const h = await harness(); await h.load('api/health.js');
  const rows = await Promise.all(Array.from({ length: 100 }, () => h.call('api/health.js', {}, 'GET')));
  assert.ok(rows.every((x) => x.body.db === true));
  assert.equal(h.state.queries.length, 1);
  assert.equal(h.state.writes, 0);
  h.state.now += 60001; h.state.failDB = true;
  assert.equal((await h.call('api/health.js', {}, 'GET')).body.db, false);
  await h.call('api/health.js', {}, 'GET');
  assert.equal(h.state.queries.length, 2);
  assert.equal((await h.call('api/health.js', {}, 'POST')).statusCode, 405);
});

test('P2: every API has a database-free ingress rejection', async () => {
  for (const path of ['health', 'ratings', 'tributes', 'lamps', 'librarians/list', 'librarians/register', 'librarians/confirm', 'items/submit', 'items/confirm']) {
    const h = await harness({ CL_ENTRY_READ_PER_MINUTE: '2', CL_ENTRY_WRITE_PER_MINUTE: '2' });
    h.state.failDB = true;
    const method = path === 'health' || path === 'librarians/list' ? 'GET' : 'POST';
    await h.call(`api/${path}.js`, {}, method);
    await h.call(`api/${path}.js`, {}, method);
    const queries = h.state.queries.length;
    const res = await h.call(`api/${path}.js`, {}, method);
    assert.equal(res.statusCode, 429, path);
    assert.ok(Number(res.headers['retry-after']) > 0);
    assert.equal(h.state.queries.length, queries, path);
  }
});

test('P2: shared rate counter saturates; cached 429s do not query or write', async () => {
  const h = await harness(), { rateLimit } = await h.load('api/_lib/db.js');
  const rows = await Promise.all(Array.from({ length: 12 }, () => rateLimit(h.sql, 'test', 3)));
  assert.equal(rows.filter(Boolean).length, 3);
  assert.equal(h.state.writes, 3);
  const queries = h.state.queries.length;
  for (let i = 0; i < 100; i++) assert.equal(await rateLimit(h.sql, 'test', 3), false);
  assert.equal(h.state.queries.length, queries);
  h.state.now += 600000;
  assert.equal(await rateLimit(h.sql, 'test', 3), true);
});

async function pending(h, purpose = 'leave') {
  const { codeHash } = await h.load('api/_lib/util.js');
  h.state.pending.set(email, { email_norm: email, purpose, pen_name: 'Offline', locale: 'en', listed: true,
    code_hash: codeHash('123456', email), attempts: 0, expires_at: h.state.now + 900000, code_version: String(h.state.now + 900000) });
  await h.load('api/librarians/confirm.js');
}
async function unverified(h) {
  const { codeHash } = await h.load('api/_lib/util.js');
  const id = 'S-000000000001';
  h.state.submissions.set(id, { id, email_norm: email, code_hash: codeHash('123456', email), status: 'unverified', attempts: 0, created_at: h.state.now });
  await h.load('api/items/confirm.js'); return id;
}

for (const kind of ['librarian', 'item']) {
  const path = kind === 'librarian' ? 'api/librarians/confirm.js' : 'api/items/confirm.js';
  const setup = async (h) => ({ email, id: kind === 'librarian' ? await pending(h) : await unverified(h) });
  test(`P2: ${kind} allows only five comparisons under 12 concurrent guesses`, async () => {
    const h = await harness(), body = await setup(h);
    const rows = await Promise.all(Array.from({ length: 12 }, () => h.call(path, { ...body, code: '999999' })));
    assert.ok(rows.every((x) => x.statusCode === 400));
    assert.equal(h.state.claims, 5);
  });
  test(`P2: ${kind} success is consumed once under 12 concurrent confirmations`, async () => {
    const h = await harness(), body = await setup(h);
    const rows = await Promise.all(Array.from({ length: 12 }, () => h.call(path, { ...body, code: '123456' })));
    assert.equal(rows.filter((x) => x.statusCode === 200).length, 1);
    assert.ok(h.state.claims <= 5);
    if (kind === 'librarian') assert.equal(h.state.retirements, 1);
    else assert.equal(h.state.submissions.get(body.id).code_hash, null);
  });
  test(`P2: ${kind} fifth attempt can succeed; expired and malformed requests cannot compare`, async () => {
    const h = await harness(), body = await setup(h);
    for (let i = 0; i < 4; i++) await h.call(path, { ...body, code: '999999' });
    assert.equal((await h.call(path, { ...body, code: '123456' })).statusCode, 200);
    assert.equal(h.state.claims, 5);
    const expired = await setup(h); h.state.now += 900000;
    assert.equal((await h.call(path, { ...expired, code: '123456' })).statusCode, 400);
    assert.equal((await h.call(path, { ...expired, code: 'bad' })).statusCode, 400);
    assert.equal(h.state.claims, 5);
  });
}

test('P2: a resend cannot be consumed by an earlier request, even with the same six digits', async () => {
  const h = await harness(); await pending(h);
  h.state.onConsume = () => {
    const p = h.state.pending.get(email); p.expires_at += 1; p.code_version = String(p.expires_at); p.purpose = 'join';
  };
  assert.equal((await h.call('api/librarians/confirm.js', { email, code: '123456' })).statusCode, 400);
  assert.equal(h.state.retirements, 0);
  assert.ok(h.state.pending.has(email));
});

test('P2: ten concurrent devices get five rating slots; existing devices can edit from any address', async () => {
  const h = await harness(), { saveRating } = await h.load('api/_lib/db.js');
  const result = await Promise.all(Array.from({ length: 10 }, (_, i) => saveRating(h.sql, 'test-item', `device-${i}`, 3, 'source-a')));
  assert.equal(result.filter(Boolean).length, 5);
  const first = [...h.state.ratings.values()][0];
  assert.equal(await saveRating(h.sql, 'test-item', first.device, 5, 'source-a'), true);
  for (let i = 0; i < 5; i++) assert.equal(await saveRating(h.sql, 'test-item', `other-${i}`, 3, 'source-b'), true);
  assert.equal(await saveRating(h.sql, 'test-item', first.device, 4, 'source-b'), true);
  assert.equal(h.state.ratings.size, 10);
  assert.equal(h.state.ratings.get('test-item:' + first.device).ip_hash, 'source-a');
  assert.equal(await saveRating(h.sql, 'different-item', 'new', 3, 'source-a'), true);
});

test('P2: historical ratings above quota remain editable; quota can be configured', async () => {
  const h = await harness({ CL_RATING_DEVICES_PER_ADDRESS: '10' }), { saveRating } = await h.load('api/_lib/db.js');
  for (let i = 0; i < 10; i++) assert.equal(await saveRating(h.sql, 'item', `d${i}`, 3, 'address'), true);
  h.env.CL_RATING_DEVICES_PER_ADDRESS = '5';
  assert.equal(await saveRating(h.sql, 'item', 'd9', 5, 'address'), true);
  assert.equal(await saveRating(h.sql, 'item', 'new', 5, 'address'), false);
  assert.equal(h.state.ratings.size, 10);
});

test('P2: rating handler returns 429 for overflow and updates the same device', async () => {
  const h = await harness(); await h.load('api/ratings.js');
  const id = JSON.parse(readFileSync('api/_lib/rate-ids.json', 'utf8')).rate[0];
  const rows = await Promise.all(Array.from({ length: 10 }, (_, i) => h.call('api/ratings.js', { id, stars: 3, device: i.toString(16).padStart(32, '0') })));
  assert.equal(rows.filter((x) => x.statusCode === 200).length, 5);
  assert.equal(rows.filter((x) => x.statusCode === 429).length, 5);
  const edit = await h.call('api/ratings.js', { id, stars: 5, device: '0'.repeat(32) });
  assert.equal(edit.statusCode, 200); assert.equal(edit.body.n, 5); assert.equal(edit.body.sum, 17);
});

test('P2: body limit counts UTF-8 bytes for objects, strings, buffers and streams', async () => {
  const h = await harness({ CL_BODY_MAX_BYTES: '8192' }), { readJson } = await h.load('api/_lib/util.js');
  const obj = { story: '字'.repeat(3000) }, raw = JSON.stringify(obj);
  assert.ok(raw.length < 8192 && Buffer.byteLength(raw) > 8192);
  for (const body of [obj, raw, Buffer.from(raw)]) {
    const res = response(); assert.equal(await readJson(request(body), res), null); assert.equal(res.statusCode, 413);
  }
  const req = request(), res = response(); delete req.body;
  const result = readJson(req, res);
  req.emit('data', Buffer.from(raw).subarray(0, 5000)); req.emit('data', Buffer.from(raw).subarray(5000));
  assert.equal(await result, null); assert.equal(res.statusCode, 413);
  req.emit('end'); // Oversized streams finish without destroying the response socket.
});

test('P2: JSON parser handles pre-parsed null, arrays, bad JSON, UTF-8 chunk splits and aborts', async () => {
  const h = await harness(), { readJson } = await h.load('api/_lib/util.js');
  for (const body of [null, [], '{bad']) {
    const res = response(); assert.equal(await readJson(request(body), res), null); assert.equal(res.statusCode, 400);
  }
  const req = request(), res = response(); delete req.body;
  const promise = readJson(req, res), bytes = Buffer.from('{"title":"中文"}');
  for (const byte of bytes) req.emit('data', Buffer.from([byte])); req.emit('end');
  assert.equal((await promise).title, '中文');
  const aborted = request(), out = response(); delete aborted.body;
  const p = readJson(aborted, out); aborted.emit('aborted'); assert.equal(await p, null);
  // A stream that was already drained (no body, or consumed by the host) answers at once instead of hanging.
  const drained = request(), empty = response(); delete drained.body; drained.readableEnded = true;
  assert.equal(JSON.stringify(await readJson(drained, empty)), "{}");
  // Vercel's lazy body getter throws on malformed JSON; that is a 400, not a crash.
  const lazy = request(), bad = response(); Object.defineProperty(lazy, 'body', { get() { throw new Error('Invalid JSON'); } });
  assert.equal(await readJson(lazy, bad), null); assert.equal(bad.statusCode, 400);
});

test('P2: strict warden format rejects invalid base64, sizes, algorithms and iteration values', () => {
  const good = envelope(); assert.equal(validWarden(good.kdf, good.locked), true);
  for (const n of [99999, 600001, 2147483647, Infinity, NaN, 210000.5, '210000']) assert.equal(validWarden({ ...good.kdf, iter: n }, good.locked), false);
  for (const n of [100000, 210000, 600000]) assert.equal(validWarden({ ...good.kdf, iter: n }, good.locked), true);
  for (const salt of ['=', 'AA', 'A'.repeat(1000000), Buffer.alloc(15).toString('base64'), good.kdf.salt.slice(0, -3) + 'B==']) assert.equal(validWarden({ ...good.kdf, salt }, good.locked), false);
  for (const iv of ['=', Buffer.alloc(13).toString('base64')]) assert.equal(validWarden(good.kdf, { ...good.locked, iv }), false);
  for (const ct of ['=', Buffer.alloc(16).toString('base64'), Buffer.alloc(32769).toString('base64')]) assert.equal(validWarden(good.kdf, { ...good.locked, ct }), false);
  assert.equal(validWarden({ ...good.kdf, alg: 'other' }, good.locked), false);
  assert.equal(validWarden(good.kdf, { ...good.locked, alg: 'other' }), false);
});

test('P2: malformed warden and oversized submissions never reach storage or mail', async () => {
  for (const mutation of [
    (it) => { it.kdf.salt = '='; it.locked.iv = '='; it.locked.ct = '='; },
    (it) => { it.kdf.iter = 2147483647; },
    (it) => { it.kdf.salt = 'A'.repeat(1000000); },
  ]) {
    const h = await harness(), body = submission();
    Object.assign(body.item, envelope(), { questions: ['A question'], lamp_hash: '0'.repeat(64) }); mutation(body.item);
    const res = await h.call('api/items/submit.js', body);
    assert.ok([400, 413].includes(res.statusCode));
    assert.equal(h.state.queries.length, 0); assert.equal(h.state.delivered.length, 0);
  }
});

test('P2: full-size Chinese form remains accepted and publishable', async () => {
  const h = await harness(), body = submission();
  Object.assign(body.item, envelope(), { title: '书'.repeat(60), subtitle: '文'.repeat(120), story: '事'.repeat(2000), questions: ['问'.repeat(120)], lamp_hash: '0'.repeat(64) });
  // More than enough ciphertext for the form's 4,000-character Chinese letter + pointer.
  body.item.locked.ct = Buffer.alloc(14000, 3).toString('base64');
  assert.ok(Buffer.byteLength(JSON.stringify(body)) > 8192);
  const res = await h.call('api/items/submit.js', body); assert.equal(res.statusCode, 200);
  const row = h.state.submissions.get(res.body.id);
  assert.ok(preparePublication(row, []).warden);
});

test('P2: publishing rechecks old pending envelopes before any output', () => {
  const body = submission(); Object.assign(body.item, envelope(), { has_warden: true, questions: ['Question'], lamp_hash: '0'.repeat(64) });
  assert.ok(preparePublication(body, []).warden);
  body.item.kdf.iter = 2147483647; assert.throws(() => preparePublication(body, []), /invalid warden/);
  body.item.has_warden = false; assert.throws(() => preparePublication(body, []), /invalid warden/);
});

test('P2: current published warden envelopes remain valid', () => {
  for (const name of readdirSync('catalog/items').filter((s) => /^[EM]-\d{6}-.+\.json$/.test(s))) {
    const item = JSON.parse(readFileSync('catalog/items/' + name, 'utf8'));
    if (item.warden) assert.equal(validWarden(item.warden.kdf, item.locked), true, item.id);
  }
});

test('P2: identical, truncated, normalized and non-Latin titles get distinct stable paths', () => {
  for (const titles of [['Same', 'Same'], ['École', 'ecole'], ['a'.repeat(45) + 'x', 'a'.repeat(45) + 'y'], ['中文', '日文']]) {
    const body = submission(), before = [{ id: 'E-000003', slug: 'historic-url', kind: 'exhibit' }];
    body.item.title = titles[0]; const a = preparePublication(body, before);
    body.item.title = titles[1]; const b = preparePublication(body, [...before, a]);
    assert.equal(a.id, 'E-000004'); assert.equal(b.id, 'E-000005'); assert.notEqual(a.slug, b.slug);
    assert.match(a.slug, /^e-000004(?:-|$)/); assert.equal(before[0].slug, 'historic-url');
  }
  const body = submission();
  assert.throws(() => preparePublication(body, [{ id: 'E-000000', kind: 'exhibit', slug: 'e-000001-offline-test' }]), /path already exists/);
});

test('configuration rejects unsafe limits and migration is additive', async () => {
  const h = await harness({ CL_MAIL_GLOBAL_PER_DAY: '-1', CL_BODY_MAX_BYTES: 'NaN', CL_RATING_DEVICES_PER_ADDRESS: '0' });
  const { limits } = await h.load('api/_lib/config.js');
  assert.equal(limits().mailDay, 30); assert.equal(limits().bodyBytes, 65536); assert.equal(limits().devices, 5);
  // Defaults must stay well under half of a free mail tier (Resend free: 100/day, 3,000/month).
  assert.ok(limits().mailDay <= 40 && limits().mailDay * 31 < 1500);
  assert.ok(limits().mailEmailDay <= 6 && limits().mailEmailBurst <= 3);
  h.env.CL_MAIL_GLOBAL_PER_DAY = '50000'; assert.equal(limits().mailDay, 30, 'typos cannot lift the cap past 1000');
  const sql = readFileSync('migrations/20261026_mail_budget.sql', 'utf8').replace(/--[^\n]*/g, '');
  assert.doesNotMatch(sql, /\b(drop|delete|update|truncate|alter)\b/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS mail_dispatches/);
});
