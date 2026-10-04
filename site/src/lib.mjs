// Shared helpers and layout for the Cold Library static site.
export const SITE = 'https://coldlibrary.com';
export const REPO = 'https://github.com/nathanskill/coldlibrary';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// Directory board, top floor first, like an elevator panel.
export const FLOORS = [
  { code: '10', slug: 'name', en: 'The Name', zh: '名字', what_en: 'Why cold, and why a library.', what_zh: '为什么是冷冻，为什么是图书馆。' },
  { code: '9', slug: 'rules', en: 'House Rules', zh: '馆规', what_en: 'What this library will never do.', what_zh: '这座图书馆永远不会做的事。' },
  { code: '8', slug: 'ledger', en: 'Ledger Room', zh: '账本室', what_en: 'Every cost, and what "perpetual" honestly means.', what_zh: '每一笔开支，以及"永续"老实说是什么意思。' },
  { code: '7', slug: 'librarians', en: 'Register of Librarians', zh: '馆员名册', what_en: 'Who keeps this place. Get your card here.', what_zh: '谁在照看这里。在这一层领馆员证。' },
  { code: '6', slug: 'continuance', en: 'Department of Continuance', zh: '传承科', what_en: 'How a will is carried on without ruling anyone.', what_zh: '意志怎样传下去，而不去管束任何人。' },
  { code: '5', slug: 'wardens', en: 'The Wardens', zh: '守馆人', what_en: 'The AI agents that guard each exhibit and plaque.', what_zh: '守着每个展位和铭牌的 AI。' },
  { code: '4', slug: 'reading-room', en: 'Reading Room', zh: '阅览室', what_en: 'Tools to write, seal and open, on your own machine.', what_zh: '在你自己的电脑上整理、封存、开启的工具。' },
  { code: '3', slug: 'exhibits', en: 'Perpetual Exhibits', zh: '永续展位', what_en: 'A standing exhibit for a project or a life\'s work.', what_zh: '给一个项目、一生作品的常设展位。' },
  { code: '2', slug: 'plaques', en: 'Perpetual Plaques', zh: '永续铭牌', what_en: 'A plaque for a person, and the lamps people light.', what_zh: '给一个人的铭牌，和大家为他点的灯。' },
  { code: 'M', slug: 'open-stacks', en: 'Open Stacks', zh: '公开文集', what_en: 'Writing people chose to leave in the open.', what_zh: '人们选择公开留下的文字。' },
  { code: '1', slug: 'accession', en: 'Front Desk', zh: '前台 · 入藏处', what_en: 'Apply for an exhibit or a plaque.', what_zh: '在这里申请展位或铭牌。' },
  { code: 'L', slug: '', en: 'Lobby', zh: '大厅', what_en: 'Where everyone comes in from the cold.', what_zh: '从外面的冷里走进来的地方。' },
  { code: 'B1', slug: 'stacks', en: 'Closed Stacks', zh: '闭架书库', what_en: 'The sealed layer: things kept for later.', what_zh: '封存层：留给以后的东西。' },
  { code: 'B2', slug: 'harbour', en: 'The Cold Harbour', zh: '冷港', what_en: 'When sealed things are opened, and by whom.', what_zh: '封存的东西什么时候打开，由谁打开。' },
  { code: 'B4', slug: 'vault', en: 'The Cold Vault', zh: '冷库', what_en: 'Crypto assets in your own contract. You decide who gets what.', what_zh: '加密资产放在你自己的合约里，怎么分由你定。' },
  { code: 'B3', slug: 'keepers', en: 'Key Room', zh: '钥匙房', what_en: 'Keys split among people you trust.', what_zh: '钥匙分给你信任的几个人。' },
  { code: 'W', slug: 'warm-room', en: 'The Warm Room', zh: '暖房', what_en: 'If you are not okay, come here first.', what_zh: '如果你现在不太好，先来这里。', warm: true },
];
export const floorOf = (slug) => FLOORS.find((f) => f.slug === slug.split('/')[0]);

export const href = (lang, slug) => {
  const s = slug ? '/' + slug : '/';
  if (lang === 'zh') return slug ? '/zh/' + slug : '/zh';
  return s;
};

export const t = (lang) => (en, zh) => (lang === 'zh' ? zh : en);

const BRAND_SVG = `<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true"><rect x="1.5" y="1.5" width="29" height="29" rx="7" fill="none" stroke="currentColor" stroke-opacity=".55"/><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M16 7v18M8.2 11.5l15.6 9M8.2 20.5l15.6-9"/><path d="M16 7l-2.2 2.2M16 7l2.2 2.2M16 25l-2.2-2.2M16 25l2.2-2.2" stroke-opacity=".7"/></g><circle cx="16" cy="16" r="2.2" fill="currentColor"/></svg>`;
const ICON_DIR = `<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 3h12M2 8h12M2 13h12" stroke="currentColor" stroke-width="1.4" fill="none"/><circle cx="4" cy="3" r="1.2" fill="currentColor"/></svg>`;
const ICON_THEME = `<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="5.6" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M8 2.4a5.6 5.6 0 0 1 0 11.2z" fill="currentColor"/></svg>`;

export function directoryBoard(lang, slug) {
  const T = t(lang);
  const items = FLOORS.map((f) => {
    const cur = f.slug === slug.split('/')[0];
    return `<li><a href="${href(lang, f.slug)}" class="${f.warm ? 'warm' : ''}"${cur ? ' aria-current="page"' : ''}><span class="floor">${esc(f.code)}</span><span class="dept">${esc(T(f.en, f.zh))}<span class="what">${esc(T(f.what_en, f.what_zh))}</span></span><span class="arrow">→</span></a></li>`;
  }).join('');
  return `<div class="directory" id="directory" role="dialog" aria-modal="true" aria-label="${T('Floor directory', '楼层指示')}" hidden>
  <div class="board">
    <div class="board-head"><span class="board-title">${T('Cold Library · Floor Directory', '冷冻图书馆 · 楼层指示')}</span><button class="board-close" type="button" data-close-directory>${T('Close · Esc', '关闭 · Esc')}</button></div>
    <ol>${items}</ol>
    <div class="board-foot"><span>${T('Stairs are always open. The elevator is a figure of speech.', '楼梯一直开着。电梯只是一个比喻。')}</span><span>78°14′N 15°29′E</span></div>
  </div>
</div>`;
}

export function layout({ lang, slug, title, description, body, image = '/assets/img/lake-library.jpg', bodyClass = '' }) {
  const T = t(lang);
  const other = lang === 'en' ? 'zh' : 'en';
  const canonical = SITE + href(lang, slug);
  const enUrl = SITE + href('en', slug);
  const zhUrl = SITE + href('zh', slug);
  const fullTitle = slug ? `${title} — ${T('Cold Library', '冷冻图书馆')}` : T('Cold Library — keep what is yours, carry on what you meant', '冷冻图书馆 — 收藏属于你的一切，把意志传下去');
  return `<!doctype html>
<html lang="${lang === 'zh' ? 'zh-CN' : 'en'}" data-theme="dark">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<link rel="alternate" hreflang="en" href="${enUrl}">
<link rel="alternate" hreflang="zh-CN" href="${zhUrl}">
<link rel="alternate" hreflang="x-default" href="${enUrl}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${T('Cold Library', '冷冻图书馆')}">
<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:image" content="${SITE}${image}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#060a0f">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="preload" href="/assets/fonts/ibm-plex-sans-condensed-latin-600-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/ibm-plex-sans-latin-400-normal.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css">
<script src="/assets/theme.js"></script>
<script src="/assets/site.js" defer></script>
</head>
<body class="${bodyClass}" data-lang="${lang}" data-slug="${esc(slug)}" data-other="${href(other, slug)}">
<a class="skip" href="#main">${T('Skip to content', '跳到正文')}</a>
<header class="topbar">
  <div class="wrap">
    <a class="brand" href="${href(lang, '')}" aria-label="${T('Cold Library, lobby', '冷冻图书馆，大厅')}">${BRAND_SVG}<span class="brand-name">${T('Cold Library', '冷冻图书馆')}</span></a>
    <span class="ticker" aria-hidden="true"><b>78°14′N</b> 15°29′E · ${T('stacks at', '书库温度')} <b>−18 °C</b> · ${T('est.', '建馆')} 2026-10-04 · ${T('kept for as long as someone cares', '有人照看，就一直在')}</span>
    <span class="spacer"></span>
    <button class="tool" type="button" data-open-directory aria-controls="directory">${ICON_DIR}<span class="tool-text">${T('Floors', '楼层')}</span></button>
    <button class="tool" type="button" data-toggle-theme aria-label="${T('Switch light or dark', '切换浅色或深色')}">${ICON_THEME}</button>
    <a class="tool lang" href="${href(other, slug)}" hreflang="${other === 'zh' ? 'zh-CN' : 'en'}" data-switch-lang="${other}" lang="${other === 'zh' ? 'zh-CN' : 'en'}">${lang === 'en' ? '中文' : 'EN'}</a>
  </div>
</header>
${directoryBoard(lang, slug)}
<main id="main">
${body}
</main>
${footer(lang)}
<div class="lang-hint" id="lang-hint" role="status"><span>${lang === 'en' ? '这里有中文版' : 'English version available'}</span><a href="${href(other, slug)}" data-switch-lang="${other}">${lang === 'en' ? '切换到中文 →' : 'Switch →'}</a><button type="button" aria-label="${T('Dismiss', '关闭')}" data-dismiss-hint>×</button></div>
</body>
</html>
`;
}


// Signature horizon: two snow ridges, a spruce line, and their reflection in the lake. Deterministic.
export function horizon() {
  let seed = 78;
  const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);
  const W = 1600, H = 260, shore = 150;
  const ridgePts = (base, amp, step) => { const pts = []; for (let x = 0; x <= W; x += step) pts.push([x, base - amp * (0.35 + 0.65 * Math.abs(Math.sin(x / 210 + base))) * (0.6 + rnd() * 0.5)]); return pts; };
  const toPath = (pts) => `M0 ${shore} ` + pts.map(([x, y]) => `L${x} ${y.toFixed(1)}`).join(' ') + ` L${W} ${shore} Z`;
  const farPts = ridgePts(100, 70, 40), nearPts = ridgePts(128, 52, 28);
  const far = toPath(farPts), near = toPath(nearPts);
  let snow = ''; // caps sit exactly on the higher peaks of the far ridge
  for (let i = 1; i < farPts.length - 1; i++) {
    const [x, y] = farPts[i], [x0, y0] = farPts[i - 1], [x1, y1] = farPts[i + 1];
    if (y < y0 && y < y1 && y < 72) {
      const t = 0.42; // cap covers the top part of both slopes
      snow += `<path d="M${(x + (x0 - x) * t).toFixed(1)} ${(y + (y0 - y) * t).toFixed(1)} L${x} ${y.toFixed(1)} L${(x + (x1 - x) * t).toFixed(1)} ${(y + (y1 - y) * t).toFixed(1)} L${(x + (x1 - x) * t * 0.45).toFixed(1)} ${(y + (y1 - y) * t * 0.7).toFixed(1)} L${x} ${(y + (y0 - y) * t * 0.9).toFixed(1)} L${(x + (x0 - x) * t * 0.5).toFixed(1)} ${(y + (y0 - y) * t * 0.65).toFixed(1)} Z"/>`;
    }
  }
  let pines = '';
  for (let x = 0; x < W; x += 9 + Math.floor(rnd() * 9)) { const h = 14 + rnd() * 26, w = h * 0.36; pines += `<path d="M${x} ${shore} L${(x + w / 2).toFixed(1)} ${(shore - h).toFixed(1)} L${(x + w).toFixed(1)} ${shore} Z"/>`; }
  let ripples = '';
  for (let i = 0; i < 9; i++) { const y = shore + 12 + i * 11, x = rnd() * W * 0.7; ripples += `<line x1="${x.toFixed(0)}" y1="${y}" x2="${(x + 120 + rnd() * 380).toFixed(0)}" y2="${y}"/>`; }
  const scene = `<path class="h-far" d="${far}"/><g class="h-snow">${snow}</g><path class="h-near" d="${near}"/><g class="h-pines">${pines}</g>`;
  return `<svg class="horizon" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
<defs><linearGradient id="hz-lake" x1="0" y1="0" x2="0" y2="1"><stop offset="0" class="h-lake-top"/><stop offset="1" class="h-lake-bottom"/></linearGradient>
<linearGradient id="hz-fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
<mask id="hz-mask"><rect x="0" y="${shore}" width="${W}" height="${H - shore}" fill="url(#hz-fade)"/></mask></defs>
<rect class="h-lake" x="0" y="${shore}" width="${W}" height="${H - shore}" fill="url(#hz-lake)"/>
${scene}
<g mask="url(#hz-mask)"><g transform="translate(0 ${shore * 2}) scale(1 -1)">${scene}</g></g>
<g class="h-ripples">${ripples}</g>
<line class="h-shore" x1="0" y1="${shore}" x2="${W}" y2="${shore}"/>
</svg>`;
}

export function footer(lang) {
  const T = t(lang);
  const link = (slug) => { const f = FLOORS.find((x) => x.slug === slug); return `<li><a href="${href(lang, slug)}">${esc(T(f.en, f.zh))}</a></li>`; };
  return `<footer class="site">
  ${horizon()}
  <div class="wrap">
    <div class="cols">
      <div>
        <div class="brand">${BRAND_SVG}<span class="brand-name">${T('Cold Library', '冷冻图书馆')}</span></div>
        <p class="mt-1">${T('A library for everything that is yours, and for the will that carries it on. Perpetual exhibits for projects, perpetual plaques for people, and AI wardens that open the deeper shelves only to the people you recognise.', '一座收藏属于你的一切、并把你的意志传下去的图书馆。项目有永续展位，人有永续铭牌；更深的那几层，只由你设定的 AI 守馆人，对你认可的人打开。')}</p>
      </div>
      <div><h4>${T('Floors', '楼层')}</h4><ul>${['exhibits', 'plaques', 'wardens', 'vault', 'accession'].map(link).join('')}</ul></div>
      <div><h4>${T('The house', '本馆')}</h4><ul>${['librarians', 'continuance', 'rules', 'ledger', 'name'].map(link).join('')}</ul></div>
      <div><h4>${T('Source', '源代码')}</h4><ul>
        <li><a href="${REPO}">GitHub</a></li>
        <li><a href="${REPO}/blob/main/spec/v0.1/${lang === 'zh' ? 'SPEC.zh.md' : 'SPEC.md'}">${T('Spec v0.1', '格式规范 v0.1')}</a></li>
        <li><a href="${REPO}/tree/main/cli">${T('Command-line tool', '命令行工具')}</a></li>
        <li><a href="${REPO}/blob/main/docs/${lang === 'zh' ? 'whitepaper.zh.md' : 'whitepaper.md'}">${T('Whitepaper', '技术白皮书')}</a></li>
        <li><a href="${REPO}/blob/main/docs/${lang === 'zh' ? 'threat-model.zh.md' : 'threat-model.md'}">${T('Threat model', '威胁模型')}</a></li>
      </ul></div>
    </div>
    <div class="fineprint"><span>${T('Spec CC0 · Code Apache-2.0 · No cookies · No tracking', '规范 CC0 · 代码 Apache-2.0 · 没有 Cookie · 没有追踪')}</span><span>${T('Not a legal will · We hold no keys · ', '不是法律遗嘱 · 我们不保管钥匙 · ')}<a href="${href(lang, 'warm-room')}">${T('The Warm Room', '暖房')}</a></span></div>
  </div>
</footer>`;
}

// ---------- components ----------
export function pageHero({ lang, slug, title, lede, image, alt }) {
  const T = t(lang);
  const f = floorOf(slug);
  const img = image ? `<div class="hero-media"><img src="/assets/img/${image}.jpg" srcset="/assets/img/${image}-sm.jpg 820w, /assets/img/${image}.jpg 1536w" sizes="100vw" alt="${esc(alt || '')}"></div><canvas class="snow" data-snow="light" aria-hidden="true"></canvas>` : '';
  return `<section class="page-hero${image ? ' with-image' : ''}">${img}
  <div class="wrap">
    ${f ? `<div class="floor-big"><span class="floor">${esc(f.code)}</span>${T('Floor', '楼层')} · ${esc(T(f.en, f.zh))}</div>` : ''}
    <h1>${title}</h1>
    ${lede ? `<p class="lede">${lede}</p>` : ''}
  </div>
</section>`;
}

export function sectionHead(label, title, intro = '') {
  return `<div class="section-head reveal"><div class="label"><span class="dot"></span>${label}</div><div><h2 class="section-title">${title}</h2>${intro ? `<p class="lede">${intro}</p>` : ''}</div></div>`;
}

export function card({ acc, title, fields = [], body = '', stamp = '', stampClass = '' }) {
  const rows = fields.map(([k, v]) => `<div class="field"><span>${k}</span><span>${v}</span></div>`).join('');
  return `<article class="card reveal">${acc ? `<span class="acc">${esc(acc)}</span>` : ''}<h3 class="card-title">${title}</h3>${rows}${body ? `<div class="card-body">${body}</div>` : ''}${stamp ? `<span class="stamp ${stampClass}">${stamp}</span>` : ''}</article>`;
}

export function floorsGrid(lang) {
  const T = t(lang);
  return `<nav class="floors reveal" aria-label="${T('Floors', '楼层')}">${FLOORS.filter((f) => f.slug !== '').map((f) => `<a href="${href(lang, f.slug)}" class="${f.warm ? 'warm' : ''}"><span class="floor">${esc(f.code)}</span><span><b>${esc(T(f.en, f.zh))}</b><small>${esc(T(f.what_en, f.what_zh))}</small></span></a>`).join('')}</nav>`;
}

// Minimal markdown for Open Stacks texts: headings, paragraphs, blockquotes, emphasis, links.
export function md(src) {
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\[(.+?)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2">$1</a>');
  return src.trim().split(/\n{2,}/).map((b) => {
    if (b.startsWith('## ')) return `<h2>${inline(b.slice(3))}</h2>`;
    if (b.startsWith('> ')) return `<blockquote>${inline(b.replace(/^> ?/gm, ''))}</blockquote>`;
    return `<p>${inline(b).replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
}
