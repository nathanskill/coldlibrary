import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { harness, request, response } from './offline.mjs';
import { preparePublication } from '../tools/publish-item.mjs';
import { itemPage } from '../site/src/pages.mjs';
import { layout } from '../site/src/lib.mjs';

const ids = JSON.parse(readFileSync(new URL('../api/_lib/rate-ids.json', import.meta.url)));
const email = 'audit@example.test';
const registration = { email, penName: 'Offline audit', adult: true, oath: true };
const submission = { email, adult: true, consent: true, kind: 'exhibit', item: { title: 'Offline audit', subtitle: 'Test only' } };
const device = 'a'.repeat(32);
const invalid = [null, true, 42, [], {}, { toString: null }];

for (const [path, body, fields] of [
  ['librarians/register', registration, ['email', 'penName']],
  ['librarians/confirm', { email, code: '123456' }, ['email', 'code']],
  ['items/submit', submission, ['email']],
  ['items/confirm', { email, code: '123456', id: 'S-000000000001' }, ['email', 'code', 'id']],
  ['ratings', { id: ids.rate[0], stars: 4, device }, ['id', 'device']],
  ['tributes', { key: ids.people[0], device }, ['key', 'device']],
  ['lamps', { item: 'E-000001', token: 'offline-test-only', note: 'Test only' }, ['item', 'token', 'note']],
]) {
  test(`AUD-01: ${path} rejects non-string fields before database or mail`, async () => {
    for (const field of fields) for (const value of invalid) {
      const h = await harness();
      const res = await h.call(`api/${path}.js`, { ...body, [field]: value });
      assert.equal(res.statusCode, 400, `${field}: ${JSON.stringify(value)}`);
      assert.equal(h.state.queries.length, 0, field);
      assert.equal(h.state.delivered.length, 0, field);
    }
  });
}

test('AUD-01: ratings reject coerced stars and registration rejects a non-boolean listed flag', async () => {
  for (const stars of [true, '5', [5], { toString: null }, null, 1.5, 0, 6]) {
    const h = await harness();
    assert.equal((await h.call('api/ratings.js', { id: ids.rate[0], stars, device })).statusCode, 400);
    assert.equal(h.state.queries.length, 0);
  }
  for (const listed of ['false', 0, [], null]) {
    const h = await harness();
    assert.equal((await h.call('api/librarians/register.js', { ...registration, listed })).statusCode, 400);
    assert.equal(h.state.delivered.length, 0);
  }
  const h = await harness();
  assert.equal((await h.call('api/librarians/register.js', { ...registration, listed: false })).statusCode, 200);
  assert.equal(h.state.pending.get(email).listed, false);
});

test('AUD-01: submissions reject nested type errors and ambiguous consent selectors', async () => {
  const bodies = [
    ...invalid.map((item) => ({ ...submission, item })),
    ...['title', 'subtitle', 'story'].flatMap((field) => invalid.map((value) => ({ ...submission, item: { ...submission.item, [field]: value } }))),
    ...['links', 'questions'].flatMap((field) => [false, 'text', {}, [{ toString: null }], [123]].map((value) => ({ ...submission, item: { ...submission.item, [field]: value } }))),
    { ...submission, kind: ['plaque'], whose: 'other' },
    { ...submission, kind: 'plaque', whose: ['other'] },
    { ...submission, kind: 'plaque' },
    { ...submission, kind: 'plaque', whose: 'other', third_party_consent: 'true' },
  ];
  for (const body of bodies) {
    const h = await harness();
    assert.equal((await h.call('api/items/submit.js', body)).statusCode, 400);
    assert.equal(h.state.queries.length, 0);
    assert.equal(h.state.delivered.length, 0);
  }
});

test('AUD-01: GET filters reject arrays, objects and repeated query parameters before database access', async () => {
  for (const [path, field, value] of [['ratings', 'ids', ids.rate[0]], ['tributes', 'keys', ids.people[0]], ['lamps', 'item', 'E-000001'], ['librarians/list', 'lang', 'en']]) {
    for (const bad of [[value], { toString: null }]) {
      const h = await harness(), mod = await h.load(`api/${path}.js`), req = request({}, 'GET'), res = response();
      req.query = { [field]: bad };
      await mod.default(req, res);
      assert.equal(res.statusCode, 400, path);
      assert.equal(h.state.queries.length, 0, path);
    }
    const h = await harness(), mod = await h.load(`api/${path}.js`), req = request({}, 'GET'), res = response();
    req.url = `/?${field}=${encodeURIComponent(value)}&${field}=${encodeURIComponent(value)}`;
    await mod.default(req, res);
    assert.equal(res.statusCode, 400, path);
    assert.equal(h.state.queries.length, 0, path);
  }
});

test('AUD-02: a complete but unread request still parses its buffered JSON body', async () => {
  const h = await harness(), { readJson } = await h.load('api/_lib/util.js');
  const req = request(), res = response(); delete req.body; req.complete = true;
  const parsed = readJson(req, res);
  req.emit('data', Buffer.from('{"title":"Buffered request"}')); req.emit('end');
  assert.equal((await parsed).title, 'Buffered request');
});

test('AUD-03: counts back off after failed loads and retain the last successful snapshot', async () => {
  const h = await harness(), { cachedCounts } = await h.load('api/_lib/counts.js');
  let loads = 0;
  const failure = async () => { loads++; throw new Error('offline database unavailable'); };
  for (let i = 0; i < 5; i++) await assert.rejects(cachedCounts('cold', failure));
  assert.equal(loads, 1, 'sequential failures must not query on every request');
  h.state.now += 60001;
  assert.equal((await cachedCounts('cold', async () => new Map([['item', 3]]))).get('item'), 3);
  h.state.now += 1800001;
  assert.equal((await cachedCounts('cold', failure)).get('item'), 3);
  assert.equal((await cachedCounts('cold', failure)).get('item'), 3);
  assert.equal(loads, 2);
});

test('AUD-04: an in-flight counts refresh preserves completed POST updates', async () => {
  const h = await harness(), { cachedCounts, updateCount } = await h.load('api/_lib/counts.js');
  for (const name of ['ratings', 'tributes']) {
    let resolve;
    const load = () => new Promise((done) => { resolve = done; });
    const cold = cachedCounts(name, load);
    await Promise.resolve();
    updateCount(name, 'item', 2);
    resolve(new Map([['item', 1]]));
    assert.equal((await cold).get('item'), 2, 'cold refresh must retain the write');
    h.state.now += 1800001;
    const warm = cachedCounts(name, load);
    await Promise.resolve();
    updateCount(name, 'item', 4);
    resolve(new Map([['item', 3]]));
    assert.equal((await warm).get('item'), 4, 'warm refresh must retain the write');
  }
});

test('audit: all nine public handlers reject unsupported methods without database access', async () => {
  for (const path of ['health', 'ratings', 'tributes', 'lamps', 'librarians/list', 'librarians/register', 'librarians/confirm', 'items/submit', 'items/confirm']) {
    const h = await harness();
    assert.equal((await h.call(`api/${path}.js`, {}, 'PUT')).statusCode, 405, path);
    assert.equal(h.state.queries.length, 0, path);
  }
});

async function get(h, path, query = {}) {
  const mod = await h.load(`api/${path}.js`), req = request({}, 'GET'), res = response();
  req.query = query; await mod.default(req, res); return res;
}

test('audit: public register omits unlisted and retired rows and never returns email', async () => {
  const h = await harness();
  for (const [uid, listed, status] of [[1, false, 'active'], [100001, true, 'active'], [100002, false, 'active'], [100003, true, 'retired']]) {
    h.state.librarians.set(`r${uid}@example.test`, { uid, listed, status, email_norm: `r${uid}@example.test`, pen_name: 'Offline audit', created_at: h.state.now });
  }
  const res = await get(h, 'librarians/list', { lang: 'zh' });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.librarians.map((p) => p.uid), [1, 100001]);
  assert.equal(res.body.librarians[0].penName, '创始馆员');
  assert.ok(res.body.librarians.every((p) => Object.keys(p).sort().join(',') === 'penName,since,uid'));
  assert.doesNotMatch(JSON.stringify(res.body), /@example\.test/);
});

test('audit: tribute writes are idempotent per day, rate limited and counts are cached', async () => {
  const h = await harness({ CL_TRIBUTES_PER_10_MINUTES: '2' });
  const body = { key: ids.people[0], device };
  for (let i = 0; i < 2; i++) assert.equal((await h.call('api/tributes.js', body)).body.count, 1);
  assert.equal((await h.call('api/tributes.js', body)).statusCode, 429);
  assert.equal(h.state.tributes.size, 1);
  await get(h, 'tributes', { keys: body.key }); await get(h, 'tributes', { keys: body.key });
  assert.equal(h.state.queries.filter((q) => q.startsWith('select person, count(*)')).length, 1);
  h.state.now += 86400000;
  assert.equal((await h.call('api/tributes.js', body)).body.count, 2);
});

test('audit: lamp capability and private-note flag are enforced before publishing notes', async () => {
  const token = 'offline-lamp-fixture';
  const hashes = { 'E-000001': { hash: createHash('sha256').update(token).digest('hex'), notes_public: false } };
  const h = await harness({ CL_LAMPS_PER_10_MINUTES: '1' }, { './_lib/lamp-hashes.json': hashes });
  assert.equal((await h.call('api/lamps.js', { item: 'E-000001', token: 'wrong' })).statusCode, 403);
  assert.equal(h.state.queries.length, 0);
  assert.equal((await h.call('api/lamps.js', { item: 'E-000001', token, note: 'Offline note' })).statusCode, 200);
  assert.equal((await h.call('api/lamps.js', { item: 'E-000001', token })).statusCode, 429);
  const hidden = await get(h, 'lamps', { item: 'E-000001' });
  assert.equal(hidden.body.count, 1); assert.deepEqual(hidden.body.notes, []);
  hashes['E-000001'].notes_public = true;
  assert.equal((await get(h, 'lamps', { item: 'E-000001' })).body.notes[0].text, 'Offline note');
});

test('audit: submitted text stays in SQL parameters and is escaped in both page languages', async () => {
  const h = await harness();
  const title = "'); SELECT 1; -- <img src=x onerror=alert(1)>";
  const body = { ...submission, item: { ...submission.item, title, links: ['javascript:alert(1)', 'https://example.test/'] } };
  const res = await h.call('api/items/submit.js', body);
  assert.equal(res.statusCode, 200); assert.equal(res.headers.location, undefined);
  assert.ok(h.state.queries.every((sql) => !sql.includes(title)));
  const insert = h.state.statements.find((q) => q.text.startsWith('insert into submissions'));
  const saved = JSON.parse(insert.values[5]);
  assert.equal(saved.title, title);
  assert.deepEqual(saved.links, ['https://example.test/']);
  assert.equal(h.state.submissions.get(res.body.id).status, 'unverified');
  const published = preparePublication({ ...body, item: { ...saved, story: '<script>alert(1)</script>' } }, []);
  const page = itemPage(published);
  for (const lang of ['en', 'zh']) {
    const html = layout({ lang, slug: page.slug, title, description: title, body: page.render(lang, { items: [published] }) });
    assert.doesNotMatch(html, /<script>alert\(1\)<\/script>|<img src=x/);
    assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(html, /href="https:\/\/example\.test\/"/);
  }
});
