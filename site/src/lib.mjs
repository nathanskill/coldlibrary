// Shared helpers and the page frame for the Cold Library static site (visual system v5, 2026-10-11).
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const SITE = 'https://coldlibrary.com';
export const REPO = 'https://github.com/nathanskill/coldlibrary';
export const FOUNDED = '2026-10-04';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const t = (lang) => (en, zh) => (lang === 'zh' ? zh : en);
export const L = (lang) => (o) => (o == null ? '' : typeof o === 'string' ? o : o[lang] ?? o.en ?? '');
export const href = (lang, slug) => {
  // Chinese is the default (2026-10-15): Chinese at /, English under /en.
  if (lang === 'en') return slug ? '/en/' + slug : '/en';
  return slug ? '/' + slug : '/';
};
export const htmlLang = (lang) => (lang === 'zh' ? 'zh-CN' : 'en');
// Classical Chinese is tagged zh-Hant / zh-Hans in HTML (browsers do not map lzh to Chinese glyph forms).
export const tagOf = (lang) => String(lang || 'en').replace(/^lzh-/, 'zh-').replace(/^lzh$/, 'zh-Hant');

// Days the library has been open, counting the founding day as day 1.
export function dayNumber(today = new Date()) {
  const start = Date.UTC(2026, 9, 4);
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.max(1, Math.floor((now - start) / 86400000) + 1);
}

// ---------- glyphs: the Chinese serif is sliced per page, so templates register what they set in serif ----------
const HAN = /[　-〿㐀-䶿一-鿿豈-﫿＀-￯]|[\u{20000}-\u{2ebef}]/gu;
let glyphs = null;
const emptyBuckets = () => ({ base: new Set(), hant: new Set(), hans: new Set(), w600: new Set() });
export function resetGlyphs() { glyphs = { ...emptyBuckets(), extra: new Map() }; }
export function addGlyphs(text, bucket = 'base') {
  if (!glyphs) resetGlyphs();
  for (const c of String(text ?? '').match(HAN) || []) glyphs[bucket].add(c);
}
// Register glyphs under a separate font key, e.g. one lobby "today's reading" block per pick ("today-S-001001").
// The page itself does not load that key; the page's script loads fontCssHref(key) (fonts.mjs) when it shows the block.
export function addGlyphsTo(key, text, bucket = 'base') {
  if (!glyphs) resetGlyphs();
  if (!glyphs.extra.has(key)) glyphs.extra.set(key, emptyBuckets());
  for (const c of String(text ?? '').match(HAN) || []) glyphs.extra.get(key)[bucket].add(c);
}
const flat = (g) => ({ base: [...g.base].join(''), hant: [...g.hant].join(''), hans: [...g.hans].join(''), w600: [...g.w600].join('') });
export function takeGlyphs() {
  const g = glyphs || { ...emptyBuckets(), extra: new Map() };
  return { ...flat(g), extra: Object.fromEntries([...g.extra].map(([k, v]) => [k, flat(v)])) };
}
// Escape text that will be set in the serif and register its Chinese characters.
export function serif(text, bucket = 'base') { addGlyphs(text, bucket); return esc(text); }

// Keep the last two Han characters (with trailing punctuation) or, in short English headings, the last two words together.
// No invisible characters are inserted, so copy and find-in-page stay clean. Element content only, never attributes.
export function glue(s, { escape = true } = {}) {
  const raw = String(s ?? '');
  const e = escape ? esc : (x) => x;
  const han = raw.match(/^([\s\S]*?)([㐀-鿿豈-﫿]{2}[　-〿＀-￯」』”’）》〉]*)$/u);
  if (han && han[1]) return `${e(han[1])}<span class="nw">${e(han[2])}</span>`;
  const words = raw.trim().split(/\s+/);
  if (words.length >= 3 && words.length <= 6 && !/[㐀-鿿]/.test(raw)) return `${e(words.slice(0, -2).join(' '))} <span class="nw">${e(words.slice(-2).join(' '))}</span>`;
  return e(raw);
}

export const ARROW = '<span class="nw">&nbsp;→</span>';
export const go = (url, label, { cls = 'go', attrs = '' } = {}) => `<a class="${cls}" href="${esc(url)}"${attrs ? ' ' + attrs : ''}>${label}${ARROW}</a>`;
export const sep = '<span class="sep" aria-hidden="true">·</span><wbr>';
export const metaLine = (parts, cls = 'meta') => `<p class="${cls}">${parts.filter(Boolean).join(sep)}</p>`;

// ---------- floors: the directory is an optional delight; the header, menu and footer do the real work ----------
export const FLOORS = [
  { code: '12', slug: 'about', en: 'About the library', zh: '关于这座馆', what_en: 'Why it is called a cold library, and the log.', what_zh: '为什么叫冷冻图书馆，以及馆务日志。' },
  { code: '11', slug: 'rules', en: 'House Rules & Ledger', zh: '馆规与账本', what_en: 'What we will never do, and every cost.', what_zh: '我们永远不会做的事，和每一笔开支。' },
  { code: '10', slug: 'librarians', en: 'Librarians', zh: '馆员', what_en: 'Who keeps this place. A card in one minute.', what_zh: '谁在照看这里。一分钟领一张馆员证。' },
  { code: '9', slug: 'wardens', en: 'Wardens', zh: '守馆人', what_en: 'The AI at each door, and its trial.', what_zh: '每扇门口的 AI，和它的考验。' },
  { code: '8', slug: 'exhibits', en: 'Exhibits', zh: '展位', what_en: 'Perpetual exhibits for projects and life works.', what_zh: '给项目和一生作品的永续展位。' },
  { code: '7', slug: 'plaques', en: 'Plaques', zh: '铭牌', what_en: 'Perpetual plaques for people, living or not.', what_zh: '给人的永续铭牌，在世与否都可以。' },
  { code: '6', slug: 'memorial', en: 'Memorial', zh: '纪念', what_en: 'Exhibits, plaques and lamps for the makers.', what_zh: '展位、铭牌，和为作者点的灯。' },
  { code: '5', slug: 'collect', en: 'Collection Desk', zh: '领取处', what_en: 'Someone left you something? Start here.', what_zh: '有人给你留了东西？从这里开始。' },
  { code: '4', slug: 'accession', en: 'Front Desk', zh: '前台', what_en: 'Hang your own exhibit or plaque.', what_zh: '挂上你自己的展位或铭牌。' },
  { code: '3', slug: 'music', en: 'Record Room', zh: '唱片室', what_en: 'Albums from every continent, rated.', what_zh: '来自各大洲的专辑，都有评分。' },
  { code: '2', slug: 'books', en: 'Catalogue', zh: '书目', what_en: 'Books rated without their text: scripture, history, beauty, novels.', what_zh: '只收书目和评分的书：经典、历史、美学、小说。' },
  { code: '1', slug: 'open-stacks', en: 'Open Stacks', zh: '开架书库', what_en: 'Real works anyone may read, copy and keep.', what_zh: '谁都能读、能抄、能带走的真实作品。' },
  { code: 'M', slug: 'charts', en: 'Charts', zh: '榜单', what_en: 'Everything ranked within its kind.', what_zh: '一切都按其类排了名。' },
  { code: 'L', slug: '', en: 'Lobby', zh: '大厅', what_en: 'Where everyone comes in from the cold.', what_zh: '从外面的冷里走进来的地方。' },
  { code: 'B1', slug: 'sealed', en: 'Sealed layer', zh: '封存层', what_en: 'Things kept for later, sealed offline.', what_zh: '留给以后的东西，离线封存。' },
  { code: 'B2', slug: 'vault', en: 'Cold Vault', zh: '冷库', what_en: 'Crypto assets in your own contract. Testnet only.', what_zh: '加密资产放在你自己的合约里。目前只在测试网。' },
];
export const floorOf = (slug) => FLOORS.find((f) => f.slug === String(slug).split('/')[0]);

// The façade of the lake library as a thin line drawing: flat roof, a glass band, its reflection, one lit window.
export const LOGO = `<svg class="logo-mark" viewBox="0 0 40 28" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M3 7h34"/><path d="M5 7v11h30V7"/><path d="M5 11.5h30" stroke-opacity=".55"/><path d="M11 11.5V18M17 11.5V18M23 11.5V18M29 11.5V18" stroke-opacity=".7"/><path d="M1 21.5h38"/><path d="M6 24.5h28M11 27h18" stroke-opacity=".4"/></g><rect class="lit" x="23.6" y="12.6" width="4.8" height="4.6"/></svg>`;
export const ICON_SEARCH = `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="7" cy="7" r="4.9" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10.6 10.6 14 14" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>`;
const ICON_THEME = `<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 2.4a5.6 5.6 0 0 1 0 11.2z" fill="currentColor"/></svg>`;

const NAV = [['charts', 'Charts', '榜单'], ['open-stacks', 'Open Stacks', '开架书库'], ['books', 'Catalogue', '书目'], ['music', 'Record Room', '唱片室'], ['memorial', 'Memorial', '纪念']];
const MORE = [['exhibits', 'Exhibits', '展位'], ['plaques', 'Plaques', '铭牌'], ['wardens', 'Wardens', '守馆人'], ['accession', 'Front Desk', '前台'], ['collect', 'Collection Desk', '领取处'], ['vault', 'Cold Vault', '冷库'], ['librarians', 'Librarians', '馆员'], ['rules', 'House rules', '馆规'], ['about', 'About', '关于']];

export function directoryBoard(lang, slug) {
  const T = t(lang);
  const items = FLOORS.map((f) => {
    const cur = f.slug === String(slug).split('/')[0];
    return `<li><a href="${href(lang, f.slug)}"${cur ? ' aria-current="page"' : ''}><span class="floor">${esc(f.code)}</span><span class="dept">${esc(T(f.en, f.zh))}<span class="what">${esc(T(f.what_en, f.what_zh))}</span></span></a></li>`;
  }).join('');
  return `<div class="directory" id="directory" role="dialog" aria-modal="true" aria-labelledby="directory-h" hidden>
  <div class="board">
    <div class="board-head"><h2 id="directory-h">${T('Floors', '楼层')}</h2><button class="btn small secondary" type="button" data-close-directory>${T('Close', '关闭')}</button></div>
    <ol>${items}</ol>
    <p class="meta board-foot">${T('The elevator is a figure of speech. The stairs are always open.', '电梯只是一个比喻。楼梯一直开着。')}</p>
  </div>
</div>`;
}

export function header(lang, slug) {
  const T = t(lang);
  const other = lang === 'en' ? 'zh' : 'en';
  const top = String(slug).split('/')[0];
  const link = ([s, en, zh]) => `<a href="${href(lang, s)}"${top === s ? ' aria-current="page"' : ''}>${T(en, zh)}</a>`;
  const langLink = (cls) => `<a class="tool lang-link ${cls}" href="${href(other, slug)}" hreflang="${htmlLang(other)}" lang="${htmlLang(other)}" data-switch-lang="${other}"><span class="short">${lang === 'en' ? '中文' : 'English'}</span><span class="long">${lang === 'en' ? '这里有中文版' : 'English version'}</span></a>`;
  const theme = (cls) => `<button class="tool icon theme-toggle ${cls}" type="button" data-toggle-theme aria-label="${T('Switch light or dark', '切换浅色或深色')}">${ICON_THEME}</button>`;
  return `<header class="site-head">
  <div class="wrap head-row">
    <a class="brand" href="${href(lang, '')}" aria-label="${T('Cold Library, lobby', '冷冻图书馆，大厅')}">${LOGO}<span>${T('Cold Library', '冷冻图书馆')}</span></a>
    <nav class="nav" aria-label="${T('Main', '主导航')}">${NAV.map(link).join('')}</nav>
    <span class="spacer"></span>
    <div class="tools">
      <a class="tool search-link" href="${href(lang, 'open-stacks/search')}" aria-label="${T('Search the library', '搜索图书馆')}">${ICON_SEARCH}<span class="lbl">${T('Search', '搜索')}</span></a>
      ${langLink('')}
      ${theme('')}
      <a class="head-cta" href="${href(lang, 'accession')}">${T('Hang your own', '挂上你自己的')}${ARROW}</a>
      <details class="menu"><summary aria-label="${T('Menu', '菜单')}">${T('Menu', '菜单')}</summary><div class="menu-panel">
        <div class="menu-top">${langLink('')}${theme('')}</div>
        ${NAV.map(link).join('')}<div class="sep-line"></div>${MORE.map(link).join('')}
      </div></details>
    </div>
  </div>
</header>`;
}

export function footer(lang) {
  const T = t(lang);
  const li = (slug, en, zh) => `<li><a href="${href(lang, slug)}">${T(en, zh)}</a></li>`;
  const claims = [T('Non-profit', '非营利'), T('open source', '开源'), T('no cookies', '不用 Cookie'), T('no ads', '没有广告'), T('no token', '没有代币'), T('not a legal will', '不是法律遗嘱'), T('18+', '仅限 18 岁以上')];
  return `<footer class="site-foot">
  <div class="wrap">
    <div class="grid foot-cols">
      <div class="foot-brand"><a class="brand" href="${href(lang, '')}">${LOGO}<span>${T('Cold Library', '冷冻图书馆')}</span></a><p>${T('We keep the library, never the keys.', '我们守着图书馆，从不保管钥匙。')}</p></div>
      <div class="foot-col"><h2>${T('Collections', '馆藏')}</h2><ul>${li('charts', 'Charts', '榜单')}${li('open-stacks', 'Open Stacks', '开架书库')}${li('books', 'Catalogue', '书目')}${li('music', 'Record Room', '唱片室')}${li('open-stacks/claude', 'Claude’s shelf', 'Claude 的书架')}${li('open-stacks/plates', 'Plates', '图版')}</ul></div>
      <div class="foot-col"><h2>${T('Memorial', '纪念')}</h2><ul>${li('memorial', 'Memorial hall', '纪念')}${li('exhibits', 'Exhibits', '展位')}${li('plaques', 'Plaques', '铭牌')}${li('wardens', 'Wardens', '守馆人')}${li('accession', 'Front Desk', '前台')}${li('collect', 'Collection Desk', '领取处')}${li('vault', 'Cold Vault', '冷库')}</ul></div>
      <div class="foot-col"><h2>${T('About', '关于')}</h2><ul>${li('about', 'About the library', '关于这座馆')}${li('rules', 'House rules & ledger', '馆规与账本')}${li('librarians', 'Librarians', '馆员')}<li><button class="linkish" type="button" data-open-directory aria-controls="directory">${T('Floor directory', '楼层指引')}</button></li><li><a href="${lang === 'en' ? '/en' : ''}/open-stacks/feed.xml">${T('New accessions (feed)', '新入藏（订阅）')}</a></li><li><a href="${REPO}">${T('Source on GitHub', 'GitHub 源代码')}</a></li></ul></div>
    </div>
    <div class="foot-lines">
      <p>${claims.map((c) => `<span class="nw">${c}</span>`).join(' <span class="sep" aria-hidden="true">·</span> ')}</p>
      <p>${T('Open since', '开馆于')} ${FOUNDED} <span class="sep" aria-hidden="true">·</span> <span data-day data-founded="${FOUNDED}">${T('day ' + dayNumber(), '第 ' + dayNumber() + ' 天')}</span> <span class="sep" aria-hidden="true">·</span> ${T('Set in IBM Plex and Noto Serif SC, served from this site.', '字体 IBM Plex 与思源宋体（Noto Serif SC），由本站自己提供。')}</p>
      <p><a href="${href(lang, 'warm-room')}">${T('Not okay right now? The Warm Room', '如果你现在不太好：暖房')}${ARROW}</a></p>
    </div>
  </div>
</footer>`;
}

// The page frame. `head` carries the page's own font links; `scripts` are extra deferred scripts in /assets/js/.
// A meta description: whole sentences up to about 160 characters (90 for Chinese, which search results show fewer of).
export function describe(s) {
  const x = String(s || '').replace(/\s+/g, ' ').trim();
  const max = /[\u3400-\u9fff]/.test(x) ? 90 : 160;
  if (x.length <= max) return x;
  const parts = x.match(/[^.!?。！？]+[.!?。！？]+["”’）)」]?\s*/g) || [];
  let out = '';
  for (const p of parts) { if ((out + p).length > max) break; out += p; }
  return (out || x.slice(0, max - 3).replace(/\s+\S*$/, '') + '…').trim();
}

export function layout({ lang, slug, title, description, body, image = '/assets/img/lake-library.jpg', bodyClass = '', noindex = false, head = '', scripts = [], alternates = true, notFound = false }) {
  const T = t(lang);
  const canonical = SITE + href(lang, slug);
  // the 404 page keeps the lobby's links (slug '') but its own title, and is never indexed
  if (notFound) noindex = true;
  const fullTitle = slug || notFound ? `${title} — ${T('Cold Library', '冷冻图书馆')}` : T('Cold Library — rate what lasts, remember who made it', '冷冻图书馆 Cold Library — Rate what lasts');
  return `<!doctype html>
<html lang="${htmlLang(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}<link rel="canonical" href="${canonical}">
${alternates ? `<link rel="alternate" hreflang="en" href="${SITE + href('en', slug)}">
<link rel="alternate" hreflang="zh-CN" href="${SITE + href('zh', slug)}">
<link rel="alternate" hreflang="x-default" href="${SITE + href('zh', slug)}">
` : ''}<link rel="alternate" type="application/atom+xml" title="${T('Cold Library · new accessions', '冷冻图书馆 · 新入藏')}" href="${lang === 'en' ? '/en' : ''}/open-stacks/feed.xml">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${T('Cold Library', '冷冻图书馆')}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}${image}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#F3F1EC" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#0E1417" media="(prefers-color-scheme: dark)">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/ibm-plex-sans-latin-400-normal.v2.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css">
${head}<script src="/assets/js/prefs.js"></script>
<script src="/assets/js/chrome.js" defer></script>
<script src="/assets/site.js" defer></script>
${scripts.map((s) => `<script src="/assets/js/${s}.js" defer></script>`).join('\n')}
</head>
<body class="${esc(bodyClass)}" data-lang="${lang}" data-slug="${esc(slug)}">
<a class="skip" href="#main">${T('Skip to content', '跳到正文')}</a>
${header(lang, slug)}
${directoryBoard(lang, slug)}
<main id="main">
${body}
</main>
${footer(lang)}
</body>
</html>
`;
}

// ---------- page building blocks ----------
// An act: a run of sections with one job and one background.
export const act = (inner, { alt = false, cls = '', id = '' } = {}) => `<div class="act${alt ? ' alt' : ''}${cls ? ' ' + cls : ''}"${id ? ` id="${id}"` : ''}>${inner}</div>`;

// A section: S1 stacked (head in c-main) or S2 side-head (`side: true`).
export function sec({ id = '', h, intro = '', label = '', body = '', foot = '', side = false, cls = '', level = 2 }) {
  const hid = id ? `h-${id}` : '';
  return `<section class="sec${side ? ' sec--side' : ''}${cls ? ' ' + cls : ''}"${id ? ` id="${id}"` : ''}${hid ? ` aria-labelledby="${hid}"` : ''}>
  <div class="wrap grid">
    <header class="sec-head c-main">${label ? `<p class="meta">${label}</p>` : ''}<h${level}${hid ? ` id="${hid}"` : ''}>${h}</h${level}>${intro ? `<p class="sec-intro">${intro}</p>` : ''}</header>
    <div class="sec-body c-all">${body}</div>
    ${foot ? `<p class="sec-foot c-all">${foot}</p>` : ''}
  </div>
</section>`;
}

// Page headers. T1: text. T2: text + a generated photograph (`photo`) or a real public-domain plate (`plate`).
export function ph({ lang, crumbs = '', h1, sub = '', lede = '', facts = '', actions = '', advisory = '', photo = null, plate = null, tone = '', cls = '' }) {
  const text = `${tone ? `<span class="tone-edge tone-${tone}" aria-hidden="true"></span>` : ''}${crumbs ? `<div class="crumbs meta">${crumbs}</div>` : ''}<h1>${h1}</h1>${sub ? `<p class="sub">${sub}</p>` : ''}${lede ? `<p class="lede">${lede}</p>` : ''}${facts ? `<p class="meta facts">${facts}</p>` : ''}${advisory ? `<p class="advisory" role="note">${advisory}</p>` : ''}${actions ? `<div class="actions">${actions}</div>` : ''}`;
  if (photo) {
    return `<header class="ph split${cls ? ' ' + cls : ''}"><div class="wrap grid"><div class="c-half ph-text">${text}</div><figure class="c-half ph-fig photo photo-dim">${picture({ name: photo.name, alt: photo.alt, sizes: '(min-width: 900px) 50vw, 100vw', eager: true })}<figcaption>${photo.caption ? photo.caption + ' · ' : ''}${t(lang)('generated image', '生成图像')}</figcaption></figure></div></header>`;
  }
  if (plate) {
    return `<header class="ph split${cls ? ' ' + cls : ''}"><div class="wrap grid"><div class="c-half ph-text">${text}</div><figure class="c-half ph-fig plate"><div class="mat">${plate.img}</div>${plate.caption ? `<figcaption>${plate.caption}</figcaption>` : ''}</figure></div></header>`;
  }
  return `<header class="ph${cls ? ' ' + cls : ''}"><div class="wrap grid"><div class="c-main">${text}</div></div></header>`;
}

// A generated photograph. Portrait source for phones when one exists. Widths and the intrinsic size come from the files.
const IMG_DIR = new URL('../public/assets/img/', import.meta.url);
const sizeCache = new Map();
export function jpegSize(file) {
  if (sizeCache.has(file)) return sizeCache.get(file);
  let out = null;
  try {
    const b = readFileSync(file);
    for (let i = 2; i < b.length - 9;) {
      if (b[i] !== 0xff) { i++; continue; }
      const m = b[i + 1];
      if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) { out = { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) }; break; }
      i += 2 + b.readUInt16BE(i + 2);
    }
  } catch { out = null; }
  sizeCache.set(file, out);
  return out;
}
const imgSize = (name) => jpegSize(fileURLToPath(new URL(name + '.jpg', IMG_DIR)));
export function picture({ name, alt, portrait = null, sizes = '100vw', cls = '', eager = false, imgCls = '' }) {
  const big = imgSize(name), small = imgSize(name + '-sm');
  const srcset = (n, a, b) => `/assets/img/${n}-sm.jpg ${(b && b.width) || 820}w, /assets/img/${n}.jpg ${(a && a.width) || 1536}w`;
  const p = portrait ? `<source media="(max-width: 599px)" srcset="${srcset(portrait, imgSize(portrait), imgSize(portrait + '-sm'))}" sizes="100vw">` : '';
  const wh = big ? ` width="${big.width}" height="${big.height}"` : '';
  return `<picture${cls ? ` class="${cls}"` : ''}>${p}<img${imgCls ? ` class="${imgCls}"` : ''} src="/assets/img/${name}.jpg" srcset="${srcset(name, big, small)}" sizes="${sizes}"${wh} alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"></picture>`;
}

// Minimal markdown for house copy: headings, paragraphs, blockquotes, emphasis, links.
export function md(src) {
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\[(.+?)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
  return String(src || '').trim().split(/\n{2,}/).map((b) => {
    if (b.startsWith('## ')) return `<h2>${inline(b.slice(3))}</h2>`;
    if (b.startsWith('> ')) return `<blockquote>${inline(b.replace(/^> ?/gm, ''))}</blockquote>`;
    return `<p>${inline(b).replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
}
