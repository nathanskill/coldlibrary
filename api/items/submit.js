// POST /api/items/submit { email, locale, kind, whose, item, adult, consent }
// The recognised layer arrives already locked by the applicant's browser; we never see answers or plaintext.
import { randomBytes } from 'node:crypto';
import { ensureSchema, rateLimit } from '../_lib/db.js';
import { send, readJson, normEmail, lang, L, newCode, codeHash, clientKey, mail, mailConfigured, codeMail } from '../_lib/util.js';

const clip = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n);
const b64 = /^[A-Za-z0-9+/=]+$/;

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { message: 'POST only' });
  const body = await readJson(req);
  const lg = lang(body.locale);
  if (!mailConfigured()) return send(res, 503, { message: L(lg, 'The front desk is not taking applications yet.', '前台暂时还不收申请。') });
  let sql;
  try { sql = await ensureSchema(); } catch { sql = null; }
  if (!sql) return send(res, 503, { message: L(lg, 'The front desk is closed for maintenance.', '前台正在维护。') });

  const email = normEmail(body.email);
  if (!email) return send(res, 400, { message: L(lg, 'Please check the email address.', '请检查邮箱地址。') });
  if (body.adult !== true || body.consent !== true) return send(res, 400, { message: L(lg, 'Please confirm the consent box.', '请勾选同意声明。') });
  const kind = body.kind === 'plaque' ? 'plaque' : 'exhibit';
  const it = body.item || {};
  const qs = Array.isArray(it.questions) ? it.questions.map((q) => clip(q, 120)).filter(Boolean).slice(0, 3) : [];
  const ok = clip(it.title, 60) && clip(it.subtitle, 120) && clip(it.story, 2000) && qs.length >= 1
    && it.kdf && b64.test(it.kdf.salt || '') && Number(it.kdf.iter) >= 100000
    && it.locked && b64.test(it.locked.iv || '') && b64.test(it.locked.ct || '') && String(it.locked.ct).length < 20000
    && /^[0-9a-f]{64}$/.test(it.lamp_hash || '');
  if (!ok) return send(res, 400, { message: L(lg, 'Some fields are missing or too long.', '有些内容没填，或者太长了。') });

  if (!(await rateLimit(sql, 'sub-ip:' + clientKey(req), 5))) return send(res, 429, { message: L(lg, 'Too many applications. Please wait ten minutes.', '提交太频繁，请十分钟后再试。') });
  if (!(await rateLimit(sql, 'sub-em:' + email, 3))) return send(res, 429, { message: L(lg, 'A code was sent recently. Please check your inbox.', '刚刚已经发过验证码，请查收邮件。') });

  const item = {
    title: clip(it.title, 60), subtitle: clip(it.subtitle, 120), story: clip(it.story, 2000),
    links: (Array.isArray(it.links) ? it.links : []).map((u) => clip(u, 200)).filter((u) => /^https:\/\/[^\s<>"]+$/.test(u)).slice(0, 6),
    questions: qs, kdf: { alg: 'PBKDF2-SHA256', salt: it.kdf.salt, iter: Number(it.kdf.iter) },
    locked: { alg: 'AES-256-GCM', iv: it.locked.iv, ct: it.locked.ct }, lamp_hash: it.lamp_hash, notes_public: true,
  };
  const id = 'S-' + randomBytes(6).toString('hex');
  const code = newCode();
  await sql`insert into submissions (id, email_norm, kind, whose, locale, item, code_hash)
    values (${id}, ${email}, ${kind}, ${kind === 'plaque' ? (body.whose === 'other' ? 'other' : 'self') : null}, ${lg}, ${JSON.stringify(item)}::jsonb, ${codeHash(code, email)})`;
  const m = codeMail(lg, code, 'submit');
  const r = await mail({ to: email, subject: m.subject, text: m.text });
  if (!r.ok) return send(res, 502, { message: L(lg, 'The code could not be sent. Please try again later.', '验证码发送失败，请稍后再试。') });
  return send(res, 200, { ok: true, id });
}
