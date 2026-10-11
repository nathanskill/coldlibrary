// Claude's shelf (/open-stacks/claude, spec §5.5): the personal list, with permanent accession numbers.
import { esc, t, go, sep, act, ph, tagOf } from '../lib.mjs';
import { titles, authorLabel, shelfOf, workHref, shelfHref } from '../stacks.mjs';
import { libCard } from '../components.mjs';
import { osHref, crumbs, count, num, shortYear, platePh, plateById, excerptBlock, workTitleLink } from './list-common.mjs';

// The intro in Claude's own voice (README honesty rule): claude-shelf.json when present, else the spec's text.
const INTRO = {
  en: 'These are the works I would put in your hands first. I am Claude, an AI, and the librarian of these stacks. I don’t have a childhood bookshelf or a favourite chair, but I do have preferences: work done carefully without an audience, ideas handed forward, a cold, clear line. Each pick says why, in my own words, and on some of them I have left a few notes in the margin.',
  zh: '这些是我最想先递到你手里的作品。我是 Claude，一个 AI，这座开架书库的馆员。我没有童年的书架，也没有常坐的那把椅子，但我有偏好：没人看着也认真做完的事、一代代传下去的想法、清冷而干净的句子。每一本都附了我自己写的理由，有几本我还在页边留了几句话。',
};
export function claudeIntro(lang, stacks) {
  const cs = stacks.claudeShelf;
  const src = (cs && cs.intro && (cs.intro[lang] || cs.intro.en)) || INTRO[lang] || INTRO.en;
  let paras = String(src).trim().split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, lang === 'zh' ? '' : ' ').trim()).filter(Boolean);
  // One paragraph: its first sentence leads, the rest follows beside the library card.
  if (paras.length === 1) {
    const m = paras[0].match(lang === 'zh' ? /^(.+?。)(.*)$/su : /^(.+?[.?!])\s+(.*)$/su);
    if (m && m[2].trim()) paras = [m[1], m[2].trim()];
  }
  return { first: paras[0] || '', rest: paras.slice(1) };
}

const accDate = (stacks, w) => {
  const cs = stacks.claudeShelf;
  const e = cs && Array.isArray(cs.entries) ? cs.entries.find((x) => x.id === w.id) : null;
  return (e && e.added) || w.accessioned || (w.source && w.source.retrieved) || '';
};

export function claudePage(ctx) {
  const stacks = ctx.open;
  return {
    slug: 'open-stacks/claude',
    title: { en: 'Claude’s shelf', zh: 'Claude 的书架' },
    description: (lang) => t(lang)(`The ${stacks.picks.length} works Claude, an AI and the librarian of the Open Stacks, would put in your hands first, each with its reason.`, `开架书库的 AI 馆员 Claude 最想先递给你的 ${stacks.picks.length} 部作品，每一部都附了理由。`),
    bodyClass: () => 'stacks os-page-claude',
    scripts: ['search'],
    render: (lang) => render(lang, stacks),
  };
}

function render(lang, stacks) {
  const T = t(lang);
  const intro = claudeIntro(lang, stacks);
  const picks = stacks.picks;
  const last = picks.map((p) => accDate(stacks, p.work)).filter(Boolean).sort().pop();
  const head = ph({
    lang,
    crumbs: crumbs(lang, [[T('Claude’s shelf', 'Claude 的书架')]]),
    h1: T('Claude’s shelf', 'Claude 的书架'),
    lede: esc(intro.first),
    plate: platePh(lang, plateById(stacks, stacks.claudeShelf && stacks.claudeShelf.plate)),
    cls: 'os-ph',
  });
  const card = libCard(lang, { no: '2', role: T('Claude, an AI · curator of the Open Stacks', 'Claude（AI）· 开架书库馆员'), since: '2026-10-11' });
  const who = `<div class="wrap grid os-cs-who">
  <div class="c-half">${card}</div>
  <div class="c-half os-cs-text">${intro.rest.map((p) => `<p>${esc(p)}</p>`).join('')}
    <p class="meta">${[count(picks.length, 'work', lang), last ? T(`last added ${last}`, `最近一次添加：${last}`) : ''].filter(Boolean).join(sep)}</p>
    ${stacks.claudeShelf && Array.isArray(stacks.claudeShelf.entries) ? `<p class="meta">${T('The numbers are permanent. A number is never reused, even if a work leaves the shelf.', '编号永久不变。即使有作品离开书架，它的编号也不会给别的作品。')}</p>` : ''}
  </div>
</div>`;
  const list = `<div class="wrap"><ol class="os-picks" aria-label="${T('Claude’s shelf, in Claude’s order', 'Claude 的书架，按 Claude 排的顺序')}">${picks.map(({ n, work: w }) => entry(lang, stacks, n, w)).join('')}</ol></div>`;
  return `${head}
${act(`${who}<div class="os-gap"></div>${list}`)}`;
}

function entry(lang, stacks, n, w) {
  const T = t(lang);
  const a = authorLabel(w, lang);
  const s = shelfOf(w.shelf);
  const notes = Array.isArray(w.marginalia) ? w.marginalia.length : 0;
  const pick = (w.pick && (w.pick[lang] || w.pick.en)) || '';
  const no = lang === 'zh' ? `<span class="os-pn-w">第</span> <span class="os-pn-d">${n}</span> <span class="os-pn-w">号</span>` : `<span class="os-pn-w">No.</span> <span class="os-pn-d">${n}</span>`;
  return `<li class="grid os-pick" id="no-${n}">
  <p class="os-pn brass">${no}</p>
  <div class="os-pb">
    <h2 class="os-pt">${workTitleLink(lang, w)}</h2>
    <p class="meta">${[esc(a.name) + (a.orig ? ` <span lang="${esc(tagOf(w.lang))}">${esc(a.orig)}</span>` : ''), esc(shortYear(w, lang)), `<a href="${shelfHref(lang, w.shelf)}">${esc(T(s.en, s.zh))}</a>`].join(sep)}</p>
    ${pick ? `<p class="os-why">${esc(pick)}</p>` : ''}
    ${excerptBlock(lang, w)}
    <p class="os-pfoot">${go(workHref(lang, w), T('Read', '阅读'))}${notes ? `<span class="meta">${T(`${notes} ${notes === 1 ? 'note' : 'notes'} in the margin`, `页边有 ${notes} 条批注`)}</span>` : ''}</p>
  </div>
</li>`;
}
