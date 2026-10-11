// Reading trails (spec §5.6): /open-stacks/trails and one page per trail in catalog/stacks/_trails/<slug>.json.
import { esc, t, go, sep, act, sec, ph, serif, glue, addGlyphs } from '../lib.mjs';
import { authorLabel, workHref } from '../stacks.mjs';
import { trailCard, shelfCard, cardGrid } from '../components.mjs';
import { osHref, crumbs, count, num, shortYear, platePh, plateById, excerptBlock, workTitleLink, SHELVES } from './list-common.mjs';

const stepsOf = (stacks, tr) => (tr.steps || []).map((s) => ({ ...s, work: stacks.byId.get(s.id) })).filter((s) => s.work);
const minutesOf = (steps) => steps.reduce((a, s) => a + s.work.size.minutes, 0);
const trailTitle = (lang, tr) => (tr.title && (tr.title[lang] || tr.title.en)) || tr.slug;
// Trails that can be shown: a slug, a title and at least one step that is on the shelves.
export const validTrails = (stacks) => (stacks.trails || []).filter((tr) => tr && typeof tr.slug === 'string' && /^[a-z0-9-]+$/.test(tr.slug) && tr.title && stepsOf(stacks, tr).length);

export function trailPages(ctx) {
  const stacks = ctx.open;
  const trails = validTrails(stacks);
  const index = {
    slug: 'open-stacks/trails',
    title: { en: 'Reading trails', zh: '书单' },
    description: (lang) => t(lang)('Paths through the Open Stacks chosen by Claude, an AI librarian, with one sentence for each step.', 'AI 馆员 Claude 选的阅读路线，穿过开架书库的各个书架，每一步一句话。'),
    bodyClass: () => 'stacks os-page-trails',
    scripts: ['search'],
    render: (lang) => renderIndex(lang, stacks, trails),
  };
  return [index, ...trails.map((tr, i) => ({
    slug: 'open-stacks/trails/' + tr.slug,
    title: { en: `${trailTitle('en', tr)} · Reading trails`, zh: `${trailTitle('zh', tr)} · 书单` },
    description: (lang) => (tr.dek && (tr.dek[lang] || tr.dek.en)) || t(lang)(`A reading trail of ${stepsOf(stacks, tr).length} works through the Open Stacks.`, `穿过开架书库的一条书单，共 ${stepsOf(stacks, tr).length} 部作品。`),
    bodyClass: () => 'stacks os-page-trail',
    scripts: ['search'],
    render: (lang) => renderTrail(lang, stacks, tr, trails[(i + 1) % trails.length]),
  }))];
}

function renderIndex(lang, stacks, trails) {
  const T = t(lang);
  const head = ph({
    lang,
    crumbs: crumbs(lang, [[T('Reading trails', '书单')]]),
    h1: T('Reading trails', '书单'),
    lede: T('Paths through the shelves, one sentence at a time. Each trail is a handful of works in an order Claude chose, with a line on what to carry from one to the next.', '穿过各个书架的路线，一步一句话。每条书单是按 Claude 排好的几部作品，每一步都有一句话，说明从这一部带什么到下一部。'),
    facts: trails.length ? [count(trails.length, 'trail', lang), T('chosen by Claude', 'Claude 选')].join(sep) : '',
    cls: 'os-ph',
  });
  if (!trails.length) {
    const body = sec({
      id: 'start', h: T('Start with a shelf', '先从一个书架开始'),
      intro: T('No reading trails are on the shelves yet. Until they are, every shelf has a few works to start with.', '书架上还没有书单。在书单写好之前，每个书架都有几部可以先读的作品。'),
      body: cardGrid(SHELVES.map((s) => shelfCard(lang, s.key, stacks)), { cls: 'thirds' }),
    });
    return `${head}\n${act(body)}`;
  }
  return `${head}\n${act(`<div class="wrap">${cardGrid(trails.map((tr) => trailCard(lang, tr, stacks)), { cls: trails.length === 2 ? 'halves' : 'thirds' })}</div>`)}`;
}

function renderTrail(lang, stacks, tr, next) {
  const T = t(lang);
  const steps = stepsOf(stacks, tr);
  const title = trailTitle(lang, tr);
  const head = ph({
    lang,
    crumbs: crumbs(lang, [[T('Reading trails', '书单'), osHref(lang, 'trails')], [esc(title)]]),
    h1: `<span class="serif">${(addGlyphs(title), glue(title))}</span>`,
    lede: tr.dek ? esc(tr.dek[lang] || tr.dek.en) : '',
    facts: [count(steps.length, 'work', lang), T(`about ${minutesOf(steps)} min`, `约 ${minutesOf(steps)} 分钟`), T('chosen by Claude', 'Claude 选')].join(sep),
    plate: platePh(lang, plateById(stacks, tr.plate)),
    cls: 'os-ph',
  });
  const rows = steps.map((s, i) => {
    const w = s.work;
    const a = authorLabel(w, lang);
    const line = s.line && (s.line[lang] || s.line.en);
    return `<li class="grid os-step">
  <p class="os-sn" aria-hidden="true">${i + 1}</p>
  <div class="os-sb">
    <h2 class="os-st"><span class="vh">${T(`Step ${i + 1}: `, `第 ${i + 1} 步：`)}</span>${workTitleLink(lang, w)}</h2>
    <p class="meta">${esc(a.name)}${sep}${esc(shortYear(w, lang))}</p>
    ${excerptBlock(lang, w, { cls: 'os-ex os-ex2' })}
    ${line ? `<p class="os-why">${esc(line)}</p>` : ''}
    <p class="os-pfoot">${go(workHref(lang, w), T('Read', '阅读'))}</p>
  </div>
</li>`;
  }).join('');
  const foot = next && next !== tr
    ? go(osHref(lang, 'trails/' + next.slug), `${T('Next trail: ', '下一条书单：')}<span class="serif">${serif(trailTitle(lang, next))}</span>`)
    : go(osHref(lang, 'trails'), T('All reading trails', '全部书单'));
  return `${head}
${act(`<div class="wrap"><ol class="os-steps">${rows}</ol><p class="os-next">${foot}</p></div>`)}`;
}

