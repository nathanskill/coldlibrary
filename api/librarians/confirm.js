// POST /api/librarians/confirm  { email, code }
// join  → assigns a unique, non-sequential number (or returns the existing one)
// leave → retires the number and forgets the email
import { ensureSchema, rateLimit } from '../_lib/db.js';
import { send, readJson, normEmail, L, codeHash, sameHash, clientKey, randomNumber, mail, welcomeMail } from '../_lib/util.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { message: 'POST only' });
  const body = await readJson(req);
  let sql;
  try { sql = await ensureSchema(); } catch { sql = null; }
  if (!sql) return send(res, 503, { message: 'The register is closed for maintenance.' });

  const email = normEmail(body.email);
  const code = String(body.code || '').replace(/\D/g, '');
  if (!email || code.length !== 6) return send(res, 400, { message: 'Please enter the six-digit code.' });
  if (!(await rateLimit(sql, 'cf:' + clientKey(req), 20))) return send(res, 429, { message: 'Too many attempts. Please wait ten minutes.' });

  const rows = await sql`select * from pending where email_norm = ${email}`;
  const p = rows[0];
  const lg = p?.locale === 'zh' ? 'zh' : 'en';
  if (!p || new Date(p.expires_at) < new Date()) return send(res, 400, { message: L(lg, 'That code has expired. Please ask for a new one.', '验证码已过期，请重新获取。') });
  if (p.attempts >= 5) {
    await sql`delete from pending where email_norm = ${email}`;
    return send(res, 400, { message: L(lg, 'Too many wrong codes. Please ask for a new one.', '错误次数太多，请重新获取验证码。') });
  }
  if (!sameHash(codeHash(code, email), p.code_hash)) {
    await sql`update pending set attempts = attempts + 1 where email_norm = ${email}`;
    return send(res, 400, { message: L(lg, 'That code did not match.', '验证码不对。') });
  }
  await sql`delete from pending where email_norm = ${email}`;

  if (p.purpose === 'leave') {
    await sql`update librarians set status = 'retired', email_norm = null, pen_name = '—', listed = false, retired_at = now()
              where email_norm = ${email} and uid <> 1`;
    return send(res, 200, { ok: true, left: true });
  }

  const existing = await sql`select uid, pen_name, created_at from librarians where email_norm = ${email} and status = 'active'`;
  if (existing[0]) {
    const e = existing[0];
    return send(res, 200, { uid: e.uid, penName: e.pen_name, since: new Date(e.created_at).toISOString().slice(0, 10), returning: true });
  }

  for (let i = 0; i < 25; i++) {
    const n = randomNumber();
    const ins = await sql`insert into librarians (uid, email_norm, pen_name, locale, listed)
      values (${n}, ${email}, ${p.pen_name}, ${lg}, ${p.listed}) on conflict do nothing returning uid, created_at`;
    if (ins[0]) {
      const m = welcomeMail(lg, n, p.pen_name);
      mail({ to: email, subject: m.subject, text: m.text }).catch(() => {});
      return send(res, 200, { uid: n, penName: p.pen_name, since: new Date(ins[0].created_at).toISOString().slice(0, 10) });
    }
    const raced = await sql`select uid, pen_name, created_at from librarians where email_norm = ${email}`;
    if (raced[0]) return send(res, 200, { uid: raced[0].uid, penName: raced[0].pen_name, since: new Date(raced[0].created_at).toISOString().slice(0, 10) });
  }
  return send(res, 500, { message: L(lg, 'No number could be assigned. Please try again.', '暂时分配不到编号，请再试一次。') });
}
