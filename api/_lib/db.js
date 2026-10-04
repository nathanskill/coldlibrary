// Neon Postgres. The connection string is injected by the Vercel integration (DATABASE_URL).
import { neon } from '@neondatabase/serverless';

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
export async function rateLimit(sql, key, limit) {
  const rows = await sql`insert into rate (key, bucket, hits)
    values (${key}, date_trunc('hour', now()) + floor(extract(minute from now()) / 10) * interval '10 minutes', 1)
    on conflict (key, bucket) do update set hits = rate.hits + 1
    returning hits`;
  return rows[0].hits <= limit;
}
