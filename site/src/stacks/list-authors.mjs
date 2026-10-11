// Authors (spec §5.7): an A–Z index by the initial of author.en (pinyin for Chinese authors), and a page for every
// author with two or more works. No biography: only what the catalogue records.
import { esc, t, sep, act, ph, tagOf } from '../lib.mjs';
import { shelfOf, workHref, shelfHref } from '../stacks.mjs';
import { wrow, rowList } from '../components.mjs';
import { osHref, crumbs, count, num, yearRange, platePh, initialOf } from './list-common.mjs';

const isHan = (s) => /^[\s㐀-鿿豈-﫿（）·・]+$/u.test(String(s || ''));
// The name in the page language, then the original (or, for a Chinese name on the Chinese site, its pinyin).
export function authorNames(lang, a) {
  const page = a[lang] || a.en;
  if (lang === 'zh') {
    if (isHan(page) && isHan(a.orig)) return { name: page, other: a.en && a.en !== page ? a.en : '', otherLang: 'en' };
    return { name: page, other: a.orig && a.orig !== page ? a.orig : (a.en !== page ? a.en : ''), otherLang: '' };
  }
  return { name: page, other: a.orig && a.orig !== page ? a.orig : '', otherLang: '' };
}
// Dates only when every work agrees (an "Anonymous" heading spans centuries).
const datesOf = (rec) => { const d = [...new Set(rec.works.map((w) => w.author.dates).filter(Boolean))]; return d.length === 1 ? d[0] : ''; };
const authorHref = (lang, rec) => osHref(lang, 'authors/' + rec.slug);
const portraitOf = (stacks, rec) => {
  const name = rec.author.en || '';
  if (name.split(/\s+/).length < 2) return null;
  return stacks.plates.find((p) => (p.title.en || '').includes(name) || (p.title.orig || '').includes(name)) || null;
};

export function authorPages(ctx) {
  const stacks = ctx.open;
  const index = {
    slug: 'open-stacks/authors',
    title: { en: 'Authors · The Open Stacks', zh: '作者 · 开架书库' },
    description: (lang) => t(lang)(`All ${stacks.authors.length} authors in the Open Stacks, A to Z.`, `开架书库的全部 ${stacks.authors.length} 位作者，按音序排列。`),
    bodyClass: () => 'stacks os-page-authors',
    scripts: ['search'],
    render: (lang) => renderIndex(lang, stacks),
  };
  return [index, ...stacks.authors.filter((rec) => rec.works.length >= 2).map((rec) => ({
    slug: 'open-stacks/authors/' + rec.slug,
    title: (lang) => `${authorNames(lang, rec.author).name} · ${t(lang)('The Open Stacks', '开架书库')}`,
    description: (lang) => t(lang)(`${rec.works.length} works by ${rec.author.en} on the Open Stacks, each with its source.`, `开架书库收录的 ${authorNames(lang, rec.author).name} 作品 ${rec.works.length} 部，各附来源。`),
    bodyClass: () => 'stacks os-page-author',
    scripts: ['search'],
    render: (lang) => renderAuthor(lang, stacks, rec),
  }))];
}

function renderIndex(lang, stacks) {
  const T = t(lang);
  const groups = new Map();
  for (const rec of stacks.authors) { const k = initialOf(rec.author); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(rec); }
  const coll = new Intl.Collator('en', { sensitivity: 'base' });
  for (const list of groups.values()) list.sort((a, b) => coll.compare(a.author.en || '', b.author.en || ''));
  const letters = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZ', ...(groups.has('#') ? ['#'] : [])];
  const strip = `<nav class="os-az" aria-label="${T('Authors by letter', '按字母查找作者')}"><div class="wrap"><p class="os-letters">${letters.map((ch) => (groups.has(ch)
    ? `<a href="#letter-${ch === '#' ? 'other' : ch.toLowerCase()}"><span>${ch}</span></a>`
    : `<span class="os-off" aria-hidden="true"><span>${ch}</span></span>`)).join('')}</p></div></nav>`;
  const multi = stacks.authors.filter((r) => r.works.length >= 2).length;
  const head = ph({
    lang,
    crumbs: crumbs(lang, [[T('Authors', '作者')]]),
    h1: T('Authors', '作者'),
    lede: T('Everyone with a work on the shelves, by the initial of their name in Latin letters. Chinese names sort by their pinyin.', '书架上每一位作者，按名字的拉丁字母首字母排列；中文名按拼音排。'),
    facts: [count(stacks.authors.length, 'author', lang), T(`${multi} with two or more works`, `其中 ${multi} 位有两部以上`)].join(sep),
    cls: 'os-ph',
  });
  const sections = letters.filter((ch) => groups.has(ch)).map((ch) => {
    const id = `letter-${ch === '#' ? 'other' : ch.toLowerCase()}`;
    const rows = groups.get(ch).map((rec) => {
      const n = authorNames(lang, rec.author);
      const shelves = [...new Set(rec.works.map((w) => w.shelf))].map((k) => { const s = shelfOf(k); return `<a href="${shelfHref(lang, k)}">${esc(T(s.en, s.zh))}</a>`; }).join(', ');
      const url = rec.works.length >= 2 ? authorHref(lang, rec) : workHref(lang, rec.works[0]);
      const dates = datesOf(rec);
      return `<li class="os-arow">
  <span class="os-an"><a href="${url}">${esc(n.name)}</a>${n.other ? ` <span class="os-ao"${n.otherLang ? ` lang="${n.otherLang}"` : ` lang="${esc(tagOf(rec.works[0].lang))}"`}>${esc(n.other)}</span>` : ''}</span>
  <span class="os-ad">${esc(dates)}</span>
  <span class="os-awn">${rec.works.length >= 2 ? count(rec.works.length, 'work', lang) : `<a href="${url}" class="os-a1">${T('1 work', '1 部作品')}</a>`}</span>
  <span class="os-as meta">${shelves}</span>
</li>`;
    }).join('');
    return `<section class="os-letter" id="${id}" aria-labelledby="h-${id}"><h2 id="h-${id}">${ch === '#' ? T('Other', '其他') : ch}</h2><ul class="os-arows">${rows}</ul></section>`;
  }).join('');
  return `${head}\n${strip}\n${act(`<div class="wrap">${sections}</div>`, { cls: 'tight' })}`;
}

function renderAuthor(lang, stacks, rec) {
  const T = t(lang);
  const n = authorNames(lang, rec.author);
  const works = [...rec.works].sort((a, b) => a.year - b.year || a.id.localeCompare(b.id));
  const dates = datesOf(rec);
  const shelves = [...new Set(works.map((w) => w.shelf))];
  const head = ph({
    lang,
    crumbs: crumbs(lang, [[T('Authors', '作者'), osHref(lang, 'authors')], [esc(n.name)]]),
    h1: esc(n.name),
    sub: n.other ? `<span${n.otherLang ? ` lang="${n.otherLang}"` : ` lang="${esc(tagOf(works[0].lang))}"`}>${esc(n.other)}</span>` : '',
    facts: [dates ? `<span class="tabular">${esc(dates)}</span>` : '', T(`${count(works.length, 'work', lang)} on the Open Stacks`, `开架书库收录 ${num(works.length, lang)} 部`), yearRange(works, lang), shelves.map((k) => { const s = shelfOf(k); return `<a href="${shelfHref(lang, k)}">${esc(T(s.en, s.zh))}</a>`; }).join(T(', ', '、'))].filter(Boolean).join(sep),
    plate: platePh(lang, portraitOf(stacks, rec)),
    cls: 'os-ph',
  });
  const body = `<div class="wrap">${rowList(works.map((w) => wrow(lang, w, stacks)))}<p class="os-next"><a class="go" href="${osHref(lang, 'authors')}">${T('All authors', '全部作者')}<span class="nw">&nbsp;→</span></a></p></div>`;
  return `${head}\n${act(body, { cls: 'tight' })}`;
}
