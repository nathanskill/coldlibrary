// POST /api/items/submit { email, locale, kind, whose, item, adult, consent }
// The recognised layer arrives already locked by the applicant's browser; we never see answers or plaintext.
import { randomBytes } from 'node:crypto';
import { ensureSchema, rateLimit } from '../_lib/db.js';
import { send, readJson, normEmail, lang, L, newCode, codeHash, clientKey, mail, mailConfigured, codeMail } from '../_lib/util.js';
import { entryLimit } from '../_lib/entry.js';
import { limits } from '../_lib/config.js';
import { validWarden } from '../_lib/warden.js';

const clip = (s, n) => String(s ?? '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '').trim().slice(0, n);

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { message: 'POST only' });
  if (!entryLimit(req, res, 'submit')) return;
  const body = await readJson(req, res);
  if (!body) return;
  const lg = lang(body.locale);
  if (!mailConfigured()) return send(res, 503, { message: L(lg, 'The front desk is not taking applications yet.', '前台暂时还不收申请。') });
  const email = normEmail(body.email);
  if (!email) return send(res, 400, { message: L(lg, 'Please check the email address.', '请检查邮箱地址。') });
  if (body.adult !== true || body.consent !== true) return send(res, 400, { message: L(lg, 'Please confirm the consent box.', '请勾选同意声明。') });
  const kind = body.kind === 'plaque' ? 'plaque' : 'exhibit';
  const it = body.item || {};
  if (!clip(it.title, 60) || !clip(it.subtitle, 120)) return send(res, 400, { message: L(lg, 'A title and one line are needed.', '需要一个标题和一句话。') });
  if (kind === 'plaque' && body.whose === 'other' && body.third_party_consent !== true) return send(res, 400, { message: L(lg, 'A plaque for someone else needs their consent.', '给别人立铭牌，需要本人同意。') });
  // The warden block is all or nothing: questions, kdf, ciphertext and lamp hash, or none of them.
  const qs = Array.isArray(it.questions) ? it.questions.map((q) => clip(q, 120)).filter(Boolean).slice(0, 3) : [];
  const anyWarden = qs.length || it.kdf || it.locked || it.lamp_hash;
  const wardenOk = qs.length >= 1 && validWarden(it.kdf, it.locked) && /^[0-9a-f]{64}$/.test(it.lamp_hash || '');
  if (anyWarden && !wardenOk) return send(res, 400, { message: L(lg, 'The warden part is incomplete. Please lock it again.', '守馆人那部分不完整，请重新锁一次。') });
  if (String(it.story || '').length > 2000) return send(res, 400, { message: L(lg, 'The story is too long.', '介绍太长了。') });

  let sql;
  try { sql = await ensureSchema(); } catch { sql = null; }
  if (!sql) return send(res, 503, { message: L(lg, 'The front desk is closed for maintenance.', '前台正在维护。') });
  if (!(await rateLimit(sql, 'sub-ip:' + clientKey(req), limits().submit))) return send(res, 429, { message: L(lg, 'Too many applications. Please wait ten minutes.', '提交太频繁，请十分钟后再试。') });

  const item = {
    title: clip(it.title, 60), subtitle: clip(it.subtitle, 120), story: clip(it.story, 2000),
    links: (Array.isArray(it.links) ? it.links : []).map((u) => clip(u, 200)).filter((u) => /^https:\/\/[^\s<>"]+$/.test(u)).slice(0, 6),
    has_warden: !!wardenOk, notes_public: true,
    ...(wardenOk ? { questions: qs, kdf: { alg: 'PBKDF2-SHA256', salt: it.kdf.salt, iter: Number(it.kdf.iter) }, locked: { alg: 'AES-256-GCM', iv: it.locked.iv, ct: it.locked.ct }, lamp_hash: it.lamp_hash } : {}),
  };
  const id = 'S-' + randomBytes(6).toString('hex');
  const code = newCode();
  const m = codeMail(lg, code, 'submit');
  const r = await mail({ sql, to: email, subject: m.subject, text: m.text, beforeSend: async () => {
    await sql`insert into submissions (id, email_norm, kind, whose, locale, item, code_hash)
      values (${id}, ${email}, ${kind}, ${kind === 'plaque' ? (body.whose === 'other' ? 'other' : 'self') : null}, ${lg}, ${JSON.stringify(item)}::jsonb, ${codeHash(code, email)})`;
  } });
  if (r.reason === 'limited') return send(res, 429, { message: L(lg, 'Please check your inbox, or try again later.', '请查收邮件，或稍后再试。') });
  if (r.reason === 'paused') return send(res, 503, { message: L(lg, 'The mail desk is resting. Please try later.', '邮件服务暂时休息，请稍后再试。') });
  if (!r.ok) return send(res, 502, { message: L(lg, 'The code could not be sent. Please try again later.', '验证码发送失败，请稍后再试。') });
  return send(res, 200, { ok: true, id });
}
