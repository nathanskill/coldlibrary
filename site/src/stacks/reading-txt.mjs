// The plain-text copy of a work (spec §5.3.10): /open-stacks/<slug>.txt (English header) and
// /zh/open-stacks/<slug>.txt (Chinese header). UTF-8, LF line ends.
// work.mjs uses plainText() to show the file's size in the colophon; outputs.mjs should write the same string.
import { SITE } from '../lib.mjs';

const L = (o, lang) => (o == null ? '' : typeof o === 'string' ? o : o[lang] ?? o.en ?? '');
export const today = () => new Date().toISOString().slice(0, 10);

// Translation coverage as the catalogue declares it ("Claude" = full by Claude; an object may be partial).
const cov = (w, l) => {
  const t = (w.translations || {})[l];
  if (!t || !(w.trans || {})[l]) return null;
  if (typeof t === 'string') return { full: true, by: t, label: null };
  return { full: t.coverage !== 'partial', by: t.by || 'Claude', label: t.label || null };
};

export function plainText(w, lang, { generated = today() } = {}) {
  const zh = lang === 'zh';
  const T = (en, z) => (zh ? z : en);
  const out = [];
  if (w.house) {
    const p = w[lang] || w.en;
    out.push(p.title, p.author, p.date, `${T('Cold Library · Open Stacks · House paper', '冷冻图书馆 · 开架书库 · 馆内文献')} · ${w.id} · ${SITE}/s/${w.id.slice(2)}`,
      T('Written by Librarian No. 1 for this library.', '由一号馆员为本馆撰写。'), `${T('Generated', '生成于')} ${generated}`, '', '----', '', String(p.body || '').trim(), '');
    return out.join('\n');
  }
  const title = w.translator ? (w.title[String(w.lang).slice(0, 2)] || w.title.en) : w.title.orig;
  const page = w.title[lang] || w.title.en;
  out.push(title + (page && page !== title ? ` / ${page}` : ''));
  const a = w.author || {};
  const aName = a[lang] || a.en || a.orig || '';
  out.push([aName + (a.orig && a.orig !== aName ? ` (${a.orig})` : ''), a.dates].filter(Boolean).join(', '));
  if (w.translator) out.push(T(`Translated by ${w.translator.name}${w.translator.year ? ', ' + w.translator.year : ''}`, `${w.translator.name} 译${w.translator.year ? '，' + w.translator.year + ' 年' : ''}`));
  out.push(L(w.year_display, lang) || String(w.year));
  out.push(`${T('Cold Library · Open Stacks', '冷冻图书馆 · 开架书库')} · ${w.id} · ${SITE}/s/${w.id.slice(2)}`);
  const r = w.rights || {};
  out.push(`${T('Rights: ', '权利：')}${L(r.basis, lang)}${r.license ? ` (${r.license})` : ''} ${T('Guidance, not legal advice.', '仅供参考，不是法律意见。')}`.trim());
  const s = w.source || {};
  out.push(`${T('Source: ', '来源：')}${[s.name, s.url, s.retrieved ? T('retrieved ', '取得于 ') + s.retrieved : ''].filter(Boolean).join(', ')}`);
  const tr = r.verbatim_only ? null : cov(w, lang);
  if (tr) out.push(`${T('Translation: ', '译文：')}${tr.by === 'Claude' ? T('Claude (an AI), 2026, CC0 1.0', 'Claude（AI），2026，CC0 1.0') : tr.by}${tr.full ? '' : T(' · partial', ' · 节译') + (L(tr.label, lang) ? ': ' + L(tr.label, lang) : '')}`);
  out.push(`${T('Generated', '生成于')} ${generated}`, '', '----', '', String(w.text || '').trim(), '');
  if (w.textHans) out.push('----', '', String(w.textHans).trim(), '');
  if (r.verbatim_only) { if (r.notice) out.push('----', '', r.notice, ''); return out.join('\n'); }
  if (tr) {
    out.push('----', '', tr.full ? T('Translation by Claude (an AI), CC0 1.0', 'Claude（AI）译，CC0 1.0') : T('Partial translation by Claude (an AI), CC0 1.0', 'Claude（AI）节译，CC0 1.0'), '', String(w.trans[lang]).trim(), '');
  }
  return out.join('\n');
}

export function plainSize(w, lang) {
  const bytes = Buffer.byteLength(plainText(w, lang), 'utf8');
  if (bytes < 1024) return '1 KB';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
  return (bytes / 1024 / 1024).toFixed(1) + ' MB';
}
