// Rated catalogue pages (2026-10-15): charts (/charts), the Record Room (/music), the Catalogue (/books) and the
// Memorial hall (/memorial). Page objects follow the contract at the top of site/build.mjs.
import { esc, t, href, go, sep, act, sec, ph, serif, glue, addGlyphs, ARROW, SITE } from '../lib.mjs';
import { ranked, catName, CHART_ORDER, entryHref, entryTitle, entryBy, entryYear, fmtScore, regionName, langLabel, personSlug } from '../catalog.mjs';
import { scoreStrip, chartList, albumCard, sleeve, lampBlock, scoreKey, toneOf } from './ui.mjs';
import { workHref, authorSlug } from '../stacks.mjs';

const num = (lang, n) => Number(n).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en');
const crumbs = (lang, items) => {
  const T = t(lang);
  return `<nav class="os-crumbs" aria-label="${T('Breadcrumb', '位置')}">${items.map(([label, url], i) => (i === items.length - 1 && !url
    ? `<span aria-current="page">${label}</span>`
    : `<a href="${esc(url)}">${label}</a>`)).join('<span class="sep" aria-hidden="true">/</span><wbr>')}</nav>`;
};
const L = (lang, o) => (o == null ? '' : typeof o === 'string' ? o : o[lang] ?? o.en ?? '');

// What each chart is about, in one line.
const DEK = {
  literature: ['Poems, stories, novels and plays, from the Book of Songs to now.', '诗、小说、散文和戏剧，从《诗经》到今天。'],
  faith: ['Scripture, devotion and the books people wrote about believing.', '经典、灵修，以及人们写下的关于信仰的书。'],
  history: ['How people have told what happened, and what they left for later.', '人们怎样讲述发生过的事，又给后来的人留下了什么。'],
  thought: ['How to live, how to think, how to pass things on.', '怎样活，怎样想，怎样把东西传下去。'],
  aesthetics: ['Writing about beauty, art, poetry, gardens and taste.', '关于美、艺术、诗、园林和品味的文字。'],
  music: ['Albums from every continent, rated from what is documented about them.', '来自各大洲的专辑，依据关于它们的文字记录评分。'],
  science: ['First-hand accounts of finding out.', '第一手的发现。'],
  computing: ['From the Analytical Engine to the licences that keep code free.', '从分析机，到让代码保持自由的许可证。'],
};

export function ratePages(ctx) {
  const cat = ctx.cat;
  const pages = [chartsHub(ctx), ...CHART_ORDER.filter((k) => cat.entries.some((e) => e.cat === k)).map((k) => chartPage(ctx, k)),
    musicIndex(ctx), ...cat.entries.filter((e) => e.kind === 'album').map((e) => albumPage(ctx, e)),
    booksIndex(ctx), ...cat.entries.filter((e) => e.kind === 'book').map((e) => bookPage(ctx, e)),
    memorialPage(ctx)];
  const seen = new Set();
  for (const p of pages) { if (seen.has(p.slug)) throw new Error(`two catalogue pages claim "${p.slug}"`); seen.add(p.slug); }
  return pages;
}

/* ------------------------------------------------------------------ charts */
function chartsHub(ctx) {
  const cat = ctx.cat;
  return {
    slug: 'charts',
    title: { en: 'Charts', zh: '榜单' },
    description: (lang) => t(lang)(`Every work, book and album in Cold Library, ranked by the librarian’s score, with readers’ scores beside them.`, '冷冻图书馆的全部作品、书和专辑，按馆员评分排序，旁边是读者评分。'),
    bodyClass: () => 'rate rate-charts',
    scripts: ['rate'],
    render: (lang) => {
      const T = t(lang);
      const scored = cat.entries.filter((e) => typeof e.score === 'number');
      const head = ph({
        lang,
        h1: T('Charts', '榜单'),
        lede: T('Everything the library keeps, ranked within its kind. The number is the librarian’s; the readers’ score sits beside it once five people have rated.', '馆里收的一切，各按其类排序。数字是馆员评分；有 5 人以上打分后，旁边会显示读者评分。'),
        facts: [T(`${num(lang, scored.length)} scored`, `已评分 ${num(lang, scored.length)}`), T(`${num(lang, cat.albums.length)} albums`, `专辑 ${num(lang, cat.albums.length)} 张`), T(`${num(lang, cat.books.length + ctx.open.works.length)} works and books`, `作品与书 ${num(lang, cat.books.length + ctx.open.works.length)} 部`)].join(sep),
        cls: 'rate-ph',
      });
      const blocks = CHART_ORDER.map((k) => {
        const list = ranked(cat, k);
        if (!list.length) return '';
        const name = catName(lang, cat, k);
        return `<section class="chart-block" id="${k}" aria-labelledby="h-${k}">
  <header class="chart-head"><h2 id="h-${k}"><a href="${href(lang, 'charts/' + k)}">${esc(name)}</a></h2><p class="meta">${esc(T(DEK[k][0], DEK[k][1]))}</p></header>
  ${chartList(lang, list.slice(0, 10))}
  <p class="chart-more">${go(href(lang, 'charts/' + k), T(`All ${num(lang, list.length)}`, `全部 ${list.length} ${k === 'music' ? '张' : '部'}`))}</p>
</section>`;
      }).join('');
      return `${head}${act(`<div class="wrap">${scoreKey(lang)}<div class="chart-grid">${blocks}</div></div>`, { cls: 'tight' })}`;
    },
  };
}

function chartPage(ctx, key) {
  const cat = ctx.cat;
  return {
    slug: 'charts/' + key,
    title: (lang) => t(lang)(`${catName('en', cat, key)} · Charts`, `${catName('zh', cat, key)}榜`),
    description: (lang) => t(lang)(DEK[key][0], DEK[key][1]),
    bodyClass: () => 'rate rate-chart',
    scripts: ['rate'],
    render: (lang) => {
      const T = t(lang);
      const list = ranked(cat, key);
      const unscored = cat.entries.filter((e) => e.cat === key && e.scripture).sort((a, b) => a.year - b.year);
      const name = catName(lang, cat, key);
      const head = ph({
        lang,
        crumbs: crumbs(lang, [[T('Charts', '榜单'), href(lang, 'charts')], [esc(name)]]),
        h1: T(`${esc(name)}`, `${esc(name)}榜`),
        lede: esc(T(DEK[key][0], DEK[key][1])),
        facts: [T(`${num(lang, list.length)} ranked`, `上榜 ${list.length}`), unscored.length ? T(`${unscored.length} scriptures collected, not scored`, `另收经典 ${unscored.length} 部，不评分`) : ''].filter(Boolean).join(sep),
        cls: 'rate-ph',
      });
      const kinds = new Set(list.map((e) => e.kind));
      const legend = kinds.has('work') && kinds.has('book')
        ? `<p class="meta">${T('Titles from the Open Stacks can be read here in full; the others link to where they can be found.', '开架书库里的作品可以在这里读全文；其余的会指向能找到它们的地方。')}</p>` : '';
      const scripture = unscored.length ? sec({
        id: 'scripture',
        h: T('Scripture, collected and not scored', '收录而不评分的经典'),
        intro: T('Texts a living faith holds as scripture are kept here with care and are not ranked, by the librarian or by readers.', '仍被信众奉为经典的文本，本馆郑重收录，但不排名：馆员不打分，读者也不能打分。'),
        body: chartList(lang, unscored, { ranks: false }),
      }) : '';
      return `${head}${act(`<div class="wrap">${scoreKey(lang)}${legend}${chartList(lang, list)}</div>${scripture}`, { cls: 'tight' })}`;
    },
  };
}

/* ------------------------------------------------------------------ the Record Room */
function musicIndex(ctx) {
  const cat = ctx.cat;
  return {
    slug: 'music',
    title: { en: 'The Record Room', zh: '唱片室' },
    description: (lang) => t(lang)(`${cat.albums.length} albums from every continent, each with the librarian’s score and readers’ scores. Information only: no audio, covers or lyrics.`, `来自各大洲的 ${cat.albums.length} 张专辑，各有馆员评分和读者评分。只收信息：不放音频、封面和歌词。`),
    bodyClass: () => 'rate rate-music',
    scripts: ['rate'],
    render: (lang) => {
      const T = t(lang);
      const all = cat.entries.filter((e) => e.kind === 'album').sort((a, b) => b.score - a.score || a.year - b.year);
      const years = all.map((e) => e.year);
      const regions = new Set(all.map((e) => e.ref.region));
      const genres = Object.keys(cat.genres).filter((g) => all.some((e) => e.ref.genres.includes(g)));
      const decades = [...new Set(all.map((e) => Math.floor(e.year / 10) * 10))].sort();
      const head = ph({
        lang,
        h1: T('The Record Room', '唱片室'),
        lede: T('Albums the library rates, from every continent. We keep the facts and our reasons, never the recordings: no audio, no covers, no lyrics. The sleeves are drawn by the site.', '本馆评分的专辑，来自各大洲。我们只记事实和理由，不收录音：没有音频、封面和歌词。唱片封套是网站自己画的。'),
        facts: all.length ? [T(`${all.length} albums`, `${all.length} 张专辑`), T(`${regions.size} countries and regions`, `${regions.size} 个国家和地区`), `${Math.min(...years)}–${Math.max(...years)}`].join(sep) : '',
        cls: 'rate-ph',
      });
      const chip = (name, v, label, n) => `<input type="radio" name="${name}" id="${name}-${v || 'all'}" value="${esc(v)}"${v ? '' : ' checked'}><label for="${name}-${v || 'all'}">${esc(label)}${n != null ? ` <span class="id">${n}</span>` : ''}</label>`;
      const filters = all.length ? `<form class="mfilters" data-mfilters hidden>
  <fieldset class="chips"><legend class="meta">${T('Genre', '流派')}</legend>${chip('g', '', T('All', '全部'), all.length)}${genres.map((g) => chip('g', g, L(lang, cat.genres[g]), all.filter((e) => e.ref.genres.includes(g)).length)).join('')}</fieldset>
  <fieldset class="chips"><legend class="meta">${T('Decade', '年代')}</legend>${chip('d', '', T('All', '全部'))}${decades.map((d) => chip('d', String(d), T(`${d}s`, `${d} 年代`))).join('')}</fieldset>
  <p class="meta"><span data-mcount>${T(`${all.length} albums`, `${all.length} 张专辑`)}</span>${sep}<label class="linkish"><input type="checkbox" data-msort> ${T('Oldest first', '按年代排')}</label></p>
</form>` : '';
      const grid = all.length ? `<div class="acards" data-acards>${all.map((e) => albumCard(lang, e)).join('')}</div>` : `<p>${T('The first records are being catalogued.', '第一批唱片正在登记。')}</p>`;
      return `${head}${act(`<div class="wrap">${scoreKey(lang)}${filters}${grid}</div>`, { cls: 'tight' })}`;
    },
  };
}

function albumPage(ctx, e) {
  const cat = ctx.cat;
  const a = e.ref;
  return {
    slug: 'music/' + e.slug,
    title: (lang) => { const tt = entryTitle(lang, e); return `${tt.sub || tt.main} · ${entryBy(lang, e).name}`; },
    description: (lang) => L(lang, a.review).slice(0, 150),
    fontKey: e.id,
    bodyClass: () => 'rate rate-album',
    scripts: ['rate'],
    render: (lang) => {
      const T = t(lang);
      const tt = entryTitle(lang, e);
      const by = entryBy(lang, e);
      addGlyphs(tt.main); addGlyphs(tt.sub);
      const facts = [esc(a.year), esc(regionName(lang, a.region)), esc(langLabel(lang, a.lang)), a.genres.map((g) => esc(L(lang, cat.genres[g]))).join(T(', ', '、'))].filter(Boolean).join(sep);
      const rows = [
        [T('Released', '发行'), esc(a.released)],
        a.label ? [T('Label', '厂牌'), esc(a.label)] : null,
        a.tracks ? [T('Tracks', '曲目'), T(`${a.tracks}${a.length ? ` · ${esc(a.length)}` : ''}`, `${a.tracks} 首${a.length ? ` · ${esc(a.length)}` : ''}`)] : null,
        a.style ? [T('Style', '风格'), esc(L(lang, a.style))] : null,
        [T('Start with', '先听这首'), `<span lang="${esc(tt.tag)}">${esc(a.start_with)}</span>`],
        [T('Catalogue number', '馆藏号'), `<span class="id">${esc(a.id)}</span>`],
      ].filter(Boolean);
      const links = [
        `<a href="${esc(a.links.musicbrainz)}" rel="noopener">MusicBrainz</a>`,
        a.links.wikipedia_en ? `<a href="${esc(a.links.wikipedia_en)}" rel="noopener" hreflang="en">Wikipedia</a>` : '',
        a.links.wikipedia_zh ? `<a href="${esc(a.links.wikipedia_zh)}" rel="noopener" hreflang="zh">${T('Wikipedia (Chinese)', '维基百科')}</a>` : '',
      ].filter(Boolean).join(sep);
      const same = cat.entries.filter((x) => x.kind === 'album' && x !== e && (x.ref.region === a.region || x.ref.genres[0] === a.genres[0]))
        .sort((x, y) => (y.ref.genres[0] === a.genres[0]) - (x.ref.genres[0] === a.genres[0]) || y.score - x.score).slice(0, 4);
      return `<article class="album" aria-labelledby="album-title">
  <header class="ph rate-ph album-head"><div class="wrap grid">
    <div class="album-sleeve">${sleeve(lang, e, { big: true })}</div>
    <div class="album-text">
      ${crumbs(lang, [[T('The Record Room', '唱片室'), href(lang, 'music')], [esc(L(lang, cat.genres[a.genres[0]]))]])}
      <h1 id="album-title"><span class="serif" lang="${esc(tt.tag)}">${glue(tt.main)}</span></h1>
      ${tt.sub ? `<p class="sub">${esc(tt.sub)}</p>` : ''}
      <p class="album-by">${esc(by.name)}${by.orig ? ` <span lang="${esc(by.tag)}">${esc(by.orig)}</span>` : ''}</p>
      <p class="meta facts">${facts}</p>
      ${scoreStrip(lang, e)}
    </div>
  </div></header>
  <div class="act tight"><div class="wrap grid">
    <div class="c-main">
      <p class="review">${esc(L(lang, a.review))}</p>
      <p class="meta review-by">${T('Review by Claude, an AI librarian, from documented sources. Claude has not heard the recording.', '短评：AI 馆员 Claude，依据文字资料写成。Claude 没有听过这张唱片。')}</p>
      ${lampBlock(lang, 'artist', a.artist)}
    </div>
    <aside class="c-aside"><dl class="facts-list">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl><p class="meta">${T('Information from', '资料来自')} ${links}</p></aside>
  </div></div>
  ${same.length ? act(sec({ id: 'more', h: T('Near it on the shelf', '同一架上'), body: `<div class="acards small">${same.map((x) => albumCard(lang, x)).join('')}</div>`, foot: go(href(lang, 'music'), T('The whole Record Room', '整个唱片室')) }), { alt: true, cls: 'tight' }) : ''}
</article>`;
    },
  };
}

/* ------------------------------------------------------------------ the Catalogue (books without full text) */
function booksIndex(ctx) {
  const cat = ctx.cat;
  return {
    slug: 'books',
    title: { en: 'The Catalogue', zh: '书目' },
    description: (lang) => t(lang)(`${cat.books.length} books the library rates without holding their text: scripture, history, aesthetics, world and Chinese literature.`, `本馆评分、但不收全文的 ${cat.books.length} 本书：经典、历史、美学、世界文学和中文文学。`),
    bodyClass: () => 'rate rate-books',
    scripts: ['rate'],
    render: (lang) => {
      const T = t(lang);
      const books = cat.entries.filter((e) => e.kind === 'book');
      const head = ph({
        lang,
        h1: T('The Catalogue', '书目'),
        lede: T('Books the library rates without holding their full text. Old ones link to free copies; books still in copyright get a score and a short review, never the text.', '本馆评分、但不收全文的书。古老的会指向免费的全文；仍在版权期内的只有评分和短评，不放正文。'),
        facts: [T(`${books.length} books`, `${books.length} 本书`), T(`plus ${ctx.open.works.length} works to read in full in the Open Stacks`, `另有 ${ctx.open.works.length} 部作品可在开架书库读全文`)].join(sep),
        cls: 'rate-ph',
      });
      const groups = CHART_ORDER.filter((k) => books.some((e) => e.cat === k)).map((k) => {
        const list = books.filter((e) => e.cat === k).sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.year - b.year);
        return sec({ id: k, h: esc(catName(lang, cat, k)), intro: esc(T(DEK[k][0], DEK[k][1])), body: chartList(lang, list, { ranks: false }), foot: go(href(lang, 'charts/' + k), T('The full chart, with the Open Stacks', '完整榜单（含开架书库）')) });
      }).join('');
      return `${head}${act(`<div class="wrap">${scoreKey(lang)}</div>${groups}`, { cls: 'tight' })}`;
    },
  };
}

function bookPage(ctx, e) {
  const cat = ctx.cat;
  const b = e.ref;
  return {
    slug: 'books/' + e.slug,
    title: (lang) => { const tt = entryTitle(lang, e); return tt.sub || tt.main; },
    description: (lang) => L(lang, b.review).slice(0, 150),
    fontKey: e.id,
    bodyClass: () => 'rate rate-book',
    scripts: ['rate'],
    render: (lang) => {
      const T = t(lang);
      const tt = entryTitle(lang, e);
      const by = entryBy(lang, e);
      addGlyphs(tt.main); addGlyphs(tt.sub);
      const dates = b.author ? (lang === 'zh' && b.author.dates_zh) || b.author.dates : '';
      const facts = [esc(L(lang, b.year_display)), esc(L(lang, b.origin)), esc(langLabel(lang, b.lang)), esc(catName(lang, cat, b.category))].filter(Boolean).join(sep);
      const stacks = (b.stacks || []).map((id) => ctx.open.byId.get(id)).filter(Boolean);
      const read = b.full_text === 'free'
        ? `<h2 class="h-small">${T('Read it free', '免费读全文')}</h2><ul class="read-links">${b.read.map((r) => `<li><a href="${esc(r.url)}" rel="noopener">${esc(r.name)}</a> <span class="meta">${esc(L(lang, r.note))}</span></li>`).join('')}</ul>`
        : `<p class="meta">${T('Still in copyright: the library keeps its information, score and review, not its text.', '仍在版权期内：本馆只收书目、评分和短评，不收正文。')}</p>`;
      const sel = stacks.length ? `<h2 class="h-small">${T('In the Open Stacks', '开架书库里有')}</h2><ul class="read-links">${stacks.map((w) => `<li><a href="${workHref(lang, w)}">${esc(w.title[lang] || w.title.en)}</a> <span class="meta">${T('read in full here, with notes', '可在本站读全文，带注释')}</span></li>`).join('')}</ul>` : '';
      const authorPage = b.author && ctx.open.authors.find((r) => r.slug === personSlug(b.author));
      return `<article class="book" aria-labelledby="book-title">
  <header class="ph rate-ph"><div class="wrap grid"><div class="c-main">
    ${crumbs(lang, [[T('The Catalogue', '书目'), href(lang, 'books')], [esc(catName(lang, cat, b.category)), href(lang, 'charts/' + b.category)]])}
    <h1 id="book-title"><span class="serif" lang="${esc(tt.tag)}">${glue(tt.main)}</span></h1>
    ${tt.sub ? `<p class="sub">${esc(tt.sub)}</p>` : ''}
    <p class="book-by">${esc(by.name)}${by.orig ? ` <span lang="${esc(by.tag)}">${esc(by.orig)}</span>` : ''}${dates ? ` · <span class="tabular">${esc(dates)}</span>` : ''}</p>
    <p class="meta facts">${facts}</p>
    ${scoreStrip(lang, e)}
  </div></div></header>
  <div class="act tight"><div class="wrap grid">
    <div class="c-main">
      <p class="review">${esc(L(lang, b.review))}</p>
      <p class="meta review-by">${T('Review by Claude, an AI librarian.', '短评：AI 馆员 Claude。')}</p>
      ${read}${sel}
      ${b.author ? lampBlock(lang, 'author', b.author) : ''}
      ${authorPage ? `<p>${go(href(lang, 'open-stacks/authors/' + authorPage.slug), T(`More by ${by.name} in the Open Stacks`, `开架书库里${by.name}的其他作品`))}</p>` : ''}
    </div>
    <aside class="c-aside"><dl class="facts-list">
      <div><dt>${T('Catalogue number', '馆藏号')}</dt><dd><span class="id">${esc(b.id)}</span></dd></div>
      ${b.tradition ? `<div><dt>${T('Tradition', '传统')}</dt><dd>${esc(L(lang, b.tradition))}</dd></div>` : ''}
      <div><dt>${T('Full text', '全文')}</dt><dd>${b.full_text === 'free' ? T('Public domain, free online', '公有领域，可免费在线读') : T('In copyright', '仍在版权期')}</dd></div>
    </dl><p class="meta">${T('Checked against', '核对来源')} <a href="https://www.wikidata.org/wiki/${esc(b.wikidata)}" rel="noopener">Wikidata ${esc(b.wikidata)}</a></p></aside>
  </div></div>
</article>`;
    },
  };
}

/* ------------------------------------------------------------------ the Memorial hall */
function memorialPage(ctx) {
  return {
    slug: 'memorial',
    title: { en: 'Memorial', zh: '纪念' },
    description: (lang) => t(lang)('Perpetual exhibits for work, perpetual plaques for people, and lamps for the writers and musicians we keep.', '给作品的永续展位，给人的永续铭牌，还有为作家和音乐人点的灯。'),
    bodyClass: () => 'rate rate-memorial',
    render: (lang) => {
      const T = t(lang);
      const head = ph({
        lang,
        h1: T('Memorial', '纪念'),
        lede: T('A library also remembers. Hang a perpetual exhibit for a body of work or a perpetual plaque for a person, and light a lamp for the writers and musicians on our shelves.', '图书馆也负责记住。给一份作品挂一个永续展位，给一个人挂一块永续铭牌；也可以为书架上的作家和音乐人点一盏灯。'),
        cls: 'rate-ph',
      });
      const card = (h, p, url, label) => `<article class="mcard"><h2 class="h-small">${h}</h2><p>${p}</p><p>${go(url, label)}</p></article>`;
      const cards = `<div class="mcards">
  ${card(T('Perpetual exhibits', '永续展位'), T('A standing room for a project or a life’s work: what it is, why it mattered, who carries it on.', '给一个项目或一生的作品一间常设展厅：它是什么、为什么重要、谁在接着做。'), href(lang, 'exhibits'), T('See the exhibits', '看看展位'))}
  ${card(T('Perpetual plaques', '永续铭牌'), T('A short record of a person, living or not. An AI warden at the door can hold what they left for the right people.', '简短地记下一个人，在世与否都可以。门口的 AI 守馆人可以替他们把东西留给对的人。'), href(lang, 'plaques'), T('See the plaques', '看看铭牌'))}
  ${card(T('Lamps', '点灯'), T('On every author’s page in the Open Stacks, every book and every album, you can light a lamp for the people who made them. One a day, counted, never named.', '开架书库的作者页、每本书和每张专辑的页面上，都可以为写下它、唱出它的人点一盏灯。每天一盏，只计数，不留名。'), href(lang, 'charts'), T('Find someone in the charts', '去榜单里找'))}
</div>`;
      const more = `<p class="meta memorial-more">${[go(href(lang, 'wardens'), T('How wardens work', '守馆人怎么工作')), go(href(lang, 'accession'), T('Hang your own', '挂上你自己的')), go(href(lang, 'collect'), T('Someone left you something?', '有人给你留了东西？'))].join(' ')}</p>`;
      return `${head}${act(`<div class="wrap">${cards}${more}</div>`, { cls: 'tight' })}`;
    },
  };
}

export { DEK };
