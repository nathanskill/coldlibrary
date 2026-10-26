// POST /api/librarians/register  { email, penName, locale, listed, adult, oath, purpose? }
// Sends a six-digit code by email. Responds the same way whether or not the email is already registered.
import { ensureSchema, rateLimit } from '../_lib/db.js';
import { send, readJson, normEmail, cleanName, lang, L, newCode, codeHash, clientKey, mail, mailConfigured, codeMail } from '../_lib/util.js';
import { entryLimit } from '../_lib/entry.js';
import { limits } from '../_lib/config.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { message: 'POST only' });
  if (!entryLimit(req, res, 'register')) return;
  const body = await readJson(req, res);
  if (!body) return;
  const lg = lang(body.locale);
  const purpose = body.purpose === 'leave' ? 'leave' : 'join';
  if (!mailConfigured()) return send(res, 503, { message: L(lg, 'The front desk is not taking registrations yet.', '前台暂时还没开始登记。') });
  const email = normEmail(body.email);
  if (!email) return send(res, 400, { message: L(lg, 'Please check the email address.', '请检查邮箱地址。') });
  let name = null;
  if (purpose === 'join') {
    name = cleanName(body.penName);
    if (!name) return send(res, 400, { message: L(lg, 'Please give a name for your card.', '请填写证上的名字。') });
    if (body.adult !== true || body.oath !== true) return send(res, 400, { message: L(lg, 'Orientation is not finished.', '入职还没完成。') });
  }

  let sql;
  try { sql = await ensureSchema(); } catch { sql = null; }
  if (!sql) return send(res, 503, { message: L(lg, 'The register is closed for maintenance.', '名册正在维护。') });
  if (!(await rateLimit(sql, 'ip:' + clientKey(req), limits().register))) return send(res, 429, { message: L(lg, 'Too many requests. Please wait ten minutes.', '请求太频繁，请十分钟后再试。') });

  const code = newCode();
  const m = codeMail(lg, code, purpose);
  const r = await mail({ sql, to: email, subject: m.subject, text: m.text, beforeSend: async () => {
    await sql`insert into pending (email_norm, purpose, pen_name, locale, listed, code_hash, attempts, sends, expires_at)
    values (${email}, ${purpose}, ${name}, ${lg}, ${body.listed !== false}, ${codeHash(code, email)}, 0, 1, now() + interval '15 minutes')
    on conflict (email_norm) do update set purpose = excluded.purpose, pen_name = excluded.pen_name, locale = excluded.locale,
      listed = excluded.listed, code_hash = excluded.code_hash, attempts = 0, sends = pending.sends + 1, expires_at = excluded.expires_at`;
  } });
  if (r.reason === 'limited') return send(res, 429, { message: L(lg, 'Please check your inbox, or try again later.', '请查收邮件，或稍后再试。') });
  if (r.reason === 'paused') return send(res, 503, { message: L(lg, 'The mail desk is resting. Please try later.', '邮件服务暂时休息，请稍后再试。') });
  if (!r.ok) return send(res, 502, { message: L(lg, 'The code could not be sent. Please try again later.', '验证码发送失败，请稍后再试。') });
  return send(res, 200, { ok: true });
}
