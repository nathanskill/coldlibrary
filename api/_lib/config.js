// Non-secret limits. Invalid settings fall back to a usable, bounded default.
export function limit(name, fallback, min = 1, max = 100000) {
  const n = Number(process.env[name]);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : fallback;
}

export const limits = () => ({
  bodyBytes: limit('CL_BODY_MAX_BYTES', 65536, 8192, 262144),
  entryRead: limit('CL_ENTRY_READ_PER_MINUTE', 300),
  entryWrite: limit('CL_ENTRY_WRITE_PER_MINUTE', 120),
  cacheKeys: limit('CL_LIMIT_CACHE_KEYS', 10000, 100, 100000),
  healthSeconds: limit('CL_HEALTH_CACHE_SECONDS', 60, 5, 3600),
  // Mail is the one thing here that can turn into a bill. 30 a day (900 a month at most) stays well under
  // half of a free tier (Resend: 100 a day / 3,000 a month) and is a small share of the shared Postmark plan.
  // A join is 2 mails (code + welcome), an application 1; 6 per address per day leaves room for a resend.
  mailDay: limit('CL_MAIL_GLOBAL_PER_DAY', 30, 1, 1000),
  mailEmailDay: limit('CL_MAIL_EMAIL_PER_DAY', 6, 1, 50),
  mailEmailBurst: limit('CL_MAIL_EMAIL_PER_10_MINUTES', 3, 1, 20),
  register: limit('CL_REGISTER_PER_10_MINUTES', 20),
  submit: limit('CL_SUBMIT_PER_10_MINUTES', 10),
  confirm: limit('CL_CONFIRM_PER_10_MINUTES', 60),
  ratings: limit('CL_RATINGS_PER_10_MINUTES', 60),
  devices: limit('CL_RATING_DEVICES_PER_ADDRESS', 5, 1, 100),
  tributes: limit('CL_TRIBUTES_PER_10_MINUTES', 30),
  lamps: limit('CL_LAMPS_PER_10_MINUTES', 6),
});

export function mailPaused() { return /^(1|true|yes)$/i.test(process.env.CL_MAIL_PAUSED || ''); }
