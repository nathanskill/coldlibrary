// The harness never inherits process.env and never connects to a database or mail
// service. SQL below is a deliberately small model, not a PostgreSQL integration
// test. It rejects unknown statements and checks the concurrency-critical clauses.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { EventEmitter } from 'node:events';

export function response() {
  return { statusCode: 200, headers: {}, body: null,
    setHeader(k, v) { this.headers[k] = v; },
    end(s) { assert.equal(this.body, null, 'response sent twice'); this.body = JSON.parse(s); },
  };
}

export function request(body = {}, method = 'POST', address = 'offline-source') {
  return Object.assign(new EventEmitter(), { method, body, headers: { 'x-forwarded-for': address }, query: {}, url: '/' });
}

export async function harness(settings = {}) {
  const state = { now: Date.UTC(2026, 9, 26, 12), dispatches: [], delivered: [], pending: new Map(), submissions: new Map(),
    librarians: new Map(), ratings: new Map(), rates: new Map(), queries: [], writes: 0, claims: 0, retirements: 0,
    failMail: false, failDB: false, onConsume: null };
  const env = { DATABASE_URL: 'offline-only', RESEND_API_KEY: 'offline-placeholder', ...settings };
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [state.now])); }
    static now() { return state.now; }
  }
  function execute(q, transaction = false) {
    const { text: s, values: v } = q;
    state.queries.push(s);
    if (state.failDB) throw new Error('offline database unavailable');
    if (/^create (table|index) if not exists/.test(s) || /^delete from (pending|rate|submissions) where (expires_at|bucket|status)/.test(s)) return [];
    if (s.startsWith('select pg_advisory_xact_lock')) { assert.ok(transaction); return []; }
    if (s === 'select 1') return [{ '?column?': 1 }];
    if (s.startsWith('delete from mail_dispatches')) {
      assert.ok(transaction);
      assert.match(s, /reserved_at <= clock_timestamp\(\) - interval '24 hours'/);
      state.dispatches = state.dispatches.filter((x) => x.at > state.now - 86400000);
      return [];
    }
    if (s.startsWith('insert into mail_dispatches')) {
      assert.ok(transaction);
      assert.match(s, /select count\(\*\) from mail_dispatches\) < \?/);
      assert.match(s, /recipient_hash = \?\) < \?/);
      assert.match(s, /interval '10 minutes'\) < \?/);
      const [recipient, globalMax, , emailMax, , burstMax] = v;
      const own = state.dispatches.filter((x) => x.recipient === recipient);
      if (state.dispatches.length >= globalMax || own.length >= emailMax || own.filter((x) => x.at > state.now - 600000).length >= burstMax) return [];
      state.dispatches.push({ recipient, at: state.now }); state.writes++;
      return [{ recipient_hash: recipient }];
    }
    if (s.startsWith('insert into rate')) {
      assert.match(s, /where rate.hits < \?/);
      const [key, max] = v, bucket = Math.floor(state.now / 600000), k = key + ':' + bucket;
      const hits = state.rates.get(k) || 0;
      if (hits >= max) return [];
      state.rates.set(k, hits + 1); state.writes++;
      return [{ hits: hits + 1, until: (bucket + 1) * 600000 }];
    }
    if (s.startsWith('insert into pending')) {
      const [email, purpose, pen_name, locale, listed, code_hash] = v;
      state.pending.set(email, { email_norm: email, purpose, pen_name, locale, listed, code_hash, attempts: 0,
        expires_at: state.now + 900000, code_version: String(state.now + 900000) });
      state.writes++; return [];
    }
    if (s.startsWith('insert into submissions')) {
      const [id, email_norm, kind, whose, locale, item, code_hash] = v;
      state.submissions.set(id, { id, email_norm, kind, whose, locale, item: JSON.parse(item), code_hash, attempts: 0, status: 'unverified', created_at: state.now });
      state.writes++; return [];
    }
    if (s.startsWith('update pending set attempts')) {
      assert.match(s, /attempts < 5 and expires_at > now\(\)/);
      const p = state.pending.get(v[0]);
      if (!p || p.attempts >= 5 || p.expires_at <= state.now) return [];
      p.attempts++; state.claims++; state.writes++; return [{ ...p }];
    }
    if (s.startsWith('delete from pending where email_norm')) {
      assert.match(s, /code_hash = \? and expires_at = \?::timestamptz and expires_at > now\(\) returning/);
      state.onConsume?.(); state.onConsume = null;
      const [email, hash, version] = v, p = state.pending.get(email);
      if (!p || p.code_hash !== hash || p.code_version !== version || p.expires_at <= state.now) return [];
      state.pending.delete(email); state.writes++; return [{ email_norm: email }];
    }
    if (s.startsWith('update submissions set attempts')) {
      assert.match(s, /email_norm = \? and status = 'unverified' and attempts < 5 and created_at > now\(\) - interval '15 minutes'/);
      const [id, email] = v, p = state.submissions.get(id);
      if (!p || p.email_norm !== email || p.status !== 'unverified' || p.attempts >= 5 || p.created_at <= state.now - 900000) return [];
      p.attempts++; state.claims++; state.writes++; return [{ ...p }];
    }
    if (s.startsWith("update submissions set status = 'pending'")) {
      assert.match(s, /email_norm = \? and status = 'unverified' and code_hash = \? and created_at > now\(\) - interval '15 minutes' returning id/);
      const [id, email, hash] = v, p = state.submissions.get(id);
      if (!p || p.email_norm !== email || p.code_hash !== hash || p.status !== 'unverified' || p.created_at <= state.now - 900000) return [];
      p.status = 'pending'; p.code_hash = null; state.writes++; return [{ id }];
    }
    if (s.startsWith('insert into librarians')) {
      if (!v.length) return [];
      const [uid, email, pen_name, locale, listed] = v;
      if (state.librarians.has(email) || [...state.librarians.values()].some((x) => x.uid === uid)) return [];
      const p = { uid, email_norm: email, pen_name, locale, listed, created_at: state.now, status: 'active' };
      state.librarians.set(email, p); state.writes++; return [{ ...p }];
    }
    if (s.startsWith('select uid, pen_name, created_at from librarians where email_norm')) {
      const p = state.librarians.get(v[0]); return p ? [{ ...p }] : [];
    }
    if (s.startsWith("update librarians set status = 'retired'")) {
      state.librarians.delete(v[0]); state.retirements++; state.writes++; return [];
    }
    if (s.startsWith('insert into ratings')) {
      assert.ok(transaction);
      assert.match(s, /where exists \(select 1 from ratings where item = \? and device = \?\) or \(select count\(\*\) from ratings where item = \? and ip_hash = \?\) < \?/);
      assert.doesNotMatch(s.split('do update')[1], /ip_hash =/);
      const [item, device, stars, ip, , , , , max] = v, key = item + ':' + device;
      const old = state.ratings.get(key);
      if (!old && [...state.ratings.values()].filter((x) => x.item === item && x.ip_hash === ip).length >= max) return [];
      state.ratings.set(key, { item, device, stars, ip_hash: old?.ip_hash || ip }); state.writes++;
      return [{ device }];
    }
    if (s.startsWith('select count(*)::int as n, coalesce(sum(stars)')) {
      const rows = [...state.ratings.values()].filter((x) => x.item === v[0]);
      return [{ n: rows.length, s: rows.reduce((sum, x) => sum + x.stars, 0) }];
    }
    throw new Error('Unmodelled SQL: ' + s);
  }
  function sql(strings, ...values) {
    const q = { text: strings.join('?').replace(/\s+/g, ' ').trim(), values };
    return { q, then(ok, bad) { return Promise.resolve().then(() => execute(q)).then(ok, bad); } };
  }
  let tail = Promise.resolve();
  sql.transaction = (queries, options) => {
    assert.equal(options.isolationLevel, 'ReadCommitted');
    assert.match(queries[0].q.text, /^select pg_advisory_xact_lock/);
    const next = tail.then(() => queries.map((x) => execute(x.q, true)));
    tail = next.catch(() => {}); return next;
  };
  const context = vm.createContext({ Buffer, URL, TextEncoder, TextDecoder, Date: Clock,
    process: { env }, console, fetch: async (_url, options) => {
      state.delivered.push(JSON.parse(options.body));
      if (state.failMail === 'throw') throw new Error('offline mail failure');
      return { ok: !state.failMail, status: state.failMail ? 503 : 200, json: async () => ({ ErrorCode: 0 }) };
    } });
  const modules = new Map();
  async function get(spec, parent = resolve('tests/entry.mjs')) {
    const id = spec.startsWith('.') ? resolve(dirname(parent), spec) : spec;
    if (modules.has(id)) return modules.get(id);
    let mod;
    if (id === '@neondatabase/serverless' || id.startsWith('node:')) {
      const exports = id === '@neondatabase/serverless' ? { neon: () => sql } : await import(id);
      mod = new vm.SyntheticModule(Object.keys(exports), function () {
        for (const [k, v] of Object.entries(exports)) this.setExport(k, v);
      }, { context, identifier: id });
    } else {
      mod = new vm.SourceTextModule(readFileSync(id, 'utf8'), { context, identifier: id,
        initializeImportMeta(meta) { meta.url = pathToFileURL(id).href; } });
    }
    modules.set(id, mod); return mod;
  }
  async function load(path) {
    const mod = await get(resolve(path));
    if (mod.status === 'unlinked') await mod.link((spec, parent) => get(spec, parent.identifier));
    if (mod.status === 'linked') await mod.evaluate();
    return mod.namespace;
  }
  async function call(path, body, method = 'POST', address) {
    const mod = await load(path), req = request(body, method, address), res = response();
    await mod.default(req, res); return res;
  }
  // Preload the shared graph once; callers may then invoke handlers concurrently.
  await load('api/_lib/util.js');
  return { state, env, sql, load, call };
}
