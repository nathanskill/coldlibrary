// The size of a work's plain-text copy, as the colophon shows it (spec §5.3.10).
// outputs.mjs writes /open-stacks/<slug>.txt and /zh/open-stacks/<slug>.txt, so the size comes from the same function:
// fmtSize(txtSize(w, lang)). The house paper's .txt is written by outputs.mjs paperTxt(), which is not exported;
// paperText() below mirrors it line for line (tools: scratchpad check compares it with the written files) until
// outputs.mjs exports it. The old plainText()/plainSize() format is retired: plainText() now returns the real file.
import { txtFile, txtSize, fmtSize } from '../outputs.mjs';
import { SITE, href } from '../lib.mjs';

const T = (lang) => (en, zh) => (lang === 'zh' ? zh : en);
// The build date, exactly as outputs.mjs computes it (only its length affects the size).
const today = () => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(process.env.CL_BUILD_DATE || '')) return process.env.CL_BUILD_DATE;
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};
// outputs.mjs plain(): LF line ends, no trailing spaces, code fences dropped, "## " markers dropped.
function plain(src) {
  const lines = String(src || '').replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/[ \t]+$/, ''));
  const out = [];
  let fence = false;
  for (const l of lines) {
    if (/^```/.test(l)) { fence = !fence; continue; }
    const h = !fence && l.match(/^#{2,3}\s+(.+)$/);
    if (h) {
      while (out.length && out[out.length - 1] === '') out.pop();
      if (out.length) out.push('', '');
      out.push(h[1].trim());
      continue;
    }
    out.push(l);
  }
  return out.join('\n').replace(/\n{4,}/g, '\n\n\n').replace(/^\n+|\n+$/g, '');
}
// outputs.mjs paperTxt(): a house paper as plain text.
export function paperText(p, lang, date = today()) {
  const tt = T(lang);
  const s = p[lang] || p.en;
  const head = [s.title, s.author, s.date].filter(Boolean).join('\n');
  const facts = [
    `${tt('Cold Library · house paper', '冷冻图书馆 · 馆内文献')} · ${p.id} · ${SITE}/s/${p.id.slice(2)}`,
    s.author ? tt(`Written for this library by ${s.author}.`, `${s.author}${/[A-Za-z0-9.]$/.test(s.author) ? ' ' : ''}为本馆撰写。`) : '',
    tt(`Generated ${date} from ${SITE}${href('en', 'open-stacks/' + p.slug)}`, `生成于 ${date}，来自 ${SITE}${href('zh', 'open-stacks/' + p.slug)}`),
  ];
  return `${head}\n\n${facts.filter(Boolean).join('\n')}\n\n----\n\n${plain(s.body)}\n`;
}

// The file a reader downloads: a work's from outputs.mjs, a house paper's from the mirror above.
export const plainText = (w, lang) => (w.house ? paperText(w, lang) : txtFile(w, lang));
export const txtSizeLabel = (w, lang) => fmtSize(txtSize(w, lang));
export const paperSizeLabel = (p, lang) => fmtSize(Buffer.byteLength(paperText(p, lang), 'utf8'));
// Kept for old callers: the same label as the colophon shows.
export const plainSize = (w, lang) => (w.house ? paperSizeLabel(w, lang) : txtSizeLabel(w, lang));
