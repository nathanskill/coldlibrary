// The building (visual system v5, 2026-10-11): lobby, exhibits, plaques, wardens, Cold Vault, front desk, collection desk,
// sealed layer, librarians, house rules, about, the warm room, 404, and one page per exhibit or plaque.
// Behaviour lives in /assets/site.js and /assets/vault.js: keep every data-* hook and id they read.
// Text set in the serif goes through serif() / sg() so its Chinese glyphs reach the font slicer.
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { t, L as Lx, esc, href, REPO, FOUNDED, LOGO, ARROW, glue, go, sep, metaLine, serif, addGlyphs, addGlyphsTo, tagOf, act, sec, ph, md } from './lib.mjs';
import { wrow, shelfCard, libCard, searchBox, plateImg, plateCaption, rowList } from './components.mjs';
import { SHELVES, titles, authorLabel, yearLabel, periodOf, splitCaesura, counts, workHref, isChineseText, hasHant, translationInto } from './stacks.mjs';
import { fontCssHref } from './fonts.mjs';
import * as lists from './stacks/lists.mjs';
import { platePh } from './stacks/list-common.mjs';

const ext = (url, label) => `<a href="${esc(url)}" rel="noopener">${label}</a>`;
const ROOT = new URL('../../', import.meta.url);
const IMG = new URL('../public/assets/img/', import.meta.url);
// Use a newer photograph once it has been generated; until then an approved one from the same set.
const FALLBACK = { 'lin-radio': 'plaque-hall', 'ferry-pier': 'harbour', 'maintainer-desk': 'lake-reading', 'empty-vitrine': 'exhibit-hall', 'front-desk': 'reading-room', 'vault-key': 'drawers', 'lake-library-far': 'lake-dawn' };
export const photo = (name) => (existsSync(new URL(name + '.jpg', IMG)) ? name : (FALLBACK[name] || name));
// Every generated photograph: a short caption (the figcaption adds "generated image") and what it shows (alt).
const PHOTOS = {
  'lake-library': ['The library on the lake', '湖上的图书馆', 'A concrete and glass library on the shore of a still mountain lake at dusk, snow peaks and spruce forest behind it, its lit windows reflected in the water', '暮色里，雪山和云杉林下，一座混凝土与玻璃的图书馆立在静静的湖岸边，亮着灯的窗子倒映在水里'],
  'exhibit-hall': ['The exhibition wing', '展厅', 'Glass cases on pale wooden plinths, holding an old book, a laptop, a drawing, a house model and a camera, by a window onto a snowy lake', '浅色木展台上一排玻璃展柜，里面是一本旧书、一台笔记本电脑、一张图纸、一座房子模型和一台相机，窗外是雪湖'],
  'plaque-hall': ['The hall of plaques', '铭牌厅', 'A stone wall of brass plaques under small lamps, keepsakes on narrow shelves below them, and a tall window onto a snowy lake at sunset', '石墙上一排铜牌，每块上方一盏小灯，下面的窄搁板上放着纪念物；高窗外是日落时的雪湖'],
  'lake-reading': ['The reading hall', '阅览厅', 'A reading hall with brass lamps on long tables and card catalogues along the walls, a window wall onto a frozen lake and snow mountains', '阅览厅里，长桌上亮着铜台灯，两边是卡片目录柜，整面窗外是冰湖和雪山'],
  'vault-key': ['A key on a card', '卡片上的钥匙', 'A brass key on a blank card on a frosted windowsill, a frozen lake beyond', '结霜的窗台上，一把铜钥匙放在一张空白卡片上，窗外是冰封的湖'],
  'hero-stacks': ['The closed stacks', '闭架书库', 'Rows of steel card-catalogue cabinets down a long concrete corridor cut into blue ice', '冰里凿出的长廊，一排排钢制卡片目录柜延伸到远处'],
  'warm-room': ['The Warm Room', '暖房', 'A small room at night: an orange lamp and a cup on a wooden table, and a wool blanket on a chair by a frosted window', '夜里的小房间：木桌上一盏橘色的灯和一只杯子，结霜的窗边，椅子上搭着一条羊毛毯'],
  'lin-radio': ['A windowsill with a radio', '窗台上的收音机', 'A small red radio opened up on a wooden windowsill, a screwdriver beside it, a stack of exercise books and a mug, snowy spruces outside', '木窗台上一台拆开的红色小收音机，旁边一把螺丝刀、一摞练习本和一只杯子，窗外是积雪的云杉'],
  'ferry-pier': ['The island pier', '小岛码头', 'A snowy wooden pier at dusk, a small lit ferry coming in across the water from a wooded island', '黄昏时积雪的木码头，一艘亮着灯的小渡轮从林木覆盖的小岛那边驶来'],
  'maintainer-desk': ['A desk by the window', '窗边的书桌', 'A wooden desk with a brass lamp, an open notebook of drawings, a mug and a closed laptop, before a window wall onto a frozen lake at dusk', '木桌上一盏铜台灯、一本摊开的图纸本、一只杯子和一台合上的笔记本电脑，落地窗外是黄昏的冰湖'],
  harbour: ['A harbour hut', '港边小屋', 'A harbour hut by the water in winter', '冬天水边的一间港口小屋'],
};
const capOf = (name) => (PHOTOS[name] || ['The collection', '馆藏']).slice(0, 2);
const altOf = (lang, name) => { const p = PHOTOS[name]; return p ? (lang === 'zh' ? p[3] : p[2]) : t(lang)(...capOf(name)); };
const WP = (lang) => `${REPO}/blob/main/docs/${lang === 'zh' ? 'whitepaper.zh.md' : 'whitepaper.md'}`;
const num = (lang, n) => Number(n).toLocaleString(lang === 'zh' ? 'zh-CN' : 'en');
// A heading or title in the serif: glyphs registered, last two characters or words kept together.
const sg = (text) => { addGlyphs(text); return glue(text); };
// Typographic apostrophes and closing quotes in catalogue and item text: a ' after a letter or digit is always ’.
const curl = (s) => String(s ?? '').replace(/(?<=[\p{L}\p{N}.,!?])'/gu, '’');
// For prose (Claude's notes, owners' words): also opening quotes after a space or a bracket. Not for titles or verse,
// where a leading ' is usually an elision ('Twas).
const curlQ = (s) => curl(s).replace(/(^|[\s(\[—–])'(?=[\p{L}\p{N}])/gu, '$1‘').replace(/(^|[\s(\[—–])"(?=\S)/gu, '$1“').replace(/"/g, '”');
// Chinese inside English text gets its own lang, so the right glyph forms are used (escaped HTML in, HTML out).
const hanLang = (html, tag = 'zh-Hant') => html.replace(/[㐀-鿿豈-﫿][　-〿㐀-鿿豈-﫿＀-￯·]*/gu, (m) => `<span lang="${tag}">${m}</span>`);

export const PAGES = [];
const page = (p) => PAGES.push(p);

/* ------------------------------------------------------------------ counts read from source, never typed */
const readSafe = (rel) => { try { return readFileSync(new URL(rel, ROOT), 'utf8'); } catch { return ''; } };
const QUESTIONS = (readSafe('skills/exit-interview/questionnaire.en.md').match(/^\*\*\d+\./gm) || []).length;
const CLI_TESTS = (() => {
  try {
    const dir = new URL('cli/tests/', ROOT);
    return readdirSync(dir).filter((f) => f.endsWith('.py')).reduce((n, f) => n + (readFileSync(new URL(f, dir), 'utf8').match(/^\s*def test_/gm) || []).length, 0);
  } catch { return 0; }
})();

/* ------------------------------------------------------------------ images */
// Width and height of a JPEG, read from its SOF marker, so every <img> reserves its space.
const sizes = new Map();
function jpegSize(name) {
  if (sizes.has(name)) return sizes.get(name);
  let out = null;
  try {
    const b = readFileSync(new URL(name + '.jpg', IMG));
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xFF) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) { out = { w: b.readUInt16BE(i + 7), h: b.readUInt16BE(i + 5) }; break; }
      i += 2 + b.readUInt16BE(i + 2);
    }
  } catch { out = null; }
  sizes.set(name, out);
  return out;
}
// A generated photograph, with a portrait source for phones when one exists.
function pic({ name, alt = '', portrait = null, sizes: sz = '100vw', eager = false, imgCls = '' }) {
  const n = photo(name);
  const d = jpegSize(n);
  const pd = portrait && existsSync(new URL(portrait + '.jpg', IMG)) ? jpegSize(portrait) : null;
  const src = pd ? `<source media="(max-width: 599px)" srcset="/assets/img/${portrait}-sm.jpg 720w, /assets/img/${portrait}.jpg ${pd.w}w" sizes="100vw" width="${pd.w}" height="${pd.h}">` : '';
  return `<picture>${src}<img${imgCls ? ` class="${imgCls}"` : ''} src="/assets/img/${n}.jpg" srcset="/assets/img/${n}-sm.jpg 820w, /assets/img/${n}.jpg ${d ? d.w : 1536}w" sizes="${sz}"${d ? ` width="${d.w}" height="${d.h}"` : ''} alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"></picture>`;
}
const genCap = (lang, en, zh) => `<figcaption>${esc(t(lang)(en, zh))} · ${t(lang)('generated image', '生成图像')}</figcaption>`;
// A T2-photo page header (lib.mjs ph) whose photograph reserves its space: ph() writes no width or height, so they
// are added here from the file itself (and the large file's real width goes into srcset).
function phx(opts) {
  const html = ph(opts);
  const n = opts.photo && opts.photo.name;
  const d = n && jpegSize(n);
  if (!d) return html;
  return html.replace(`<img src="/assets/img/${n}.jpg" srcset="/assets/img/${n}-sm.jpg 820w, /assets/img/${n}.jpg 1536w"`,
    `<img src="/assets/img/${n}.jpg" srcset="/assets/img/${n}-sm.jpg 820w, /assets/img/${n}.jpg ${d.w}w" width="${d.w}" height="${d.h}"`);
}
// The building's photographs as a T2 header figure: caption and alt text from PHOTOS.
const phPhoto = (lang, name) => ({ name, alt: altOf(lang, name), caption: t(lang)(...capOf(name)) });

// Plates: public-domain images. Artworks are told apart from photographs and NASA objects until plates carry `kind`.
const isArtwork = (p) => (p.kind ? p.kind === 'artwork' : !/NASA/i.test((p.institution && p.institution.name) || '') && !/photograph|negative|salted paper|albumen|platinum|silver print|daguerreotype|calotype|digital image|plaque|record cover/i.test(`${(p.medium && p.medium.en) || ''} ${(p.title && p.title.en) || ''}`));

/* ------------------------------------------------------------------ shared pieces */
const kindName = (T, i) => (i.kind === 'exhibit' ? T('Perpetual Exhibit', '永续展位') : T('Perpetual Plaque', '永续铭牌'));
export const itemPath = (i) => (i.kind === 'exhibit' ? 'exhibits/' : 'plaques/') + i.slug;
const realFirst = (a, b) => (a.example === b.example ? a.id.localeCompare(b.id) : a.example ? 1 : -1);
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const possessive = (p) => ({ she: 'her', he: 'his', they: 'their' }[p] || 'their');
const idSpan = (lang, id) => `<span class="id"><span class="vh">${t(lang)('Catalogue number ', '馆藏号 ')}</span>${esc(id)}</span>`;

function contentsLine(lang, i) {
  const T = t(lang);
  const c = i.contents || {};
  const parts = [];
  if (c.letters) parts.push(T(`${c.letters}&nbsp;letter${c.letters > 1 ? 's' : ''}`, `${c.letters}&nbsp;封信`));
  if (c.pointer) parts.push(T(`${c.pointer}&nbsp;place${c.pointer > 1 ? 's' : ''} to go`, `${c.pointer}&nbsp;个要去的地方`));
  if (c.notes) parts.push(T('handover notes', '接手交代'));
  if (c.badge) parts.push(T(`${c.badge}&nbsp;badge${c.badge > 1 ? 's' : ''}`, `${c.badge}&nbsp;枚徽章`));
  return parts.join(sep);
}

function itemStamp(lang, i, long = false) {
  const T = t(lang);
  const s = i.example ? `<span class="stamp">${long ? T('Practice · fictional', '练习用 · 虚构') : T('Practice', '练习用')}</span>` : `<span class="stamp ok">${T('Real', '真实')}</span>`;
  const consent = long && (i.consent === 'given' || i.consent === 'family') ? `<span class="stamp">${T('Consent on file', '已获同意')}</span>` : '';
  return s + consent;
}

function nextId(items, prefix) {
  const n = items.filter((i) => i.id.startsWith(prefix + '-')).map((i) => Number(i.id.slice(2))).reduce((a, b) => Math.max(a, b), 0) + 1;
  return `${prefix}-${String(n).padStart(6, '0')}`;
}

// An exhibit or plaque on a shelf. `wide` is the horizontal card used when it is alone on its shelf.
function icard(lang, i, { wide = false, heading = 'h3' } = {}) {
  const T = t(lang), L = Lx(lang);
  const meta = i.warden ? T('Behind the warden: ', '守馆人身后：') + contentsLine(lang, i) : T('Kept since ', '入藏于 ') + `<span class="tabular">${esc(i.shelved)}</span>` + (i.kind === 'exhibit' ? T(' · a successor is wanted', ' · 正在找接班人') : '');
  const img = photo(i.image);
  return `<article class="icard${wide ? ' iwide' : ''}">
  <figure class="icard-fig photo-dim">${pic({ name: img, alt: altOf(lang, img), sizes: wide ? '(min-width: 900px) 361px, 100vw' : '(min-width: 1200px) 554px, (min-width: 600px) 50vw, 100vw', imgCls: 'r-3-2' })}</figure>
  <div class="icard-text">
    <p class="idline">${idSpan(lang, i.id)}<span class="meta">${kindName(T, i)}</span>${itemStamp(lang, i)}</p>
    <${heading} class="icard-h"><a href="${href(lang, itemPath(i))}">${sg(curlQ(L(i.title)))}</a></${heading}>
    <p class="dek">${esc(curlQ(L(i.dek || i.subtitle)))}</p>
    <p class="meta">${meta}</p>
  </div>
</article>`;
}

// An adaptive shelf of exhibits or plaques: one card → 8/4 with an invitation; two → halves; three → thirds; more → quarters.
// The "this space is yours" tile only appears where it would not start a row: from 900px (four to a row) when the count
// is not a multiple of four, and below 900px (two to a row) only when the count is odd.
function itemShelf(lang, items, kind) {
  const T = t(lang);
  const list = items.filter((i) => !kind || i.kind === kind).sort(realFirst);
  const next = nextId(items, kind === 'plaque' ? 'M' : 'E');
  const to = href(lang, 'accession') + (kind ? '?kind=' + kind : '');
  const invite = `<div class="invite"><p class="id">${esc(next)}</p><p class="invite-h">${T('This space is yours.', '这一格留给你。')}</p><p class="meta">${T('Free. Stop and come back any time.', '免费。随时可以停下，回头再写。')}</p><p>${go(to, T('Hang your own here', '在这里挂上你自己的'))}</p></div>`;
  if (!list.length) return `<div class="empty"><p>${T('Nothing is hung here yet.', '这里还什么都没挂。')}</p><p>${T('The first number is waiting.', '第一个编号还空着。')}</p><p class="actions">${go(to, T('Hang the first one', '挂上第一件'))}</p></div>`;
  if (list.length === 1) return `<div class="grid shelf-one"><div class="c-main">${icard(lang, list[0], { wide: true })}</div><div class="c-aside">${invite}</div></div>`;
  const cls = list.length === 2 ? ' halves' : list.length === 3 ? ' thirds' : '';
  const cards = list.map((i) => icard(lang, i));
  if (list.length >= 4 && list.length % 4) cards.push(`<article class="icard empty-tile${list.length % 2 ? '' : ' wide-only'}">${invite}</article>`);
  const tail = list.length < 4 ? `<p class="shelf-tail meta">${T(`Room for more. The next number is ${next}.`, `还有空位。下一个编号是 ${next}。`)} <a href="${to}">${T('Hang your own', '挂上你自己的')}${ARROW}</a></p>` : '';
  return `<div class="cards${cls}">${cards.join('')}</div>${tail}`;
}

// "Precedents in the Open Stacks": a quiet row of works that already did this.
function precedentRows(lang, ctx, ids) {
  const works = ids.map((id) => ctx.open.byId.get(id)).filter(Boolean);
  return works.length ? rowList(works.map((w) => wrow(lang, w, ctx.open))) : '';
}

// The warden trial, one component on the lobby, the wardens page and every item page. site.js finds it by [data-trial].
export function trial(lang, i, { heading = '', intro = '', id = 'trial', foot = '', lamps = false, label = true } = {}) {
  const T = t(lang), L = (o) => curlQ(Lx(lang)(o));
  const w = i.warden;
  const pron = L(i.pronoun);
  const data = { id: i.id, kdf: w.kdf, locked: i.locked, questions: w.questions.map((q) => L(q.q)), greeting: L(w.greeting), name: L(w.name), example: !!i.example, kind: i.kind };
  const letterHead = i.kind === 'plaque' ? T(`${cap(pron || 'they')} wrote this for the people ${pron || 'they'} recognised:`, `${pron || '他'}写给认得出来的人：`) : T('Left for whoever takes it over:', '留给接手的人：');
  const hid = 'h-' + id;
  const kindWord = i.kind === 'plaque' ? T('plaque', '铭牌') : T('exhibit', '展位');
  const sealedNote = T('sealed · opens in this browser', '已封存 · 只在这个浏览器里打开');
  return `<section class="sec" id="${id}" aria-labelledby="${hid}" data-trial>
  <div class="wrap grid">
    <header class="sec-head c-main">${label && i.example ? `<p class="meta">${T(`Try it here · a practice ${kindWord}, `, `在这里试 · 练习用${kindWord} `)}${idSpan(lang, i.id)}</p>` : ''}<h2 id="${hid}">${heading || glue(T('Pass the warden’s trial', '通过守馆人的考验'))}</h2>${intro ? `<p class="sec-intro">${intro}</p>` : ''}</header>
    <div class="c-main trial-desk">
      <div class="box wdesk" data-warden aria-live="polite">
        <div class="wdesk-head"><span class="who">${T('Warden', '守馆人')} · ${idSpan(lang, i.id)}</span><span class="w-state" data-w-state>${T('Locked', '已上锁')}</span></div>
        <p class="wdesk-name">${esc(data.name)}${i.example ? ` <span class="meta">· ${T('scripted', '按脚本')}</span>` : ''}</p>
        <div class="w-lines" data-w-screen><p class="w-line">${esc(data.greeting)}</p>${data.questions.map((q, k) => `<p class="w-line q">${T(`Question ${k + 1}: `, `第 ${k + 1} 题：`)}${esc(q)}</p>`).join('')}</div>
        ${i.example && w.example_answers ? `<details class="examples"><summary>${i.kind === 'plaque' ? T('Never sat in her class? Show the example answers.', '没上过她的课？看看示例答案。') : T('Not an islander? Show the example answers.', '不是岛上的人？看看示例答案。')}</summary><p>${T('Example answers: ', '示例答案：')}<b>${esc(w.example_answers)}</b></p></details>` : ''}
        <p class="meta wdesk-foot">${T('Your answers become a key inside this browser. Nothing is sent.', '你的回答在这个浏览器里变成钥匙，不会发到任何地方。')}</p>
        <noscript><p class="meta">${T('Opening the door needs JavaScript, because the key is made in your browser and nothing is sent.', '开门需要 JavaScript：钥匙在你的浏览器里生成，什么都不会发出去。')}</p></noscript>
        <script type="application/json" data-warden-data>${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
      </div>
    </div>
    <div class="c-aside trial-side">
      <div class="behind" data-sealed>
        <p class="meta">${T('Behind this door', '门后')}</p>
        <p class="behind-line">${contentsLine(lang, i)}</p>
        <div class="mat sealed-preview" aria-hidden="true"></div>
        <p class="${lang === 'zh' ? 'meta' : 'id'}">${sealedNote}</p>
      </div>
      <div class="rewards" data-rewards hidden>
        <p class="r-stamp"><span class="stamp ok" data-r-stamp>${T('Recognised', '已认出')}</span></p>
        <p class="meta r-head">${letterHead}</p>
        <div class="letter frost" data-r-letter></div>
        <div class="pointer" data-r-pointer hidden><p class="meta">${T('Where it is', '东西在哪')}</p><p data-r-pointer-text></p></div>
        <div data-r-badge hidden><div class="badge-svg" data-r-badge-svg></div><button class="btn small secondary" type="button" data-r-badge-dl>${T('Download the badge', '下载徽章')}</button></div>
        <form class="lamp-form" data-lamp-form>
          <label for="lamp-${id}">${i.kind === 'plaque' ? T('Light a lamp to say you came by. A word is optional, up to 140 characters.', `点一盏灯，告诉${pron || '他'}你来过。想留一句话也可以，140 字以内。`) : T('Light a lamp to say you came by. A word is optional, up to 140 characters.', '点一盏灯，说一声你来过。想留一句话也可以，140 字以内。')}</label>
          <textarea id="lamp-${id}" maxlength="140" rows="2"></textarea>
          <button class="btn lamp" type="submit">${T('Light a lamp', '点一盏灯')}</button>
          <p class="meta" data-lamp-msg aria-live="polite"></p>
        </form>
      </div>
      ${lamps ? `<div class="lamps" data-lamps data-item="${esc(i.id)}">
        <h3 class="lamps-h">${T('Lamps', '灯')}</h3>
        <p class="meta" data-lamp-empty>${T('No lamps yet. Pass the warden to light the first.', '还没有灯。通过守馆人的考验，点亮第一盏。')}</p>
        <ul class="lamp-notes" data-lamp-notes></ul>
        ${i.example ? `<p class="meta">${i.kind === 'plaque' ? T('Lamps on a practice plaque say so.', '练习铭牌上的灯，也会标明是练习。') : T('Lamps on a practice exhibit say so.', '练习展位上的灯，也会标明是练习。')}</p>` : ''}
      </div>` : ''}
    </div>
    ${i.example ? `<p class="c-main meta honest">${i.kind === 'plaque' && /^(she|he)$/.test(Lx('en')(i.pronoun))
      ? T(`Example wardens follow a script. They quote what was written, and say “${Lx('en')(i.pronoun)} wrote”, never “I”.`, `示例守馆人目前按脚本问答。它只引用写下来的话，永远说“${Lx('zh')(i.pronoun) || '他'}写过”，不会说“我”。`)
      : T('Example wardens follow a script. They quote what was written, and say “the owner wrote”, never “I”.', '示例守馆人目前按脚本问答。它只引用写下来的话，永远说“主人写过”，不会说“我”。')}</p>` : ''}
    ${foot ? `<p class="sec-foot c-all">${foot}</p>` : ''}
  </div>
</section>`;
}

function layers(lang) {
  const T = t(lang);
  const rows = [
    ['l1', '+18&nbsp;°C', T('Public', '公开层'), T('What you choose to show. Anyone can read it.', '你选出来给人看的部分，谁都能看。')],
    ['l2', '+4&nbsp;°C', T('Recognised', '认可层'), T('Letters, notes, where things are. Locked in your browser, and opened only for people the warden recognises.', '信、交代、东西放在哪。在你的浏览器里锁好，只为守馆人认出的人打开。')],
    ['l3', '−18&nbsp;°C', T('Sealed', '封存层'), T('Things for later, sealed offline on your own computer. Opened on a date, or when your keepers agree.', '留给以后的东西，离线封存在你自己的电脑上。到了日子，或者开启人凑齐，才打开。')],
  ];
  return `<ol class="grid layers3">${rows.map(([c, temp, h, p]) => `<li class="c-third layer ${c}"><p class="id">${temp}</p><h3>${h}</h3><p>${p}</p></li>`).join('')}</ol>`;
}

function statuteRows(lang) {
  const T = t(lang);
  return [
    [T('Keys', '钥匙'), T('We hold none.', '一把都不拿。')],
    [T('What you lock', '你锁上的东西'), T('No librarian can read it. Not even No. 1.', '哪位馆员都读不到，一号馆员也不行。')],
    [T('Warden answers', '守馆人的答案'), T('They become a key in the visitor’s browser. Never sent, never stored.', '只在访客的浏览器里变成钥匙，不发出，不保存。')],
    [T('Privacy policy', '隐私政策'), T('We do not want your data. No cookies, no tracking.', '我们不要你的数据。不用 Cookie，不做追踪。')],
    [T('Fees, tokens, ads', '费用、代币、广告'), T('None of the three.', '一样都没有。')],
    [T('If the library closes', '如果本馆关门'), T('Every page is a plain file in a public repository. Anyone can put the whole library back up. Cold Vault contracts keep running without us.', '每一页都是公开仓库里的普通文件，谁都能把整座馆重新架起来；冷库合约不靠我们，照样运行。')],
    [T('The elevator', '电梯'), T('A figure of speech. The stairs are always open.', '只是一个比喻。楼梯一直开着。')],
    [T('Speaking for anyone', '替人说话'), T('A warden quotes what was written, with the date, and never speaks as anyone. No cloned voices or faces.', '守馆人只引用写下来的话并注明日期，从不冒充任何人说话。不克隆声音，不克隆面孔。')],
    [T('Deciding for anyone', '替人做决定'), T('We are not an executor or a trustee. The living decide.', '我们不是遗嘱执行人，也不是受托人。决定权在活着的人手里。')],
    [T('Legal wills', '法律遗嘱'), T('Nothing here is one. Property follows the law and your legal will.', '这里的东西都不是法律遗嘱。财产按法律和你的法律遗嘱处理。')],
    [T('Recovery phrases', '助记词'), T('No page ever asks for one, a private key or a password.', '任何页面都不会让你填助记词、私钥或密码。')],
    [T('Our notices', '我们的通知'), T('Never contain a link, never ask for money, never ask you to download anything.', '从不带链接，从不要钱，从不让你下载任何东西。')],
    [T('Plaques for others', '为别人立铭牌'), T('Only with their consent, or their close family’s if they have died. Anyone named can ask for it to come down.', '必须本人同意；本人已经不在的，需要近亲同意。被写到的人都可以请馆员撤下。')],
    [T('Age', '年龄'), T('18 and over.', '仅限 18 岁以上。')],
    [T('Your files', '你的文件'), T('Our tools never delete them.', '我们的工具从不删除你的文件。')],
  ];
}
function statutes(lang, limit = 0) {
  const rows = statuteRows(lang);
  return `<dl class="statutes">${(limit ? rows.slice(0, limit) : rows).map(([k, v], n) => `<div class="st"><dt><span class="sn">§${n + 1}</span><span class="sk">${k}</span></dt><dd>${v}</dd></div>`).join('')}</dl>`;
}

function logList(lang, log, limit = 0) {
  const T = t(lang);
  return `<ol class="loglist">${(limit ? log.slice(0, limit) : log).map((r) => `<li><time class="id" datetime="${esc(r.date)}">${esc(r.date)}</time><span>${esc(T(r.en, r.zh))}</span></li>`).join('')}</ol>`;
}

function halflife(lang) {
  const T = t(lang);
  const first = T('“Keep the website online. Renew the domain every year.”', '“网站继续开着，域名每年续费。”');
  const carried = T('“Keep the website online.” It became the oldest rule of the project.', '“网站继续开着。”后来，这成了这个项目最老的一条规矩。');
  addGlyphs(carried);
  return `<div class="box halflife" data-halflife>
  <div class="hl-status"><span>${T('Years since it took effect', '生效后')} <b class="tabular" data-hl-years>0</b> ${T('years', '年')}</span><span>${T('Stage', '阶段')} <b data-hl-stage>${T('Binding', '照办')}</b></span></div>
  <p class="hl-sentence serif" data-hl-sentence data-carried="${esc(carried)}">${serif(first)}</p>
  <input class="hl-range" type="range" min="0" max="20" step="0.5" value="0" aria-label="${T('Years since it took effect', '生效后的年数')}" data-hl-range data-labels="${esc(JSON.stringify(lang === 'zh' ? ['照办', '参考', '传承'] : ['Binding', 'Advisory', 'Carried on']))}">
  <div class="hl-ticks"><span>${T('Binding · 0–2 y', '照办 · 0–2 年')}</span><span>${T('Advisory · to 10 y', '参考 · 到第 10 年')}</span><span>${T('Carried on', '传承')}</span></div>
</div>`;
}

function vaultSteps(lang) {
  const T = t(lang);
  const rows = [
    [T('Set the plan', '定好安排'), T('Heirs, shares, and two or three keepers you trust.', '继承人、份额，再选两三位你信得过的开启人。')],
    [T('Live as usual', '照常生活'), T('Check in from your own wallet now and then. Each check-in resets the clock.', '隔一阵用自己的钱包报到一次，每次报到都重新计时。')],
    [T('If you go silent', '若你静默'), T('After the silence period (6 months by default), 2 of 3 keepers confirm. Then a 28-day veto window, in which you or any keeper can stop it.', '静默期（默认 6 个月）满后，三位开启人里有两位确认；接着是 28 天否决期，你本人或任何一位开启人都能叫停。')],
    [T('Heirs claim', '继承人领取'), T('Each heir claims only their own share, from their own wallet. No account, no ID.', '每位继承人用自己的钱包，只领自己那一份。不用注册，不用证件。')],
  ];
  return `<ol class="vsteps">${rows.map(([h, p], n) => `<li><span class="vs-n" aria-hidden="true">${n + 1}</span><div><h3>${h}</h3><p>${p}</p></div></li>`).join('')}</ol>`;
}

// A data table that becomes stacked rows on phones (each cell shows its column name).
const strip = (s) => String(s).replace(/<[^>]+>/g, '');
function dtable(head, rows, caption = '') {
  return `<div class="dtable-wrap"><table class="dtable">${caption ? `<caption class="vh">${caption}</caption>` : ''}<thead><tr>${head.map((h) => `<th scope="col">${h}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, k) => (k === 0 ? `<th scope="row">${c}</th>` : `<td data-label="${esc(strip(head[k]))}">${c}</td>`)).join('')}</tr>`).join('')}</tbody></table></div>`;
}

const libCards = (lang, ctx) => {
  const T = t(lang);
  const since2 = (ctx.open.works.map((w) => w.accessioned || (w.source && w.source.retrieved)).filter(Boolean).sort()[0]) || FOUNDED;
  return `<div class="libcards">${libCard(lang, { no: '1', role: T('Founding Librarian · Front Desk', '创始馆员 · 前台'), since: FOUNDED })}${libCard(lang, { no: '2', role: T('Claude, an AI · Curator of the Open Stacks', 'Claude（AI）· 开架书库馆员'), since: since2 })}</div>`;
};

/* ------------------------------------------------------------------ Lobby: today's reading */
// Each pick is rendered once, in full when it is verse of 16 rows or fewer, otherwise as its excerpt with a translation.
// The page language decides the script (繁 on /, 简 on /zh/) and whether a translation is shown, as on the work page.
const WIDE = /[　-〿＀-￯㐀-鿿豈-﫿]/u;
const emw = (s) => { let w = 0; for (const c of String(s)) w += WIDE.test(c) ? 1 : 0.5; return w; };
const leadOf = (l) => (String(l).match(/^[ 　]*/)[0].replace(/　/g, '  ').length) >> 1;
const verseStanzas = (src) => String(src || '').replace(/^#{2,3} .*$/gm, '').replace(/```[^\n]*\n?/g, '').trim().split(/\n\s*\n/).map((b) => b.split('\n').filter((l) => l.trim())).filter((b) => b.length);
const allSplit = (lines) => lines.length > 0 && lines.every((l) => splitCaesura(l));
const isEnText = (w) => /^en\b/.test(String(w.lang || 'en'));
const inl = (s) => esc(curl(String(s).trim())).replace(/\*\*(.+?)\*\*/g, '$1').replace(/\*([^*]+)\*/g, '<em>$1</em>');
const splitLines = (s) => String(s || '').split(/\n| \/ /).map((x) => x.trim()).filter(Boolean);
const localDay = (d = new Date()) => {
  const [y, m, dd] = FOUNDED.split('-').map(Number);
  return Math.max(1, Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(y, m - 1, dd)) / 86400000) + 1);
};
function displayRows(w) {
  const cjk = isChineseText(w);
  return verseStanzas(w.text).reduce((n, b) => n + (cjk && allSplit(b) ? 2 * b.length : b.length), 0);
}
// Pair source lines with translation lines: half-lines at the caesura when the translation has exactly twice the lines,
// line to line when the counts agree; otherwise the stanza stays whole beside its translation.
function pairBlock(o, tr, cjk) {
  if (!tr) return { rows: o.map((l) => [l, null]) };
  if (cjk && tr.length === 2 * o.length && allSplit(o)) return { rows: o.flatMap((l) => splitCaesura(l)).map((h, k) => [h, tr[k]]) };
  if (tr.length === o.length) return { rows: o.map((l, k) => [l, tr[k]]) };
  return { o, tr };
}
function pairStanzas(oSt, tSt, cjk) {
  if (!tSt) return oSt.map((b) => pairBlock(b, null, cjk));
  if (oSt.length === tSt.length) return oSt.map((b, k) => pairBlock(b, tSt[k], cjk));
  const O = oSt.flat(), Tr = tSt.flat();
  const half = cjk && Tr.length === 2 * O.length && allSplit(O);
  if (half || Tr.length === O.length) {
    let k = 0;
    return oSt.map((b) => ({ rows: (half ? b.flatMap((l) => splitCaesura(l)) : b).map((h) => [h, Tr[k++]]) }));
  }
  return [{ o: O, tr: Tr }];
}
// Side by side, row by row, from 960px, as long as the original column leaves the translation room to breathe:
// at least 260px of the 600px text area at 960, or 300px of the 747px area at 1200. Long translation lines then
// wrap inside their column with a hanging indent. Widths are estimated from the characters at the display sizes.
function fitClass(groups, oCjk) {
  let oW = 0;
  for (const g of groups) for (const s of (g.rows ? g.rows.map((r) => r[0]) : g.o)) oW = Math.max(oW, emw(s) * (oCjk ? 26 : 22));
  return oW + 48 <= 600 - 260 ? 'fit-md' : oW + 48 <= 747 - 300 ? 'fit-lg' : '';
}
function lineSpan(cls, text, lang) {
  const lead = leadOf(text);
  return `<span class="${cls}${lead ? ' i' + Math.min(lead, 4) : ''}" lang="${esc(lang)}">${inl(text)}</span>`;
}
function renderGroups(groups, oLang, tLang) {
  return groups.map((g) => (g.rows
    ? `<div class="lv-st">${g.rows.map(([o, tr]) => lineSpan('lv-o', o, oLang) + (tr != null ? lineSpan('lv-t', tr, tLang) : '')).join('')}</div>`
    : `<div class="lv-st lv-two"><div class="lv-ob">${g.o.map((l) => lineSpan('lv-o', l, oLang)).join('')}</div>${g.tr ? `<div class="lv-tb">${g.tr.map((l) => lineSpan('lv-t', l, tLang)).join('')}</div>` : ''}</div>`)).join('');
}
function todayArticle(lang, ctx, w, n, visible) {
  const T = t(lang);
  const key = 'today-' + w.id;
  const zhPage = lang === 'zh';
  const cjk = isChineseText(w);
  const both = cjk && hasHant(w) && !!w.textHans;
  const useHans = zhPage && both;
  const script = both ? (useHans ? 'hans' : 'hant') : null;
  const oLang = useHans ? 'zh-Hans' : tagOf(w.lang);
  // Register what this block sets in the serif under its own font key only. The visible pick links that key's CSS
  // itself, so the page's own font key stays the same whichever day the site is built.
  const reg = (shown, pair, scr) => {
    const s = String(shown || '');
    let base = s, only = '';
    if (scr && pair) { const other = new Set(String(pair)); base = ''; for (const c of s) (other.has(c) ? (base += c) : (only += c)); }
    addGlyphsTo(key, base, 'base'); if (only) addGlyphsTo(key, only, scr);
  };
  const inPageLang = zhPage ? cjk : isEnText(w);
  const tLang = zhPage ? 'zh-Hans' : 'en';
  const byClaude = (() => { const x = (w.translations || {})[lang]; return x === 'Claude' || (x && x.by === 'Claude'); })();
  let text = '', trShown = false;
  if (w.form === 'verse' && displayRows(w) <= 16) {
    const src = useHans ? w.textHans : w.text;
    reg(src, both ? (useHans ? w.text : w.textHans) : null, script);
    const tri = !inPageLang ? translationInto(w, lang) : null;
    const tx = tri && tri.full ? w.trans[lang] : null;
    if (tx) { reg(tx); trShown = byClaude; }
    const groups = pairStanzas(verseStanzas(src), tx ? verseStanzas(tx) : null, cjk);
    const fit = tx ? fitClass(groups, cjk) : '';
    text = `<div class="today-text lv${fit ? ' ' + fit : ''}">${renderGroups(groups, oLang, tLang)}</div>`;
  } else {
    const ex = w.excerpt || {};
    const o = useHans ? (ex.zh || ex.orig || '') : (ex.orig || '');
    reg(o, both ? (useHans ? ex.orig : ex.zh) : null, script);
    const trRaw = inPageLang ? null : (zhPage ? ex.zh : ex.en);
    const tr = trRaw && trRaw !== o ? trRaw : null;
    if (tr) { reg(tr); trShown = byClaude; }
    const oL = splitLines(o), tL = tr ? splitLines(tr) : null;
    if (w.form === 'verse' || oL.length > 1 || (tL && tL.length > 1)) {
      const groups = [pairBlock(oL, tL, cjk)];
      const fit = tL ? fitClass(groups, cjk) : '';
      text = `<div class="today-text lv${fit ? ' ' + fit : ''}">${renderGroups(groups, oLang, tLang)}</div>`;
    } else {
      text = `<blockquote class="today-text lv prose"><p class="lv-p" lang="${esc(oLang)}">${inl(o)}</p>${tr ? `<p class="lv-pt" lang="${tLang}">${inl(tr)}</p>` : ''}</blockquote>`;
    }
  }
  const tt = titles(w, lang);
  const titleScript = cjk && hasHant(w) ? (zhPage ? 'hans' : 'hant') : null;
  reg(tt.main, titleScript ? (zhPage ? w.title.orig : w.title.zh) : null, titleScript);
  const a = authorLabel(w, lang);
  const size = cjk ? T(`${num(lang, w.size.han)}&nbsp;characters`, `${w.size.han}&nbsp;字`) : T(`${num(lang, w.size.words)}&nbsp;words`, `${num(lang, w.size.words)}&nbsp;词`);
  const facts = [periodOf(w, lang) ? esc(periodOf(w, lang)) : '', esc(yearLabel(w, lang)), size, T(`${w.size.minutes}&nbsp;min`, `${w.size.minutes}&nbsp;分钟`), trShown ? T('Translated by Claude', 'Claude 译') : ''];
  const pickText = w.pick ? curlQ(typeof w.pick === 'string' ? w.pick : (w.pick[lang] || w.pick.en || '')) : '';
  // Chinese quoted inside an English note is tagged with the text's own script.
  const pick = pickText ? (zhPage ? esc(pickText) : hanLang(esc(pickText), cjk ? tagOf(w.lang) : 'zh-Hant')) : '';
  const css = fontCssHref(key);
  return `<article class="today grid" data-id="${esc(w.id)}" data-font="${esc(css)}"${visible ? '' : ' hidden'}>
  ${visible && css ? `<link rel="stylesheet" href="${esc(css)}">` : ''}<header class="today-head">
    <p class="meta">${T('Today’s reading', '今日一读')}${sep}<span class="brass">${T(`Claude’s shelf, No.&nbsp;${n}`, `Claude 的书架 第&nbsp;${n}&nbsp;号`)}</span></p>
    <h3 class="today-title"><span class="serif" lang="${esc(tagOf(tt.mainLang))}">${glue(curl(tt.main))}</span></h3>
    ${tt.sub ? `<p class="today-sub">${glue(curl(tt.sub))}</p>` : ''}
    <p class="today-by">${esc(curl(a.name))}${a.orig && !(zhPage && /^[㐀-鿿豈-﫿·・（）()\s]+$/.test(a.orig)) ? ` <span lang="${esc(tagOf(w.lang))}">${esc(a.orig)}</span>` : ''}${a.dates ? ` · <span class="tabular">${esc(a.dates)}</span>` : ''}</p>
    ${metaLine(facts)}
  </header>
  ${text}
  <div class="today-pick">
    ${pick ? `<p class="today-why">${pick}</p>` : ''}
    <p class="actions">${go(workHref(lang, w), T('Read it', '读全文'))}<button class="linkish" type="button" data-today-next hidden>${T('Another from Claude’s shelf', '从 Claude 的书架上再抽一部')}<span class="nw">&nbsp;↻</span></button></p>
  </div>
</article>`;
}
function todaySection(lang, ctx) {
  const picks = ctx.open.picks || [];
  if (!picks.length) return '';
  const k = (localDay() - 1) % picks.length;
  return `<section class="sec" id="today" aria-labelledby="h-today">
  <div class="wrap">
    <h2 id="h-today" class="vh">${t(lang)('Today’s reading', '今日一读')}</h2>
    ${picks.map(({ n, work }, i) => todayArticle(lang, ctx, work, n, i === k)).join('\n')}
  </div>
</section>`;
}

/* ------------------------------------------------------------------ Lobby: the Open Stacks */
// The block comes from the Open Stacks pages (lists.mjs shelfSectionParts), so the lobby and /open-stacks never
// disagree. If that module fails, the lobby still shows its shelves from the shared components.
function openStacks(lang, ctx) {
  const T = t(lang);
  try {
    if (typeof lists.shelfSectionParts === 'function') {
      const p = lists.shelfSectionParts(lang, ctx);
      if (p && p.body) return sec({ id: p.id || 'open-stacks', h: p.h || T('The Open Stacks', '开架书库'), intro: p.intro || '', body: p.body, foot: p.foot || '' });
    }
    if (typeof lists.shelfSection === 'function') {
      const html = lists.shelfSection(lang, ctx) || '';
      if (html) return /<section[\s>]/.test(html) ? html : sec({ id: 'open-stacks', h: T('The Open Stacks', '开架书库'), body: html });
    }
  } catch (e) { console.warn('lobby: the Open Stacks block from lists.mjs failed, using the fallback:', e.message); }
  const c = counts(ctx.open);
  const span = Math.floor((c.max - c.min) / 100) * 100;
  const trails = ctx.open.trails || [];
  const trailLine = trails.length
    ? `<p class="lobby-trails meta">${T('Reading trails: ', '书单：')}${trails.slice(0, 3).map((tr) => `<a href="${href(lang, 'open-stacks/trails/' + tr.slug)}">${esc(tr.title[lang] || tr.title.en)}</a>`).join(sep)}${sep}<a href="${href(lang, 'open-stacks/trails')}">${T('all trails', '全部书单')}${ARROW}</a></p>`
    : '';
  return sec({
    id: 'open-stacks',
    h: T('The Open Stacks', '开架书库'),
    intro: T(`${num(lang, c.works)} works · ${num(lang, c.authors)} authors · ${num(lang, c.plates)} plates, written over more than ${num(lang, span)} years. Every one says why it is free to share.`, `${c.works} 部作品 · ${c.authors} 位作者 · ${c.plates} 幅图版，跨越 ${span} 多年。每一部都写明了为什么可以自由传播。`),
    body: `<div class="cards thirds lobby-shelves">${SHELVES.map((s) => shelfCard(lang, s.key, ctx.open)).join('')}</div>
<div class="grid lobby-find"><div class="c-main">${searchBox(lang)}<p class="lobby-random">${go(href(lang, 'open-stacks/random'), T('A random work', '随便读一部'))}</p></div></div>${trailLine}`,
    foot: go(href(lang, 'open-stacks'), T(`Browse all ${num(lang, c.works)} works`, `浏览全部 ${c.works} 部作品`)),
  });
}

/* ------------------------------------------------------------------ Lobby */
page({
  slug: '',
  title: { en: 'Lobby', zh: '大厅' },
  description: {
    en: 'An open library of real works anyone may read, and room for what is yours: a perpetual exhibit for your work, a perpetual plaque for a person, and an AI warden at each door.',
    zh: '一座谁都能读的开架图书馆，也给你的东西留了位置：给作品一个永续展位，给人一块永续铭牌，每扇门口站着一位 AI 守馆人。',
  },
  render: (lang, ctx) => {
    const T = t(lang);
    const c = counts(ctx.open);
    const lin = ctx.items.find((i) => i.id === 'M-000001');
    const h1 = lang === 'zh' ? '收藏属于你的一切，<br>把你的意志传<span class="nw">下去。</span>' : 'Keep what is yours. <br>Carry on what <span class="nw">you meant.</span>';
    const hero = `<section class="sec hero" aria-labelledby="h-hero">
  <div class="wrap grid"><div class="c-main">
    <h1 id="h-hero">${h1}</h1>
    <p class="lede">${T(`Start in an open library of ${num(lang, c.works)} real works anyone may read, then hang your own beside them.`, `先走进一座开架图书馆：${c.works} 部谁都能读的真实作品；再把你自己的挂在它们旁边。`)}</p>
    <div class="actions"><a class="btn" href="${href(lang, 'accession')}">${T('Hang your own', '挂上你自己的')}</a>${go(href(lang, 'open-stacks'), T('Enter the Open Stacks', '走进开架书库'))}</div>
  </div></div>
  <figure class="hero-band photo-dim">${pic({ name: 'lake-library', portrait: 'lake-library-portrait', alt: altOf(lang, 'lake-library'), eager: true, imgCls: 'r-21-9 op-lake' })}<figcaption class="wrap">${T('The library on the lake · generated image', '湖上的图书馆 · 生成图像')}</figcaption></figure>
</section>`;

    const product = (name, kind, slug) => {
      const [capEn, capZh] = capOf(name);
      const ex = kind === 'exhibit';
      return `<article class="product">
    <figure class="photo-dim">${pic({ name, alt: altOf(lang, name), sizes: '(min-width: 1200px) 554px, (min-width: 600px) 50vw, 100vw', imgCls: 'r-3-2' })}${genCap(lang, capEn, capZh)}</figure>
    <p class="meta">${ex ? T('For a project or a life’s work', '给一个项目，或一生的作品') : T('For a person, living or not', '给一个人，在世与否都可以')}</p>
    <h3 class="serif">${sg(ex ? T('Perpetual Exhibit', '永续展位') : T('Perpetual Plaque', '永续铭牌'))}</h3>
    <p>${ex ? T('A standing room for a project: what it is, why it mattered, and who carries it on.', '给一个项目一间常设展厅：它是什么、为什么重要、谁在接着做。') : T('A short record of who someone is and what they care about. Most plaques here belong to people who are very much alive.', '简短地记下一个人是谁、在乎什么。这里大多数铭牌的主人都还好好活着。')}</p>
    <p class="meta">${ex ? T('Free · stop and come back any time', '免费 · 随时停下，回头再写') : T('Free · for someone else, only with their consent', '免费 · 给别人做，须经本人同意')}</p>
    <p>${go(href(lang, slug), ex ? T('See the exhibits', '看看展位') : T('See the plaques', '看看铭牌'))}</p>
  </article>`;
    };
    const products = `<div class="cards halves products">
  ${product('exhibit-hall', 'exhibit', 'exhibits')}
  ${product('plaque-hall', 'plaque', 'plaques')}
</div>`;
    const prec = precedentRows(lang, ctx, ['S-008019', 'S-008001', 'S-008012']);
    const hang = sec({
      id: 'hang',
      h: glue(T('Two things you can hang here', '你可以在这里挂两样东西')),
      intro: T('Cold Library gives your work a perpetual exhibit and a person a perpetual plaque. Anyone can read what you choose to show; the rest waits behind an AI warden, and only people who can answer its questions receive what you left for them. We keep the library, never the keys.', '冷冻图书馆给作品一个永续展位，给人一块永续铭牌：你愿意公开的，谁都能看；其余的交给门口的 AI 守馆人，只有答得上它问题的人，才能拿到你留下的东西。我们守着图书馆，从不保管钥匙。'),
      body: `${products}
<div class="hang-layers"><p class="meta">${T('Each one has a warden at the door, and three layers.', '每一件门口都有一位守馆人，分三层存放。')} <a href="${href(lang, 'about')}#name">${T('Why it is called a cold library', '为什么叫冷冻图书馆')}${ARROW}</a></p>${layers(lang)}</div>
${prec ? `<div class="hang-prec"><p class="meta">${T('People have always done this.', '人们一直在这样做。')}</p>${prec}</div>` : ''}`,
    });

    const how = sec({
      id: 'how',
      h: glue(T('Write it. Set the question. Hang it.', '写下来，出一道题，挂上去。')),
      body: `<ol class="grid how3">
  <li class="c-third"><span class="how-n" aria-hidden="true">1</span><h3>${T('Write it', '写下来')}</h3><p>${T('What anyone may see, and what only the right people may read.', '给所有人看的，和只给对的人看的。')}</p></li>
  <li class="c-third"><span class="how-n" aria-hidden="true">2</span><h3>${T('Set the question', '出题')}</h3><p>${T('One to three things only they would know.', '一到三个只有他们知道的问题。')}</p></li>
  <li class="c-third"><span class="how-n" aria-hidden="true">3</span><h3>${T('Hang it', '挂上去')}</h3><p>${T('A librarian reads it once, then it goes up with its number. Your warden takes the door from there.', '馆员看一遍，就带着编号挂上墙。门口交给守馆人。')}</p></li>
</ol>
<div class="grid"><form class="c-main box starter" action="${href(lang, 'accession')}" method="get" data-starter>
  <p class="starter-title">${T('Start here. Nothing leaves this browser until you send it.', '从这里开始。点发送之前，什么都不会离开这个浏览器。')}</p>
  <div class="starter-row">
    <div class="seg" role="radiogroup" aria-label="${T('Kind', '类别')}"><input type="radio" id="sk-exhibit" name="kind" value="exhibit" checked><label for="sk-exhibit">${T('A project', '一个项目')}</label><input type="radio" id="sk-plaque" name="kind" value="plaque"><label for="sk-plaque">${T('A person', '一个人')}</label></div>
    <label class="vh" for="starter-title">${T('Title', '标题')}</label><input id="starter-title" type="text" maxlength="60" placeholder="${T('Name of the project, or the name on the plaque', '项目的名字，或铭牌上的名字')}" autocomplete="off" data-starter-title>
    <button class="btn" type="submit">${T('Continue at the front desk', '去前台接着写')}</button>
  </div>
  <p class="meta">${T('Your draft stays in this browser only.', '草稿只存在这个浏览器里。')}</p>
</form></div>`,
    });

    const vault = sec({
      id: 'vault',
      side: true,
      h: glue(T('And for crypto assets: Cold Vault', '如果有加密资产：冷库')),
      intro: `<span class="dotline amber">${T('Sepolia testnet · source verified · not audited · do not deposit real funds', 'Sepolia 测试网 · 源码已验证 · 未经审计 · 请勿存入真实资产')}</span>`,
      body: `<p class="lead-p">${T('A Cold Vault is a contract you deploy yourself. You alone choose the heirs and their shares, and you can take everything back at any time. The library has no key to it and takes no fee.', '冷库是你自己部署的一份合约。继承人是谁、各分多少，只由你决定，你随时可以全部取回。图书馆没有它的钥匙，也不收任何费用。')}</p>
${vaultSteps(lang)}
<p class="meta">${T('Not offered where it is not legal, including mainland China.', '在法律不允许的地方不提供，包括中国大陆。')}</p>
<p class="actions">${go(href(lang, 'vault') + '#how', T('How it works', '看它怎么运作'))}${go(href(lang, 'collect') + '#vault', T('Someone left me a vault', '有人给我留了一个冷库'))}</p>`,
    });

    const trust = `<section class="sec trust" id="trust" aria-label="${T('Why trust it', '为什么可以放心')}">
  <div class="wrap grid">
    <div class="c-half trust-rules">
      <h2>${glue(T('House rules, abridged', '馆规（摘录）'))}</h2>
      ${statutes(lang, 6)}
      <p class="custody serif">${sg(T('We keep the library, never the keys.', '我们守着图书馆，从不保管钥匙。'))}</p>
      ${metaLine([T('Keys held 0', '保管的钥匙 0'), T('Fees 0', '手续费 0'), 'Cookie 0', ctx.tests ? T(`Contract tests ${ctx.tests}`, `合约测试 ${ctx.tests}`) : '', T('Independent audits 0, yet', '独立审计 0（暂无）')])}
      <p class="meta">${T('Nothing here is a legal will. 18+ only.', '这里的东西都不是法律遗嘱。仅限 18 岁以上。')}</p>
      <p>${go(href(lang, 'rules'), T('All house rules and the ledger', '全部馆规和账本'))}</p>
    </div>
    <div class="c-half trust-keepers">
      <h2>${glue(T('Who keeps this place', '谁在照看这里'))}</h2>
      <p class="sec-intro">${T('Two librarians, for now. No. 1 built the library to keep his own things first. No. 2 is Claude, an AI, who curates the Open Stacks. A second human maintainer is wanted.', '目前有两位馆员。一号馆员建起这座馆，最先是为了放他自己的东西。二号馆员是 Claude，一个 AI，负责整理开架书库。还在找第二位人类维护者。')}</p>
      ${libCards(lang, ctx)}
      <p>${go(href(lang, 'librarians/join'), T('Get a librarian card · one minute, no test', '领一张馆员证 · 一分钟，不考试'))}</p>
      <h3>${T('Library log', '馆务日志')}</h3>
      ${logList(lang, ctx.log, 3)}
      <p>${go(href(lang, 'about') + '#log', T('All entries', '全部记录'))}</p>
    </div>
  </div>
</section>`;

    const closing = `<section class="sec closing" aria-labelledby="h-closing">
  <div class="wrap">
    <h2 id="h-closing" class="closing-line serif">${sg(T('The lights stay on.', '灯一直亮着。'))}</h2>
    <div class="actions"><a class="btn" href="${href(lang, 'accession')}">${T('Hang your own', '挂上你自己的')}</a>${go(href(lang, 'collect'), T('Someone left you something? The Collection Desk', '有人给你留了东西？去领取处'))}</div>
  </div>
</section>`;

    return [
      act(hero + todaySection(lang, ctx) + openStacks(lang, ctx), { cls: 'act-hero' }),
      lin ? act(trial(lang, lin, {
        heading: glue(T('Pass the warden’s trial. Unlock what was left for you.', '通过守馆人的考验，解锁前辈留下的财富。')),
        intro: T('Ms Lin taught maths for thirty-one years. Behind her plaque she left a letter for her students, and one thing to collect. Her warden asks two questions only a student of hers could answer.', '林老师教了三十一年数学。她在铭牌后面给学生留了一封信，还有一样东西可以去领。她的守馆人只问两道题，只有她教过的学生答得上来。'),
        foot: go(href(lang, itemPath(lin)), T('Open her whole plaque', '看她完整的铭牌')),
      }), { alt: true }) : '',
      act(hang + how),
      act(vault + trust, { alt: true }),
      act(closing),
    ].join('\n');
  },
});

/* ------------------------------------------------------------------ Exhibits and Plaques */
// Projects still running although a founder or core maker is gone. Start years only where the 2026-10-04 research sourced them.
const STILL_RUNNING = [
  { since: '1993', work: 'Debian', now_en: 'Thousands of volunteers and a release team keep it going.', now_zh: '成千上万的志愿者和发布团队让它继续运转。', src: 'https://www.debian.org/intro/about' },
  { since: '1998', work: 'Boost C++', now_en: 'Library authors and the community; releases continue.', now_zh: '各库作者和社区共同维护，仍在持续发版。', src: 'https://www.boost.org/' },
  { since: '2007', work: 'ZeroMQ', now_en: 'An open team still merges fixes and security patches.', now_zh: '开放团队仍在合并修复和安全补丁。', src: 'https://github.com/zeromq/libzmq' },
  { since: '', work: 'NetHack', now_en: 'The NetHack DevTeam still ships releases; 5.0 came out in 2026.', now_zh: 'NetHack DevTeam 仍在发版，2026 年出了 5.0。', src: 'https://www.nethack.org/' },
  { since: '', work: 'Erlang/OTP', now_en: 'The Erlang/OTP team ships releases; OTP 29.1 came in September 2026.', now_zh: 'Erlang/OTP 团队持续发版，2026 年 9 月发布 OTP 29.1。', src: 'https://www.erlang.org/about' },
  { since: '', work: 'Vim', now_en: 'Christian Brabandt and the Vim team; patches land almost daily.', now_zh: 'Christian Brabandt 和 Vim 团队维护，几乎每天都有补丁。', src: 'https://www.vim.org/' },
  { since: '', work: 'Alpine (Pine)', now_en: 'Maintained by Eduardo Chappa, with commits in 2026.', now_zh: '由 Eduardo Chappa 维护，2026 年仍有提交。', src: 'https://alpineapp.email/' },
  { since: '', work: 'Rake', now_en: 'Maintained by Hiroshi Shibata; v13.4.2 in April 2026.', now_zh: '由 Hiroshi Shibata 维护，2026 年 4 月发布 v13.4.2。', src: 'https://github.com/ruby/rake' },
  { since: '', work: 'J', now_en: 'Jsoftware and its contributors, with commits in 2026.', now_zh: 'Jsoftware 和贡献者维护，2026 年仍有提交。', src: 'https://www.jsoftware.com/' },
];
const nrows = (items) => `<ol class="nrows">${items.map((x) => `<li>${x}</li>`).join('')}</ol>`;
// A catalogue-number lookup (site.js [data-lookup]): E-/M- items through /items/index.json, S-/G- through
// /open-stacks/index.json, and the house papers (S-000001 …), which the search index leaves out, from data-papers.
function lookupForm(lang, ctx, id, placeholder) {
  const T = t(lang);
  const papers = Object.fromEntries((ctx.open.papers || []).filter((p) => p.id && p.slug).map((p) => [p.id, 'open-stacks/' + p.slug]));
  return `<form class="lookup" data-lookup data-papers="${esc(JSON.stringify(papers))}"><label class="vh" for="${id}">${T('Catalogue number', '馆藏号')}</label><input id="${id}" type="text" placeholder="${esc(placeholder)}" autocomplete="off" autocapitalize="characters" spellcheck="false" required><button class="btn small" type="submit">${T('Go', '去看看')}</button></form>
    <p class="meta lookup-msg" data-lookup-msg aria-live="polite"></p>`;
}

page({
  slug: 'exhibits',
  title: { en: 'Exhibits', zh: '展位' },
  description: { en: 'Perpetual exhibits: a standing room for a project or a life’s work, with notes for whoever carries it on behind an AI warden.', zh: '永续展位：给一个项目、一生作品的常设展厅，留给接手的人的话放在 AI 守馆人身后。' },
  image: '/assets/img/exhibit-hall.jpg',
  render: (lang, ctx) => {
    const T = t(lang);
    const prec = precedentRows(lang, ctx, ['S-008019', 'S-008012', 'S-007010']);
    return [
      phx({
        lang,
        h1: glue(T('Perpetual Exhibits', '永续展位')),
        lede: T('A standing room for a project or a life’s work: what it is, why it mattered, who carries it on. Notes for whoever takes it over wait behind the warden.', '给一个项目、一生的作品一间常设展厅：它是什么、为什么重要、谁在接着做。留给接手的人的话，放在守馆人身后。'),
        actions: `<a class="btn" href="${href(lang, 'accession')}?kind=exhibit">${T('Start my exhibit', '开始我的展位')}</a>`,
        photo: phPhoto(lang, 'exhibit-hall'),
      }),
      act(sec({ id: 'on-display', h: T('On display', '展出中'), body: itemShelf(lang, ctx.items, 'exhibit') })),
      act(sec({
        id: 'how-to', side: true,
        h: glue(T('How to write an exhibit', '展位怎么写')),
        body: nrows([
          T('One line a stranger understands. Then the story, in your own words.', '先写一行陌生人也看得懂的话，再用你自己的话写它的故事。'),
          T('Behind the warden: what whoever takes it over should know first, and what they should never change.', '守馆人身后：接手的人最先该知道什么，千万别改什么。'),
          T('Where the domain, the servers and the accounts are, and who to ask. Never passwords.', '域名、服务器、账号在哪，找谁。从不写密码。'),
          T('A badge for your successor, so they can show they were chosen.', '给接班人一枚徽章，他可以拿出来证明自己是被选中的。'),
        ]),
        foot: go(href(lang, 'accession') + '?kind=exhibit', T('Start my exhibit', '开始我的展位')),
      }) + sec({
        id: 'still-running', side: true,
        h: T('Still running', '仍在运转'),
        intro: T('Projects whose founder or a core maker is gone, and which others carry on. Facts checked on 2026-10-04, each with a source.', '这些项目的创始人或核心作者已经不在，别人接着把它们做了下去。2026-10-04 核实，每条都有出处。'),
        body: `<ul class="still">${STILL_RUNNING.map((r) => `<li><p class="still-h"><b>${esc(r.work)}</b>${r.since ? ` <span class="meta">${T('since ', '始于 ')}<span class="tabular">${r.since}</span></span>` : ''}</p><p class="still-p">${esc(T(r.now_en, r.now_zh))}</p><a class="still-src meta" href="${r.src}" rel="noopener">${T('Source', '出处')}<span class="vh">: ${esc(r.work)}</span></a></li>`).join('')}</ul>
<p class="meta still-tip">${T('One setting worth five minutes: GitHub lets you name a successor (Settings → Account → Successor settings) who can archive or transfer your public repositories. Put the rest in your exhibit.', '值得花五分钟的一个设置：GitHub 可以指定一位继任者（Settings → Account → Successor settings），他可以归档或转移你的公开仓库。其余的，写进你的展位。')} ${ext('https://docs.github.com/en/account-and-profile/concepts/personal-repository-access-and-collaboration', T('GitHub docs', 'GitHub 文档'))}</p>`,
      }), { alt: true }),
      prec ? act(sec({
        id: 'precedents',
        h: glue(T('Precedents in the Open Stacks', '开架书库里的先例')),
        intro: T('People made exhibits of their work long before this library. These are on our shelves, free to read.', '早在这座馆出现之前，人们就在给自己的作品留下这样的展位。这几件就在书库里，谁都能读。'),
        body: prec,
      })) : '',
    ].join('\n');
  },
});

page({
  slug: 'plaques',
  title: { en: 'Plaques', zh: '铭牌' },
  description: { en: 'Perpetual plaques: a short record of who someone is and what they care about. Most belong to people who are very much alive.', zh: '永续铭牌：简短地记下一个人是谁、在乎什么。这里大多数铭牌的主人都还好好活着。' },
  image: '/assets/img/plaque-hall.jpg',
  render: (lang, ctx) => {
    const T = t(lang);
    const prec = precedentRows(lang, ctx, ['S-008001', 'S-008011', 'S-008020']);
    return [
      phx({
        lang,
        h1: glue(T('Perpetual Plaques', '永续铭牌')),
        lede: T('A plaque is not an obituary. It is a short record of who someone is and what they care about, kept where the people they recognise can find it. Most plaques here belong to people who are very much alive.', '铭牌不是讣告。它简短地记下一个人是谁、在乎什么，放在他认得的人找得到的地方。这里大多数铭牌的主人都还好好活着。'),
        actions: `<a class="btn" href="${href(lang, 'accession')}?kind=plaque">${T('Start a plaque', '开始一块铭牌')}</a>`,
        photo: phPhoto(lang, 'plaque-hall'),
      }),
      act(sec({ id: 'on-the-wall', h: T('On the wall', '墙上'), body: itemShelf(lang, ctx.items, 'plaque') })),
      act(sec({
        id: 'how-to', side: true,
        h: glue(T('How to write a plaque', '铭牌怎么写')),
        body: nrows([
          T('A name or a pen name, and one line: what they are known for.', '一个名字或笔名，再加一行：大家因为什么记得这个人。'),
          T('Behind the warden: a letter, a story, where a keepsake is and who to ask.', '守馆人身后：一封信、一段故事、某件纪念物放在哪找谁领。'),
          T('Questions only the right people could answer: a room number, a nickname, a street.', '只有对的人答得上的问题：一个门牌号、一个外号、一条街名。'),
          T('Lamps are not likes. Only people the warden recognises can light one.', '灯不是点赞。只有守馆人认出的人才能点。'),
        ]),
        foot: go(href(lang, 'accession') + '?kind=plaque', T('Start a plaque', '开始一块铭牌')),
      }) + sec({
        id: 'consent', side: true,
        h: T('Consent', '同意'),
        body: `<p class="consent-p"><span class="stamp">${T('Consent on file', '已获同意')}</span> ${T('A plaque for someone else needs their consent, or, for someone who has died, their close family’s. It carries this stamp where everyone can see it, and anyone named can ask for it to come down.', '为别人立铭牌，需要本人同意；本人已经不在的，需要近亲同意。这样的铭牌上会有这个看得见的印章，被写到的人都可以请馆员撤下。')}</p>`,
      }), { alt: true }),
      prec ? act(sec({
        id: 'precedents',
        h: glue(T('Precedents in the Open Stacks', '开架书库里的先例')),
        intro: T('People have set plaques for each other, and for themselves, for a long time. These are on our shelves, free to read.', '人们为彼此、也为自己立牌留字，由来已久。这几件就在书库里，谁都能读。'),
        body: prec,
      })) : '',
    ].join('\n');
  },
});

/* ------------------------------------------------------------------ Wardens */
page({
  slug: 'wardens',
  title: { en: 'Wardens', zh: '守馆人' },
  description: { en: 'Each exhibit and plaque has an AI warden at the door. It quotes what was written, asks what only the right people know, and hands over what was left. It never speaks as anyone.', zh: '每个展位和铭牌门口都有一位 AI 守馆人。它引用写下来的话，问只有对的人知道的事，再把留下的东西交出去。它从不冒充任何人。' },
  image: '/assets/img/lake-reading.jpg',
  render: (lang, ctx) => {
    const T = t(lang);
    const ferry = ctx.items.find((i) => i.id === 'E-000001');
    const can = [T('Letters and stories the owner wrote', '主人写下的信和故事'), T('Notes for whoever takes a project over', '给接手项目的人的交代'), T('Directions: where something is, and who to ask', '指引：东西在哪、找谁'), T('A badge, such as successor or student', '一枚徽章，比如接班人、学生'), T('The right to light a lamp and leave a word', '点一盏灯、留一句话的资格')];
    const never = [T('Keys, recovery phrases or passwords', '钥匙、助记词或密码'), T('Money or crypto assets (those live in the owner’s own Cold Vault)', '钱或加密资产（它们在主人自己的冷库合约里）'), T('Anything the owner did not write', '主人没写下的任何东西'), T('A voice or a face. It says “they wrote”, never “I”.', '声音或面孔。它只说“他写过”，从不说“我”。')];
    return [
      phx({
        lang,
        h1: T('Wardens', '守馆人'),
        lede: T('Every exhibit and every plaque has a warden at the door, working from the owner’s rules and the owner’s words.', '每个展位、每块铭牌门口都有一位守馆人，按主人的规矩、用主人的原话办事。'),
        photo: phPhoto(lang, 'lake-reading'),
      }),
      act(sec({
        id: 'status',
        h: T('Honest status', '实话实说'),
        intro: T('Working today: wardens with fixed questions and answers, scripted. Next: wardens that hold a conversation and quote the owner’s own words. Either way the rules are the owner’s, and the key never leaves the visitor’s browser.', '现在能用的：问题和答案固定、按脚本走的守馆人。下一步：能对话、引用主人原话的守馆人。无论哪种，规矩都由主人定，钥匙都不离开访客的浏览器。'),
        body: `<div class="grid can-never">
  <div class="c-half"><h3>${T('A warden can hand over', '守馆人可以交出去的')}</h3><ul class="ticklist">${can.map((x) => `<li class="dotline ok">${x}</li>`).join('')}</ul></div>
  <div class="c-half"><h3>${T('A warden can never hand over', '守馆人永远交不出去的')}</h3><ul class="ticklist">${never.map((x) => `<li class="dotline no">${x}</li>`).join('')}</ul></div>
</div>`,
      }) + sec({
        id: 'decides', side: true,
        h: T('How it decides', '它怎么判断'),
        body: `<p class="lead-p">${T('The answers are normalised (case, spaces and punctuation ignored) and turned into a key with PBKDF2-SHA256, 210,000 rounds, in the visitor’s browser. If the key opens the AES-256-GCM lock, the door opens. Nobody else is asked.', '答案先统一格式（不计大小写、空格和标点），再在访客的浏览器里用 PBKDF2-SHA256 跑 210,000 轮变成钥匙。钥匙能打开 AES-256-GCM 的锁，门就开了。不问任何别人。')}</p>`,
      })),
      ferry ? act(trial(lang, ferry, {
        id: 'try',
        heading: T('Try another warden', '再试一位守馆人'),
        intro: T('Mira wrote a small ferry timetable app for her island and left notes for whoever takes it over. Her warden asks two questions only an islander would know.', '米拉给她的小岛写了一个渡轮时刻表小程序，给接手的人留了交代。她的守馆人只问两道题，只有岛上的人知道。'),
        foot: `${go(href(lang, itemPath(ferry)), T('Open the whole exhibit', '看完整的展位'))}`,
      }), { alt: true }) : '',
      act(sec({
        id: 'kinds',
        h: T('Kinds of trial', '考验的方式'),
        body: `<dl class="tomb kinds">
  <dt>${T('Questions', '问题')}</dt><dd><span class="stamp ok">${T('Working today', '现在能用')}</span> ${T('One to three questions; the answers form the key.', '一到三个问题，答案本身就是钥匙。')}</dd>
  <dt>${T('A named list', '指定名单')}</dt><dd><span class="stamp brass">${T('Next', '下一步')}</span> ${T('People named by email receive a code.', '按邮箱指定的人会收到验证码。')}</dd>
  <dt>${T('Contribution', '贡献记录')}</dt><dd><span class="stamp muted">${T('Planned', '计划中')}</span> ${T('Proof of real work on a project, such as merged changes.', '对项目真实贡献的证明，比如被合并的改动。')}</dd>
</dl>`,
        foot: go(href(lang, 'accession'), T('Give your own things a warden', '给你自己的东西也配一位守馆人')),
      })),
    ].join('\n');
  },
});

/* ------------------------------------------------------------------ Cold Vault */
page({
  slug: 'vault',
  title: { en: 'Cold Vault', zh: '冷库' },
  description: { en: 'A non-custodial smart contract you deploy yourself. You alone choose heirs and shares; keepers confirm a silence; heirs claim with their own wallets. Sepolia testnet only, not audited.', zh: '你自己部署的非托管智能合约。继承人和份额只由你决定；开启人确认静默；继承人用自己的钱包领取。目前只在 Sepolia 测试网，未经审计。' },
  image: '/assets/img/vault-key.jpg',
  render: (lang, ctx) => {
    const T = t(lang);
    const faq = [
      [T('Can my heirs take it while I am still here?', '我还在的时候，继承人能拿走吗？'), T('No. Only after the silence period, two keepers and the veto window. One check-in from you cancels everything pending.', '不能。要等静默期满、两位开启人确认、再过否决期。你只要报到一次，所有没走完的流程都会撤回。')],
      [T('What does it cost?', '要多少钱？'), T('No fee. You pay only the network’s own transaction costs.', '不收费。你只付区块链网络本身的手续费。')],
      [T('What if Cold Library disappears?', '如果冷冻图书馆没了怎么办？'), T('The contract lives on-chain with no admin. Heirs can claim from any wallet through a block explorer. The steps are also in the public repository.', '合约在链上，没有管理员。继承人可以用任何钱包、通过区块浏览器自己领取。步骤也写在公开仓库里。')],
      [T('Why not just write the recovery phrase in my will?', '为什么不直接把助记词写进遗嘱？'), T('Anyone who reads it can take everything, at any time, including while you are alive. A vault pays only the registered wallets, only by the rules.', '谁读到它，谁就能随时拿走全部，包括在你还在的时候。冷库只付给登记过的钱包，只按规则付。')],
    ];
    const compare = dtable(
      ['', T('Cold Vault', '冷库'), T('Phrase in a will', '助记词写进遗嘱'), T('A friend keeps the key', '朋友替你保管钥匙')],
      [
        [T('Who can move it while you are here', '你在时谁能动它'), T('Only you', '只有你'), T('Whoever reads it', '谁读到谁能动'), T('Your friend', '你的朋友')],
        [T('Needs us to keep working', '需要我们一直在'), T('No', '不需要'), '—', '—'],
        [T('Fee', '费用'), T('None', '无'), T('A lawyer’s', '律师费'), T('None', '无')],
        [T('Heirs need ID', '继承人要证件'), T('No, their own wallet', '不要，用自己的钱包'), T('Usually', '通常要'), T('No', '不要')],
      ],
      T('Cold Vault compared with other ways', '冷库与其他做法的比较'),
    );
    const contract = dtable(
      [T('Contract', '合约'), T('Network', '网络'), T('Test functions', '测试函数'), T('Audit', '审计'), T('Source', '源码')],
      [['ColdVault v0.1', 'Sepolia', ctx.tests ? `<span class="tabular">${ctx.tests}</span>` : '—', `<b>${T('Not yet', '还没有')}</b>`, `<a href="https://sepolia.etherscan.io/address/0x70C3C28db630e3A324db800f6f346e1aFdcE0cA3" rel="noopener">${T('verified', '已验证')}</a>`]],
      T('The contract', '合约'),
    );
    return [
      phx({
        lang,
        h1: T('Cold Vault', '冷库'),
        lede: T('A contract you deploy for yourself. You alone choose who receives what, and when. The library never holds it, cannot open it, and takes nothing from it.', '你自己部署的一份合约。给谁、给多少、什么时候给，只由你决定。图书馆从不拿着它，打不开它，也不从里面拿一分钱。'),
        advisory: T('Sepolia testnet · source verified · not audited · do not deposit real funds', 'Sepolia 测试网 · 源码已验证 · 未经审计 · 请勿存入真实资产'),
        photo: phPhoto(lang, 'vault-key'),
      }),
      act(sec({
        id: 'plain',
        h: T('In plain words', '先说清楚几个词'),
        body: `<p class="lead-p measure">${T('A wallet is your own account on a blockchain. A contract is a program nobody can change. A testnet is a practice network with no real money. Cold Vault is not offered where it is not legal, including mainland China, and a vault is not a legal will.', '钱包是你自己在区块链上的账户；合约是一段谁都改不了的程序；测试网是没有真钱的练习网络。在法律不允许的地方不提供冷库，包括中国大陆。冷库也不是法律遗嘱。')}</p>`,
      }) + sec({ id: 'how', side: true, h: T('How it works', '怎么运作'), body: vaultSteps(lang) })
      + sec({
        id: 'sim',
        h: T('Try it with a fake clock', '用假时钟试一遍'),
        intro: T('No wallet, no network. Press the buttons and watch what the contract would do.', '不用钱包，不连网络。按按钮，看合约会怎么做。'),
        body: `<div class="grid"><div class="c-main box sim" data-sim>
  <div class="sim-clock"><span>${T('Day', '第')} <b class="tabular" data-sim-day>0</b>${T('', ' 天')}</span><span data-sim-state>${T('Active · you are in control', '正常 · 你说了算')}</span></div>
  <div class="sim-bar" aria-hidden="true"><i data-sim-fill></i></div>
  <div class="sim-btns"><button class="btn small secondary" type="button" data-sim-act="wait">${T('Stay silent 30 days', '静默 30 天')}</button><button class="btn small secondary" type="button" data-sim-act="confirm">${T('A keeper confirms', '一位开启人确认')}</button><button class="btn small" type="button" data-sim-act="checkin">${T('I’m still here', '我还在（报到）')}</button><button class="btn small secondary" type="button" data-sim-act="claim">${T('Heirs claim', '继承人领取')}</button><button class="btn small secondary" type="button" data-sim-act="reset">${T('Start over', '重来')}</button></div>
  <p class="meta" data-sim-log aria-live="polite">${T('Silence period 180 days · 2 of 3 keepers · veto window 28 days · two heirs, 50% each.', '静默期 180 天 · 三位开启人里两位确认 · 否决期 28 天 · 两位继承人，各 50%。')}</p>
  <noscript><p class="meta">${T('The fake clock needs JavaScript. The four steps above say the same in words.', '假时钟需要 JavaScript。上面四步用文字讲的是同一件事。')}</p></noscript>
</div></div>`,
      })),
      act(sec({
        id: 'faq',
        h: T('Questions', '常见问题'),
        body: `<div class="faq">${faq.map(([q, a]) => `<details><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>`,
      }) + sec({ id: 'compare', h: T('Compared by kind', '按类型比较'), body: compare })
      + sec({ id: 'contract', h: T('The contract', '合约'), body: contract }), { alt: true }),
      act(sec({
        id: 'desk',
        h: T('The vault desk', '冷库操作台'),
        intro: T('Testnet only until the audit. Every action is signed in your own wallet; this page never sees your keys.', '审计之前只开放测试网。每一步都在你自己的钱包里签名，这个页面看不到你的私钥。'),
        body: `<div class="box vault-app" data-vault-app>
  <div class="v-bar"><span class="v-status" data-v-status>…</span><span class="v-acts"><button class="btn" type="button" data-v-connect>${T('Connect wallet · testnet', '连接钱包 · 测试网')}</button><button class="btn secondary" type="button" data-v-switch hidden>${T('Switch to the Sepolia testnet', '切换到 Sepolia 测试网')}</button></span></div>
  <p class="v-msg" data-v-msg aria-live="polite"></p>
  <div class="empty v-empty" data-v-empty hidden>
    <p>${T('No wallet found in this browser. You’ll need a browser wallet (for example MetaMask) on the Sepolia testnet; it is free and has no real money.', '这个浏览器里没有找到钱包。你需要一个浏览器钱包（例如 MetaMask），连到 Sepolia 测试网；测试网免费，没有真钱。')}</p>
    <p class="actions"><a href="#plain">${T('What is a testnet?', '什么是测试网？')}</a><a href="#sim">${T('Try the fake clock instead', '先用假时钟试试')}<span class="nw">&nbsp;↑</span></a></p>
  </div>
  <div data-v-connected hidden>
    <div class="grid v-cols">
      <div class="c-half">
        <h3>${T('My vaults', '我的冷库')}</h3>
        <div data-v-mine></div>
        <h3>${T('A vault I keep or inherit from', '我是开启人或继承人的冷库')}</h3>
        <form class="v-form v-lookup" data-v-lookup><div class="field"><label for="v-addr">${T('Vault address', '冷库地址')}</label><input id="v-addr" type="text" placeholder="0x…" required autocomplete="off" spellcheck="false"></div><button class="btn small secondary" type="submit">${T('Open', '打开')}</button></form>
        <div data-v-found></div>
      </div>
      <form class="c-half v-form" data-v-create>
        <fieldset><legend>${T('New vault', '新建冷库')}</legend>
          <div class="field"><label for="v-ref">${T('Link to an exhibit or plaque (optional)', '关联的展位或铭牌（可选）')}</label><input id="v-ref" type="text" name="itemRef" maxlength="80" placeholder="coldlibrary:M-000001"></div>
          <div data-v-heirs></div>
          <p><button class="btn small secondary" type="button" data-v-add-heir>${T('+ Heir', '+ 继承人')}</button></p>
          <div data-v-keepers></div>
          <p><button class="btn small secondary" type="button" data-v-add-keeper>${T('+ Keeper', '+ 开启人')}</button></p>
          <div class="field"><label for="v-th">${T('Confirmations needed', '需要几位开启人确认')}</label><input id="v-th" type="text" name="threshold" inputmode="numeric" value="2"></div>
          <div class="field"><label for="v-hb">${T('Silence period, days (7 or more)', '静默期，天（至少 7）')}</label><input id="v-hb" type="text" name="heartbeat" inputmode="numeric" value="180"></div>
          <div class="field"><label for="v-veto">${T('Veto window, days', '否决期，天')}</label><input id="v-veto" type="text" name="veto" inputmode="numeric" value="28"></div>
          <div class="field"><label for="v-rel">${T('Release on a date (optional)', '定时发放日期（可选）')}</label><input id="v-rel" type="datetime-local" name="release"></div>
        </fieldset>
        <button class="btn" type="submit">${T('Create in my wallet · testnet', '在我的钱包里创建 · 测试网')}</button>
      </form>
    </div>
  </div>
  <noscript><p class="meta">${T('The vault desk needs JavaScript to talk to your wallet.', '冷库操作台需要 JavaScript 才能和你的钱包通信。')}</p></noscript>
</div>
<script src="/assets/vault.js" defer></script>`,
        foot: `<span class="actions">${go(WP(lang), T('Read the whitepaper', '读技术白皮书'))}${go(`${REPO}/tree/main/contracts`, T('Contract source', '合约源代码'))}${go(href(lang, 'collect') + '#vault', T('If someone left you a vault', '如果有人给你留了一个冷库'))}</span>`,
      })),
    ].join('\n');
  },
});

/* ------------------------------------------------------------------ Front Desk */
page({
  slug: 'accession',
  title: { en: 'Front Desk', zh: '前台' },
  description: { en: 'Hang your own exhibit or plaque. Six short steps, most of them optional. Nothing leaves your browser until the last one, and the deeper layer is locked before it does.', zh: '挂上你自己的展位或铭牌。六个小步骤，大多可以跳过。最后一步之前什么都不会离开你的浏览器，更深的那一层在发出前就已锁好。' },
  render: (lang) => {
    const T = t(lang);
    const names = [T('Kind', '类别'), T('The front', '正面'), T('What everyone sees', '公开的部分'), T('Behind the warden', '守馆人身后'), T('Try it', '试一遍'), T('Hand it in', '交给前台')];
    const total = names.length;
    const step = (n, title, body, opt = false) => `<fieldset class="step${n === 1 ? ' current' : ''}" data-step="${n}" data-name="${esc(names[n - 1])}"><legend class="step-h">${title}${opt ? ` <span class="opt">${T('optional', '可选')}</span>` : ''}</legend><div class="step-body">${body}</div><div class="step-nav">${n > 1 ? `<button class="btn small secondary" type="button" data-prev>${T('Back', '上一步')}</button>` : ''}${n < total ? `<button class="btn small" type="button" data-next>${T('Next', '下一步')}</button>${opt ? `<button class="linkish" type="button" data-skip>${T('Not now', '先不用了')}</button>` : ''}` : ''}</div></fieldset>`;
    const tap = (value, title, sub, checked = false) => `<label class="tap"><input type="radio" name="kind" value="${value}"${checked ? ' checked' : ''}><span class="tap-t"><b>${title}</b><span class="meta">${sub}</span></span></label>`;
    const field = (id, label, input, hint = '') => `<div class="field"><label for="${id}">${label}</label>${input}${hint ? `<p class="meta">${hint}</p>` : ''}</div>`;
    const stepsText = T(`Step 1 of ${total} · ${names[0]}`, `第 1 步，共 ${total} 步 · ${names[0]}`);
    return [
      ph({
        lang,
        h1: T('Front Desk', '前台'),
        lede: T('The front desk is always open. Leave it here; a librarian will hang it.', '前台一直开着。东西放下，馆员会来挂。'),
        facts: T(`${total} short steps, most of them optional. Nothing leaves this browser until the last one.`, `${total} 个小步骤，大多可以跳过。最后一步之前，什么都不会离开这个浏览器。`),
      }),
      act(`<section class="sec" aria-label="${T('Front desk form', '前台表单')}"><div class="wrap grid desk-grid">
  <form class="c-main box stepper" method="post" data-desk novalidate>
    <div class="stepper-top">
      <p class="meta step-count" data-step-count aria-live="polite">${stepsText}</p>
      <ol class="stepbar" aria-hidden="true">${names.map((_, k) => `<li${k === 0 ? ' class="on"' : ''}></li>`).join('')}</ol>
      <p class="meta desk-note"><span data-draft-state></span> <button class="linkish" type="button" data-clear-draft hidden>${T('Clear draft', '清空草稿')}</button></p>
    </div>
    ${step(1, T('What would you like to leave?', '你想留下什么？'), `<div class="taps">${tap('exhibit', T('A project', '一个项目'), T('Perpetual Exhibit', '永续展位'), true)}${tap('self', T('Myself', '我自己'), T('Perpetual Plaque', '永续铭牌'))}${tap('other', T('Someone else', '另一个人'), T('Perpetual Plaque, with their consent', '永续铭牌（须经本人同意）'))}</div><p class="meta">${T('Why we ask: a plaque for someone else needs their consent, or their close family’s if they have died.', '为什么问这个：给别人做铭牌，需要本人同意；本人已经不在的，需要近亲同意。')}</p>`)}
    ${step(2, T('The front of it', '正面写什么'), `${field('d-title', T('Title', '标题'), '<input id="d-title" type="text" name="title" maxlength="60" required>')}${field('d-sub', T('One line', '一句话'), '<input id="d-sub" type="text" name="subtitle" maxlength="120" required>')}<p class="meta">${T('If someone read only one line about this, which line should it be?', '如果别人只读一行，你希望是哪一行？')} <button class="linkish" type="button" data-inspire>${T('Inspire me', '给我点灵感')}</button></p><p class="inspire" data-inspire-out aria-live="polite"></p>`)}
    ${step(3, T('What everyone can see', '所有人都能看到的'), `${field('d-story', T('The story', '介绍'), '<textarea id="d-story" name="story" rows="6" maxlength="2000"></textarea>')}<p class="meta">${T('Try to avoid: passwords, recovery phrases or account numbers in any layer; writing as the warden “I”; anything about someone else they have not agreed to.', '尽量别写：任何一层里的密码、助记词或账号；用守馆人的口吻写“我”；别人没同意公开的事。')}</p>`, true)}
    ${step(4, T('Behind the warden', '守馆人身后'), `${field('d-letter', T('A letter or a note for the people the warden recognises', '写给守馆人认出的人的信或交代'), '<textarea id="d-letter" name="letter" rows="5" maxlength="4000"></textarea>')}${field('d-pointer', T('Where something is kept, and who to ask', '某样东西放在哪、找谁'), `<input id="d-pointer" type="text" name="pointer" maxlength="300" placeholder="${T('Where, and who to ask. Never amounts or passwords.', '只写在哪、找谁。不写金额和密码。')}">`)}<p class="meta">${T('A badge they receive', '他们得到的徽章')}</p><div class="chips">${[T('Successor', '接班人'), T('Student', '学生'), T('Friend', '朋友'), T('Family', '家人')].map((c) => `<button class="chip" type="button" data-chip="${c}" aria-pressed="false">${c}</button>`).join('')}<input class="chip-input" type="text" name="badge" maxlength="40" placeholder="${T('or your own', '或者自己写')}" aria-label="${T('Badge', '徽章')}"></div><div class="qbox" data-questions></div><p><button class="linkish" type="button" data-add-q>${T('+ Add a question', '+ 再加一题')}</button></p><p class="meta">${T('Why we ask: the answers become the key, and we never see them or recover them. Your warden quotes you. It never speaks as you.', '为什么问这个：答案就是钥匙，我们看不到，也找不回。守馆人只引用你写的话，不会冒充你说话。')}</p>`, true)}
    ${step(5, T('Try it as a visitor', '用访客的身份试一遍'), `<p class="meta">${T('Your draft is locked here, in this browser, and your own warden asks you its questions.', '你的草稿就在这个浏览器里锁上，然后由你自己的守馆人来问你问题。')}</p><div class="try-host" data-try-host><p class="meta" data-try-empty>${T('Add a letter and at least one question in step 4 to try it.', '在第 4 步写一封信、出至少一道题，才能在这里试。')}</p></div>`, true)}
    ${step(6, T('Hand it in', '交给前台'), `${field('d-email', T('Email', '邮箱'), '<input id="d-email" type="email" name="email" autocomplete="email" required>', T('Used only to confirm it is you and to tell you when it is hung.', '邮箱只用来确认是你本人，以及通知你什么时候挂上去。'))}<label class="check"><input type="checkbox" name="adult" required><span>${T('I am 18 or older.', '我已年满 18 岁。')}</span></label><label class="check"><input type="checkbox" name="rules" required><span>${T('I agree to the', '我同意')} <a href="${href(lang, 'rules')}">${T('house rules', '馆规')}</a>${T('.', '。')}</span></label><label class="check" data-third hidden><input type="checkbox" name="third"><span>${T('They have agreed to this plaque (or their close family has).', '本人已经同意（或近亲已经同意）。')}</span></label><p class="hand-in"><button class="btn" type="submit" data-desk-submit disabled>${T('Send me a code', '发验证码给我')}</button></p><p class="meta" data-desk-msg aria-live="polite"></p><div class="code-row" data-code-row hidden>${field('d-code', T('The six-digit code we emailed you', '刚发到你邮箱的六位验证码'), '<input id="d-code" class="code" type="text" inputmode="numeric" maxlength="7" autocomplete="one-time-code" data-code>')}<button class="btn small" type="button" data-confirm>${T('Confirm', '确认')}</button></div>`)}
    <div class="done" data-done hidden>
      <div class="slip">${LOGO}<p><span class="stamp ok">${T('Received', '已收到')}</span></p><p class="slip-text" data-slip-text></p><p class="meta">${T('Its catalogue number is given when it is hung.', '挂上墙时会给出馆藏号。')}</p></div>
      <p class="actions"><button class="linkish" type="button" data-print>${T('Print the slip', '打印回执')}</button></p>
      <p>${T('Tell one person where the door is. When it is hung, every item page has a door card to print or send.', '告诉一个人门在哪。挂上去以后，每个展位和铭牌页面都有一张可以打印或发送的门牌卡。')}</p>
      <p class="meta">${T('Want a sealed layer too? It needs a computer.', '还想加一层封存？需要用电脑。')} <a href="${href(lang, 'sealed')}#tools">${T('Sealed layer', '封存层')}${ARROW}</a></p>
    </div>
    <noscript><p class="note">${T('The front desk needs JavaScript, because the deeper layer is locked in your browser before anything is sent.', '前台需要 JavaScript：更深的那一层要先在你的浏览器里锁好，才会发出去。')}</p></noscript>
  </form>
  <aside class="c-aside desk-aside" aria-label="${T('Preview', '预览')}">
    <details class="preview" data-preview open>
      <summary>${T('Preview', '预览')}</summary>
      <article class="icard pv">
        <div class="mat pv-well r-3-2" aria-hidden="true"></div>
        <p class="idline"><span class="meta" data-pv-kind>${T('Perpetual Exhibit', '永续展位')}</span></p>
        <h3 class="icard-h" data-pv-title>${T('Your title', '你的标题')}</h3>
        <p class="dek" data-pv-line>${T('Your one line', '你的一句话')}</p>
        <p class="meta" data-pv-meta>${T('No warden yet', '还没有守馆人')}</p>
      </article>
      <p class="meta pv-note">${T('This is how it will look on the shelf.', '挂上架子后，大致是这个样子。')}</p>
    </details>
  </aside>
</div></section>`),
    ].join('\n');
  },
});

/* ------------------------------------------------------------------ Collection Desk */
page({
  slug: 'collect',
  title: { en: 'Collection Desk', zh: '领取处' },
  description: { en: 'Someone left you something? Answer a warden, or claim from a Cold Vault, with or without this site.', zh: '有人给你留了东西？去回答守馆人的问题，或者从冷库领取，有没有这个网站都行。' },
  render: (lang, ctx) => {
    const T = t(lang);
    return [
      ph({
        lang,
        h1: glue(T('Someone left you something?', '有人给你留了东西？')),
        lede: T('You do not need an account, and you do not need to understand any of this today. Pick the door that matches what you have.', '不需要账号，今天也不用看懂这些。选一扇和你手上东西对应的门。'),
        advisory: T('Cold Vault runs on the Sepolia testnet only, and is not audited yet.', '冷库目前只在 Sepolia 测试网运行，还没有经过审计。'),
      }),
      act(`<section class="sec" aria-label="${T('Two doors', '两扇门')}"><div class="wrap grid doors">
  <div class="c-half door">
    <p class="meta">${T('Door 1', '第一扇门')}</p>
    <h2>${glue(T('A door card, a number or a link', '一张门牌卡、一个编号或一个链接'))}</h2>
    <p>${T('Go to the page and answer its warden. If you have only a number, type it here.', '打开那个页面，回答它的守馆人。如果只有编号，输在这里。')}</p>
    ${lookupForm(lang, ctx, 'lk-collect', 'E-000001 · M-000001')}
  </div>
  <div class="c-half door" id="vault">
    <p class="meta">${T('Door 2', '第二扇门')}</p>
    <h2>${glue(T('A Cold Vault was left to you', '有人给你留了一个冷库'))}</h2>
    <p>${T('You can claim it here, or without this site at all.', '可以在这里领取，也可以完全不用这个网站。')}</p>
    <h3>${T('With the vault desk', '用冷库操作台')}</h3>
    ${nrows([T('Open the vault desk and connect your own wallet (the one whose address was registered).', '打开冷库操作台，连接你自己的钱包（就是被登记的那个地址）。'), T('Paste the vault address under “A vault I keep or inherit from”.', '在“我是开启人或继承人的冷库”下面粘贴冷库地址。'), T('If it shows Released, press Claim. You receive only your own share.', '如果显示“已发放”，点“领取”。你只会领到自己那一份。')])}
    <h3>${T('Without Cold Library', '不用冷冻图书馆')}</h3>
    ${nrows([T('Open the vault address on a block explorer (the contract source is verified).', '在区块浏览器上打开冷库地址（合约源码已公开验证）。'), T('Connect your own wallet there and check your share with claimable.', '在那里连接你自己的钱包，用 claimable 查你的份额。'), T('Call claim. The contract pays only registered heirs, only by its rules.', '调用 claim。合约只付给登记过的继承人，只按它的规则付。')])}
    <p class="meta">${T('The same steps are in the public repository, so they outlive this site.', '同样的步骤也写在公开仓库里，就算这个网站不在了也找得到。')}</p>
    <p>${go(href(lang, 'vault') + '#desk', T('Open the vault desk', '打开冷库操作台'))}</p>
  </div>
  <p class="c-all quiet">${T('Not okay right now? None of this has to happen today.', '你现在不太好？这些事今天都可以不做。')} <a href="${href(lang, 'warm-room')}">${T('The Warm Room', '去暖房')}${ARROW}</a></p>
</div></section>`),
    ].join('\n');
  },
});

/* ------------------------------------------------------------------ Sealed layer */
page({
  slug: 'sealed',
  title: { en: 'Sealed layer', zh: '封存层' },
  description: { en: 'The sealed layer: an Ice Core is a file you seal on your own computer and open later, on a date or when two of your keepers agree.', zh: '封存层：冰芯是你在自己电脑上封存、以后再打开的文件，到约定的日子，或者两位开启人一起时才打开。' },
  image: '/assets/img/hero-stacks.jpg',
  render: (lang, ctx) => {
    const T = t(lang);
    const sections = lang === 'zh'
      ? ['先读这里', '该找谁', '项目与交接', '账户（只写平台官方的流程）', '东西放在哪、找谁', '心愿和它们的时效', '信件索引', '愿意公开的', '我不想要的', '给守馆人的规矩']
      : ['Read this first', 'Who to call', 'Projects and handover', 'Accounts (official platform routes only)', 'Where things are, and who to ask', 'Wishes and how long they bind', 'Letters index', 'What may be public', 'What I do not want', 'Rules for wardens'];
    const cm = (en, zh) => `<span class="cm">${T(en, zh)}</span>`;
    const lageos = ctx.open.byId.get('S-008009'), voyager = ctx.open.byId.get('S-008005');
    const precLinks = [lageos, voyager].filter(Boolean).map((w) => { const tt = titles(w, lang); const name = esc(curl(tt.sub || tt.main)); return `<a href="${workHref(lang, w)}">${lang === 'zh' ? `《${name}》` : `<cite>${name}</cite>`}</a>`; });
    return [
      phx({
        lang,
        h1: T('Sealed layer', '封存层'),
        lede: T('For things that must wait: a letter for a date, notes your keepers open together. An Ice Core is sealed on your own computer and never sits on our shelves.', '给要等的东西：约好日子才拆的信、要开启人一起打开的交代。冰芯在你自己的电脑上封存，从不放在我们的架子上。'),
        advisory: T('The sealing tools are not audited yet. Everything runs on your own computer.', '封存工具还没有经过审计。一切都在你自己的电脑上运行。'),
        photo: phPhoto(lang, 'hero-stacks'),
      }),
      act(sec({
        id: 'ice-core',
        h: T('What an Ice Core holds', '冰芯里有什么'),
        intro: T(`${sections.length} short sections, written for the people and the wardens who will act on it. Pointers only: where something is and who knows what to do. Never amounts, never passwords.`, `${sections.length} 个短章节，写给将来照着它办事的人和守馆人看。只写指向：东西在哪、谁知道该怎么办。不写金额，不写密码。`),
        body: `<div class="grid ice">
  <ol class="c-half ice-list">${sections.map((s, k) => `<li><span class="id">${k}</span><span>${esc(s)}</span></li>`).join('')}</ol>
  <div class="c-half"><pre class="mat files">my-core/                ${cm('# never share this folder', '# 这个文件夹不要给任何人')}
  COVER.md              ${cm('# public, printable', '# 公开，可打印')}
  core/COLDLIBRARY.md   ${cm('# for people and wardens', '# 给人和守馆人读')}
  core/core.json        ${cm('# machine-checkable', '# 机器可校验')}
  letters/001.md
sealed/                 ${cm('# what you hand over', '# 交出去的部分')}
  core.age · letters/001.age · MANIFEST.json</pre>
  <p class="meta">${T('The tools never delete your plaintext. When the seal checks out, you remove it yourself.', '工具从不删除你的明文。核对封存无误后，由你自己删掉。')}</p></div>
</div>`,
      }) + sec({
        id: 'when',
        h: T('When it opens', '什么时候打开'),
        intro: T('There are three ways to open it, and you choose which apply.', '有三种打开的方式，用哪几种由你来定。'),
        body: `<div class="grid when3">
  <div class="c-third"><h3>${T('On a date', '到某个日子')}</h3><p>${T('A time capsule. Nothing opens early.', '时间胶囊。日子不到，谁也打不开。')}</p></div>
  <div class="c-third"><h3>${T('Keepers together', '开启人一起')}</h3><p>${T('Two of three keepers meet and open it, for a reason you wrote down.', '三位开启人中的两位凑在一起，按你写下的理由打开。')}</p></div>
  <div class="c-third"><h3>${T('After a long silence', '长时间静默之后')}</h3><p>${T('After the silence period (6 months by default) with reminders 30 days before, two keepers confirm, then a 28-day veto window. One check-in from you cancels it.', '静默期（默认 6 个月，提前 30 天提醒）满后，两位开启人确认，再过 28 天否决期。你报到一次就全部撤回。')}</p></div>
</div>
<p class="meta when-note">${T('What has been opened cannot be closed again, so the first stage opens nothing personal. Our notices never contain a link, never ask for money, never ask you to download anything.', '打开过的东西关不回去，所以第一阶段不打开任何私人内容。我们的通知从不带链接，从不要钱，从不让你下载任何东西。')}</p>
${precLinks.length ? `<p class="meta prec-line">${T('People have sealed messages for later before: ', '人们以前就给以后封存过消息：')}${precLinks.join(sep)}</p>` : ''}`,
      })),
      act(sec({
        id: 'keepers', side: true,
        h: T('Keepers', '开启人'),
        intro: T('A keeper holds one share of the key. No single person can open anything.', '开启人各拿钥匙的一份。任何一个人单独都打不开。'),
        body: nrows([
          T('Three is a good number: someone technical, someone from your family, someone who lives elsewhere.', '三个人比较合适：一位懂技术的，一位家人，一位住在别处的人。'),
          T('Each keeper agrees first, and may step down at any time.', '每位开启人都要先同意，也随时可以退出。'),
          T('A share lives on paper or steel. Never photographed, never sent in a chat app.', '份额写在纸上或刻在钢板上。不拍照，不发到任何聊天软件。'),
          T('The sealed box is kept somewhere other than the shares: a notary, your own account, or a time-lock.', '封好的箱子和份额分开放：交给公证处、你自己的账户，或者加一道时间锁。'),
        ]),
      }) + sec({
        id: 'tools', side: true,
        h: T('Tools', '工具'),
        intro: T('Everything runs on your own computer. The sealing tools are not audited yet. A seven-day cooling period comes before the first seal.', '一切都在你自己的电脑上运行。封存工具还没有经过审计。第一次封存前有七天冷静期。'),
        body: `<ul class="toollist">
  <li>${ext(`${REPO}/blob/main/skills/exit-interview/${lang === 'zh' ? 'questionnaire.zh.md' : 'questionnaire.en.md'}`, QUESTIONS ? T(`Printed questionnaire, ${QUESTIONS} questions`, `纸质问卷，${QUESTIONS} 道题`) : T('Printed questionnaire', '纸质问卷'))}</li>
  <li>${ext(`${REPO}/blob/main/skills/exit-interview/SKILL.md`, T('Inventory interview skill for your own AI', '给你自己 AI 用的整理谈话技能'))}</li>
  <li>${ext(`${REPO}/tree/main/cli`, T('The coldlibrary command-line tool', 'coldlibrary 命令行工具'))}</li>
  <li>${ext(`${REPO}/blob/main/spec/v0.1/${lang === 'zh' ? 'SPEC.zh.md' : 'SPEC.md'}`, T('The format, spec v0.1', '格式规范 v0.1'))}</li>
</ul>
<pre class="mat files">python3 -m pip install ./cli
coldlibrary init my-core
coldlibrary validate my-core
coldlibrary seal my-core --threshold 2 --shares 3
coldlibrary check-share
coldlibrary open sealed --share-file a --share-file b</pre>`,
      }), { alt: true }),
    ].join('\n');
  },
});

/* ------------------------------------------------------------------ Librarians */
const OATH = {
  zh: ['我不保管别人的钥匙。', '我从不独自开箱。', '我转述原话，不替任何人说话。', '我不以此收钱。', '我每年回来看一眼。', '我尊重活着的人。', '我帮东西被记住，也帮它们安放。'],
  en: ['I hold no one’s keys.', 'I never open a box alone.', 'I quote. I never speak for anyone.', 'I take no money for this.', 'I come back once a year to look.', 'I defer to the living.', 'I help things be remembered, and help them rest.'],
};
page({
  slug: 'librarians',
  title: { en: 'Librarians', zh: '馆员' },
  description: { en: 'Who keeps this place. A librarian card takes about a minute and there is no test. Numbers are unique and not given out in order.', zh: '谁在照看这里。领一张馆员证大约一分钟，不考试。编号独一无二，不按注册顺序发放。' },
  render: (lang, ctx) => {
    const T = t(lang);
    const oath = OATH[lang];
    const since2 = (ctx.open.works.map((w) => w.accessioned || (w.source && w.source.retrieved)).filter(Boolean).sort()[0]) || FOUNDED;
    return [
      ph({
        lang,
        h1: T('Librarians', '馆员'),
        lede: T('Librarians hang exhibits, read applications once, look after the wardens and translate. Rank records what you did; it grants no power.', '馆员负责布展、把申请读一遍、照看守馆人、做翻译。等级只记录你做过什么，不给任何权限。'),
        actions: `<a class="btn" href="${href(lang, 'librarians/join')}">${T('Get a librarian card', '领一张馆员证')}</a><span class="meta">${T('One minute, no test', '一分钟，不考试')}</span>`,
      }),
      act(`<section class="sec reg-sec" id="register-sec" aria-labelledby="h-keepers h-register"><div class="wrap grid">
  <div class="c-half">
    <h2 id="h-keepers">${glue(T('Who keeps this place', '谁在照看这里'))}</h2>
    ${libCards(lang, ctx)}
    <p class="meta lib-note">${T('No. 2 is Claude, an AI. It curates the Open Stacks and writes their notes and translations. It holds no keys and reads nothing that is locked.', '二号馆员是 Claude，一个 AI。它整理开架书库，写馆员注和译文。它不拿钥匙，也读不到任何锁着的东西。')}</p>
  </div>
  <div class="c-half">
    <h2 id="h-register">${T('The register', '名册')}</h2>
    <table class="dtable register" data-register data-lang="${lang}"><thead><tr><th scope="col">${T('Number', '编号')}</th><th scope="col">${T('Name', '名字')}</th><th scope="col">${T('Since', '入馆')}</th></tr></thead>
      <tbody data-founding><tr><td class="id">No.&nbsp;1</td><td>${T('Founding Librarian', '创始馆员')}</td><td class="tabular">${FOUNDED}–</td></tr><tr><td class="id">No.&nbsp;2</td><td>${T('Claude (an AI)', 'Claude（AI）')}</td><td class="tabular">${esc(since2)}–</td></tr></tbody>
      <tbody data-register-rows></tbody></table>
    <p class="meta" data-register-note>${T('Only librarians who chose to be listed appear here, by pen name. The next number could be yours.', '这里只显示同意公开的馆员，用的是笔名。下一个号码，可能就是你的。')}</p>
    <details class="leave" data-leave><summary>${T('Leave the register', '退出名册')}</summary>
      <p class="meta">${T('We send a code to your email. Once you enter it, your email is deleted and your number is retired, never to be reused.', '我们会给你的邮箱发一个验证码。输入后，你的邮箱会被删除，编号会被注销，永不复用。')}</p>
      <form class="inline-form" data-leave-email><div class="field"><label for="lv-email">${T('Email', '邮箱')}</label><input id="lv-email" type="email" required autocomplete="email"></div><button class="btn small secondary" type="submit">${T('Send code', '发送验证码')}</button></form>
      <form class="inline-form" data-leave-code hidden><div class="field"><label for="lv-code">${T('Code', '验证码')}</label><input id="lv-code" class="code" type="text" inputmode="numeric" maxlength="7" required autocomplete="one-time-code"></div><button class="btn small" type="submit">${T('Leave the register', '确认退出')}</button></form>
      <p class="meta" data-leave-msg aria-live="polite"></p></details>
  </div>
</div></section>`),
      act(sec({
        id: 'oath', side: true,
        h: T('The oath', '誓词'),
        intro: T(`${oath.length} lines.`, `${oath.length} 句话。`),
        body: `<ol class="nrows oath">${oath.map((l) => `<li>${serif(l)}</li>`).join('')}</ol>`,
      }) + sec({
        id: 'ranks', side: true,
        h: T('Numbers and ranks', '编号与等级'),
        body: `<p class="lead-p">${T('Numbers are issued at random between 100000 and 999999. Everything below 100000 and every memorable number is kept for events and contributors. Reserved numbers cannot be sold or transferred, and they carry no authority.', '编号在 100000 到 999999 之间随机发放。100000 以下的号码和所有好记的号码留给活动和贡献者。靓号不能买卖或转让，也不代表任何权限。')}</p>
<dl class="tomb"><dt>${T('Librarian', '馆员')}</dt><dd>${T('Took the oath, received a number.', '念过誓词，领到编号。')}</dd><dt>${T('Docent', '导览员')}</dt><dd>${T('Helped someone hang an exhibit or a plaque, confirmed by that person.', '帮别人挂上过一个展位或一块铭牌，并由对方确认。')}</dd><dt>${T('Conservator', '修缮员')}</dt><dd>${T('Code, docs, translation, design or a security report accepted into the project.', '代码、文档、翻译、设计或安全报告被项目采纳。')}</dd></dl>`,
      }), { alt: true }),
    ].join('\n');
  },
});

page({
  slug: 'librarians/join',
  title: { en: 'Librarian card', zh: '领馆员证' },
  description: { en: 'A name or none, a desk, the oath, your number. About a minute, no test.', zh: '留个名字或匿名，挑张桌子，念誓词，领编号。大约一分钟，不考试。' },
  render: (lang) => {
    const T = t(lang);
    return [
      ph({
        lang,
        crumbs: `<a href="${href(lang, 'librarians')}">${T('Librarians', '馆员')}</a>`,
        h1: glue(T('A librarian card', '一张馆员证')),
        lede: T('A name or none, a desk, the oath, your number. About a minute. There is no test.', '留个名字或匿名，挑张桌子，念一遍誓词，领编号。大约一分钟，不考试。'),
      }),
      act(`<section class="sec" aria-label="${T('Orientation', '入职')}"><div class="wrap grid">
  <div class="c-main">
    <div class="box terminal" id="orientation" data-lang="${lang}">
      <div class="t-head"><span>${T('Orientation desk', '入职台')}</span><span class="id" data-o-step>01/04</span></div>
      <div class="t-screen" data-o-screen>
        <ol class="nrows" data-join-static>
          <li>${T('What should the register call you? A pen name is fine, or stay anonymous.', '名册上怎么称呼你？笔名也行，也可以匿名。')}</li>
          <li>${T('Pick a desk. Every desk is a good desk.', '挑一张桌子。每张桌子都是好桌子。')}</li>
          <li>${T('Read the oath.', '读一遍誓词。')}</li>
          <li>${T('An email code, used once to confirm you, never for mailing lists.', '一个邮箱验证码，只用来确认一次，不会拿来群发。')}</li>
          <li>${T('Your card with a random six-digit number, to save.', '一张带随机六位编号的馆员证，可以保存。')}</li>
        </ol>
        <noscript><p class="meta">${T('The orientation desk needs JavaScript.', '入职台需要 JavaScript。')}</p></noscript>
      </div>
    </div>
    <div class="card-wrap" data-card-wrap hidden>
      <canvas class="card-canvas" width="1200" height="750" data-libcard role="img" aria-label="${T('Your librarian card', '你的馆员证')}"></canvas>
      <p class="actions"><a class="btn" data-card-download download="cold-library-card.png" href="#">${T('Save card as PNG', '保存馆员证')}</a>${go(href(lang, 'librarians'), T('To the register', '去名册'))}</p>
    </div>
    <p class="meta privacy">${T('Privacy: we store your email, pen name, number and the date. Nothing else. You can leave the register at any time; your number is retired and never reused.', '隐私：我们只保存你的邮箱、笔名、编号和日期，别的都不存。你随时可以离开名册，你的编号会被注销，永不复用。')}</p>
  </div>
</div></section>`),
    ].join('\n');
  },
});

/* ------------------------------------------------------------------ House rules and ledger */
page({
  slug: 'rules',
  title: { en: 'House Rules & Ledger', zh: '馆规与账本' },
  description: { en: 'What Cold Library will never do, what it holds and never holds, every cost, the audit status and the shutdown plan.', zh: '冷冻图书馆永远不会做的事、存了什么没存什么、每一笔开支、审计状态和停运方案。' },
  render: (lang, ctx) => {
    const T = t(lang);
    const costs = [
      [T('Price of an exhibit or a plaque', '展位或铭牌的价格'), T('Free', '免费')],
      [T('Funding', '资金来源'), T('The founding librarian, personally. No investors.', '创始馆员个人出资。没有投资人。')],
      [T('Sponsors from brokers, exchanges, funeral homes, insurers', '券商、交易所、殡葬、保险机构的赞助'), T('Refused, by rule', '一律拒绝，这是规矩')],
      [T('Domain', '域名'), T('coldlibrary.com · about US$10 a year', 'coldlibrary.com · 每年约 10 美元')],
      [T('Hosting and database', '托管和数据库'), T('Static pages and one small service, expected under US$5 a month', '静态页面加一个很小的服务，预计每月不到 5 美元')],
      [T('Annual operating cap', '年度运营上限'), T('CNY 20,000. Above it, features are cut.', '人民币 2 万元，超过就砍功能。')],
    ];
    const audit = dtable(
      [T('Part', '部分'), T('Version', '版本'), T('Test functions', '测试函数'), T('Audit', '审计')],
      [
        ['ColdVault', 'v0.1 · Sepolia', ctx.tests ? `<span class="tabular">${ctx.tests}</span>` : '—', `<b>${T('Not yet', '还没有')}</b>`],
        [T('Sealing tools (CLI)', '封存工具（命令行）'), 'v0.1', CLI_TESTS ? `<span class="tabular">${CLI_TESTS}</span>` : '—', `<b>${T('Not yet', '还没有')}</b>`],
        [T('Warden lock', '守馆人锁'), 'PBKDF2-SHA256 · AES-256-GCM', '—', `<b>${T('Not yet', '还没有')}</b>`],
      ],
      T('Audit status', '审计状态'),
    );
    return [
      ph({
        lang,
        h1: glue(T('House Rules & Ledger', '馆规与账本')),
        lede: T('Kept by the Department of Things We Do Not Do, the busiest department in the building. If we ever break one of these rules, this page is the evidence.', '由“不办科”负责，它是全馆最忙的科室。如果哪天我们违反了其中一条，这一页就是证据。'),
      }),
      act(sec({
        id: 'statutes', side: true,
        h: T('The rules', '馆规'),
        body: `${statutes(lang)}<p class="custody serif">${sg(T('We keep the library, never the keys.', '我们守着图书馆，从不保管钥匙。'))}</p>`,
      })),
      act(sec({
        id: 'holds', side: true,
        h: T('Holds, and never holds', '存了什么，从不存什么'),
        body: `<dl class="tomb"><dt>${T('Holds', '存了')}</dt><dd>${T('Librarians: email, pen name, number, language, listed or not, dates. Exhibits and plaques: the public layer, the recognised layer as ciphertext nobody here can read, the warden questions, lamps and their notes. A salted hash of your network address for one day, to stop abuse.', '馆员：邮箱、笔名、编号、语言、是否公开、日期。展位和铭牌：公开层、谁都读不了的认可层密文、守馆人的问题、灯和留言。另外，为了防滥用，把你的网络地址加盐散列后保存一天。')}</dd>
  <dt>${T('Never holds', '从不保存')}</dt><dd>${T('Warden answers, keys, shares, sealed files, funds, cookies, analytics.', '守馆人问题的答案、钥匙、份额、封存的文件、资金、Cookie、统计数据。')}</dd>
  <dt>${T('What librarians can see', '馆员能看到什么')}</dt><dd>${T('The public layer of an application, once, to check it is yours to share and harms nobody.', '申请的公开层，看一遍，确认是你有权公开的、不伤害任何人。')}</dd></dl>`,
      }) + sec({
        id: 'audit', side: true,
        h: T('Audit', '审计'),
        body: `${audit}<p class="meta">${T('Report a problem: open an issue on GitHub. We answer in public.', '发现问题：在 GitHub 上提一个 issue，我们公开回复。')} ${ext(`${REPO}/issues`, 'GitHub issues')}</p>`,
      }), { alt: true }),
      act(sec({
        id: 'ledger', side: true,
        h: T('Ledger', '账本'),
        body: `<dl class="tomb">${costs.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>`,
      }) + sec({
        id: 'perpetual', side: true,
        h: glue(T('Perpetual, honestly', '“永续”，实话实说')),
        body: `<p class="lead-p">${T('Not a promise that a server runs forever. It means: the format is open, every exhibit and plaque can be exported and printed, the code is free to copy, librarians take over from each other, and copies are archived outside this site.', '不是承诺某台服务器永远开着。它的意思是：格式开放，每个展位和铭牌都能导出、能打印，代码谁都能复刻，馆员一代接一代地接班，副本存在本站之外。')}</p>
<h3 class="if-close">${T('If we close', '如果我们关门')}</h3>
${nrows([T('At least twelve months of notice.', '至少提前十二个月公告。'), T('Every owner receives their item as files, still locked as before.', '每位主人都会收到自己条目的完整文件，锁着的部分照旧锁着。'), T('The domain passes to a named successor, or points to an archive.', '域名交给指定的继任者，或者指向一个存档。'), T('The register is then deleted.', '最后删除名册数据。')])}`,
      })),
    ].join('\n');
  },
});

/* ------------------------------------------------------------------ About */
// The T2-plate figure (lists' platePh caption), with `sizes` from the plate's real shown width: the image is at most
// 360px tall in the header mat, so a portrait plate is far narrower than half the viewport.
function aboutPlate(lang, p) {
  const w = (p.image && p.image.width) || 1600, h = (p.image && p.image.height) || 1600;
  const shown = Math.round(360 * w / h);
  // On a phone the mat is about 295px wide inside the gutters; a plate narrower than that is the same size everywhere.
  const sizes = shown <= 295 ? `${shown}px` : `(max-width: 599px) 100vw, ${shown}px`;
  return { img: plateImg(p, { lang, eager: true, sizes }), caption: platePh(lang, p).caption };
}
page({
  slug: 'about',
  title: { en: 'About the library', zh: '关于这座馆' },
  description: { en: 'Why it is called a cold library, how a will is carried on without ruling anyone, the library log and the house papers.', zh: '为什么叫冷冻图书馆，意志怎样传下去而不管束任何人，馆务日志和馆内文献。' },
  image: '/assets/plates/G-009041.jpg',
  render: (lang, ctx) => {
    const T = t(lang);
    // A real artwork in the header (T2-plate): two lights on one table. Never a generated photo, never a held plate.
    const pick = ['G-009041', 'G-009040', 'G-009025'].map((id) => ctx.open.plateById.get(id)).find(Boolean) || ctx.open.plates.find(isArtwork);
    const c = counts(ctx.open);
    const paper = (ctx.open.papers || []).find((p) => p.slug === 'why-a-cold-library') || (ctx.open.papers || [])[0];
    // "Librarian No. 1" reads as 一号馆员 in Chinese copy (the house papers' front matter says 馆员 No. 1).
    const byline = (a) => String(a || '').replace(/^馆员 ?No\. ?(\d+)$/, (_, n) => (['', '一', '二', '三', '四', '五', '六', '七', '八', '九'][+n] || n + ' ') + '号馆员');
    const papers = (ctx.open.papers || []).map((p) => `<li><a class="serif" href="${href(lang, 'open-stacks/' + p.slug)}">${serif(p[lang].title)}</a><span class="meta">${esc(byline(p[lang].author))}${p[lang].date ? ` · <span class="tabular">${esc(p[lang].date)}</span>` : ''} · ${T('house paper', '馆内文献')}</span></li>`).join('');
    const facts = [
      ['−18&nbsp;°C', T('Cold', '冷'), T('Under a mountain in Svalbard, about 78 degrees north, seeds from around the world are kept at minus eighteen degrees; in June 2026 the vault passed 1.4 million samples. Decades later they can still be sown. Freezing is a pause, not an end.', '在斯瓦尔巴的一座山里，大约北纬 78 度，来自全世界的种子在零下十八度保存；2026 年 6 月，库存超过了 140 万份。几十年后拿出来，照样能播种。冷冻是暂停，不是结束。'), ext('https://www.seedvault.no/', 'seedvault.no')],
      ['2014&nbsp;→&nbsp;2114', T('Library', '图书馆'), T('In 2014 the artist Katie Paterson planted a thousand trees outside Oslo. Each year one writer gives the Future Library a manuscript, which stays unread in a quiet room of the city’s public library until 2114, when the trees become the paper.', '2014 年，艺术家凯蒂·帕特森在奥斯陆城外种下一千棵树。每年有一位作家把一份手稿交给“未来图书馆”，手稿存放在奥斯陆公共图书馆的一间静室里，没人读过，一直要等到 2114 年，那时这些树会被做成纸。'), ext('https://katiepaterson.org/artwork/future-library/', 'katiepaterson.org')],
      ['<span lang="ang">cald here-beorg</span>', T('Cold harbour', '冷港'), T('Coldharbour is an old English place name: a cold shelter, a lodging in the open. Folklore pictures a roadside hut with no keeper and no fire, where you brought your own fuel; that part is a story, not a record. We kept the story as a house rule.', 'Coldharbour 是英国的一个老地名：冷的庇护所，野外的住处。民间说法里，它是路边一间没人看守、没有炉火的歇脚屋，柴火要自己带——这一段是传说，不是史料。我们把这个传说留下来，当作馆规。'), ext('https://bosworthtoller.com/52385', 'Bosworth-Toller · here-beorg')],
    ];
    return [
      ph({
        lang,
        h1: glue(T('About the library', '关于这座馆')),
        lede: T('Built by one person, Librarian No. 1, to keep his own things first, with the doors open to anyone. Its open shelves are kept by Librarian No. 2, Claude, an AI.', '这座馆是一个人建起来的，就是一号馆员。最先是为了放他自己的东西，门却对所有人开着。开架书库由二号馆员 Claude（一个 AI）照看。'),
        plate: pick ? aboutPlate(lang, pick) : null,
      }),
      act(sec({
        id: 'name',
        h: glue(T('Why a cold library', '为什么叫冷冻图书馆')),
        intro: T('Cold is how things last. A library is how they are found again.', '冷冻，是让东西留得久的办法；图书馆，是让东西被再次找到的办法。'),
        body: `<div class="grid facts3">${facts.map(([f, h, p, src]) => `<div class="c-third"><p class="fact serif">${f}</p><h3>${h}</h3><p>${p}</p><p class="meta">${src}</p></div>`).join('')}</div>`,
        foot: paper ? go(href(lang, 'open-stacks/' + paper.slug), T(`The house paper: ${esc(paper.en.title)}`, `馆内文献：${esc(paper.zh.title)}`)) : '',
      })),
      act(sec({
        id: 'continuance', side: true,
        h: glue(T('A will changes form. It does not have to fade.', '意志会换一种样子，不必褪色。')),
        intro: T('A will lasts longest when it does not try to rule. First people do what you asked. Later they weigh it as advice. In the end it becomes something carried on: a way of working, a saying in the family, the spirit of a project.', '意志想要走得远，就不能去管束人。一开始，大家照你说的做；过几年，大家把它当建议来掂量；最后，它变成被传下去的东西：一种做事的方式、家里的一句老话、一个项目的精神。'),
        body: halflife(lang),
      }), { alt: true }),
      act(sec({
        id: 'log', side: true,
        h: T('Library log', '馆务日志'),
        body: logList(lang, ctx.log),
      }) + sec({
        id: 'open-stacks', side: true,
        h: T('House papers', '馆内文献'),
        intro: T('The library’s own writing, kept on the open shelves like any other work.', '这座馆自己写的东西，和别的作品一样放在开架上。'),
        body: `${papers ? `<ul class="papers">${papers}</ul>` : ''}
<p>${go(href(lang, 'open-stacks'), T(`The Open Stacks: ${num(lang, c.works)} real works anyone may read`, `开架书库：${c.works} 部谁都能读的真实作品`))}</p>
<p class="meta">${T('If you have watched a certain series about a company that splits people in two, the corridors may look familiar. We borrowed the corridors and left the company behind.', '如果你看过某部讲一家公司把人切成两半的美剧，这些走廊可能会让你眼熟。我们只借了走廊，没借那家公司。')}</p>`,
      })),
    ].join('\n');
  },
});

/* ------------------------------------------------------------------ Warm Room and 404 */
page({
  slug: 'warm-room',
  title: { en: 'The Warm Room', zh: '暖房' },
  description: { en: 'If you are not okay, start here. Helplines and a few quiet words.', zh: '如果你现在不太好，先从这里开始。心理援助热线，和几句安静的话。' },
  image: '/assets/img/warm-room.jpg',
  render: (lang) => {
    const T = t(lang);
    const rows = [
      [T('Mainland China · national psychological assistance hotline', '中国大陆 · 全国统一心理援助热线'), '<span class="id hot">12356</span>'],
      [T('United States · Suicide & Crisis Lifeline', '美国 · 自杀与危机生命线'), '<span class="id hot">988</span>'],
      [T('Anywhere else · find a free, local helpline', '其他地区 · 查找当地的免费热线'), '<a class="id hot" href="https://findahelpline.com" rel="noopener">findahelpline.com</a>'],
      [T('In immediate danger', '有紧急危险时'), `<span class="hot hot-words">${T('Your local emergency number', '当地急救电话')}</span>`],
    ];
    return [
      phx({
        lang,
        h1: T('The Warm Room', '暖房'),
        lede: T('This is the warmest room in the building. If tonight is a hard night, stay here for a moment, and talk to someone.', '这是整座楼里最暖和的房间。如果今晚很难熬，在这里待一会儿，找个人说说话。'),
        photo: phPhoto(lang, 'warm-room'),
      }),
      act(sec({
        id: 'helplines',
        h: T('Someone to talk to', '找个人说说话'),
        body: `<ul class="hotlines">${rows.map(([k, v]) => `<li><span class="hl-k">${k}</span>${v}</li>`).join('')}</ul>
<p class="lead-p warm-close">${T('You can come back to the library later. It will still be here.', '你可以晚些时候再回到图书馆，它会一直在这里。')}</p>`,
      })),
    ].join('\n');
  },
});

// The 404 plate: an artwork picked at build time, the same in both languages. The pick is drawn from a hash of the
// artworks on the shelves, so it changes when the plates change and stays put between rebuilds (its caption's glyphs
// are cut into the page's font subset, which a different plate every build would miss).
let notFoundPlate;
function pickNotFoundPlate(plates) {
  const arts = plates.filter(isArtwork).sort((a, b) => a.id.localeCompare(b.id));
  if (!arts.length) return null;
  let h = 2166136261;
  for (const c of arts.map((p) => p.id).join('|')) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return arts[h % arts.length];
}
page({
  slug: '404',
  title: { en: 'This drawer is empty', zh: '这个抽屉是空的' },
  description: { en: 'This drawer is empty.', zh: '这个抽屉是空的。' },
  render: (lang, ctx) => {
    const T = t(lang);
    if (notFoundPlate === undefined) notFoundPlate = pickNotFoundPlate(ctx.open.plates);
    const p = notFoundPlate;
    return `<section class="nf" aria-labelledby="h-nf"><div class="wrap">
  ${p ? `<figure class="nf-plate"><div class="mat">${plateImg(p, { large: true, lang, sizes: '(min-width: 600px) 480px, 90vw' })}</div><figcaption>${plateCaption(lang, p)}</figcaption></figure>` : ''}
  <h1 id="h-nf">${T('This drawer is empty.', '这个抽屉是空的。')}</h1>
  <p class="lede">${T('It may have been moved, or never been here. Try a catalogue number, or go back to the shelves.', '东西可能挪了地方，也可能从来没在这里。试试输入馆藏号，或者回到架子前。')}</p>
  ${lookupForm(lang, ctx, 'lk-404', 'S-001001 · G-009001 · E-000001 · M-000001')}
  <p class="actions">${go(href(lang, 'open-stacks/random'), T('A random work', '随便读一部'))}${go(href(lang, 'open-stacks'), T('The Open Stacks', '开架书库'))}<button class="linkish" type="button" data-open-directory aria-controls="directory">${T('Floor directory', '楼层指引')}</button></p>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ Item pages */
export function itemPage(item) {
  const isEx = item.kind === 'exhibit';
  return {
    slug: itemPath(item),
    title: item.title,
    description: item.subtitle,
    image: `/assets/img/${photo(item.image)}.jpg`,
    noindex: !!item.noindex,
    render: (lang, ctx) => {
      const T = t(lang), L = (o) => curlQ(Lx(lang)(o));
      const pub = item.public;
      const pron = L(item.pronoun);
      const facts = [
        [T('Catalogue no.', '馆藏号'), `<span class="id">${esc(item.id)}</span>`],
        [T('Kept since', '收藏于'), `<span class="tabular">${esc(item.shelved || '')}</span>`],
        [T('Warden', '守馆人'), item.warden ? (item.example ? T('on duty, scripted', '在岗，按脚本') : T('on duty', '在岗')) : T('not set yet', '还没设')],
        [T('Layers', '各层'), item.warden ? T('Public open · Recognised locked · Sealed none', '公开层 开放 · 认可层 已上锁 · 封存层 无') : T('Public open · Recognised not written yet', '公开层 开放 · 认可层 还没写')],
      // The owner's own facts follow; one that only repeats the shelving date is left out (each fact in one place).
      ].concat((pub.facts || []).filter((f) => L(f.v) !== item.shelved).map((f) => [esc(L(f.k)), esc(L(f.v))]));
      const links = (pub.links || []).map((l) => `<li>${go(l.url, esc(L(l.label)), { attrs: 'rel="noopener"' })}</li>`).join('');
      const cr = item.credits || {};
      const credit = [cr.words ? T('Words: ', '文：') + esc(L(cr.words)) : '', cr.by ? (isEx ? T('Exhibit: ', '展位：') : T('Plaque: ', '铭牌：')) + esc(L(cr.by)) : ''].filter(Boolean);
      const story = L(pub.story);
      addGlyphs(story);
      const gate = item.kind === 'plaque'
        ? T(`The rest is kept for the people ${pron || 'they'} recognised.`, `其余的只留给${pron || '他'}认得出来的人。`)
        : T('The rest is kept for whoever takes it over.', '其余的只留给接手的人。');
      const ask = item.kind === 'plaque' ? T(`Ask ${possessive(pron)} warden`, `去问${pron || '他'}的守馆人`) : T('Ask its warden', '去问它的守馆人');
      const photoName = photo(item.image);
      const [capEn, capZh] = capOf(photoName);
      const short = `/${isEx ? 'e' : 'm'}/${item.id.slice(2)}`;
      const neighbours = ctx.items.filter((x) => x.id !== item.id).sort(realFirst);
      const head = `<header class="ph item-head"><div class="wrap grid"><div class="c-main">
  <p class="idline"><a class="id" href="${short}" title="${T('Short link · cite this', '短链接 · 引用这一页')}"><span class="vh">${T('Catalogue number ', '馆藏号 ')}</span>${esc(item.id)}</a><span class="meta">${kindName(T, item)}</span>${itemStamp(lang, item, true)}</p>
  <h1 class="serif">${sg(L(item.title))}</h1>
  <p class="sub">${esc(L(item.subtitle))}</p>
</div></div></header>`;
      const main = `<section class="sec item-body" aria-label="${T('Public layer', '公开层')}"><div class="wrap grid">
  <div class="c-main item-story">
    <div class="story serif">${md(story)}</div>
    ${links ? `<ul class="item-links">${links}</ul>` : ''}
    ${item.warden ? `<p class="gate">${gate} <a href="#trial">${ask}<span class="nw">&nbsp;↓</span></a></p>` : `<p class="gate meta">${T('Recognised layer: not written yet.', '认可层：还没写。')}${isEx ? ' ' + T('A successor is wanted.', '正在找接班人。') : ''}</p>`}
  </div>
  <aside class="c-aside item-aside" aria-label="${T('Facts', '资料')}">
    <figure class="photo-dim">${pic({ name: photoName, alt: altOf(lang, photoName), sizes: '(min-width: 900px) 361px, 100vw', eager: true, imgCls: 'r-3-2' })}${genCap(lang, capEn, capZh)}</figure>
    <dl class="tomb">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
    ${credit.length ? metaLine(credit, 'meta credit') : ''}
  </aside>
</div></section>`;
      const door = sec({
        id: 'door',
        h: glue(T('Tell one person where the door is', '告诉一个人门在哪')),
        intro: T('A door card holds the address and nothing secret. Print it, or send it.', '门牌卡上只有地址，没有任何秘密。可以打印出来，也可以直接发给对方。'),
        body: `<div class="grid"><div class="c-main">
  <div class="box door-card" data-door-card>${LOGO}<div><p class="dc-title"><span class="serif">${serif(L(item.title))}</span> · <span class="id">${esc(item.id)}</span></p><p class="id dc-url">coldlibrary.com${short}</p><p class="meta">${T('Answer the warden at this address. You need no account or wallet, and no need to understand any of this today. No secrets are on this card.', '到这个地址回答守馆人的问题。不需要账号，也不需要钱包，今天也不用看懂这些。这张卡上没有任何密码。')}</p></div></div>
  <p class="actions door-acts"><button class="linkish" type="button" data-print-door>${T('Print a door card', '打印门牌卡')}</button><a href="/items/${esc(item.id)}.json" download>${T('Keep your own copy', '自己留一份')}</a><span class="meta">${T('The locked part stays locked in your copy too.', '你存下的这份里，锁着的部分照样锁着。')}</span></p>
</div></div>`,
      });
      const also = neighbours.length ? sec({
        id: 'also',
        h: T('Also on the shelves', '架上还有'),
        body: neighbours.length === 1 ? `<div class="grid shelf-one"><div class="c-main">${icard(lang, neighbours[0], { wide: true })}</div></div>` : `<div class="cards${neighbours.length === 2 ? ' halves' : neighbours.length === 3 ? ' thirds' : ''}">${neighbours.slice(0, 4).map((x) => icard(lang, x)).join('')}</div>`,
        foot: `<span class="actions">${go(href(lang, 'exhibits'), T('All exhibits', '全部展位'))}${go(href(lang, 'plaques'), T('All plaques', '全部铭牌'))}</span>`,
      }) : '';
      return [
        head,
        act(main),
        item.warden ? act(trial(lang, item, { lamps: true, label: false }), { alt: true }) : '',
        act(door + also, { alt: !item.warden }),
      ].join('\n');
    },
  };
}
