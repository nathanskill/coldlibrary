// Neon Postgres. The connection string is injected by the Vercel integration (DATABASE_URL).
import { neon } from '@neondatabase/serverless';
import { limits } from './config.js';

let sqlFn = null;
let ready = null;

export function db() {
  if (!process.env.DATABASE_URL) return null;
  if (!sqlFn) sqlFn = neon(process.env.DATABASE_URL);
  return sqlFn;
}

export async function ensureSchema() {
  const sql = db();
  if (!sql) return null;
  if (!ready) {
    ready = (async () => {
      await sql`create table if not exists librarians (
        uid integer primary key,
        email_norm text unique,
        pen_name text not null,
        locale text not null default 'en',
        listed boolean not null default true,
        status text not null default 'active',
        created_at timestamptz not null default now(),
        retired_at timestamptz
      )`;
      await sql`create table if not exists pending (
        email_norm text primary key,
        purpose text not null,
        pen_name text,
        locale text not null default 'en',
        listed boolean not null default true,
        code_hash text not null,
        attempts integer not null default 0,
        sends integer not null default 1,
        expires_at timestamptz not null,
        created_at timestamptz not null default now()
      )`;
      await sql`create table if not exists rate (
        key text not null,
        bucket timestamptz not null,
        hits integer not null default 0,
        primary key (key, bucket)
      )`;
      await sql`create table if not exists lamps (
        id bigserial primary key,
        item text not null,
        note text,
        locale text not null default 'en',
        ip_hash text,
        created_at timestamptz not null default now()
      )`;
      await sql`create index if not exists lamps_item on lamps (item, created_at desc)`;
      await sql`create table if not exists submissions (
        id text primary key,
        email_norm text not null,
        kind text not null,
        whose text,
        locale text not null default 'en',
        item jsonb not null,
        status text not null default 'unverified',
        code_hash text,
        attempts integer not null default 0,
        created_at timestamptz not null default now(),
        verified_at timestamptz
      )`;
      // Readers' scores (2026-10-15): one row per entry per device; the device is a random id the browser keeps,
      // stored here only as a hash. Tribute lamps: one per person per device per day. Counted, never named.
      await sql`create table if not exists ratings (
        item text not null,
        device text not null,
        stars smallint not null check (stars between 1 and 5),
        ip_hash text,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now(),
        primary key (item, device)
      )`;
      await sql`create index if not exists ratings_item on ratings (item)`;
      await sql`create table if not exists tributes (
        person text not null,
        device text not null,
        day date not null default current_date,
        ip_hash text,
        created_at timestamptz not null default now(),
        primary key (person, device, day)
      )`;
      await sql`create index if not exists tributes_person on tributes (person)`;
      // Shared mail budget (2026-10-26): a hash of the recipient and the time, nothing else. Also in migrations/.
      await sql`create table if not exists mail_dispatches (
        recipient_hash text not null,
        reserved_at timestamptz not null default clock_timestamp()
      )`;
      await sql`create index if not exists mail_dispatches_time on mail_dispatches (reserved_at)`;
      await sql`create index if not exists mail_dispatches_recipient_time on mail_dispatches (recipient_hash, reserved_at)`;
      await sql`delete from submissions where status = 'unverified' and created_at < now() - interval '2 days'`;
      await sql`insert into librarians (uid, email_norm, pen_name, locale, listed, created_at)
                values (1, null, 'Founding Librarian', 'en', true, '2026-10-04T00:00:00Z')
                on conflict (uid) do nothing`;
      await sql`delete from pending where expires_at < now() - interval '1 day'`;
      await sql`delete from rate where bucket < now() - interval '1 day'`;
      return sql;
    })().catch((e) => { ready = null; throw e; });
  }
  return ready;
}

// Allows `limit` hits per key per 10-minute bucket.
const blocked = new Map();
export async function rateLimit(sql, key, limit) {
  const now = Date.now();
  if ((blocked.get(key) || 0) > now) return false;
  const rows = await sql`insert into rate (key, bucket, hits)
    values (${key}, date_trunc('hour', now()) + floor(extract(minute from now()) / 10) * interval '10 minutes', 1)
    on conflict (key, bucket) do update set hits = rate.hits + 1
    where rate.hits < ${limit}
    returning hits, extract(epoch from (bucket + interval '10 minutes')) * 1000 as until`;
  if (!rows.length || rows[0].hits >= limit) {
    if (blocked.size >= limits().cacheKeys) blocked.delete(blocked.keys().next().value);
    // A denial without RETURNING is cached briefly, never beyond the local boundary.
    const until = rows[0] ? Number(rows[0].until) : Math.min(now + 1000, (Math.floor(now / 600000) + 1) * 600000);
    blocked.set(key, Math.max(blocked.get(key) || 0, until));
  }
  return rows.length > 0;
}

export async function reserveMailBudget(sql, recipientHash) {
  const cfg = limits();
  // One transaction, one global lock, then fresh READ COMMITTED snapshots.
  // Never combine the lock and COUNT in one statement (its snapshot can be stale).
  const [, , rows] = await sql.transaction([
    sql`select pg_advisory_xact_lock(20261026, 1)`,
    sql`delete from mail_dispatches where reserved_at <= clock_timestamp() - interval '24 hours'`,
    sql`insert into mail_dispatches (recipient_hash)
      select ${recipientHash}
      where (select count(*) from mail_dispatches) < ${cfg.mailDay}
        and (select count(*) from mail_dispatches where recipient_hash = ${recipientHash}) < ${cfg.mailEmailDay}
        and (select count(*) from mail_dispatches where recipient_hash = ${recipientHash}
          and reserved_at > clock_timestamp() - interval '10 minutes') < ${cfg.mailEmailBurst}
      returning recipient_hash`,
  ], { isolationLevel: 'ReadCommitted' });
  return rows.length === 1;
}

export async function saveRating(sql, id, device, stars, ip) {
  const [, rows] = await sql.transaction([
    sql`select pg_advisory_xact_lock(hashtextextended(${`rating:${id}:${ip}`}, 0))`,
    sql`insert into ratings (item, device, stars, ip_hash)
      select ${id}, ${device}, ${stars}, ${ip}
      where exists (select 1 from ratings where item = ${id} and device = ${device})
        or (select count(*) from ratings where item = ${id} and ip_hash = ${ip}) < ${limits().devices}
      on conflict (item, device) do update set stars = excluded.stars, updated_at = now()
      returning device`,
  ], { isolationLevel: 'ReadCommitted' });
  return rows.length === 1;
}
