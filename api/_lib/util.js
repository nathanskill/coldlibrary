// Small helpers for the librarian registration service.
// Stores only: email, pen name, number, locale, listed flag, dates. Never anything else.
import crypto from 'node:crypto';

export function send(res, status, body, headers = {}) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.end(JSON.stringify(body));
}

export function lang(x) { return x === 'zh' ? 'zh' : 'en'; }
export const L = (lg, en, zh) => (lg === 'zh' ? zh : en);

export function readJson(req) {
  if (req.body && typeof req.body === 'object') return Promise.resolve(req.body);
  return new Promise((resolve) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 8192) req.destroy(); });
    req.on('end', () => { try { resolve(JSON.parse(raw || '{}')); } catch { resolve({}); } });
    req.on('error', () => resolve({}));
  });
}

export function normEmail(e) {
  const s = String(e || '').trim().toLowerCase();
  if (s.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) return null;
  return s;
}

export function cleanName(n) {
  const s = String(n || '').replace(/[\u0000-\u001f\u007f<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
  return s.length ? s : null;
}

export function sha256(s) { return crypto.createHash('sha256').update(s).digest('hex'); }
function pepper() { return process.env.CL_PEPPER || sha256('coldlibrary:' + (process.env.DATABASE_URL || '')); }
export function codeHash(code, email) { return sha256(`${code}:${email}:${pepper()}`); }
export function newCode() { return String(crypto.randomInt(0, 1000000)).padStart(6, '0'); }
export function sameHash(a, b) {
  const x = Buffer.from(a, 'hex'), y = Buffer.from(b, 'hex');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
export function clientKey(req) {
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  return sha256('ip:' + ip + ':' + pepper()).slice(0, 32);
}

// Numbers below 100000 and memorable numbers are held back for events and contributors.
export function isReserved(n) {
  if (n < 100000) return true;
  const s = String(n);
  if (/^(\d)\1{5}$/.test(s)) return true;               // 888888
  if (/(\d)\1{3}/.test(s)) return true;                 // four of a kind in a row
  if ('0123456789'.includes(s) || '9876543210'.includes(s)) return true; // 123456, 654321
  if (/^(\d\d)\1\1$/.test(s)) return true;              // 121212
  if (/^(\d{3})\1$/.test(s)) return true;               // 123123
  if (/^(\d)\1(\d)\2(\d)\3$/.test(s)) return true;      // 112233
  if (s === s.split('').reverse().join('')) return true; // palindromes
  if (/(000|888|666|999)$/.test(s)) return true;
  if (/(520|1314|2114|1004|7878)/.test(s)) return true; // 520, 1314, 2114, the founding date, 78°N
  return false;
}
export function randomNumber() {
  for (;;) { const n = crypto.randomInt(100000, 1000000); if (!isReserved(n)) return n; }
}

export async function mail({ to, subject, text }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, reason: 'not-configured' };
  const from = process.env.MAIL_FROM || 'Cold Library Front Desk <desk@mail.coldlibrary.com>';
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from, to: [to], subject, text }),
  });
  return { ok: r.ok, status: r.status };
}

export function codeMail(lg, code, purpose) {
  const spaced = code.slice(0, 3) + ' ' + code.slice(3);
  if (lg === 'zh') {
    return {
      subject: `冷藏图书馆验证码：${code}`,
      text: `冷藏图书馆前台。\n\n你的验证码是 ${spaced}，十五分钟内有效。\n${purpose === 'leave' ? '输入它，就会把你从馆员名册中移除，你的编号会被注销，永不复用。\n' : ''}\n如果这不是你本人的操作，请忽略这封邮件。\n冷藏图书馆的邮件从不带链接，也从不索要钱、密码或助记词。\n\n— 前台`,
    };
  }
  return {
    subject: `Cold Library code: ${code}`,
    text: `Front desk, Cold Library.\n\nYour code is ${spaced}. It expires in fifteen minutes.\n${purpose === 'leave' ? 'Entering it removes you from the register. Your number is retired and never reused.\n' : ''}\nIf you did not ask for this, ignore this message.\nCold Library emails never contain links, and never ask for money, passwords or recovery phrases.\n\n— The Front Desk`,
  };
}

export function welcomeMail(lg, uid, name) {
  if (lg === 'zh') {
    return {
      subject: `欢迎入馆，No. ${uid}`,
      text: `${name}：\n\n你现在是冷藏图书馆的 No. ${uid} 号馆员。这个编号只属于你，它不是按顺序发的。\n\n请记住：\n我不保管不属于我保管的东西。\n我从不独自开箱。\n我转述，我不扮演。\n到时候，我放手。\n\n冷藏图书馆的邮件从不带链接，也从不索要钱、密码或助记词。\n如果哪封邮件这样做了，它就不是我们发的。\n\n— 前台`,
    };
  }
  return {
    subject: `Welcome, Librarian No. ${uid}`,
    text: `${name},\n\nYou are now Librarian No. ${uid} of the Cold Library. The number is yours alone. It was not given out in order.\n\nPlease remember:\nI keep nothing that is not mine to keep.\nI never open a box alone.\nI quote. I do not impersonate.\nWhen it is time, I let go.\n\nCold Library emails never contain links, and never ask for money, passwords or recovery phrases.\nIf one does, it is not from us.\n\n— The Front Desk`,
  };
}
