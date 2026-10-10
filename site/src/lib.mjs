// Shared helpers and layout for the Cold Library static site.
export const SITE = 'https://coldlibrary.com';
export const REPO = 'https://github.com/nathanskill/coldlibrary';
export const FOUNDED = '2026-10-04';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const t = (lang) => (en, zh) => (lang === 'zh' ? zh : en);
export const L = (lang) => (o) => (o == null ? '' : typeof o === 'string' ? o : o[lang] ?? o.en ?? '');
export const href = (lang, slug) => {
  if (lang === 'zh') return slug ? '/zh/' + slug : '/zh';
  return slug ? '/' + slug : '/';
};

// Days the library has been open, counting the founding day as day 1.
export function dayNumber(today = new Date()) {
  const start = Date.UTC(2026, 9, 4);
  const now = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.max(1, Math.floor((now - start) / 86400000) + 1);
}

// The elevator directory: a secondary, Severance-flavoured wayfinder. Top floor first.
export const FLOORS = [
  { code: '8', slug: 'about', en: 'About the library', zh: '关于这座馆', what_en: 'Why it is called a cold library, and the log.', what_zh: '为什么叫冷冻图书馆，以及馆务日志。' },
  { code: '7', slug: 'rules', en: 'House Rules & Ledger', zh: '馆规与账本', what_en: 'What we will never do, and every cost.', what_zh: '我们永远不会做的事，和每一笔开支。' },
  { code: '6', slug: 'librarians', en: 'Librarians', zh: '馆员', what_en: 'Who keeps this place. A card in one minute.', what_zh: '谁在照看这里。一分钟领一张馆员证。' },
  { code: '5', slug: 'wardens', en: 'Wardens', zh: '守馆人', what_en: 'The AI at each door, and its trial.', what_zh: '每扇门口的 AI，和它的考验。' },
  { code: '4', slug: 'exhibits', en: 'Exhibits', zh: '展位', what_en: 'Perpetual exhibits for projects and life works.', what_zh: '给项目和一生作品的永续展位。' },
  { code: '3', slug: 'plaques', en: 'Plaques', zh: '铭牌', what_en: 'Perpetual plaques for people, living or not.', what_zh: '给人的永续铭牌，在世与否都可以。' },
  { code: '2', slug: 'collect', en: 'Collection Desk', zh: '领取处', what_en: 'Someone left you something? Start here.', what_zh: '有人给你留了东西？从这里开始。' },
  { code: '1', slug: 'accession', en: 'Front Desk', zh: '前台', what_en: 'Hang your own exhibit or plaque.', what_zh: '挂上你自己的展位或铭牌。' },
  { code: 'L', slug: '', en: 'Lobby', zh: '大厅', what_en: 'Where everyone comes in from the cold.', what_zh: '从外面的冷里走进来的地方。' },
  { code: 'B1', slug: 'sealed', en: 'Sealed layer', zh: '封存层', what_en: 'Things kept for later, sealed offline.', what_zh: '留给以后的东西，离线封存。' },
  { code: 'B2', slug: 'vault', en: 'Cold Vault', zh: '冷库', what_en: 'Crypto assets in your own contract. Testnet only.', what_zh: '加密资产放在你自己的合约里。目前只在测试网。' },
];
export const floorOf = (slug) => FLOORS.find((f) => f.slug === slug.split('/')[0]);

// The façade of the lake library as a thin line drawing: flat roof, a glass band, its reflection, one lit window.
export const LOGO = `<svg class="logo-mark" viewBox="0 0 40 28" aria-hidden="true" focusable="false"><g fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M3 7h34"/><path d="M5 7v11h30V7"/><path d="M5 11.5h30" stroke-opacity=".55"/><path d="M11 11.5V18M17 11.5V18M23 11.5V18M29 11.5V18" stroke-opacity=".7"/><path d="M1 21.5h38"/><path d="M6 24.5h28M11 27h18" stroke-opacity=".4"/></g><rect class="lit" x="23.6" y="12.6" width="4.8" height="4.6"/></svg>`;

const ICON_THEME = `<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 2.4a5.6 5.6 0 0 1 0 11.2z" fill="currentColor"/></svg>`;

export function statusBar(lang, slug) {
  const T = t(lang);
  const day = dayNumber();
  if (slug === 'vault' || slug === 'sealed' || slug === 'collect') {
    return `<div class="status-bar warn" role="note"><div class="wrap"><span class="dot"></span>${slug === 'sealed'
      ? T('Status · the sealing tools are not audited yet. Try them on something small first.', '状态 · 封存工具还没有经过审计，先拿小东西试。')
      : T('Status · Cold Vault runs on the Sepolia testnet only · not audited · do not deposit real funds', '状态 · 冷库只在 Sepolia 测试网运行 · 未经审计 · 请勿存入真实资产')}</div></div>`;
  }
  return `<div class="status-bar" role="note"><div class="wrap"><span class="dot"></span><span>${T('Open today', '今日开馆')} · ${T('est. ', '')}${FOUNDED}${T('', ' 建馆')} · <span data-day data-founded="${FOUNDED}">${T('day ' + day, '第 ' + day + ' 天')}</span></span></div></div>`;
}

export function directoryBoard(lang, slug) {
  const T = t(lang);
  const items = FLOORS.map((f) => {
    const cur = f.slug === slug.split('/')[0];
    return `<li><a href="${href(lang, f.slug)}"${cur ? ' aria-current="page"' : ''}><span class="floor">${esc(f.code)}</span><span class="dept">${esc(T(f.en, f.zh))}<span class="what">${esc(T(f.what_en, f.what_zh))}</span></span></a></li>`;
  }).join('');
  return `<div class="directory" id="directory" role="dialog" aria-modal="true" aria-label="${T('Floors', '楼层')}" hidden>
  <div class="board">
    <div class="board-head"><span>${T('Cold Library · Floors', '冷冻图书馆 · 楼层')}</span><button class="board-close" type="button" data-close-directory>${T('Close', '关闭')}</button></div>
    <ol>${items}</ol>
    <p class="board-foot">${T('The elevator is a figure of speech. The stairs are always open.', '电梯只是一个比喻。楼梯一直开着。')}</p>
  </div>
</div>`;
}

const NAV = ['exhibits', 'plaques', 'wardens', 'vault'];

export function header(lang, slug) {
  const T = t(lang);
  const other = lang === 'en' ? 'zh' : 'en';
  const top = slug.split('/')[0];
  const nav = NAV.map((s) => { const f = floorOf(s); return `<a href="${href(lang, s)}"${top === s ? ' aria-current="page"' : ''}>${esc(T(f.en.replace('Cold Vault', 'Cold Vault'), f.zh))}</a>`; }).join('');
  const more = ['collect', 'librarians', 'rules', 'about'].map((s) => { const f = floorOf(s); return `<a href="${href(lang, s)}">${esc(T(f.en, f.zh))}</a>`; }).join('');
  return `<header class="site-head">
  <div class="wrap">
    <a class="brand" href="${href(lang, '')}" aria-label="${T('Cold Library, lobby', '冷冻图书馆，大厅')}">${LOGO}<span class="brand-name">${T('Cold Library', '冷冻图书馆')}</span></a>
    <nav class="nav" aria-label="${T('Main', '主导航')}">${nav}</nav>
    <span class="spacer"></span>
    <button class="tool" type="button" data-open-directory aria-controls="directory">${T('Floors', '楼层')}</button>
    <a class="tool" href="${href(other, slug)}" hreflang="${other === 'zh' ? 'zh-CN' : 'en'}" data-switch-lang="${other}" lang="${other === 'zh' ? 'zh-CN' : 'en'}">${lang === 'en' ? '中文' : 'EN'}</a>
    <button class="tool icon" type="button" data-toggle-theme aria-label="${T('Switch light or dark', '切换浅色或深色')}">${ICON_THEME}</button>
    <a class="btn small head-cta" href="${href(lang, 'accession')}">${T('Hang your own', '挂上你自己的')} <span aria-hidden="true">→</span></a>
    <details class="menu"><summary aria-label="${T('Menu', '菜单')}">${T('Menu', '菜单')}</summary><div class="menu-panel">${nav}${more}<a href="${href(lang, 'accession')}">${T('Hang your own →', '挂上你自己的 →')}</a></div></details>
  </div>
</header>`;
}

export function layout({ lang, slug, title, description, body, image = '/assets/img/lake-library.jpg', bodyClass = '', noindex = false }) {
  const T = t(lang);
  const other = lang === 'en' ? 'zh' : 'en';
  const canonical = SITE + href(lang, slug);
  const fullTitle = slug ? `${title} — ${T('Cold Library', '冷冻图书馆')}` : T('Cold Library — keep what is yours, carry on what you meant', '冷冻图书馆 — 收藏属于你的一切，把意志传下去');
  return `<!doctype html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
${noindex ? '<meta name="robots" content="noindex">\n' : ''}<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="en" href="${SITE + href('en', slug)}">
<link rel="alternate" hreflang="zh-CN" href="${SITE + href('zh', slug)}">
<link rel="alternate" hreflang="x-default" href="${SITE + href('en', slug)}">
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
<link rel="preload" href="/assets/fonts/ibm-plex-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css">
<script src="/assets/theme.js"></script>
<script src="/assets/site.js" defer></script>
</head>
<body class="${bodyClass}" data-lang="${lang}" data-slug="${esc(slug)}">
<a class="skip" href="#main">${T('Skip to content', '跳到正文')}</a>
<div class="lang-bar" id="lang-bar" hidden><div class="wrap"><a href="${href(other, slug)}" data-switch-lang="${other}" lang="${other === 'zh' ? 'zh-CN' : 'en'}">${lang === 'en' ? '这里有中文版 → 切换到中文' : 'An English version is available → switch'}</a><button type="button" data-dismiss-lang aria-label="${T('Dismiss', '关闭')}">×</button></div></div>
${statusBar(lang, slug.split('/')[0])}
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

export function footer(lang) {
  const T = t(lang);
  const link = (slug, en, zh) => `<li><a href="${href(lang, slug)}">${T(en, zh)}</a></li>`;
  return `<footer class="site-foot">
  <div class="wrap">
    <div class="foot-cols">
      <div class="foot-brand">${LOGO}<p><b>${T('Cold Library', '冷冻图书馆')}</b><br>${T('We keep the library, never the keys.', '我们守着图书馆，从不保管钥匙。')}</p></div>
      <ul>${link('exhibits', 'Exhibits', '展位')}${link('plaques', 'Plaques', '铭牌')}${link('wardens', 'Wardens', '守馆人')}${link('vault', 'Cold Vault', '冷库')}${link('sealed', 'Sealed layer', '封存层')}</ul>
      <ul>${link('collect', 'Collection Desk', '领取处')}${link('librarians', 'Librarians', '馆员')}${link('rules', 'House rules & ledger', '馆规与账本')}${link('about', 'About', '关于')}<li><a href="${REPO}">${T('Source on GitHub', 'GitHub 源代码')}</a></li></ul>
    </div>
    <p class="statute">${T('Non-profit · Open source (code Apache-2.0, format CC0) · No cookies · No ads · No token · Keys never held · Not a legal will · 18+', '非营利 · 开源（代码 Apache-2.0，格式 CC0）· 不用 Cookie · 没有广告 · 没有代币 · 从不保管钥匙 · 不是法律遗嘱 · 仅限 18 岁以上')}</p>
    <p class="colophon">${T('Set in IBM Plex, served from this site. Photographs are generated images.', '字体 IBM Plex，由本站自己提供。照片均为生成图像。')} <span class="sep">·</span> <a href="${href(lang, 'warm-room')}">${T('Not okay right now? The Warm Room →', '如果你现在不太好：暖房 →')}</a></p>
  </div>
</footer>`;
}

// ---------- components ----------
// A photograph as a museum plate. Portrait source for phones when one exists.
export function picture({ name, alt, portrait = null, sizes = '100vw', cls = '', eager = false }) {
  const p = portrait ? `<source media="(max-width: 700px)" srcset="/assets/img/${portrait}-sm.jpg 720w, /assets/img/${portrait}.jpg 1024w" sizes="100vw">` : '';
  return `<picture class="${cls}">${p}<img src="/assets/img/${name}.jpg" srcset="/assets/img/${name}-sm.jpg 820w, /assets/img/${name}.jpg 1536w" sizes="${sizes}" alt="${esc(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"></picture>`;
}

export function plate(n, lang, en, zh) {
  const T = t(lang);
  return `<span class="plate">${T('Plate', '图版')} ${n} · ${T(en, zh)} · ${T('generated image', '生成图像')}</span>`;
}

export function pageHero({ lang, slug, title, lede, image, alt, portrait = null, n = 1, caption_en = '', caption_zh = '', strip = false }) {
  const T = t(lang);
  const f = floorOf(slug);
  return `<section class="page-hero${image ? ' has-image' : ''}${strip ? ' strip' : ''}">
  <div class="wrap">
    ${f ? `<p class="kicker"><span class="floor-chip">${esc(f.code)}</span>${esc(T(f.en, f.zh))}</p>` : ''}
    <h1>${title}</h1>
    ${lede ? `<p class="lede">${lede}</p>` : ''}
  </div>
  ${image ? `<figure class="hero-plate">${picture({ name: image, alt, portrait, eager: true })}${caption_en ? plate(n, lang, caption_en, caption_zh) : ''}</figure>` : ''}
</section>`;
}

export function sectionHead(label, title, intro = '') {
  return `<div class="section-head">${label ? `<p class="label">${label}</p>` : ''}<h2>${title}</h2>${intro ? `<p class="intro">${intro}</p>` : ''}</div>`;
}

export function card({ acc, title, fields = [], body = '', stamp = '', stampClass = '' }) {
  const rows = fields.map(([k, v]) => `<div class="field"><span>${k}</span><span>${v}</span></div>`).join('');
  return `<article class="card">${acc ? `<span class="acc">${esc(acc)}</span>` : ''}<h3>${title}</h3>${rows}${body ? `<div class="card-body">${body}</div>` : ''}${stamp ? `<span class="stamp ${stampClass}">${stamp}</span>` : ''}</article>`;
}

// Minimal markdown: headings, paragraphs, blockquotes, emphasis, links.
export function md(src) {
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\[(.+?)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
  return String(src || '').trim().split(/\n{2,}/).map((b) => {
    if (b.startsWith('## ')) return `<h2>${inline(b.slice(3))}</h2>`;
    if (b.startsWith('> ')) return `<blockquote>${inline(b.replace(/^> ?/gm, ''))}</blockquote>`;
    return `<p>${inline(b).replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
}
