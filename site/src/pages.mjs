import { existsSync } from 'node:fs';
import { t, L as Lx, esc, href, REPO, FOUNDED, LOGO, pageHero, sectionHead, md, picture, plate } from './lib.mjs';

const ext = (url, label) => `<a href="${url}" rel="noopener">${label}</a>`;
const IMG = new URL('../public/assets/img/', import.meta.url);
// Use a newer photograph once it has been generated; until then an approved one from the same set.
const FALLBACK = { 'lin-radio': 'plaque-hall', 'ferry-pier': 'harbour', 'maintainer-desk': 'lake-reading', 'empty-vitrine': 'exhibit-hall', 'front-desk': 'reading-room', 'vault-key': 'drawers', 'lake-library-far': 'lake-dawn' };
export const photo = (name) => (existsSync(new URL(name + '.jpg', IMG)) ? name : (FALLBACK[name] || name));
const CAPTION = {
  'lin-radio': ['A windowsill with a radio', '窗台上的收音机'], 'plaque-hall': ['The hall of plaques', '铭牌厅'],
  'ferry-pier': ['The island pier', '小岛码头'], harbour: ['A harbour hut', '港边小屋'],
  'maintainer-desk': ['A desk by the window', '窗边的书桌'], 'lake-reading': ['The reading hall', '阅览厅'],
};
const capOf = (name) => CAPTION[name] || ['The collection', '馆藏'];
const WP = (lang) => `${REPO}/blob/main/docs/${lang === 'zh' ? 'whitepaper.zh.md' : 'whitepaper.md'}`;

export const PAGES = [];
const page = (p) => PAGES.push(p);

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

/* ------------------------------------------------------------------ shared pieces */
const kindName = (T, i) => (i.kind === 'exhibit' ? T('Perpetual Exhibit', '永续展位') : T('Perpetual Plaque', '永续铭牌'));
export const itemPath = (i) => (i.kind === 'exhibit' ? 'exhibits/' : 'plaques/') + i.slug;
const realFirst = (a, b) => (a.example === b.example ? a.id.localeCompare(b.id) : a.example ? 1 : -1);
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const possessive = (p) => ({ she: 'her', he: 'his', they: 'their' }[p] || 'their');

function contentsLine(lang, i) {
  const T = t(lang);
  const c = i.contents || {};
  const parts = [];
  if (c.letters) parts.push(T(`${c.letters} letter${c.letters > 1 ? 's' : ''}`, `${c.letters} 封信`));
  if (c.pointer) parts.push(T('1 place to go', '1 个要去的地方'));
  if (c.notes) parts.push(T('handover notes', '接手交代'));
  if (c.badge) parts.push(T('1 badge', '1 枚徽章'));
  if (i.warden) parts.push(T('the right to light a lamp', '点一盏灯的资格'));
  return parts.join(' · ');
}

export function tile(lang, i) {
  const T = t(lang), L = Lx(lang);
  const stamp = i.example ? `<span class="stamp red">${T('Practice', '练习用')}</span>` : `<span class="stamp green">${T('Real', '真实')}</span>`;
  const meta = i.warden ? T('Behind the warden: ', '守馆人身后：') + contentsLine(lang, i) : T('Shelved ', '入藏 ') + esc(i.shelved) + (i.kind === 'exhibit' ? T(' · a successor is wanted', ' · 正在找接班人') : '');
  return `<a class="tile" href="${href(lang, itemPath(i))}">${picture({ name: photo(i.image), alt: '', sizes: '(max-width: 700px) 50vw, 25vw' })}<div class="tile-band spine-${esc(i.spine || 'slate')}"><p class="acc">${esc(i.id)} · ${kindName(T, i)} ${stamp}</p><h3>${esc(L(i.title))}</h3><p class="dek">${esc(L(i.dek || i.subtitle))}</p><p class="meta">${meta}</p></div></a>`;
}

function emptyTile(lang, id) {
  const T = t(lang);
  return `<a class="tile empty" href="${href(lang, 'accession')}">${picture({ name: photo('empty-vitrine'), alt: '', sizes: '(max-width: 700px) 50vw, 25vw' })}<div class="tile-band"><p class="acc">${esc(id)}</p><h3>${T('This space is yours', '这一格留给你')} →</h3><p class="dek">${T('Hang an exhibit or a plaque.', '挂一个展位，或者一块铭牌。')}</p></div></a>`;
}

function nextId(items, prefix) {
  const n = items.filter((i) => i.id.startsWith(prefix + '-')).map((i) => Number(i.id.slice(2))).reduce((a, b) => Math.max(a, b), 0) + 1;
  return `${prefix}-${String(n).padStart(6, '0')}`;
}

function shelf(lang, items, { kind = null, limit = 0 } = {}) {
  let list = items.filter((i) => !kind || i.kind === kind).sort(realFirst);
  if (limit) list = list.slice(0, limit);
  return `<div class="shelf">${list.map((i) => tile(lang, i)).join('')}${emptyTile(lang, nextId(items, kind === 'plaque' ? 'M' : 'E'))}</div>`;
}

// The warden trial, as one component. site.js finds it by [data-trial].
export function trial(lang, i, { heading = '', intro = '', id = 'trial', links = true } = {}) {
  const T = t(lang), L = Lx(lang);
  const w = i.warden;
  const pron = L(i.pronoun);
  const data = { id: i.id, kdf: w.kdf, locked: i.locked, questions: w.questions.map((q) => L(q.q)), greeting: L(w.greeting), name: L(w.name), example: !!i.example, kind: i.kind };
  const letterHead = i.kind === 'plaque' ? T(`${cap(pron || 'they')} wrote this for the people ${pron || 'they'} recognised:`, `${pron || '他'}写给认得出来的人：`) : T('Left for whoever takes it over:', '留给接手的人：');
  return `<section class="trial" id="${id}" data-trial>
  <div class="wrap">
    ${heading ? `<div class="section-head"><p class="label">${T('Try it here · practice ', '在这里试 · 练习')}${kindName(T, i)} ${esc(i.id)}</p><h2>${heading}</h2>${intro ? `<p class="intro">${intro}</p>` : ''}</div>` : ''}
    <div class="trial-grid">
      <div class="desk-card" data-warden aria-live="polite">
        <div class="desk-head"><span>${T('Warden', '守馆人')} · ${esc(i.id)}</span><span class="state" data-w-state>${T('Locked', '已上锁')}</span></div>
        <p class="desk-name">${esc(data.name)}${i.example ? ` <span class="faint">· ${T('scripted', '按脚本')}</span>` : ''}</p>
        <div class="desk-lines" data-w-screen><p class="w-line">${esc(data.greeting)}</p>${data.questions.map((q, k) => `<p class="w-line q">${T(`Question ${k + 1}: `, `第 ${k + 1} 题：`)}${esc(q)}</p>`).join('')}</div>
        ${i.example && w.example_answers ? `<details class="examples"><summary>${i.kind === 'plaque' ? T('Never sat in her class? Show the example answers.', '没上过她的课？看看示例答案。') : T('Not an islander? Show the example answers.', '不是岛上的人？看看示例答案。')}</summary><p>${T('Example answers: ', '示例答案：')}<b>${esc(w.example_answers)}</b></p></details>` : ''}
        <p class="micro">${T('Your answers become a key inside this browser. Nothing is sent.', '你的回答在这个浏览器里变成钥匙，不会发到任何地方。')}</p>
        <noscript><p class="micro">${T('Opening the door needs JavaScript, because the key is made in your browser and nothing is sent.', '开门需要 JavaScript：钥匙在你的浏览器里生成，什么都不会发出去。')}</p></noscript>
        <script type="application/json" data-warden-data>${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
      </div>
      <div class="trial-side">
        <p class="behind-label">${T('Behind this door', '门后')}</p>
        <p class="behind">${contentsLine(lang, i)}</p>
        <div class="rewards" data-rewards hidden>
          <p class="stamp green big" data-r-stamp>${T('Recognised', '已认出')}</p>
          <p class="r-head">${letterHead}</p>
          <div class="letter frost" data-r-letter></div>
          <div class="pointer" data-r-pointer hidden><p class="r-head">${T('Where it is', '东西在哪')}</p><p data-r-pointer-text></p></div>
          <div class="badge-out" data-r-badge hidden><div class="badge-svg" data-r-badge-svg></div><button class="btn ghost small" type="button" data-r-badge-dl>${T('Download the badge', '下载徽章')}</button></div>
          <form class="lamp-form" data-lamp-form>
            <label>${i.kind === 'plaque' ? T('Light a lamp to say you came by. A word is optional, up to 140 characters.', '点一盏灯，告诉她你来过。想留一句话也可以，140 字以内。') : T('Light a lamp to say you came by. A word is optional, up to 140 characters.', '点一盏灯，说一声你来过。想留一句话也可以，140 字以内。')}<textarea maxlength="140" rows="2"></textarea></label>
            <button class="btn lamp" type="submit">${T('Light a lamp', '点一盏灯')}</button>
            <p class="micro" data-lamp-msg></p>
          </form>
        </div>
      </div>
    </div>
    ${i.example ? `<p class="honest">${T('Example wardens follow a script. They quote what was written, and say “she wrote”, never “I”.', '示例守馆人目前按脚本问答。它只引用写下来的话，永远说“她写过”，不会说“我”。')}</p>` : ''}
    ${links ? `<p class="links"><a href="${href(lang, itemPath(i))}">${i.kind === 'plaque' ? T('Open her whole plaque →', '看她完整的铭牌 →') : T('Open the whole exhibit →', '看完整的展位 →')}</a> <a href="${href(lang, 'accession')}">${T('Give your own things a warden →', '给你自己的东西也配一位守馆人 →')}</a></p>` : ''}
  </div>
</section>`;
}

function layers(lang) {
  const T = t(lang);
  return `<div class="layers">
  <div class="layer l1"><span class="temp">+18 °C</span><h3>${T('Public', '公开层')}</h3><p>${T('What you choose to show. Anyone can read it.', '你选出来给人看的部分，谁都能看。')}</p></div>
  <div class="layer l2"><span class="temp">+4 °C</span><h3>${T('Recognised', '认可层')}</h3><p>${T('Letters, notes, where things are. Locked in your browser, and opened only for people the warden recognises.', '信、交代、东西放在哪。在你的浏览器里锁好，只为守馆人认出的人打开。')}</p></div>
  <div class="layer l3"><span class="temp">−18 °C</span><h3>${T('Sealed', '封存层')}</h3><p>${T('Things for later, sealed offline on your own computer. Opened on a date, or when your keepers agree.', '留给以后的东西，离线封存在你自己的电脑上。到了日子，或者开启人凑齐，才打开。')}</p></div>
</div>`;
}

function statutes(lang, abridged) {
  const T = t(lang);
  const rows = [
    [T('Keys', '钥匙'), T('We hold none.', '一把都不拿。')],
    [T('What you lock', '你锁上的东西'), T('No librarian can read it. Not even No. 1.', '哪位馆员都读不到，一号馆员也不行。')],
    [T('Warden answers', '守馆人的答案'), T('They become a key in the visitor’s browser. Never sent, never stored.', '只在访客的浏览器里变成钥匙，不发出，不保存。')],
    [T('Privacy policy', '隐私政策'), T('We do not want your data. No cookies, no tracking.', '我们不要你的数据。不用 Cookie，不做追踪。')],
    [T('Fees, tokens, ads', '费用、代币、广告'), T('None of the three.', '一样都没有。')],
    [T('If the library closes', '如果本馆关门'), T('Every page is a plain file in a public repository. Anyone can put the whole library back up. Cold Vault contracts keep running without us.', '每一页都是公开仓库里的普通文件，谁都能把整座馆重新架起来；冷库合约不靠我们，照样运行。')],
    [T('The elevator', '电梯'), T('A figure of speech. The stairs are always open.', '只是一个比喻。楼梯一直开着。')],
  ];
  const more = abridged ? [] : [
    [T('Speaking for anyone', '替人说话'), T('A warden quotes what was written, with the date, and never speaks as anyone. No cloned voices or faces.', '守馆人只引用写下来的话并注明日期，从不冒充任何人说话。不克隆声音，不克隆面孔。')],
    [T('Deciding for anyone', '替人做决定'), T('We are not an executor or a trustee. The living decide.', '我们不是遗嘱执行人，也不是受托人。决定权在活着的人手里。')],
    [T('Legal wills', '法律遗嘱'), T('Nothing here is one. Property follows the law and your legal will.', '这里的东西都不是法律遗嘱。财产按法律和你的法律遗嘱处理。')],
    [T('Recovery phrases', '助记词'), T('No page ever asks for one, a private key or a password.', '任何页面都不会让你填助记词、私钥或密码。')],
    [T('Our notices', '我们的通知'), T('Never contain a link, never ask for money, never ask you to download anything.', '从不带链接，从不要钱，从不让你下载任何东西。')],
    [T('Plaques for others', '为别人立铭牌'), T('Only with their consent, or their close family’s if they have died. Anyone named can ask for it to come down.', '必须本人同意；本人已经不在的，需要近亲同意。被写到的人都可以请馆员撤下。')],
    [T('Age', '年龄'), T('18 and over.', '仅限 18 岁以上。')],
    [T('Your files', '你的文件'), T('Our tools never delete them.', '我们的工具从不删除你的文件。')],
  ];
  return `<dl class="statutes">${rows.concat(more).map(([k, v], n) => `<div><dt><span class="sec">§${n + 1}</span>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;
}

function brassCard(lang, no, role, since) {
  const T = t(lang);
  return `<div class="brass-card"><div class="bc-top">${LOGO}<span>${T('Cold Library · Librarian', '冷冻图书馆 · 馆员')}</span></div><p class="bc-no">No. ${esc(no)}</p><p class="bc-role">${role}</p><p class="bc-meta"><span class="dot"></span>${T('On duty since ', '在岗，自 ')}${esc(since)}</p></div>`;
}

function logList(lang, log, limit = 0) {
  const T = t(lang);
  return `<ol class="log">${(limit ? log.slice(0, limit) : log).map((r) => `<li><time datetime="${esc(r.date)}">${esc(r.date)}</time><span>${esc(T(r.en, r.zh))}</span></li>`).join('')}</ol>`;
}

function halflife(lang) {
  const T = t(lang);
  return `<div class="halflife" data-halflife>
  <div class="hl-status"><span>${T('Years since it took effect', '生效后')} <b data-hl-years>0</b> ${T('years', '年')}</span><span>${T('Stage', '阶段')} <b data-hl-stage>${T('Binding', '照办')}</b></span></div>
  <p class="hl-sentence" data-hl-sentence data-carried="${T('“Keep the website online.” It became the oldest rule of the project.', '“网站继续开着。”后来，这成了这个项目最老的一条规矩。')}">${T('“Keep the website online. Renew the domain every year.”', '“网站继续开着，域名每年续费。”')}</p>
  <input class="hl-range" type="range" min="0" max="20" step="0.5" value="0" aria-label="${T('Years since it took effect', '生效后的年数')}" data-hl-range data-labels='${JSON.stringify(lang === 'zh' ? ['照办', '参考', '传承'] : ['Binding', 'Advisory', 'Carried on'])}'>
  <div class="hl-ticks"><span>${T('Binding · 0–2 y', '照办 · 0–2 年')}</span><span>${T('Advisory · to 10 y', '参考 · 到第 10 年')}</span><span>${T('Carried on', '传承')}</span></div>
</div>`;
}

function vaultSteps(lang) {
  const T = t(lang);
  return `<ol class="timeline">
  <li><span class="n">1</span><b>${T('Set the plan', '定好安排')}</b><span>${T('Heirs, shares, and two or three keepers you trust.', '继承人、份额，再选两三位你信得过的开启人。')}</span></li>
  <li><span class="n">2</span><b>${T('Live as usual', '照常生活')}</b><span>${T('Check in from your own wallet now and then. Each check-in resets the clock.', '隔一阵用自己的钱包报到一次，每次报到都重新计时。')}</span></li>
  <li><span class="n">3</span><b>${T('If you go silent', '若你静默')}</b><span>${T('After the silence period (6 months by default), 2 of 3 keepers confirm. Then a 28-day veto window, in which you or any keeper can stop it.', '静默期（默认 6 个月）满后，三位开启人里有两位确认；接着是 28 天否决期，你本人或任何一位开启人都能叫停。')}</span></li>
  <li><span class="n">4</span><b>${T('Heirs claim', '继承人领取')}</b><span>${T('Each heir claims only their own share, from their own wallet. No account, no ID.', '每位继承人用自己的钱包，只领自己那一份。不用注册，不用证件。')}</span></li>
</ol>`;
}

/* ------------------------------------------------------------------ Lobby */
page({
  slug: '',
  title: { en: 'Lobby', zh: '大厅' },
  description: {
    en: 'A perpetual exhibit for your work, a perpetual plaque for a person, and an AI warden at each door. Anyone can read what you choose to show; the rest opens only for people who can answer the warden.',
    zh: '给作品一个永续展位，给人一块永续铭牌，每扇门口站着一位 AI 守馆人。你愿意公开的，谁都能看；其余的，只对答得上守馆人问题的人打开。',
  },
  render: (lang, ctx) => {
    const T = t(lang), L = Lx(lang);
    const lin = ctx.items.find((i) => i.id === 'M-000001');
    const portrait = existsSync(new URL('lake-library-portrait.jpg', IMG)) ? 'lake-library-portrait' : null;
    return `
<section class="lobby-hero">
  <figure class="hero-plate">${picture({ name: 'lake-library', portrait, alt: T('A concrete and glass library on the shore of a frozen lake, snow mountains and a spruce forest behind it, its windows lit', '冰湖岸边一座混凝土和玻璃的图书馆，背后是雪山和云杉林，窗子都亮着'), eager: true })}${plate(1, lang, 'The library on the lake', '湖上的图书馆')}</figure>
  <div class="wrap hero-grid">
    <div class="hero-text">
      <p class="label">${T('Cold Library', '冷冻图书馆')}</p>
      <h1>${T('Keep what is yours.<br>Carry on what you meant.', '收藏属于你的一切，<br>把你的意志传下去。')}</h1>
      <p class="definition">${T('A perpetual exhibit for your work, a perpetual plaque for a person, and an AI warden at each door. Anyone can read what you choose to show. The rest opens only for people who can answer the warden.', '给作品一个永续展位，给人一块永续铭牌，每扇门口站着一位 AI 守馆人。你愿意公开的，谁都能看；其余的，只对答得上守馆人问题的人打开。')}</p>
      <div class="btns"><a class="btn" href="#trial">${T('Try a warden · two questions', '试一位守馆人 · 两道题')} <span aria-hidden="true">↓</span></a><a class="btn ghost" href="${href(lang, 'accession')}">${T('Hang your own', '挂上你自己的')} <span aria-hidden="true">→</span></a></div>
      <p class="router">${T('I’m here to:', '我来是想：')} <a href="${href(lang, 'exhibits')}">${T('keep a project', '留下一个项目')}</a> · <a href="${href(lang, 'plaques')}">${T('remember someone', '记住一个人')}</a> · <a href="${href(lang, 'collect')}">${T('open something left for me', '打开别人留给我的东西')}</a> · <a href="#shelves">${T('just look around', '随便看看')}</a></p>
      <p class="fineline">${T('Free · open source · no cookies · we never hold your keys', '免费 · 开源 · 不用 Cookie · 我们从不保管你的钥匙')}</p>
    </div>
    ${lin ? `<a class="plaque-card" href="#trial">
      <p class="acc">M-000001 · ${T('Perpetual Plaque', '永续铭牌')} <span class="stamp red">${T('Practice', '练习用')}</span></p>
      <p class="pc-name">${esc(L(lin.title))}</p>
      <p class="pc-line">${esc(L(lin.subtitle))}</p>
      <p class="pc-behind">${T('Behind the warden: a letter · where something of hers is kept · a badge', '守馆人身后：一封信 · 一样东西放在哪 · 一枚徽章')}</p>
      <span class="pc-lock">${T('Locked · two questions open it →', '已上锁 · 答两道题就能打开 →')}</span>
    </a>` : ''}
  </div>
</section>

${lin ? trial(lang, lin, { heading: T('Pass the warden’s trial. Unlock what was left for you.', '通过守馆人的考验，解锁前辈留下的财富。'), intro: T('Ms Lin taught maths for thirty-one years. Behind her plaque she left a letter for her students, and one thing to collect. Her warden asks two questions only a student of hers could answer.', '林老师教了三十一年数学。她在铭牌后面给学生留了一封信，还有一样东西可以去领。她的守馆人只问两道题，只有她教过的学生答得上来。') }) : ''}

<section class="block" id="shelves">
  <div class="wrap">
    ${sectionHead('', T('On the shelves', '在架上'), T('Every exhibit and plaque has a number, a public page and a door. The spines are public. What is behind each door is not.', '每个展位、每块铭牌都有编号、一张公开的页面和一扇门。书脊谁都能看，门后的东西不行。'))}
    ${shelf(lang, ctx.items, { limit: 3 })}
    <p class="foot-links">${T('Practice items are fictional, and marked as such.', '练习用的条目是虚构的，都已标明。')} <a href="${href(lang, 'exhibits')}">${T('All exhibits →', '全部展位 →')}</a> <a href="${href(lang, 'plaques')}">${T('All plaques →', '全部铭牌 →')}</a></p>
  </div>
</section>

<section class="block">
  <div class="wrap">
    ${sectionHead('', T('Two things you can hang here', '这里能挂两样东西'))}
    <div class="products">
      <article class="product">${picture({ name: 'exhibit-hall', alt: T('Display plinths and vitrines in a quiet exhibition wing by a window onto a snowy lake', '安静的展厅里一排展台和玻璃柜，窗外是雪湖'), sizes: '(max-width: 700px) 100vw, 50vw' })}<div class="product-text"><p class="label">${T('For a project', '给一个项目')}</p><h3>${T('Perpetual Exhibit', '永续展位')}</h3><p>${T('A standing room for a project or a life’s work: what it is, why it mattered, who carries it on.', '给一个项目、一生的作品一间常设展厅：它是什么、为什么重要、谁在接着做。')}</p><p class="anchor">${T('Free · stop and come back any time', '免费 · 随时停下，回头再写')}</p><a class="btn" href="${href(lang, 'accession')}?kind=exhibit">${T('Start my exhibit', '开始我的展位')}</a></div></article>
      <article class="product">${picture({ name: 'plaque-hall', alt: T('A pale stone wall with small brass plaques and warm lamps, snow falling outside a tall window', '浅色石墙上一排小铜牌和暖灯，高窗外下着雪'), sizes: '(max-width: 700px) 100vw, 50vw' })}<div class="product-text"><p class="label">${T('For a person, living or not', '给一个人，在世与否都可以')}</p><h3>${T('Perpetual Plaque', '永续铭牌')}</h3><p>${T('A short record of who someone is and what they care about. Most plaques here belong to people who are very much alive.', '简短地记下一个人是谁、在乎什么。这里大多数铭牌的主人都还好好活着。')}</p><p class="anchor">${T('Free · for someone else, only with their consent', '免费 · 给别人做，须经本人同意')}</p><a class="btn" href="${href(lang, 'accession')}?kind=plaque">${T('Start a plaque', '开始一块铭牌')}</a></div></article>
    </div>
    <h3 class="row-title">${T('Each one has a warden at the door, and three layers.', '每一件门口都有一位守馆人，分三层存放。')}</h3>
    ${layers(lang)}
    <p class="foot-links"><a href="${href(lang, 'about')}#name">${T('Why it is called a cold library →', '所以它叫冷冻图书馆 →')}</a></p>
  </div>
</section>

<section class="block">
  <div class="wrap">
    ${sectionHead('', T('Write it. Set the question. Hang it.', '写下来，出一道题，挂上去。'))}
    <ol class="how">
      <li><span class="n">01</span><h3>${T('Write it', '写下来')}</h3><p>${T('What anyone may see, and what only the right people may read.', '给所有人看的，和只给对的人看的。')}</p></li>
      <li><span class="n">02</span><h3>${T('Set the question', '出题')}</h3><p>${T('One to three things only they would know.', '一到三个只有他们知道的问题。')}</p></li>
      <li><span class="n">03</span><h3>${T('Hang it', '挂上去')}</h3><p>${T('A librarian reads it once, then it goes up with its number. Your warden takes the door from there.', '馆员看一遍，就带着编号挂上墙。门口交给守馆人。')}</p></li>
    </ol>
    <p class="then"><b>${T('Then:', '最后：')}</b> ${T('tell one person where the door is. We make you a door card to print or send. It holds no secrets.', '告诉一个人门在哪。我们给你做一张门牌卡，可以打印，也可以发给他，上面没有任何密码。')}</p>
    <form class="starter" action="${href(lang, 'accession')}" method="get" data-starter>
      <p class="starter-title">${T('Start here. Nothing leaves this browser until you send it.', '从这里开始。点发送之前，什么都不会离开这个浏览器。')}</p>
      <div class="starter-row">
        <div class="seg" role="radiogroup" aria-label="${T('Kind', '类别')}"><label><input type="radio" name="kind" value="exhibit" checked><span>${T('A project', '一个项目')}</span></label><label><input type="radio" name="kind" value="plaque"><span>${T('A person', '一个人')}</span></label></div>
        <input type="text" maxlength="60" placeholder="${T('Name of the project, or the name on the plaque', '项目的名字，或铭牌上的名字')}" aria-label="${T('Title', '标题')}" data-starter-title>
        <button class="btn" type="submit">${T('Continue at the front desk', '去前台接着写')} <span aria-hidden="true">→</span></button>
      </div>
      <p class="micro">${T('Your draft stays in this browser only.', '草稿只存在这个浏览器里。')}</p>
    </form>
  </div>
</section>

<section class="block vault-block">
  <div class="wrap">
    <p class="advisory"><span class="dot amber"></span>${T('Sepolia testnet · source verified · not audited · do not deposit real funds', 'Sepolia 测试网 · 源码已验证 · 未经审计 · 请勿存入真实资产')}</p>
    <div class="vault-row">
      <figure class="vault-photo">${picture({ name: photo('vault-key'), alt: T('A brass key on a blank catalogue card on a snowy windowsill', '雪窗台上，一把铜钥匙放在空白的卡片上'), sizes: '30vw' })}</figure>
      <div>
        <p class="label">${T('Cold Vault', '冷库')}</p>
        <h2>${T('If what you leave includes crypto assets', '如果你留下的东西里有加密资产')}</h2>
        <p>${T('A Cold Vault is a contract you deploy yourself. You alone choose the heirs and their shares, and you can take everything back at any time. The library has no key to it and takes no fee.', '冷库是你自己部署的一份合约。继承人是谁、各分多少，只由你决定，你随时可以全部取回。图书馆没有它的钥匙，也不收任何费用。')}</p>
        ${vaultSteps(lang)}
        <p class="micro">${T('Not offered where it is not legal, including mainland China.', '在法律不允许的地方不提供，包括中国大陆。')}</p>
        <p class="links"><a href="${href(lang, 'vault')}#how">${T('How it works →', '看它怎么运作 →')}</a> <a href="${href(lang, 'collect')}#vault">${T('Someone left me a vault →', '有人给我留了一个冷库 →')}</a></p>
      </div>
    </div>
  </div>
</section>

<section class="block">
  <div class="wrap narrow">
    <div class="sheet"><span class="stamp red corner">${T('Abridged', '摘录')}</span>
      ${sectionHead('', T('House rules, abridged.', '馆规（摘录）。'))}
      ${statutes(lang, true)}
      <p class="custody">${T('We keep the library, never the keys.', '我们守着图书馆，从不保管钥匙。')}</p>
      <p class="numbers">${T('Keys held', '保管的钥匙')} 0 · ${T('Fees', '手续费')} 0 · Cookie 0${ctx.tests ? ` · ${T('Contract tests', '合约测试')} ${ctx.tests}` : ''} · ${T('Independent audits 0, yet', '独立审计 0（暂无）')}</p>
      <p class="micro">${T('Nothing here is a legal will. 18+ only.', '这里的东西都不是法律遗嘱。仅限 18 岁以上。')} <a href="${href(lang, 'rules')}">${T('All house rules and the ledger →', '全部馆规和账本 →')}</a></p>
    </div>
  </div>
</section>

<section class="block">
  <div class="wrap keepers-row">
    <div>${brassCard(lang, '1', T('Founding Librarian · Front Desk', '创始馆员 · 前台'), FOUNDED)}<p class="micro">${T('The next number could be yours.', '下一个号码，可能就是你的。')}</p></div>
    <div>
      ${sectionHead('', T('Who keeps this place', '谁在照看这里'), T('One person, for now: Librarian No. 1, who built it to keep his own things first. A second maintainer is wanted.', '目前只有一个人：一号馆员。他建这座馆，先是为了放自己的东西。还在找第二位维护者。'))}
      <a class="btn ghost" href="${href(lang, 'librarians/join')}">${T('Get a librarian card · one minute, no test', '领一张馆员证 · 一分钟，不考试')} <span aria-hidden="true">→</span></a>
      <h3 class="row-title">${T('Library log', '馆务日志')}</h3>
      ${logList(lang, ctx.log, 3)}
      <p class="foot-links"><a href="${href(lang, 'about')}#log">${T('All entries →', '全部记录 →')}</a></p>
    </div>
  </div>
</section>

<section class="closing">
  <figure>${picture({ name: photo('lake-library-far'), alt: T('The library seen from across the frozen lake at dusk, its windows lit', '黄昏时隔着冰湖看图书馆，窗子都亮着') })}<canvas class="snow" data-snow aria-hidden="true"></canvas><p class="closing-line">${T('The lights stay on.', '灯一直亮着。')}</p>${plate(9, lang, 'The library from across the lake', '隔着湖看图书馆')}</figure>
  <div class="wrap closing-actions"><a class="btn" href="${href(lang, 'accession')}">${T('Hang your own', '挂上你自己的')} <span aria-hidden="true">→</span></a><a href="${href(lang, 'collect')}">${T('Someone left you something? The Collection Desk →', '有人给你留了东西？去领取处 →')}</a></div>
</section>`;
  },
});

/* ------------------------------------------------------------------ Exhibits and Plaques */
page({
  slug: 'exhibits',
  title: { en: 'Exhibits', zh: '展位' },
  description: { en: 'Perpetual exhibits: a standing room for a project or a life’s work, with notes for whoever carries it on behind an AI warden.', zh: '永续展位：给一个项目、一生作品的常设展厅，留给接手的人的话放在 AI 守馆人身后。' },
  image: '/assets/img/exhibit-hall.jpg',
  render: (lang, ctx) => {
    const T = t(lang);
    return `${pageHero({ lang, slug: 'exhibits', title: T('Perpetual Exhibits', '永续展位'), lede: T('A standing room for a project or a life’s work: what it is, why it mattered, who carries it on. Notes for whoever takes it over wait behind the warden.', '给一个项目、一生的作品一间常设展厅：它是什么、为什么重要、谁在接着做。留给接手的人的话，放在守馆人身后。'), image: 'exhibit-hall', alt: T('Display plinths and vitrines in a quiet exhibition wing by a window onto a snowy lake', '安静的展厅里一排展台和玻璃柜，窗外是雪湖'), n: 2, caption_en: 'The exhibition wing', caption_zh: '展厅' })}
<section class="block"><div class="wrap">
  ${sectionHead('', T('On display', '展出中'))}
  ${shelf(lang, ctx.items, { kind: 'exhibit' })}
</div></section>
<section class="block"><div class="wrap split">
  <div>
    ${sectionHead('', T('How to write an exhibit', '展位怎么写'))}
    <ol class="tips">
      <li>${T('One line a stranger understands. Then the story, in your own words.', '先写一行陌生人也看得懂的话，再用你自己的话写它的故事。')}</li>
      <li>${T('Behind the warden: what whoever takes it over should know first, and what they should never change.', '守馆人身后：接手的人最先该知道什么，千万别改什么。')}</li>
      <li>${T('Where the domain, the servers and the accounts are, and who to ask. Never passwords.', '域名、服务器、账号在哪，找谁。从不写密码。')}</li>
      <li>${T('A badge for your successor, so they can show they were chosen.', '给接班人一枚徽章，他可以拿出来证明自己是被选中的。')}</li>
    </ol>
    <a class="btn" href="${href(lang, 'accession')}?kind=exhibit">${T('Start my exhibit', '开始我的展位')}</a>
  </div>
  <div>
    ${sectionHead('', T('Still running', '仍在运转'), T('Projects whose founder or a core maker is gone, and which others carry on. Facts checked on 2026-10-04, each with a source.', '这些项目的创始人或核心作者已经不在，别人接着把它们做了下去。2026-10-04 核实，每条都有出处。'))}
    <div class="still">${STILL_RUNNING.map((r) => `<div class="still-row"><b>${esc(r.work)}</b><span class="since">${r.since ? T('since ', '始于 ') + r.since : ''}</span><p>${esc(T(r.now_en, r.now_zh))}</p><a href="${r.src}" rel="noopener">${T('Source', '出处')}</a></div>`).join('')}</div>
    <p class="micro">${T('One setting worth five minutes: GitHub lets you name a successor (Settings → Account → Successor settings) who can archive or transfer your public repositories. Put the rest in your exhibit.', '值得花五分钟的一个设置：GitHub 可以指定一位继任者（Settings → Account → Successor settings），他可以归档或转移你的公开仓库。其余的，写进你的展位。')} ${ext('https://docs.github.com/en/account-and-profile/concepts/personal-repository-access-and-collaboration', T('GitHub docs', 'GitHub 文档'))}</p>
  </div>
</div></section>`;
  },
});

page({
  slug: 'plaques',
  title: { en: 'Plaques', zh: '铭牌' },
  description: { en: 'Perpetual plaques: a short record of who someone is and what they care about. Most belong to people who are very much alive.', zh: '永续铭牌：简短地记下一个人是谁、在乎什么。这里大多数铭牌的主人都还好好活着。' },
  image: '/assets/img/plaque-hall.jpg',
  render: (lang, ctx) => {
    const T = t(lang);
    return `${pageHero({ lang, slug: 'plaques', title: T('Perpetual Plaques', '永续铭牌'), lede: T('A plaque is not an obituary. It is a short record of who someone is and what they care about, kept where the people they recognise can find it. Most plaques here belong to people who are very much alive.', '铭牌不是讣告。它简短地记下一个人是谁、在乎什么，放在他认得的人找得到的地方。这里大多数铭牌的主人都还好好活着。'), image: 'plaque-hall', alt: T('A pale stone wall with small brass plaques and warm lamps, snow falling outside a tall window', '浅色石墙上一排小铜牌和暖灯，高窗外下着雪'), n: 3, caption_en: 'The hall of plaques', caption_zh: '铭牌厅' })}
<section class="block"><div class="wrap">
  ${sectionHead('', T('On the wall', '墙上'))}
  ${shelf(lang, ctx.items, { kind: 'plaque' })}
</div></section>
<section class="block"><div class="wrap split">
  <div>
    ${sectionHead('', T('How to write a plaque', '铭牌怎么写'))}
    <ol class="tips">
      <li>${T('A name or a pen name, and one line: what they are known for.', '一个名字或笔名，再加一行：大家因为什么记得这个人。')}</li>
      <li>${T('Behind the warden: a letter, a story, where a keepsake is and who to ask.', '守馆人身后：一封信、一段故事、某件纪念物放在哪找谁领。')}</li>
      <li>${T('Questions only the right people could answer: a room number, a nickname, a street.', '只有对的人答得上的问题：一个门牌号、一个外号、一条街名。')}</li>
      <li>${T('Lamps are not likes. Only people the warden recognises can light one.', '灯不是点赞。只有守馆人认出的人才能点。')}</li>
    </ol>
    <a class="btn" href="${href(lang, 'accession')}?kind=plaque">${T('Start a plaque', '开始一块铭牌')}</a>
  </div>
  <div class="notice">
    <p><b>${T('Consent', '同意')}</b></p>
    <p>${T('A plaque for someone else needs their consent, or, for someone who has died, their close family’s. It carries a visible “Consent on file” stamp, and anyone named can ask for it to come down.', '为别人立铭牌，需要本人同意；本人已经不在的，需要近亲同意。这样的铭牌上会有一个看得见的“已获同意”印章，被写到的人都可以请馆员撤下。')}</p>
  </div>
</div></section>`;
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
    return `${pageHero({ lang, slug: 'wardens', title: T('Wardens', '守馆人'), lede: T('Every exhibit and every plaque has a warden at the door, working from the owner’s rules and the owner’s words.', '每个展位、每块铭牌门口都有一位守馆人，按主人的规矩、用主人的原话办事。'), image: 'lake-reading', alt: T('A reading hall with brass lamps and a window wall onto a frozen lake', '亮着铜台灯的阅览厅，整面窗外是冰湖'), n: 4, caption_en: 'The reading hall', caption_zh: '阅览厅' })}
<section class="block tight"><div class="wrap narrow">
  <div class="notice"><p><b>${T('Honest status', '老实说现状')}</b></p><p>${T('Working today: wardens with fixed questions and answers, scripted. Next: wardens that hold a conversation and quote the owner’s own words. Either way the rules are the owner’s, and the key never leaves the visitor’s browser.', '现在能用的：问题和答案固定、按脚本走的守馆人。下一步：能对话、引用主人原话的守馆人。无论哪种，规矩都由主人定，钥匙都不离开访客的浏览器。')}</p></div>
</div></section>
<section class="block"><div class="wrap split">
  <div>
    ${sectionHead('', T('A warden can hand over', '守馆人可以交出去的'))}
    <ul class="ticks"><li>${T('Letters and stories the owner wrote', '主人写下的信和故事')}</li><li>${T('Notes for whoever takes a project over', '给接手项目的人的交代')}</li><li>${T('Directions: where something is, and who to ask', '指引：东西在哪、找谁')}</li><li>${T('A badge, such as successor or student', '一枚徽章，比如接班人、学生')}</li><li>${T('The right to light a lamp and leave a word', '点一盏灯、留一句话的资格')}</li></ul>
  </div>
  <div>
    ${sectionHead('', T('A warden can never hand over', '守馆人永远交不出去的'))}
    <ul class="crosses"><li>${T('Keys, recovery phrases or passwords', '钥匙、助记词或密码')}</li><li>${T('Money or crypto assets (those live in the owner’s own Cold Vault)', '钱或加密资产（它们在主人自己的冷库合约里）')}</li><li>${T('Anything the owner did not write', '主人没写下的任何东西')}</li><li>${T('A voice or a face. It says “they wrote”, never “I”.', '声音或面孔。它只说“他写过”，从不说“我”。')}</li></ul>
    <p class="micro">${T('How it decides: the answers are normalised (case, spaces and punctuation ignored) and turned into a key with PBKDF2-SHA256, 210,000 rounds, in the visitor’s browser. If the key opens the AES-256-GCM lock, the door opens. Nobody else is asked.', '它怎么判断：答案先统一格式（不计大小写、空格和标点），再在访客的浏览器里用 PBKDF2-SHA256 跑 210,000 轮变成钥匙。钥匙能打开 AES-256-GCM 的锁，门就开了。不问任何别人。')}</p>
  </div>
</div></section>
${ferry ? trial(lang, ferry, { heading: T('Try another warden', '再试一位守馆人'), intro: T('Mira wrote a small ferry timetable app for her island and left notes for whoever takes it over. Her warden asks two questions only an islander would know.', '米拉给她的小岛写了一个渡轮时刻表小程序，给接手的人留了交代。她的守馆人只问两道题，只有岛上的人知道。'), id: 'try' }) : ''}
<section class="block"><div class="wrap narrow">
  ${sectionHead('', T('Kinds of trial', '考验的方式'))}
  <dl class="kv"><dt>${T('Questions', '问题')}</dt><dd>${T('Working today. One to three questions; the answers form the key.', '现在就能用。一到三个问题，答案本身就是钥匙。')}</dd><dt>${T('A named list', '指定名单')}</dt><dd>${T('Next. People named by email receive a code.', '下一步。按邮箱指定的人会收到验证码。')}</dd><dt>${T('Contribution', '贡献记录')}</dt><dd>${T('Planned. Proof of real work on a project, such as merged changes.', '计划中。对项目真实贡献的证明，比如被合并的改动。')}</dd></dl>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ Cold Vault */
page({
  slug: 'vault',
  title: { en: 'Cold Vault', zh: '冷库' },
  description: { en: 'A non-custodial smart contract you deploy yourself. You alone choose heirs and shares; keepers confirm a silence; heirs claim with their own wallets. Sepolia testnet only, not audited.', zh: '你自己部署的非托管智能合约。继承人和份额只由你决定；开启人确认静默；继承人用自己的钱包领取。目前只在 Sepolia 测试网，未经审计。' },
  render: (lang, ctx) => {
    const T = t(lang);
    return `${pageHero({ lang, slug: 'vault', title: T('Cold Vault', '冷库'), lede: T('A contract you deploy for yourself. You alone choose who receives what, and when. The library never holds it, cannot open it, and takes nothing from it.', '你自己部署的一份合约。给谁、给多少、什么时候给，只由你决定。图书馆从不拿着它，打不开它，也不从里面拿一分钱。'), image: photo('vault-key'), alt: T('A brass key on a blank catalogue card on a snowy windowsill', '雪窗台上，一把铜钥匙放在空白的卡片上'), n: 5, caption_en: 'A key on a card', caption_zh: '卡片上的钥匙' })}
<section class="block tight"><div class="wrap narrow">
  <p class="micro">${T('In plain words: a wallet is your own account on a blockchain; a contract is a program nobody can change; a testnet is a practice network with no real money. Not offered where it is not legal, including mainland China. A vault is not a legal will.', '先说清楚几个词：钱包是你自己在区块链上的账户；合约是一段谁都改不了的程序；测试网是没有真钱的练习网络。在法律不允许的地方不提供，包括中国大陆。冷库不是法律遗嘱。')}</p>
</div></section>
<section class="block" id="how"><div class="wrap">
  ${sectionHead('', T('How it works', '怎么运作'))}
  ${vaultSteps(lang)}
</div></section>
<section class="block"><div class="wrap">
  ${sectionHead('', T('Try it with a fake clock', '用假时钟试一遍'), T('No wallet, no network. Press the buttons and watch what the contract would do.', '不用钱包，不连网络。按按钮，看合约会怎么做。'))}
  <div class="sim" data-sim>
    <div class="sim-clock"><span>${T('Day', '第')} <b data-sim-day>0</b>${T('', ' 天')}</span><span data-sim-state>${T('Active · you are in control', '正常 · 你说了算')}</span></div>
    <div class="sim-bar"><i data-sim-fill></i></div>
    <div class="btns"><button class="btn ghost small" type="button" data-sim-act="wait">${T('Stay silent 30 days', '静默 30 天')}</button><button class="btn ghost small" type="button" data-sim-act="confirm">${T('A keeper confirms', '一位开启人确认')}</button><button class="btn small" type="button" data-sim-act="checkin">${T('I’m still here', '我还在（报到）')}</button><button class="btn ghost small" type="button" data-sim-act="claim">${T('Heirs claim', '继承人领取')}</button><button class="btn ghost small" type="button" data-sim-act="reset">${T('Start over', '重来')}</button></div>
    <p class="micro" data-sim-log>${T('Silence period 180 days · 2 of 3 keepers · veto window 28 days · two heirs, 50% each.', '静默期 180 天 · 三位开启人里两位确认 · 否决期 28 天 · 两位继承人，各 50%。')}</p>
  </div>
</div></section>
<section class="block"><div class="wrap split">
  <div>
    ${sectionHead('', T('Questions', '常见问题'))}
    <dl class="kv">
      <dt>${T('Can my heirs take it while I am still here?', '我还在的时候，继承人能拿走吗？')}</dt><dd>${T('No. Only after the silence period, two keepers and the veto window. One check-in from you cancels everything pending.', '不能。要等静默期满、两位开启人确认、再过否决期。你只要报到一次，所有没走完的流程都会撤回。')}</dd>
      <dt>${T('What does it cost?', '要多少钱？')}</dt><dd>${T('No fee. You pay only the network’s own transaction costs.', '不收费。你只付区块链网络本身的手续费。')}</dd>
      <dt>${T('What if Cold Library disappears?', '如果冷冻图书馆没了怎么办？')}</dt><dd>${T('The contract lives on-chain with no admin. Heirs can claim from any wallet through a block explorer. The steps are also in the public repository.', '合约在链上，没有管理员。继承人可以用任何钱包、通过区块浏览器自己领取。步骤也写在公开仓库里。')}</dd>
      <dt>${T('Why not just write the recovery phrase in my will?', '为什么不直接把助记词写进遗嘱？')}</dt><dd>${T('Anyone who reads it can take everything, at any time, including while you are alive. A vault pays only the registered wallets, only by the rules.', '谁读到它，谁就能随时拿走全部，包括在你还在的时候。冷库只付给登记过的钱包，只按规则付。')}</dd>
    </dl>
  </div>
  <div>
    ${sectionHead('', T('Compared by kind', '按类型比较'))}
    <div class="table-wrap"><table class="compare"><thead><tr><th></th><th>${T('Cold Vault', '冷库')}</th><th>${T('Phrase in a will', '助记词写进遗嘱')}</th><th>${T('A friend keeps the key', '朋友替你保管钥匙')}</th></tr></thead>
      <tbody>
        <tr><th>${T('Who can move it while you are here', '你在时谁能动它')}</th><td>${T('Only you', '只有你')}</td><td>${T('Whoever reads it', '谁读到谁能动')}</td><td>${T('Your friend', '你的朋友')}</td></tr>
        <tr><th>${T('Needs us to keep working', '需要我们一直在')}</th><td>${T('No', '不需要')}</td><td>—</td><td>—</td></tr>
        <tr><th>${T('Fee', '费用')}</th><td>${T('None', '无')}</td><td>${T('A lawyer’s', '律师费')}</td><td>${T('None', '无')}</td></tr>
        <tr><th>${T('Heirs need ID', '继承人要证件')}</th><td>${T('No, their own wallet', '不要，用自己的钱包')}</td><td>${T('Usually', '通常要')}</td><td>${T('No', '不要')}</td></tr>
      </tbody></table></div>
    <div class="table-wrap"><table class="compare"><thead><tr><th>${T('Contract', '合约')}</th><th>${T('Network', '网络')}</th><th>${T('Tests', '测试')}</th><th>${T('Audit', '审计')}</th><th>${T('Source', '源码')}</th></tr></thead>
      <tbody><tr><td>ColdVault v0.1</td><td>Sepolia</td><td>${ctx.tests || '—'}</td><td><b>${T('Not yet', '还没有')}</b></td><td><a href="https://sepolia.etherscan.io/address/0x70C3C28db630e3A324db800f6f346e1aFdcE0cA3" rel="noopener">${T('verified', '已验证')}</a></td></tr></tbody></table></div>
  </div>
</div></section>
<section class="block" id="desk"><div class="wrap">
  ${sectionHead('', T('The vault desk', '冷库操作台'), T('Testnet only until the audit. Every action is signed in your own wallet; this page never sees your keys.', '审计之前只开放测试网。每一步都在你自己的钱包里签名，这个页面看不到你的私钥。'))}
  <div class="vault-app" data-vault-app>
    <div class="v-bar"><span class="v-status" data-v-status>…</span><button class="btn" type="button" data-v-connect>${T('Connect wallet · testnet', '连接钱包 · 测试网')}</button><button class="btn ghost" type="button" data-v-switch hidden>${T('Switch to the Sepolia testnet', '切换到 Sepolia 测试网')}</button></div>
    <p class="feedback" data-v-msg></p>
    <div data-v-connected hidden>
      <div class="split">
        <div>
          <h3>${T('My vaults', '我的冷库')}</h3>
          <div data-v-mine></div>
          <h3>${T('A vault I keep or inherit from', '我是开启人或继承人的冷库')}</h3>
          <form class="form" data-v-lookup><label>${T('Vault address', '冷库地址')}<input type="text" placeholder="0x…" required></label><button class="btn ghost" type="submit">${T('Open', '打开')}</button></form>
          <div data-v-found></div>
        </div>
        <form class="form" data-v-create>
          <fieldset><legend>${T('New vault', '新建冷库')}</legend>
            <label>${T('Link to an exhibit or plaque (optional)', '关联的展位或铭牌（可选）')}<input type="text" name="itemRef" maxlength="80" placeholder="coldlibrary:M-000001"></label>
            <div data-v-heirs></div>
            <button class="btn ghost small" type="button" data-v-add-heir>${T('+ Heir', '+ 继承人')}</button>
            <div data-v-keepers></div>
            <button class="btn ghost small" type="button" data-v-add-keeper>${T('+ Keeper', '+ 开启人')}</button>
            <label>${T('Confirmations needed', '需要几位开启人确认')}<input type="text" name="threshold" inputmode="numeric" value="2"></label>
            <label>${T('Silence period, days (7 or more)', '静默期，天（至少 7）')}<input type="text" name="heartbeat" inputmode="numeric" value="180"></label>
            <label>${T('Veto window, days', '否决期，天')}<input type="text" name="veto" inputmode="numeric" value="28"></label>
            <label>${T('Release on a date (optional)', '定时发放日期（可选）')}<input type="datetime-local" name="release"></label>
          </fieldset>
          <button class="btn" type="submit">${T('Create in my wallet · testnet', '在我的钱包里创建 · 测试网')}</button>
        </form>
      </div>
    </div>
  </div>
  <script src="/assets/vault.js" defer></script>
  <p class="links"><a href="${WP(lang)}">${T('Read the whitepaper →', '读技术白皮书 →')}</a> <a href="${REPO}/tree/main/contracts">${T('Contract source →', '合约源代码 →')}</a> <a href="${href(lang, 'collect')}#vault">${T('If someone left you a vault →', '如果有人给你留了一个冷库 →')}</a></p>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ Front Desk */
page({
  slug: 'accession',
  title: { en: 'Front Desk', zh: '前台' },
  description: { en: 'Hang your own exhibit or plaque. Six short steps, most of them optional. Nothing leaves your browser until the last one, and the deeper layer is locked before it does.', zh: '挂上你自己的展位或铭牌。六个小步骤，大多可以跳过。最后一步之前什么都不会离开你的浏览器，更深的那一层在发出前就已锁好。' },
  render: (lang) => {
    const T = t(lang);
    const step = (n, title, body, opt = false) => `<fieldset class="step" data-step="${n}"><legend><span class="n">${n}</span>${title}${opt ? ` <span class="opt">${T('optional', '可选')}</span>` : ''}</legend>${body}<div class="step-nav">${n > 1 ? `<button class="btn ghost small" type="button" data-prev>${T('Back', '上一步')}</button>` : ''}${n < 6 ? `<button class="btn small" type="button" data-next>${T('Next', '下一步')}</button>${opt ? `<button class="linkish" type="button" data-skip>${T('Not now', '先不用了')}</button>` : ''}` : ''}</div></fieldset>`;
    const tap = (name, value, title, sub, checked = false) => `<label class="tap"><input type="radio" name="${name}" value="${value}"${checked ? ' checked' : ''}><span><b>${title}</b><small>${sub}</small></span></label>`;
    return `${pageHero({ lang, slug: 'accession', title: T('Front Desk', '前台'), lede: T('The front desk is always open. Leave it here; a librarian will hang it.', '前台一直开着。东西放下，馆员会来挂。'), image: photo('front-desk'), alt: T('A front desk with a brass bell, a date stamp and blank index cards by a glass wall', '玻璃墙边的前台，上面有铜铃、日期戳和空白卡片'), n: 6, caption_en: 'The front desk', caption_zh: '前台', strip: true })}
<section class="block"><div class="wrap desk-layout">
  <form class="stepper" data-desk novalidate>
    <p class="micro desk-note">${T('Nothing leaves this browser until the last step.', '最后一步之前，什么都不会离开这个浏览器。')} <span data-draft-state></span> <button class="linkish" type="button" data-clear-draft hidden>${T('Clear draft', '清空草稿')}</button></p>
    ${step(1, T('What would you like to leave?', '你想留下什么？'), `<div class="taps">${tap('kind', 'exhibit', T('A project', '一个项目'), T('Perpetual Exhibit', '永续展位'), true)}${tap('kind', 'self', T('Myself', '我自己'), T('Perpetual Plaque', '永续铭牌'))}${tap('kind', 'other', T('Someone else', '另一个人'), T('Perpetual Plaque, with their consent', '永续铭牌（须经本人同意）'))}</div><p class="micro">${T('Why we ask: a plaque for someone else needs their consent, or their close family’s if they have died.', '为什么问这个：给别人做铭牌，需要本人同意；本人已经不在的，需要近亲同意。')}</p>`)}
    ${step(2, T('The front of it', '正面写什么'), `<label>${T('Title', '标题')}<input type="text" name="title" maxlength="60" required></label><label>${T('One line', '一句话')}<input type="text" name="subtitle" maxlength="120" required></label><p class="micro">${T('If someone read only one line about this, which line should it be?', '如果别人只读一行，你希望是哪一行？')} <button class="linkish" type="button" data-inspire>${T('Inspire me', '给我点灵感')}</button></p><p class="inspire" data-inspire-out></p>`)}
    ${step(3, T('What everyone can see', '所有人都能看到的'), `<label>${T('The story', '介绍')}<textarea name="story" rows="6" maxlength="2000"></textarea></label><p class="micro">${T('Try to avoid: passwords, recovery phrases or account numbers in any layer; writing as the warden “I”; anything about someone else they have not agreed to.', '尽量别写：任何一层里的密码、助记词或账号；用守馆人的口吻写“我”；别人没同意公开的事。')}</p>`, true)}
    ${step(4, T('Behind the warden', '守馆人身后'), `<label>${T('A letter or a note for the people the warden recognises', '写给守馆人认出的人的信或交代')}<textarea name="letter" rows="5" maxlength="4000"></textarea></label><label>${T('Where something is kept, and who to ask', '某样东西放在哪、找谁')}<input type="text" name="pointer" maxlength="300" placeholder="${T('Where, and who to ask. Never amounts or passwords.', '只写在哪、找谁。不写金额和密码。')}"></label><p class="micro">${T('A badge they receive', '他们得到的徽章')}</p><div class="chips">${[T('Successor', '接班人'), T('Student', '学生'), T('Friend', '朋友'), T('Family', '家人')].map((c) => `<button class="chip" type="button" data-chip="${c}">${c}</button>`).join('')}<input type="text" name="badge" maxlength="40" placeholder="${T('or your own', '或者自己写')}" aria-label="${T('Badge', '徽章')}"></div><div data-questions></div><button class="linkish" type="button" data-add-q>${T('+ Add a question', '+ 再加一题')}</button><p class="micro">${T('Why we ask: the answers become the key, and we never see them or recover them. Your warden quotes you. It never speaks as you.', '为什么问这个：答案就是钥匙，我们看不到，也找不回。守馆人只引用你写的话，不会冒充你说话。')}</p>`, true)}
    ${step(5, T('Try it as a visitor', '用访客的身份试一遍'), `<p class="micro">${T('Your draft is locked here, in this browser, and your own warden asks you its questions.', '你的草稿就在这个浏览器里锁上，然后由你自己的守馆人来问你问题。')}</p><div data-try-host><p class="micro" data-try-empty>${T('Add a letter and at least one question in step 4 to try it.', '在第 4 步写一封信、出至少一道题，才能在这里试。')}</p></div>`, true)}
    ${step(6, T('Hand it in', '交给前台'), `<label>${T('Email', '邮箱')}<input type="email" name="email" autocomplete="email" required></label><label class="check"><input type="checkbox" name="adult" required> ${T('I am 18 or older.', '我已年满 18 岁。')}</label><label class="check"><input type="checkbox" name="rules" required> ${T('I agree to the house rules.', '我同意馆规。')}</label><label class="check" data-third hidden><input type="checkbox" name="third"> ${T('They have agreed to this plaque (or their close family has).', '本人已经同意（或近亲已经同意）。')}</label><p class="micro">${T('Your email is used only to confirm it is you and to tell you when it is hung.', '邮箱只用来确认是你本人，以及通知你什么时候挂上去。')}</p><button class="btn" type="submit" data-desk-submit>${T('Send me a code', '发验证码给我')}</button><p class="micro" data-desk-msg></p><div class="code-row" data-code-row hidden><label>${T('The six-digit code we emailed you', '刚发到你邮箱的六位验证码')}<input class="code" type="text" inputmode="numeric" maxlength="7" autocomplete="one-time-code" data-code></label><button class="btn" type="button" data-confirm>${T('Confirm', '确认')}</button></div>`)}
    <div class="done" data-done hidden>
      <div class="slip">${LOGO}<p class="stamp green big">${T('Received', '已收到')}</p><p data-slip-text></p><p class="micro">${T('Its catalogue number is given when it is hung.', '挂上墙时会给出馆藏号。')}</p></div>
      <div class="btns"><button class="btn ghost" type="button" data-print>${T('Print the slip', '打印回执')}</button></div>
      <p>${T('Tell one person where the door is. When it is hung, every item page has a door card to print or send.', '告诉一个人门在哪。挂上去以后，每个展位和铭牌页面都有一张可以打印或发送的门牌卡。')}</p>
      <p class="micro">${T('Want a sealed layer too? It needs a computer →', '还想加一层封存？需要用电脑 →')} <a href="${href(lang, 'sealed')}#tools">${T('Sealed layer', '封存层')}</a></p>
    </div>
    <noscript><p class="notice">${T('The front desk needs JavaScript, because the deeper layer is locked in your browser before anything is sent.', '前台需要 JavaScript：更深的那一层要先在你的浏览器里锁好，才会发出去。')}</p></noscript>
  </form>
  <aside class="preview" data-preview aria-label="${T('Preview', '预览')}">
    <p class="label">${T('Preview', '预览')}</p>
    <div class="tile ghost-tile"><div class="tile-band spine-slate"><p class="acc" data-pv-kind>${T('Perpetual Exhibit', '永续展位')}</p><h3 data-pv-title>${T('Your title', '你的标题')}</h3><p class="dek" data-pv-line>${T('Your one line', '你的一句话')}</p><p class="meta" data-pv-meta>${T('No warden yet', '还没有守馆人')}</p></div></div>
  </aside>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ Collection Desk */
page({
  slug: 'collect',
  title: { en: 'Collection Desk', zh: '领取处' },
  description: { en: 'Someone left you something? Answer a warden, or claim from a Cold Vault, with or without this site.', zh: '有人给你留了东西？去回答守馆人的问题，或者从冷库领取，有没有这个网站都行。' },
  render: (lang) => {
    const T = t(lang);
    return `${pageHero({ lang, slug: 'collect', title: T('Someone left you something?', '有人给你留了东西？'), lede: T('You do not need an account, and you do not need to understand any of this today. Pick the door that matches what you have.', '不需要账号，今天也不用看懂这些。选一扇和你手上东西对应的门。') })}
<section class="block"><div class="wrap doors">
  <div class="door"><p class="label">${T('Door 1', '第一扇门')}</p><h3>${T('A door card, a number or a link', '一张门牌卡、一个编号或一个链接')}</h3><p>${T('Go to the page and answer its warden. If you have only a number, type it here.', '打开那个页面，回答它的守馆人。如果只有编号，输在这里。')}</p>
    <form class="lookup" data-lookup><input type="text" placeholder="E-000001 · M-000001" aria-label="${T('Catalogue number', '馆藏号')}" required><button class="btn" type="submit">${T('Go', '去看看')}</button></form><p class="micro" data-lookup-msg></p></div>
  <div class="door" id="vault"><p class="label">${T('Door 2', '第二扇门')}</p><h3>${T('A Cold Vault was left to you', '有人给你留了一个冷库')}</h3>
    <p><b>${T('With the vault desk', '用冷库操作台')}</b></p>
    <ol class="tips"><li>${T('Open the vault desk and connect your own wallet (the one whose address was registered).', '打开冷库操作台，连接你自己的钱包（就是被登记的那个地址）。')}</li><li>${T('Paste the vault address under “A vault I keep or inherit from”.', '在“我是开启人或继承人的冷库”下面粘贴冷库地址。')}</li><li>${T('If it shows Released, press Claim. You receive only your own share.', '如果显示“已发放”，点“领取”。你只会领到自己那一份。')}</li></ol>
    <p><b>${T('Without Cold Library', '不用冷冻图书馆')}</b></p>
    <ol class="tips"><li>${T('Open the vault address on a block explorer (the contract source is verified).', '在区块浏览器上打开冷库地址（合约源码已公开验证）。')}</li><li>${T('Connect your own wallet there and check your share with claimable.', '在那里连接你自己的钱包，用 claimable 查你的份额。')}</li><li>${T('Call claim. The contract pays only registered heirs, only by its rules.', '调用 claim。合约只付给登记过的继承人，只按它的规则付。')}</li></ol>
    <p class="micro">${T('Testnet only today, not audited. The same steps are in the public repository, so they outlive this site.', '目前只在测试网，未经审计。同样的步骤也写在公开仓库里，就算这个网站不在了也找得到。')} <a href="${href(lang, 'vault')}#desk">${T('Open the vault desk →', '打开冷库操作台 →')}</a></p></div>
  <div class="door"><p class="label">${T('Door 3', '第三扇门')}</p><h3>${T('Not okay right now', '你现在不太好')}</h3><p>${T('None of this has to happen today. Talk to someone first.', '这些事今天都可以不做。先找个人说说话。')}</p><a class="btn ghost" href="${href(lang, 'warm-room')}">${T('The Warm Room →', '去暖房 →')}</a></div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ Sealed layer */
page({
  slug: 'sealed',
  title: { en: 'Sealed layer', zh: '封存层' },
  description: { en: 'The sealed layer: an Ice Core is a file you seal on your own computer and open later, on a date or when two of your keepers agree.', zh: '封存层：冰芯是你在自己电脑上封存、以后再打开的文件，到约定的日子，或者两位开启人一起时才打开。' },
  render: (lang) => {
    const T = t(lang);
    const sections = lang === 'zh'
      ? ['0 先读这里', '1 该找谁', '2 项目与交接', '3 账户（只写平台官方的流程）', '4 东西放在哪、找谁', '5 心愿和它们的时效', '6 信件索引', '7 愿意公开的', '8 我不想要的', '9 给守馆人的规矩']
      : ['0 Read this first', '1 Who to call', '2 Projects and handover', '3 Accounts (official platform routes only)', '4 Where things are, and who to ask', '5 Wishes and how long they bind', '6 Letters index', '7 What may be public', '8 What I do not want', '9 Rules for wardens'];
    return `${pageHero({ lang, slug: 'sealed', title: T('Sealed layer', '封存层'), lede: T('For things that must wait: a letter for a date, notes your keepers open together. An Ice Core is sealed on your own computer and never sits on our shelves.', '给要等的东西：约好日子才拆的信、要开启人一起打开的交代。冰芯在你自己的电脑上封存，从不放在我们的架子上。'), image: 'hero-stacks', alt: T('Rows of card-catalogue cabinets in a cold archive', '冷库里一排排卡片目录柜'), n: 7, caption_en: 'The closed stacks', caption_zh: '闭架书库' })}
<section class="block" id="ice-core"><div class="wrap split">
  <div>${sectionHead('', T('What an Ice Core holds', '冰芯里有什么'), T('Ten short sections, written for the people and the wardens who will act on it. Pointers only: where something is and who knows what to do. Never amounts, never passwords.', '十个短章节，写给将来照着它办事的人和守馆人看。只写指向：东西在哪、谁知道该怎么办。不写金额，不写密码。'))}
    <ul class="clean">${sections.map((s) => `<li><span class="mark">${esc(s.split(' ')[0])}</span><span>${esc(s.slice(s.indexOf(' ') + 1))}</span></li>`).join('')}</ul></div>
  <div><pre class="files">my-core/                ${T('# never share this folder', '# 这个文件夹不要给任何人')}
  COVER.md              ${T('# public, printable', '# 公开，可打印')}
  core/COLDLIBRARY.md   ${T('# for people and wardens', '# 给人和守馆人读')}
  core/core.json        ${T('# machine-checkable', '# 机器可校验')}
  letters/001.md
sealed/                 ${T('# what you hand over', '# 交出去的部分')}
  core.age · letters/001.age · MANIFEST.json</pre>
    <p class="micro">${T('The tools never delete your plaintext. When the seal checks out, you remove it yourself.', '工具从不删除你的明文。核对封存无误后，由你自己删掉。')}</p></div>
</div></section>
<section class="block" id="when"><div class="wrap">
  ${sectionHead('', T('When it opens', '什么时候打开'))}
  <div class="three">
    <div><h3>${T('On a date', '到某个日子')}</h3><p>${T('A time capsule. Nothing opens early.', '时间胶囊。日子不到，谁也打不开。')}</p></div>
    <div><h3>${T('Keepers together', '开启人一起')}</h3><p>${T('Two of three keepers meet and open it, for a reason you wrote down.', '三位开启人中的两位凑在一起，按你写下的理由打开。')}</p></div>
    <div><h3>${T('After a long silence', '长时间静默之后')}</h3><p>${T('After the silence period (6 months by default) with reminders 30 days before, two keepers confirm, then a 28-day veto window. One check-in from you cancels it.', '静默期（默认 6 个月，提前 30 天提醒）满后，两位开启人确认，再过 28 天否决期。你报到一次就全部撤回。')}</p></div>
  </div>
  <p class="micro">${T('What has been opened cannot be closed again, so the first stage opens nothing personal. Our notices never contain a link, never ask for money, never ask you to download anything.', '打开过的东西关不回去，所以第一阶段不打开任何私人内容。我们的通知从不带链接，从不要钱，从不让你下载任何东西。')}</p>
</div></section>
<section class="block" id="keepers"><div class="wrap split">
  <div>${sectionHead('', T('Keepers', '开启人'), T('A keeper holds one share of the key. No single person can open anything.', '开启人各拿钥匙的一份。任何一个人单独都打不开。'))}
    <ul class="clean"><li><span class="mark">01</span><span>${T('Three is a good number: someone technical, someone from your family, someone who lives elsewhere.', '三个人比较合适：一位懂技术的，一位家人，一位住在别处的人。')}</span></li><li><span class="mark">02</span><span>${T('Each keeper agrees first, and may step down at any time.', '每位开启人都要先同意，也随时可以退出。')}</span></li><li><span class="mark">03</span><span>${T('A share lives on paper or steel. Never photographed, never sent in a chat app.', '份额写在纸上或刻在钢板上。不拍照，不发到任何聊天软件。')}</span></li><li><span class="mark">04</span><span>${T('The sealed box is kept somewhere other than the shares: a notary, your own account, or a time-lock.', '封好的箱子和份额分开放：交给公证处、你自己的账户，或者加一道时间锁。')}</span></li></ul></div>
  ${picture({ name: 'drawers', alt: T('A catalogue drawer with frost on its brass label holder', '铜标签框上结了霜的目录抽屉'), cls: 'side-photo', sizes: '(max-width: 700px) 100vw, 40vw' })}
</div></section>
<section class="block" id="tools"><div class="wrap split">
  <div>${sectionHead('', T('Tools', '工具'), T('Everything runs on your own computer. The sealing tools are not audited yet. A seven-day cooling period comes before the first seal.', '一切都在你自己的电脑上运行。封存工具还没有经过审计。第一次封存前有七天冷静期。'))}
    <ul class="ticks"><li>${ext(`${REPO}/blob/main/skills/exit-interview/${lang === 'zh' ? 'questionnaire.zh.md' : 'questionnaire.en.md'}`, T('Printed questionnaire, thirty questions', '纸质问卷，三十道题'))}</li><li>${ext(`${REPO}/blob/main/skills/exit-interview/SKILL.md`, T('Inventory interview skill for your own AI', '给你自己 AI 用的整理谈话技能'))}</li><li>${ext(`${REPO}/tree/main/cli`, T('The coldlibrary command-line tool', 'coldlibrary 命令行工具'))}</li><li>${ext(`${REPO}/blob/main/spec/v0.1/${lang === 'zh' ? 'SPEC.zh.md' : 'SPEC.md'}`, T('The format, spec v0.1', '格式规范 v0.1'))}</li></ul></div>
  <pre class="files">python3 -m pip install ./cli
coldlibrary init my-core
coldlibrary validate my-core
coldlibrary seal my-core --threshold 2 --shares 3
coldlibrary check-share
coldlibrary open sealed --share-file a --share-file b</pre>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ Librarians */
page({
  slug: 'librarians',
  title: { en: 'Librarians', zh: '馆员' },
  description: { en: 'Who keeps this place. A librarian card takes about a minute and there is no test. Numbers are unique and not given out in order.', zh: '谁在照看这里。领一张馆员证大约一分钟，不考试。编号独一无二，不按注册顺序发放。' },
  render: (lang) => {
    const T = t(lang);
    const oath = lang === 'zh'
      ? ['我不保管别人的钥匙。', '我从不独自开箱。', '我转述原话，不替任何人说话。', '我不以此收钱。', '我每年回来看一眼。', '我尊重活着的人。', '我帮东西被记住，也帮它们安放。']
      : ['I hold no one’s keys.', 'I never open a box alone.', 'I quote. I never speak for anyone.', 'I take no money for this.', 'I come back once a year to look.', 'I defer to the living.', 'I help things be remembered, and help them rest.'];
    return `${pageHero({ lang, slug: 'librarians', title: T('Librarians', '馆员'), lede: T('Librarians hang exhibits, read applications once, look after the wardens and translate. Rank records what you did; it grants no power.', '馆员负责布展、把申请读一遍、照看守馆人、做翻译。等级只记录你做过什么，不给任何权限。'), image: 'corridor', alt: T('A long quiet corridor ending at a frosted door', '一条长长的安静走廊，尽头是一扇结霜的门'), n: 8, caption_en: 'Corridor to the stacks', caption_zh: '通往书库的走廊' })}
<section class="block"><div class="wrap keepers-row">
  <div>${brassCard(lang, '1', T('Founding Librarian · Front Desk', '创始馆员 · 前台'), FOUNDED)}<a class="btn" href="${href(lang, 'librarians/join')}">${T('Get a librarian card · one minute, no test', '领一张馆员证 · 一分钟，不考试')} <span aria-hidden="true">→</span></a></div>
  <div>${sectionHead('', T('The register', '名册'))}
    <table class="register" data-register data-lang="${lang}"><thead><tr><th>${T('Number', '编号')}</th><th>${T('Name', '名字')}</th><th>${T('Since', '入馆')}</th></tr></thead><tbody><tr><td class="no">No. 1</td><td>${T('Founding Librarian', '创始馆员')}</td><td>${FOUNDED}–</td></tr></tbody></table>
    <p class="micro" data-register-note>${T('Only librarians who chose to be listed appear here, by pen name. The next number could be yours.', '这里只显示同意公开的馆员，用的是笔名。下一个号码，可能就是你的。')}</p>
    <details class="leave" data-leave><summary>${T('Leave the register', '退出名册')}</summary>
      <p class="micro">${T('We send a code to your email. Once you enter it, your email is deleted and your number is retired, never to be reused.', '我们会给你的邮箱发一个验证码。输入后，你的邮箱会被删除，编号会被注销，永不复用。')}</p>
      <form class="form inline" data-leave-email><label>${T('Email', '邮箱')}<input type="email" required autocomplete="email"></label><button class="btn ghost small" type="submit">${T('Send code', '发送验证码')}</button></form>
      <form class="form inline hidden" data-leave-code><label>${T('Code', '验证码')}<input class="code" type="text" inputmode="numeric" maxlength="7" required autocomplete="one-time-code"></label><button class="btn small" type="submit">${T('Leave the register', '确认退出')}</button></form>
      <p class="micro" data-leave-msg></p></details>
  </div>
</div></section>
<section class="block"><div class="wrap split">
  <div>${sectionHead('', T('The oath', '誓词'), T('Seven lines.', '七句话。'))}<ul class="clean">${oath.map((l, i) => `<li><span class="mark">0${i + 1}</span><span>${esc(l)}</span></li>`).join('')}</ul></div>
  <div>${sectionHead('', T('Numbers and ranks', '编号与等级'))}
    <p>${T('Numbers are issued at random between 100000 and 999999. Everything below 100000 and every memorable number is kept for events and contributors. Reserved numbers cannot be sold or transferred, and they carry no authority.', '编号在 100000 到 999999 之间随机发放。100000 以下的号码和所有好记的号码留给活动和贡献者。靓号不能买卖或转让，也不代表任何权限。')}</p>
    <dl class="kv"><dt>${T('Librarian', '馆员')}</dt><dd>${T('Took the oath, received a number.', '念过誓词，领到编号。')}</dd><dt>${T('Docent', '导览员')}</dt><dd>${T('Helped someone hang an exhibit or a plaque, confirmed by that person.', '帮别人挂上过一个展位或一块铭牌，并由对方确认。')}</dd><dt>${T('Conservator', '修缮员')}</dt><dd>${T('Code, docs, translation, design or a security report accepted into the project.', '代码、文档、翻译、设计或安全报告被项目采纳。')}</dd></dl>
  </div>
</div></section>`;
  },
});

page({
  slug: 'librarians/join',
  title: { en: 'Librarian card', zh: '领馆员证' },
  description: { en: 'A name or none, a desk, the oath, your number. About a minute, no test.', zh: '留个名字或匿名，挑张桌子，念誓词，领编号。大约一分钟，不考试。' },
  render: (lang) => {
    const T = t(lang);
    return `<section class="page-hero"><div class="wrap narrow">
  <p class="kicker"><span class="floor-chip">6</span>${T('Librarians', '馆员')}</p>
  <h1>${T('A librarian card', '一张馆员证')}</h1>
  <p class="lede">${T('A name or none, a desk, the oath, your number. About a minute. There is no test.', '留个名字或匿名，挑张桌子，念一遍誓词，领编号。大约一分钟，不考试。')}</p>
</div></section>
<section class="block"><div class="wrap narrow">
  <ol class="join-static" data-join-static>
    <li>${T('What should the register call you? A pen name is fine, or stay anonymous.', '名册上怎么称呼你？笔名也行，也可以匿名。')}</li>
    <li>${T('Pick a desk. Every desk is a good desk.', '挑一张桌子。每张桌子都是好桌子。')}</li>
    <li>${T('Read the seven-line oath.', '读一遍七句誓词。')}</li>
    <li>${T('An email code, used once to confirm you, never for mailing lists.', '一个邮箱验证码，只用来确认一次，不会拿来群发。')}</li>
    <li>${T('Your card with a random six-digit number, to save.', '一张带随机六位编号的馆员证，可以保存。')}</li>
  </ol>
  <div class="terminal paper" id="orientation" data-lang="${lang}">
    <div class="t-head"><span>${T('Orientation desk', '入职台')}</span><span data-o-step>01/04</span></div>
    <div data-o-screen></div>
  </div>
  <div class="libcard-wrap hidden" data-card-wrap>
    <canvas class="libcard" width="1200" height="750" data-libcard></canvas>
    <div class="btns"><a class="btn" data-card-download download="cold-library-card.png" href="#">${T('Save card as PNG', '保存馆员证')}</a><a class="btn ghost" href="${href(lang, 'librarians')}">${T('To the register', '去名册')}</a></div>
  </div>
  <p class="micro">${T('Privacy: we store your email, pen name, number and the date. Nothing else. You can leave the register at any time; your number is retired and never reused.', '隐私：我们只保存你的邮箱、笔名、编号和日期，别的都不存。你随时可以离开名册，你的编号会被注销，永不复用。')}</p>
</div></section>`;
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
    return `${pageHero({ lang, slug: 'rules', title: T('House Rules & Ledger', '馆规与账本'), lede: T('Kept by the Department of Things We Do Not Do, the busiest department in the building. If we ever break one of these rules, this page is the evidence.', '由不办科负责，它是全馆最忙的科室。如果哪天我们违反了其中一条，这一页就是证据。') })}
<section class="block"><div class="wrap narrow"><div class="sheet">${statutes(lang, false)}<p class="custody">${T('We keep the library, never the keys.', '我们守着图书馆，从不保管钥匙。')}</p></div></div></section>
<section class="block"><div class="wrap split">
  <div>${sectionHead('', T('Holds, and never holds', '存了什么，从不存什么'))}
    <dl class="kv"><dt>${T('Holds', '存了')}</dt><dd>${T('Librarians: email, pen name, number, language, listed or not, dates. Exhibits and plaques: the public layer, the recognised layer as ciphertext nobody here can read, the warden questions, lamps and their notes. A salted hash of your network address for one day, to stop abuse.', '馆员：邮箱、笔名、编号、语言、是否公开、日期。展位和铭牌：公开层、谁都读不了的认可层密文、守馆人的问题、灯和留言。另外，为了防滥用，把你的网络地址加盐散列后保存一天。')}</dd>
      <dt>${T('Never holds', '从不保存')}</dt><dd>${T('Warden answers, keys, shares, sealed files, funds, cookies, analytics.', '守馆人问题的答案、钥匙、份额、封存的文件、资金、Cookie、统计数据。')}</dd>
      <dt>${T('What librarians can see', '馆员能看到什么')}</dt><dd>${T('The public layer of an application, once, to check it is yours to share and harms nobody.', '申请的公开层，看一遍，确认是你有权公开的、不伤害任何人。')}</dd></dl></div>
  <div id="audit">${sectionHead('', T('Audit', '审计'))}
    <div class="table-wrap"><table class="compare"><thead><tr><th>${T('Part', '部分')}</th><th>${T('Version', '版本')}</th><th>${T('Tests', '测试')}</th><th>${T('Audit', '审计')}</th></tr></thead><tbody>
      <tr><td>ColdVault</td><td>v0.1 · Sepolia</td><td>${ctx.tests || '—'}</td><td><b>${T('Not yet', '还没有')}</b></td></tr>
      <tr><td>${T('Sealing tools (CLI)', '封存工具（命令行）')}</td><td>v0.1</td><td>140</td><td><b>${T('Not yet', '还没有')}</b></td></tr>
      <tr><td>${T('Warden lock', '守馆人锁')}</td><td>PBKDF2-SHA256 · AES-256-GCM</td><td>—</td><td><b>${T('Not yet', '还没有')}</b></td></tr></tbody></table></div>
    <p class="micro">${T('Report a problem: open an issue on GitHub. We answer in public.', '发现问题：在 GitHub 上提一个 issue，我们公开回复。')} ${ext(`${REPO}/issues`, 'GitHub issues')}</p></div>
</div></section>
<section class="block" id="ledger"><div class="wrap split">
  <div>${sectionHead('', T('Ledger', '账本'))}<div class="ledger">${costs.map(([k, v]) => `<div><span>${k}</span><span>${v}</span></div>`).join('')}</div></div>
  <div>${sectionHead('', T('Perpetual, honestly', '永续，老实说'))}<p>${T('Not a promise that a server runs forever. It means: the format is open, every exhibit and plaque can be exported and printed, the code is free to copy, librarians take over from each other, and copies are archived outside this site.', '不是承诺某台服务器永远开着。它的意思是：格式开放，每个展位和铭牌都能导出、能打印，代码谁都能复刻，馆员一代接一代地接班，副本存在本站之外。')}</p>
    <h3>${T('If we close', '如果我们关门')}</h3><ul class="ticks"><li>${T('At least twelve months of notice.', '至少提前十二个月公告。')}</li><li>${T('Every owner receives their item as files, still locked as before.', '每位主人都会收到自己条目的完整文件，锁着的部分照旧锁着。')}</li><li>${T('The domain passes to a named successor, or points to an archive.', '域名交给指定的继任者，或者指向一个存档。')}</li><li>${T('The register is then deleted.', '最后删除名册数据。')}</li></ul></div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ About */
page({
  slug: 'about',
  title: { en: 'About the library', zh: '关于这座馆' },
  description: { en: 'Why it is called a cold library, how a will is carried on without ruling anyone, the library log and the open stacks.', zh: '为什么叫冷冻图书馆，意志怎样传下去而不管束任何人，馆务日志和公开文集。' },
  render: (lang, ctx) => {
    const T = t(lang);
    const stacks = ctx.stacks.map((s) => `<li><a href="${href(lang, 'open-stacks/' + s.slug)}">${esc(s[lang].title)}</a> <span class="micro">${esc(s[lang].author)} · ${esc(s[lang].date)}</span></li>`).join('');
    return `${pageHero({ lang, slug: 'about', title: T('About the library', '关于这座馆'), lede: T('Built by one person, Librarian No. 1, to keep his own things first, with the doors open to anyone.', '由一个人建起来，一号馆员，最先是为了放他自己的东西，门对所有人开着。'), image: 'lake-dawn', alt: T('A still lake reflecting snow mountains at dawn', '清晨静止的湖面倒映着雪山'), n: 10, caption_en: 'The lake at dawn', caption_zh: '清晨的湖' })}
<section class="block" id="name"><div class="wrap">
  ${sectionHead('', T('Why a cold library', '为什么叫冷冻图书馆'), T('Cold is how things last. A library is how they are found again.', '冷冻，是让东西留得久的办法；图书馆，是让东西被再次找到的办法。'))}
  <div class="three">
    <div><span class="temp">−18 °C</span><h3>${T('Cold', '冷')}</h3><p>${T('Under a mountain in Svalbard, about 78 degrees north, seeds from around the world are kept at minus eighteen degrees; in June 2026 the vault passed 1.4 million samples. Decades later they can still be sown. Freezing is a pause, not an end.', '在斯瓦尔巴的一座山里，大约北纬 78 度，来自全世界的种子在零下十八度保存；2026 年 6 月，库存超过了 140 万份。几十年后拿出来，照样能播种。冷冻是暂停，不是结束。')}</p><p class="micro">${ext('https://www.seedvault.no/', 'seedvault.no')}</p></div>
    <div><span class="temp">2014 → 2114</span><h3>${T('Library', '图书馆')}</h3><p>${T('In 2014 the artist Katie Paterson planted a thousand trees outside Oslo. Each year one writer gives the Future Library a manuscript, which stays unread in a quiet room of the city’s public library until 2114, when the trees become the paper.', '2014 年，艺术家凯蒂·帕特森在奥斯陆城外种下一千棵树。每年有一位作家把一份手稿交给“未来图书馆”，手稿存放在奥斯陆公共图书馆的一间静室里，没人读过，一直要等到 2114 年，那时这些树会被做成纸。')}</p><p class="micro">${ext('https://katiepaterson.org/artwork/future-library/', 'katiepaterson.org')}</p></div>
    <div><span class="temp">cald here-beorg</span><h3>${T('Cold harbour', '冷港')}</h3><p>${T('Coldharbour is an old English place name: a cold shelter, a lodging in the open. Folklore pictures a roadside hut with no keeper and no fire, where you brought your own fuel; that part is a story, not a record. We kept the story as a house rule.', 'Coldharbour 是英国的一个老地名：冷的庇护所，野外的住处。民间说法里，它是路边一间没人看守、没有炉火的歇脚屋，柴火要自己带——这一段是传说，不是史料。我们把这个传说留下来，当作馆规。')}</p><p class="micro">${ext('https://bosworthtoller.com/52385', 'Bosworth-Toller · here-beorg')}</p></div>
  </div>
</div></section>
<section class="block" id="continuance"><div class="wrap split">
  <div>${sectionHead('', T('A will changes form. It does not have to fade.', '意志会换一种样子，不必褪色。'), T('A will lasts longest when it does not try to rule. First people do what you asked. Later they weigh it as advice. In the end it becomes something carried on: a way of working, a saying in the family, the spirit of a project.', '意志想要走得远，就不能去管束人。一开始，大家照你说的做；过几年，大家把它当建议来掂量；最后，它变成被传下去的东西：一种做事的方式、家里的一句老话、一个项目的精神。'))}</div>
  ${halflife(lang)}
</div></section>
<section class="block" id="log"><div class="wrap split">
  <div>${sectionHead('', T('Library log', '馆务日志'))}${logList(lang, ctx.log)}</div>
  <div id="open-stacks">${sectionHead('', T('Open Stacks', '公开文集'), T('Writing people chose to leave in the open.', '人们选择公开留下的文字。'))}<ul class="ticks">${stacks}</ul>
    <p class="micro">${T('If you have watched a certain series about a company that splits people in two, the corridors may look familiar. We borrowed the corridors and left the company behind.', '如果你看过某部讲一家公司把人切成两半的美剧，这些走廊可能会让你眼熟。我们只借了走廊，没借那家公司。')}</p></div>
</div></section>`;
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
    return `${pageHero({ lang, slug: 'warm-room', title: T('The Warm Room', '暖房'), lede: T('This is the warmest room in the building. If tonight is a hard night, stay here for a moment, and talk to someone.', '这是整座楼里最暖和的房间。如果今晚很难熬，在这里待一会儿，找个人说说话。'), image: 'warm-room', alt: T('A small room with an orange lamp and a wool blanket', '一盏橘色的灯和一条羊毛毯的小房间'), n: 11, caption_en: 'The Warm Room', caption_zh: '暖房' })}
<section class="block"><div class="wrap narrow">
  <div class="hotline"><span>${T('Mainland China · national psychological assistance hotline', '中国大陆 · 全国统一心理援助热线')}</span><b>12356</b></div>
  <div class="hotline"><span>${T('United States · Suicide & Crisis Lifeline', '美国 · 自杀与危机生命线')}</span><b>988</b></div>
  <div class="hotline"><span>${T('Anywhere else · find a free, local helpline', '其他地区 · 查找当地的免费热线')}</span><b><a href="https://findahelpline.com" rel="noopener">findahelpline.com</a></b></div>
  <div class="hotline"><span>${T('In immediate danger', '有紧急危险时')}</span><b>${T('Local emergency number', '当地急救电话')}</b></div>
  <p class="lede">${T('You can come back to the library later. It will still be here.', '你可以晚些时候再回到图书馆，它会一直在这里。')}</p>
</div></section>`;
  },
});

page({
  slug: '404',
  title: { en: 'This drawer is empty', zh: '这个抽屉是空的' },
  description: { en: 'This drawer is empty.', zh: '这个抽屉是空的。' },
  render: (lang) => {
    const T = t(lang);
    return `<section class="page-hero"><div class="wrap narrow">
  <p class="kicker"><span class="floor-chip">?</span>${T('Floor unknown', '楼层未知')}</p>
  <h1>${T('This drawer is empty.', '这个抽屉是空的。')}</h1>
  <p class="lede">${T('It may have been moved, or never been here. Try a catalogue number, or go back to the shelves.', '东西可能挪了地方，也可能从来没在这里。试试输入馆藏号，或者回到架子前。')}</p>
  <form class="lookup" data-lookup><input type="text" placeholder="E-000001 · M-000001" aria-label="${T('Catalogue number', '馆藏号')}" required><button class="btn" type="submit">${T('Go', '去看看')}</button></form>
  <p class="micro" data-lookup-msg></p>
  <p class="links"><a href="${href(lang, '')}#shelves">${T('To the shelves →', '回到架子前 →')}</a> <button class="linkish" type="button" data-open-directory>${T('Floors', '楼层')}</button></p>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ Open Stacks items */
export function stackItemPage(item) {
  return {
    slug: 'open-stacks/' + item.slug,
    title: { en: item.en.title, zh: item.zh.title },
    description: { en: item.en.excerpt, zh: item.zh.excerpt },
    render: (lang) => {
      const T = t(lang);
      const s = item[lang];
      return `<section class="page-hero"><div class="wrap narrow">
  <p class="kicker"><span class="floor-chip">8</span>${T('Open Stacks', '公开文集')} · ${esc(item.accession)}</p>
  <h1>${esc(s.title)}</h1>
  <p class="lede">${esc(s.author)} · ${esc(s.date)}</p>
</div></section>
<section class="block"><div class="wrap narrow prose">${md(s.body)}
<p><a href="${href(lang, 'about')}#open-stacks">← ${T('Back to the Open Stacks', '回到公开文集')}</a></p></div></section>`;
    },
  };
}

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
      const T = t(lang), L = Lx(lang);
      const pub = item.public;
      const pron = L(item.pronoun);
      const facts = [
        [T('Catalogue no.', '馆藏号'), esc(item.id)],
        [T('Kept since', '收藏于'), esc(item.shelved || '')],
        [T('Warden', '守馆人'), item.warden ? (item.example ? T('on duty, scripted', '在岗，按脚本') : T('on duty', '在岗')) : T('not set yet', '还没设')],
        [T('Layers', '各层'), item.warden ? T('Public open · Recognised locked · Sealed none', '公开层 开放 · 认可层 已上锁 · 封存层 无') : T('Public open · Recognised not written yet', '公开层 开放 · 认可层 还没写')],
      ].concat((pub.facts || []).map((f) => [esc(L(f.k)), esc(L(f.v))]));
      const links = (pub.links || []).map((l) => `<li><a href="${esc(l.url)}" rel="noopener">${esc(L(l.label))}</a></li>`).join('');
      const cr = item.credits || {};
      const credit = [cr.words ? T('Words — ', '文 · ') + esc(L(cr.words)) : '', cr.photo ? T('Photo — ', '图 · ') + esc(L(cr.photo)) : '', cr.by ? (isEx ? T('Exhibit — ', '展位 · ') : T('Plaque — ', '铭牌 · ')) + esc(L(cr.by)) : ''].filter(Boolean).join('　');
      const paras = L(pub.story).split(/\n{2,}/);
      const head = md(paras[0] || '');
      const rest = paras.length > 1 ? md(paras.slice(1).join('\n\n')) : '';
      const gate = item.kind === 'plaque'
        ? T(`The rest is kept for the people ${pron || 'they'} recognised. Ask ${possessive(pron)} warden.`, `其余的只留给${pron || '他'}认得出来的人。去问${pron || '他'}的守馆人。`)
        : T('The rest is kept for whoever takes it over. Ask its warden.', '其余的只留给接手的人。去问它的守馆人。');
      const photoName = photo(item.image);
      const [capEn, capZh] = capOf(photoName);
      const neighbours = ctx.items.filter((x) => x.id !== item.id).sort(realFirst).slice(0, 2).map((x) => tile(lang, x)).join('') + emptyTile(lang, nextId(ctx.items, isEx ? 'E' : 'M'));
      const short = `/${isEx ? 'e' : 'm'}/${item.id.slice(2)}`;
      return `<section class="item-head"><div class="wrap">
  <p class="id-line"><a href="${short}" title="${T('Cite this', '引用这一页')}">${esc(item.id)}</a> · ${kindName(T, item)}${item.example ? ` <span class="stamp red">${T('Practice · fictional', '练习用 · 虚构')}</span>` : ''}${item.consent === 'given' || item.consent === 'family' ? ` <span class="stamp red">${T('Consent on file', '已获同意')}</span>` : ''}</p>
  <h1 class="item-name">${esc(L(item.title))}</h1>
  <p class="epithet">${esc(L(item.subtitle))}</p>
</div></section>
<section class="block tight"><div class="wrap item-grid">
  <figure class="item-plate">${picture({ name: photoName, alt: L(item.title), sizes: '(max-width: 900px) 100vw, 50vw', eager: true })}${plate(item.example ? 12 : 13, lang, capEn, capZh)}</figure>
  <div class="item-main">
    <div class="prose">${head}${rest ? `<details class="more"><summary>${T('Continue reading', '继续读')}</summary>${rest}</details>` : ''}</div>
    ${links ? `<ul class="ticks">${links}</ul>` : ''}
    ${item.warden ? `<p class="behind-label">${T('Behind this door', '门后')}</p><p class="behind">${contentsLine(lang, item)}</p><p class="gate"><a href="#trial">${gate}</a></p>` : `<p class="gate">${T('Recognised layer: not written yet.', '认可层：还没写。')}${isEx ? ' ' + T('A successor is wanted.', '正在找接班人。') : ''}</p>`}
    <details class="facts"><summary>${T('View all data', '查看全部资料')}</summary><dl class="kv">${facts.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl></details>
    ${credit ? `<p class="credit">${credit}</p>` : ''}
  </div>
</div></section>
${item.warden ? trial(lang, item, { links: false, id: 'trial' }) : ''}
${item.warden ? `<section class="block"><div class="wrap">
  ${sectionHead('', T('Lamps', '灯'))}
  <div class="lamps" data-lamps data-item="${esc(item.id)}"><div class="lamp-first">${T('Pass the warden to light a lamp here.', '通过守馆人的考验，就能在这里点一盏灯。')}</div><ul class="lamp-notes" data-lamp-notes></ul></div>
  ${item.example ? `<p class="micro">${item.kind === 'plaque' ? T('Lamps on a practice plaque.', '练习铭牌上的灯。') : T('Lamps on a practice exhibit.', '练习展位上的灯。')}</p>` : ''}
</div></section>` : ''}
<section class="block"><div class="wrap">
  <div class="door-card" data-door-card>
    ${LOGO}<div><p class="dc-title">${esc(L(item.title))} · ${esc(item.id)}</p><p class="dc-url">coldlibrary.com${short}</p><p class="micro">${T('Answer the warden at this address. You need no account or wallet, and no need to understand any of this today. No secrets are on this card.', '到这个地址回答守馆人的问题。不需要账号，也不需要钱包，今天也不用看懂这些。这张卡上没有任何密码。')}</p></div>
  </div>
  <p class="links"><button class="linkish" type="button" data-print-door>${T('Print a door card', '打印门牌卡')}</button> <a href="/items/${esc(item.id)}.json" download>${T('Keep your own copy', '自己留一份')}</a> <span class="micro">${T('The locked part stays locked in your copy too.', '你存下的这份里，锁着的部分照样锁着。')}</span></p>
  ${sectionHead('', T('Also on the shelves', '架上还有'))}
  <div class="shelf">${neighbours}</div>
</div></section>`;
    },
  };
}
