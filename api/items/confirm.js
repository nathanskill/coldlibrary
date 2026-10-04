// POST /api/items/confirm { id, email, code } → marks an application as verified and waiting for a librarian.
import { ensureSchema } from '../_lib/db.js';
import { send, readJson, normEmail, lang, L, codeHash, sameHash } from '../_lib/util.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { message: 'POST only' });
  const body = await readJson(req);
  const lg = lang(body.locale);
  let sql;
  try { sql = await ensureSchema(); } catch { sql = null; }
  if (!sql) return send(res, 503, { message: L(lg, 'The front desk is closed for maintenance.', '前台正在维护。') });
  const email = normEmail(body.email);
  const code = String(body.code || '').replace(/\D/g, '');
  const rows = await sql`select id, email_norm, code_hash, attempts, status, created_at from submissions where id = ${String(body.id || '')}`;
  const s = rows[0];
  if (!s || s.email_norm !== email || s.status !== 'unverified' || Date.now() - new Date(s.created_at).getTime() > 15 * 60 * 1000) return send(res, 400, { message: L(lg, 'This code has expired. Please send the form again.', '验证码已过期，请重新提交。') });
  if (s.attempts >= 5) return send(res, 429, { message: L(lg, 'Too many tries. Please send the form again.', '尝试次数太多，请重新提交。') });
  if (!sameHash(codeHash(code, email), s.code_hash)) {
    await sql`update submissions set attempts = attempts + 1 where id = ${s.id}`;
    return send(res, 400, { message: L(lg, 'That code did not match.', '验证码不对。') });
  }
  await sql`update submissions set status = 'pending', code_hash = null, verified_at = now() where id = ${s.id}`;
  return send(res, 200, { ok: true });
}
