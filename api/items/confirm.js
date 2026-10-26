// POST /api/items/confirm { id, email, code } → marks an application as verified and waiting for a librarian.
import { ensureSchema, rateLimit } from '../_lib/db.js';
import { send, readJson, normEmail, lang, L, codeHash, sameHash, clientKey } from '../_lib/util.js';
import { entryLimit } from '../_lib/entry.js';
import { limits } from '../_lib/config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { message: 'POST only' });
  if (!entryLimit(req, res, 'item-confirm')) return;
  const body = await readJson(req, res);
  if (!body) return;
  const lg = lang(body.locale);
  const email = normEmail(body.email);
  const code = String(body.code || '').replace(/\D/g, '');
  const id = String(body.id || '');
  if (!email || code.length !== 6 || !/^S-[0-9a-f]{12}$/.test(id)) return send(res, 400, { message: L(lg, 'Please enter the six-digit code.', '请输入六位验证码。') });
  let sql;
  try { sql = await ensureSchema(); } catch { sql = null; }
  if (!sql) return send(res, 503, { message: L(lg, 'The front desk is closed for maintenance.', '前台正在维护。') });
  if (!(await rateLimit(sql, 'sub-cf:' + clientKey(req), limits().confirm))) return send(res, 429, { message: L(lg, 'Too many attempts. Please wait ten minutes.', '尝试太频繁，请十分钟后再试。') });
  const rows = await sql`update submissions set attempts = attempts + 1
    where id = ${id} and email_norm = ${email} and status = 'unverified'
      and attempts < 5 and created_at > now() - interval '15 minutes'
    returning id, code_hash`;
  const s = rows[0];
  if (!s) return send(res, 400, { message: L(lg, 'This code has expired or had too many tries. Please send the form again.', '验证码已过期或尝试次数太多，请重新提交。') });
  if (!sameHash(codeHash(code, email), s.code_hash)) {
    return send(res, 400, { message: L(lg, 'That code did not match.', '验证码不对。') });
  }
  const consumed = await sql`update submissions set status = 'pending', code_hash = null, verified_at = now()
    where id = ${s.id} and email_norm = ${email} and status = 'unverified' and code_hash = ${s.code_hash}
      and created_at > now() - interval '15 minutes' returning id`;
  if (!consumed.length) return send(res, 400, { message: L(lg, 'This code has already been used or expired.', '验证码已使用或已过期。') });
  return send(res, 200, { ok: true });
}
