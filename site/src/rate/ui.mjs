// Pieces of the rated catalogue: the score strip, list badges, chart rows, album sleeves and cards, tribute lamps.
// Readers' scores and lamps are filled in by /assets/js/rate.js from /api/ratings and /api/tributes; without
// JavaScript the librarian's score still reads, and the interactive parts stay hidden.
import { esc, t, href, serif, glue, tagOf, addGlyphs } from '../lib.mjs';
import { entryHref, entryTitle, entryBy, entryYear, scoreNote, fmtScore, personSlug } from '../catalog.mjs';

const STAR = '<svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M10 1.8l2.5 5.3 5.8.7-4.3 4 1.1 5.7L10 14.7l-5.1 2.8 1.1-5.7-4.3-4 5.8-.7z"/></svg>';
export const LAMP = '<svg class="lamp-mark" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M8 1.6c1.6 2 2.6 3.6 2.6 5.2a2.6 2.6 0 0 1-5.2 0C5.4 5.2 6.4 3.6 8 1.6z" fill="currentColor"/><path d="M5.2 11.2h5.6M6 13.6h4" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>';

// The score strip on a work, book or album page.
export function scoreStrip(lang, e, { why = true } = {}) {
  const T = t(lang);
  if (e.scripture) {
    return `<div class="score unscored"><p>${T('Scripture of a living faith: the library collects it and does not score it, and readers cannot rate it.', '宗教经典：只收录，不评分。')}</p></div>`;
  }
  if (typeof e.score !== 'number') return '';
  const id = esc(e.id);
  const note = why && e.kind === 'work' ? scoreNote(lang, e) : null;
  const stars = [1, 2, 3, 4, 5].map((n) => `<input type="radio" id="r-${id}-${n}" name="r-${id}" value="${n}"><label for="r-${id}-${n}"><span class="vh">${T(`${n} star${n > 1 ? 's' : ''}`, `${n} 星`)}</span>${STAR}</label>`).join('');
  return `<div class="score" data-rate="${id}">
  <p class="sc sc-cur"><span class="sc-k">${T('Librarian’s score', '馆员评分')}</span><span class="sc-v">${fmtScore(e.score)}</span><span class="sc-by">Claude · ${T('AI', 'AI')}</span></p>
  <p class="sc sc-read"><span class="sc-k">${T('Readers', '读者评分')}</span><span class="sc-v" data-rate-avg>—</span><span class="sc-by" data-rate-n>${T('Shown after five ratings', '满 5 人评分后显示')}</span></p>
  <fieldset class="sc sc-mine" data-rate-mine hidden><legend class="sc-k">${T('Your rating', '我的评分')}</legend><span class="stars">${stars}</span><span class="sc-by" data-rate-msg aria-live="polite"></span></fieldset>
  ${note ? `<p class="sc-why">${esc(note[lang] || note.en)}</p>` : ''}
</div>`;
}

// A score in a list: the librarian's number, with room for the readers' (filled by rate.js).
export const scoreCell = (lang, e) => (e.scripture
  ? `<span class="c-score"><span class="meta">${t(lang)('Not scored', '不评分')}</span></span>`
  : typeof e.score === 'number'
    ? `<span class="c-score"><span class="sb" title="${t(lang)('Librarian’s score', '馆员评分')}">${fmtScore(e.score)}</span><span class="sr" data-rate-row="${esc(e.id)}"></span></span>`
    : '<span class="c-score"></span>');

// A ranked row: rank, title, maker, year, score.
// In lists the reader's own language comes first; the original title follows in small type.
export function listTitle(lang, e) {
  const tt = entryTitle(lang, e);
  if (!tt.sub) return tt;
  return { main: tt.sub, tag: lang === 'zh' ? 'zh-Hans' : 'en', sub: tt.main, subTag: tt.tag };
}
export function chartRow(lang, e, rank) {
  const tt = listTitle(lang, e);
  const by = entryBy(lang, e);
  addGlyphs(tt.main);
  return `<li class="crow k-${e.kind}" data-id="${esc(e.id)}">
  <span class="c-rank id">${rank == null ? '' : rank}</span>
  <span class="c-title"><a href="${entryHref(lang, e)}"><span class="serif" lang="${esc(tt.tag)}">${glue(tt.main)}</span></a>${tt.sub ? `<span class="alt"${tt.subTag ? ` lang="${esc(tt.subTag)}"` : ''}>${esc(tt.sub)}</span>` : ''}</span>
  <span class="c-by">${esc(by.name)}</span>
  <span class="c-year">${esc(entryYear(lang, e))}</span>
  ${scoreCell(lang, e)}
</li>`;
}
export const chartList = (lang, list, { ranks = true, start = 1 } = {}) => `<ol class="crows${ranks ? '' : ' plain'}">${list.map((e, i) => chartRow(lang, e, ranks ? start + i : null)).join('')}</ol>`;

// Album sleeve: drawn by the site, never a scanned cover. The tone comes from the catalogue number.
const TONES = ['snow', 'night', 'ink', 'warm', 'sea', 'green', 'dusk'];
export function toneOf(id) { let h = 7; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return TONES[h % TONES.length]; }
export function sleeve(lang, e, { big = false } = {}) {
  const a = e.ref;
  const tt = entryTitle(lang, e);
  addGlyphs(a.title.orig);
  return `<div class="sleeve tone-${toneOf(a.id)}${big ? ' big' : ''}" aria-hidden="true"><span class="sl-a">${esc(a.artist.orig)}</span><span class="sl-t serif" lang="${esc(tt.tag)}">${esc(a.title.orig)}</span><span class="sl-y">${esc(a.year)}</span></div>`;
}
export function albumCard(lang, e, { heading = 'h3' } = {}) {
  const tt = listTitle(lang, e);
  const by = entryBy(lang, e);
  const g = e.ref.genres || [];
  return `<article class="acard" data-id="${esc(e.id)}" data-genres="${esc(g.join(' '))}" data-decade="${Math.floor(e.year / 10) * 10}" data-region="${esc(e.ref.region)}" data-score="${e.score ?? ''}" data-year="${e.year}">
  <a class="acard-a" href="${entryHref(lang, e)}" tabindex="-1" aria-hidden="true">${sleeve(lang, e)}</a>
  <${heading}><a href="${entryHref(lang, e)}"><span class="serif" lang="${esc(tt.tag)}">${glue(tt.main)}</span></a></${heading}>
  ${tt.sub ? `<p class="alt"${tt.subTag ? ` lang="${esc(tt.subTag)}"` : ''}>${esc(tt.sub)}</p>` : ''}
  <p class="by">${esc(by.name)} · ${esc(e.year)}</p>
  <p class="acard-score">${scoreCell(lang, e)}</p>
</article>`;
}

// Lamps are for people, not institutions or the anonymous.
const NOT_A_PERSON = /\b(anonymous|unknown|various|traditional|NASA|IETF|IAB|ISOC|Project|Society|Office|Board|Department|Administration|Team|Developers|Foundation|Committee|Institute|Agency|Council|Bureau|Architect of the Capitol|Authors|Group|Laboratory)\b/i;
export const isPerson = (p) => !!p && !NOT_A_PERSON.test(String(p.en || p.orig || '')) && !/佚名|无名氏/.test(String(p.zh || ''));

// A tribute lamp for an author or an artist. One per device per person per day; counted, never named.
export function lampBlock(lang, kind, person, { label = '' } = {}) {
  if (!isPerson(person)) return '';
  const key = `${kind}:${personSlug(person)}`;
  if (/:$/.test(key)) return '';
  const T = t(lang);
  const name = person[lang] || person.en;
  return `<div class="tribute" data-lamp="${esc(key)}" hidden>
  <button class="btn small secondary lamp-btn" type="button" data-lamp-btn>${LAMP}<span>${esc(label || T(`Light a lamp for ${name}`, `为${name}点一盏灯`))}</span></button>
  <span class="meta" data-lamp-n aria-live="polite"></span>
</div>`;
}

// The line that explains the two scores, once per page that lists them.
export function scoreKey(lang) {
  const T = t(lang);
  return `<p class="meta score-key">${T('The number is the librarian’s score, out of ten, from Claude, an AI. Readers’ scores appear beside it once five people have rated. Claude has not heard the albums: their scores come from what is documented about them.', '馆员评分满分 10，由 AI 给出；读者评分满 5 人后显示。AI 听不到录音，专辑分数依据文字资料。')}</p>`;
}
export { STAR };
