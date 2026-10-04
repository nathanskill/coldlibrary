import { t, esc, href, REPO, pageHero, sectionHead, card, floorsGrid, md } from './lib.mjs';

const ext = (url, label) => `<a href="${url}" rel="noopener">${label}</a>`;
const img = (name, alt, cls = 'figure wide', cap = '') => `<figure class="${cls} reveal"><img src="/assets/img/${name}-sm.jpg" srcset="/assets/img/${name}-sm.jpg 820w, /assets/img/${name}.jpg 1536w" sizes="(max-width: 900px) 100vw, 50vw" alt="${alt}" loading="lazy">${cap ? `<figcaption>${cap}</figcaption>` : ''}</figure>`;

export const PAGES = [];
const page = (p) => PAGES.push(p);

// Works that are still looked after although their makers are gone. Checked 2026-10-04, see the Cue report.
const LONG_SHELF = [
  { year: '1994', work: 'NetHack', maker_en: 'Izchak Miller, founding member of the DevTeam', maker_zh: 'Izchak Miller，DevTeam 创始成员', now_en: 'The NetHack DevTeam still ships releases; 5.0 came out in 2026.', now_zh: 'NetHack DevTeam 仍在发版，2026 年出了 5.0。', src: 'https://www.nethack.org/' },
  { year: '2012', work: 'Alpine (Pine)', maker_en: 'Mark Crispin, an original author, also the author of IMAP', maker_zh: 'Mark Crispin，原作者之一，也是 IMAP 的作者', now_en: 'Maintained by Eduardo Chappa, with commits in 2026.', now_zh: '由 Eduardo Chappa 维护，2026 年仍有提交。', src: 'https://alpineapp.email/' },
  { year: '2014', work: 'Rake', maker_en: 'Jim Weirich, who created it', maker_zh: 'Jim Weirich，创建者', now_en: 'Maintained by Hiroshi Shibata; v13.4.2 released in April 2026.', now_zh: '由 Hiroshi Shibata 维护，2026 年 4 月发布 v13.4.2。', src: 'https://github.com/ruby/rake' },
  { year: '2015', work: 'Debian', maker_en: 'Ian Murdock, who founded it in 1993', maker_zh: 'Ian Murdock，1993 年创立', now_en: 'Thousands of volunteers and a release team keep it going.', now_zh: '成千上万的志愿者和发布团队让它继续运转。', src: 'https://bits.debian.org/2015/12/mourning-ian-murdock.html' },
  { year: '2016', work: 'ZeroMQ', maker_en: 'Pieter Hintjens, who founded the project', maker_zh: 'Pieter Hintjens，项目创办者', now_en: 'An open team still merges fixes and security patches.', now_zh: '开放团队仍在合并修复和安全补丁。', src: 'https://github.com/zeromq/libzmq' },
  { year: '2019', work: 'Erlang/OTP', maker_en: 'Joe Armstrong, co-inventor of Erlang', maker_zh: 'Joe Armstrong，Erlang 共同发明者', now_en: 'The Erlang/OTP team at Ericsson; OTP 29.1 shipped in September 2026.', now_zh: '爱立信的 Erlang/OTP 团队维护，2026 年 9 月发布 OTP 29.1。', src: 'https://www.erlang.org/news/87' },
  { year: '2020', work: 'Boost C++', maker_en: 'Beman Dawes, co-founder', maker_zh: 'Beman Dawes，共同创始人', now_en: 'Library authors and the community; releases continue.', now_zh: '各库作者和社区共同维护，仍在持续发版。', src: 'https://www.boost.org/' },
  { year: '2021', work: 'J', maker_en: 'Roger Hui, who designed it with Ken Iverson', maker_zh: 'Roger Hui，与 Ken Iverson 共同设计', now_en: 'Jsoftware and its contributors, with commits in 2026.', now_zh: 'Jsoftware 和贡献者维护，2026 年仍有提交。', src: 'https://www.jsoftware.com/papers/remembering.htm' },
  { year: '2023', work: 'Vim', maker_en: 'Bram Moolenaar, its creator and long-time lead', maker_zh: 'Bram Moolenaar，创建者和长期主要开发者', now_en: 'Christian Brabandt and the Vim team; patches land almost daily.', now_zh: 'Christian Brabandt 和 Vim 团队维护，几乎每天都有补丁。', src: 'https://www.vim.org/vim-9.1-released.php' },
];

// The three layers, used on several floors.
function layers(lang) {
  const T = t(lang);
  return `<div class="layers reveal">
  <div class="layer l-open"><span class="num">${T('LAYER 1', '第一层')}</span><h3>${T('Public', '公开层')}</h3><p>${T('What you choose to show anyone: a name, a line, the work, the links. Nothing else is shown.', '你愿意给任何人看的部分：名字、一句话、作品、链接。除此之外，什么都不显示。')}</p><span class="who">${T('Anyone', '任何人')}</span></div>
  <div class="layer l-rec"><span class="num">${T('LAYER 2', '第二层')}</span><h3>${T('Recognised', '认可层')}</h3><p>${T('Letters, stories, notes for whoever carries on, where things are kept. Locked behind your warden.', '信、故事、给接手的人的话、东西放在哪。锁在你的守馆人身后。')}</p><span class="who">${T('Only people your warden recognises', '只给守馆人认可的人')}</span></div>
  <div class="layer l-seal"><span class="num">${T('LAYER 3', '第三层')}</span><h3>${T('Sealed', '封存层')}</h3><p>${T('Things kept for later, sealed on your own machine. Opened on a date you choose, or when your keepers agree.', '留给以后的东西，在你自己的电脑上封存。到你定的日子，或者开启人凑齐时才打开。')}</p><span class="who">${T('Two of your keepers, together', '两位开启人一起')}</span></div>
</div>`;
}

/* ------------------------------------------------------------------ */
page({
  slug: '',
  title: { en: 'Lobby', zh: '大厅' },
  description: {
    en: 'Cold Library keeps what is yours and carries on what you meant: perpetual exhibits for projects, perpetual plaques for people, and AI wardens that open the deeper shelves only to the people you recognise.',
    zh: '冷冻图书馆收藏属于你的一切，并把你的意志传下去：项目有永续展位，人有永续铭牌，更深的内容只由你设定的 AI 守馆人对你认可的人打开。',
  },
  render: (lang, ctx) => {
    const T = t(lang);
    const ex = ctx.items.filter((i) => i.example);
    return `
<section class="hero hero-calm">
  <div class="hero-media" data-parallax="0.12"><img src="/assets/img/lake-library.jpg" srcset="/assets/img/lake-library-sm.jpg 820w, /assets/img/lake-library.jpg 1536w" sizes="100vw" alt="${T('A concrete and glass library on the shore of a frozen lake, snow mountains and a spruce forest behind it, a few windows lit', '冰湖岸边一座混凝土和玻璃的图书馆，背后是雪山和云杉林，几扇窗亮着')}" fetchpriority="high"></div>
  <canvas class="snow" data-snow="full" aria-hidden="true"></canvas>
  <div class="wrap">
    <div class="label"><span class="dot"></span>${T('The Cold Library · est. 2026', '冷冻图书馆 · 建于 2026')}</div>
    <h1 class="display hero-q mt-1">${T('Keep what is yours.<br>Carry on what you meant.', '收藏属于你的一切，<br>把你的意志传下去。')}</h1>
    <p class="lede">${T('A perpetual exhibit for your projects. A perpetual plaque for you. Show the world only what you choose. The deeper shelves are guarded by an AI warden you set up: pass its trial, and you inherit what the one before you left behind.', '给你的项目一个永续展位，给你这个人一块永续铭牌。对外只展示你选的部分；更深的几层由你设定的 AI 守馆人看守——通过它的考验，才能解锁前辈留下的财富。')}</p>
    <div class="btns">
      <a class="btn ember" href="${href(lang, 'accession')}">${T('Apply for an exhibit or a plaque', '申请展位或铭牌')} <span class="k">→</span></a>
      <a class="btn" href="${href(lang, 'plaques')}">${T('See an example', '看一个示例')}</a>
      <button class="btn ghost" type="button" data-open-directory>${T('Floor directory', '楼层指示')}</button>
    </div>
    <div class="hero-meta"><span>${T('Free', '免费')}</span><span>${T('Open source', '开源')}</span><span>${T('Shows only what you choose', '只展示你选的')}</span><span>${T('Opens only for people you recognise', '只对你认可的人打开')}</span><span>${T('No cookies', '没有 Cookie')}</span></div>
  </div>
</section>

<section class="block name-line">
  <div class="wrap">
    <div class="name-split reveal">
      <div><span class="big">${T('Cold', '冷冻')}</span><p>${T('Seeds kept at minus eighteen degrees can still be sown decades later. Your work, your words and what you believe can keep here too: not faded, not rewritten.', '种子在零下十八度能存几十年，拿出来照样能播种。你的作品、你的话、你相信的东西，在这里也冻得住：不褪色，不被改写。')}</p></div>
      <div class="plus" aria-hidden="true">+</div>
      <div><span class="big">${T('Library', '图书馆')}</span><p>${T('Freezing is not locking away. A library catalogues, shelves and lends, so the right people can find what you left and carry it on.', '冻住不是为了锁起来。图书馆会编目、上架、出借，让对的人找得到你留下的东西，并且接着做下去。')}</p></div>
    </div>
  </div>
</section>

<section class="block">
  <div class="wrap">
    ${sectionHead(T('What you can have here', '你能在这里拥有什么'), T('An exhibit, a plaque, a warden.', '一个展位，一块铭牌，一位守馆人。'))}
    <div class="offer-grid">
      <a class="offer reveal" href="${href(lang, 'exhibits')}"><img src="/assets/img/exhibit-hall-sm.jpg" alt="${T('Display plinths and vitrines in a quiet exhibition wing by a window onto a snowy lake', '安静的展厅里一排展台和玻璃柜，窗外是雪湖')}" loading="lazy"><div class="offer-text"><span class="num">3 · ${T('For projects', '给项目')}</span><h3>${T('Perpetual Exhibit', '永续展位')}</h3><p>${T('A standing exhibit for a project or a life of work: what it is, why it matters, who carries it on, and notes left for whoever takes over.', '给一个项目、一生作品的常设展位：它是什么、为什么重要、谁在接着做，以及留给接手的人的话。')}</p></div></a>
      <a class="offer reveal" href="${href(lang, 'plaques')}"><img src="/assets/img/plaque-hall-sm.jpg" alt="${T('A pale stone wall with small brass plaques and warm lamps, snow falling outside a tall window', '浅色石墙上一排小铜牌和暖灯，高窗外下着雪')}" loading="lazy"><div class="offer-text"><span class="num">2 · ${T('For people', '给人')}</span><h3>${T('Perpetual Plaque', '永续铭牌')}</h3><p>${T('A plaque for a person: who they are, what they cared about, what they made. The people they recognise can read more, and light a lamp.', '给一个人的铭牌：他是谁、在乎什么、做过什么。被他认可的人能读到更多，也能为他点一盏灯。')}</p></div></a>
      <a class="offer reveal" href="${href(lang, 'wardens')}"><img src="/assets/img/lake-reading-sm.jpg" alt="${T('A reading hall with brass lamps and a window wall onto a frozen lake', '亮着铜台灯的阅览厅，整面窗外是冰湖')}" loading="lazy"><div class="offer-text"><span class="num">5 · ${T('For your will', '给你的意志')}</span><h3>${T('A Warden', '守馆人')}</h3><p>${T('An AI agent that stands at the door. It answers with your own words, asks what only the right people would know, and hands over what you left for them.', '一个站在门口的 AI。它用你的原话回答问题，问只有对的人才答得上的事，再把你留给他们的东西交出去。')}</p></div></a>
    </div>
  </div>
</section>

<section class="block">
  <div class="wrap">
    ${sectionHead(T('Three layers', '三层'), T('Show what you choose. Keep the rest for the right people.', '想给谁看，就给谁看。'), T('Every exhibit and every plaque has the same three layers.', '每个展位、每块铭牌都有同样的三层。'))}
    ${layers(lang)}
  </div>
</section>

<section class="block">
  <div class="wrap">
    ${sectionHead(T('The trial', '考验'), T('Pass the warden. Inherit what was left.', '通过守馆人的考验，解锁前辈留下的财富。'), T('Wealth here means what a person leaves behind: letters, know-how, a project to carry on, a title, directions to anything set aside, and crypto assets in their own Cold Vault. The library never takes custody of any of it.', '这里说的财富，是一个人留下的东西：信、手艺和门道、可以接着做的项目、一个身份、某样东西放在哪找谁领的指引，以及放在他自己冷库合约里的加密资产。本馆从不托管其中任何一样。'))}
    <div class="steps reveal">
      <div class="step"><h3>${T('You write', '你来写')}</h3><p>${T('What to show everyone, and what to leave for the people who matter: a letter, a story, notes for a successor.', '写下给所有人看的，以及留给重要的人的：一封信、一段故事、给接班人的话。')}</p></div>
      <div class="step"><h3>${T('You set the test', '你来出题')}</h3><p>${T('A few questions only the right people can answer. The answers never leave your computer; they become the key.', '出几个只有对的人才答得上的问题。答案不会离开你的电脑，它们本身就是钥匙。')}</p></div>
      <div class="step"><h3>${T('The warden asks', '守馆人来问')}</h3><p>${T('Visitors talk to your warden. It does not hint, does not bargain, and cannot be paid.', '访客和你的守馆人对话。它不给提示，不讲价，也收买不了。')}</p></div>
      <div class="step"><h3>${T('They receive', '对的人收到')}</h3><p>${T('What you left them, the right to light a lamp and leave a word, a badge such as successor, and directions to anything you set aside.', '你留给他们的东西、点灯留言的资格、一枚徽章（比如"接班人"），以及你留下的东西在哪里、找谁领。')}</p></div>
    </div>
  </div>
</section>

<section class="block">
  <div class="wrap split">
    <div class="reveal">
      <div class="label ember"><span class="dot"></span>${T('B4 · The Cold Vault', 'B4 · 冷库')}</div>
      <h2 class="section-title mt-1">${T('What is left can be real assets, too.', '留下的财富，也可以是真金白银。')}</h2>
      <p class="lede">${T('Keep crypto assets in a Cold Vault: a smart contract that belongs to you, not to us. You decide who receives what share, and when. You can take everything back at any time. If you go silent, your keepers confirm, a veto window passes, and each heir claims their own share with their own wallet.', '把加密资产放进冷库：一个属于你、不属于我们的智能合约。给谁、给多少、什么时候给，都由你决定，你随时可以全部取回。如果你长时间没有音讯，开启人确认、否决期过去，每位继承人用自己的钱包领走自己那一份。')}</p>
      <div class="btns"><a class="btn ember" href="${href(lang, 'vault')}">${T('How the vault works', '冷库怎么运作')}</a><a class="btn ghost" href="${REPO}/blob/main/docs/${lang === 'zh' ? 'whitepaper.zh.md' : 'whitepaper.md'}">${T('Read the whitepaper', '读技术白皮书')}</a></div>
    </div>
    <div class="reveal">${card({ acc: 'B4 · ColdVault', title: T('Non-custodial', '非托管'), fields: [[T('Who holds it', '谁拿着'), T('Your own contract', '你自己的合约')], [T('Who decides', '谁决定'), T('You alone', '只有你')], [T('Admin key', '管理员密钥'), T('None', '没有')], [T('Fee', '手续费'), T('None', '没有')], [T('Status', '状态'), T('On the Sepolia testnet, not yet audited', '已上 Sepolia 测试网，尚未审计')]], stamp: T('Testnet live', '测试网已上线') })}</div>
  </div>
</section>

<section class="block">
  <div class="wrap">
    ${sectionHead(T('On display', '展出中'), T('Two examples, both fictional.', '两个示例，都是虚构的。'), T('Try the warden. The example answers are printed on the page.', '去试试守馆人，示例的答案就印在页面上。'))}
    <div class="grid two">${ex.map((i) => itemCard(lang, i)).join('')}</div>
  </div>
</section>

<section class="block">
  <div class="wrap split">
    <div class="reveal">
      <div class="label"><span class="dot"></span>${T('Floor 6 · Department of Continuance', '6 楼 · 传承科')}</div>
      <h2 class="section-title mt-1">${T('A will changes form. It does not have to fade.', '意志会换一种样子，不必褪色。')}</h2>
      <p class="lede">${T('Drag the years forward. The same sentence moves from something to do, to advice, to something carried on.', '把年份往后拖，同一句话会从"照办"变成"参考"，再变成被传下去的东西。')}</p>
      <a class="btn mt-2" href="${href(lang, 'continuance')}">${T('Visit the department', '去传承科')}</a>
    </div>
    ${halflife(lang)}
  </div>
</section>

<section class="block">
  <div class="wrap split">
    <div class="reveal">
      <div class="label lake"><span class="dot"></span>${T('Outside the windows', '窗外')}</div>
      <h2 class="section-title mt-1">${T('A lake, a snowline, a forest.', '一片湖，一条雪线，一片林。')}</h2>
      <p class="lede">${T('The library stands where the cold does the work. The lake freezes every winter and keeps a clear surface for reading the sky. Above the snowline, snow stays and slowly becomes ice. At the edge of the grounds a young spruce forest grows in rows, the way the Future Library in Norway grows the paper for 2114. Nothing here is in a hurry.', '图书馆建在冷替你干活的地方。湖每年冬天都会结冰，冰面清澈，可以照见天空。雪线以上的雪不会化，年复一年压成冰。院子边上有一片年轻的云杉林，一排一排长着，就像挪威的"未来图书馆"为 2114 年种下的那片树。这里没有什么是着急的。')}</p>
      <a class="btn ghost mt-1" href="${href(lang, 'name')}">${T('Why cold', '为什么是冷冻')}</a>
    </div>
    <div class="grid two reveal">
      ${img('forest-rows', T('Young spruce trees in rows under deep snow', '深雪里一排排年轻的云杉'), 'figure tall', T('The forest · paper for later', '森林 · 留给以后的纸'))}
      ${img('lake-dawn', T('A still lake reflecting snow mountains at dawn', '清晨静止的湖面倒映着雪山'), 'figure tall', T('The lake · above the snowline', '湖 · 雪线以上'))}
    </div>
  </div>
</section>

<section class="block">
  <div class="wrap">
    ${sectionHead(T('Floor directory', '楼层指示'), T('Where things are kept.', '东西都放在哪。'))}
    ${floorsGrid(lang)}
  </div>
</section>

<section class="block">
  <div class="wrap split">
    <div class="reveal">
      <div class="label ember"><span class="dot"></span>${T('Floor 7 · Register of Librarians', '7 楼 · 馆员名册')}</div>
      <h2 class="section-title mt-1">${T('Become a librarian.', '成为一名馆员。')}</h2>
      <p class="lede">${T('Librarians hang exhibits, review applications, look after wardens and translate. It takes about a minute, mostly clicks, and there is no test. Your number is yours alone, and it is not given out in order.', '馆员负责布展、审核申请、照看守馆人、做翻译。入职大约一分钟，基本是点一点，不考试。你的编号独一无二，而且不按注册顺序发放。')}</p>
      <div class="btns"><a class="btn ember" href="${href(lang, 'librarians/join')}">${T('Get a librarian card', '领一张馆员证')}</a><a class="btn ghost" href="${href(lang, 'librarians')}">${T('See the register', '看名册')}</a></div>
    </div>
    <div class="reveal">${card({ acc: 'No. 1', title: T('Founding Librarian', '创始馆员'), fields: [[T('Floor', '楼层'), T('All of them', '全部')], [T('Since', '入馆'), '2026-10-04'], [T('Duty', '职责'), T('Keeps the lights low and the rules short.', '把灯调暗，把规矩写短。')]], stamp: T('On duty', '在岗') })}</div>
  </div>
</section>
`;
  },
});

function halflife(lang) {
  const T = t(lang);
  return `<div class="panel halflife reveal" data-halflife>
      <div class="hl-status"><span>${T('Years since it took effect', '生效后')} <b data-hl-years>0</b> ${T('years', '年')}</span><span>${T('Stage', '阶段')}: <b data-hl-stage>${T('Binding', '照办')}</b></span></div>
      <p class="hl-sentence" data-hl-sentence data-carried="${T('“Keep the website online.” It became the oldest rule of the project.', '"网站继续开着。"后来，这成了这个项目最老的一条规矩。')}">${T('“Keep the website online. Renew the domain every year.”', '"网站继续开着，域名每年续费。"')}</p>
      <input class="hl-range" type="range" min="0" max="20" step="0.5" value="0" aria-label="${T('Years since it took effect', '生效后的年数')}" data-hl-range data-labels='${JSON.stringify(lang === 'zh' ? ['照办', '参考', '传承'] : ['Binding', 'Advisory', 'Carried on'])}'>
      <div class="hl-ticks"><span>${T('Binding · 0–2 y', '照办 · 0–2 年')}</span><span>${T('Advisory · to 10 y', '参考 · 到第 10 年')}</span><span>${T('Carried on', '传承')}</span></div>
    </div>`;
}

// A catalog card for an exhibit or a plaque.
export function itemCard(lang, i) {
  const T = t(lang);
  const path = (i.kind === 'exhibit' ? 'exhibits/' : 'plaques/') + i.slug;
  return `<a class="item-card reveal" href="${href(lang, path)}"><img src="/assets/img/${esc(i.image)}-sm.jpg" alt="" loading="lazy"><div class="item-text"><span class="num">${esc(i.id)} · ${i.kind === 'exhibit' ? T('Perpetual Exhibit', '永续展位') : T('Perpetual Plaque', '永续铭牌')}${i.example ? ' · ' + T('Example', '示例') : ''}</span><h3>${esc(i.title[lang])}</h3><p>${esc(i.subtitle[lang])}</p></div></a>`;
}

/* ------------------------------------------------------------------ */
page({
  slug: 'exhibits',
  title: { en: 'Perpetual Exhibits', zh: '永续展位' },
  description: { en: 'A standing exhibit for a project or a life of work, with notes for whoever carries it on, guarded by an AI warden.', zh: '给一个项目、一生作品的常设展位，附上留给接手的人的话，由 AI 守馆人看守。' },
  image: '/assets/img/exhibit-hall.jpg',
  render: (lang, ctx) => {
    const T = t(lang);
    const items = ctx.items.filter((i) => i.kind === 'exhibit');
    const projects = ctx.projects.map((p) => card({
      acc: p.accession,
      title: `<a href="${esc(p.url)}" rel="noopener">${esc(p.name)}</a>`,
      fields: [
        [T('What', '是什么'), esc(p.summary[lang] || p.summary.en)],
        [T('Kept by', '维护'), esc(p.maintainers.map((m) => m.name).join(', '))],
        [T('Handover', '交接'), p.handoff_doc ? `<a href="${esc(p.handoff_doc)}" rel="noopener">${T('notes', '文档')}</a>` : '—'],
        [T('Since', '入藏'), esc(p.since)],
      ],
      stamp: p.status === 'active' ? T('Active', '在维护') : esc(p.status),
      stampClass: 'ice',
    })).join('');
    return `${pageHero({ lang, slug: 'exhibits', title: T('Perpetual Exhibits', '永续展位'), lede: T('Work outlives plans. An exhibit keeps a project or a life of work on show: what it is, why it mattered, who carries it on. The notes for whoever takes over sit one layer deeper, behind your warden.', '作品往往比计划活得久。展位让一个项目、一生的作品一直陈列着：它是什么、为什么重要、谁在接着做。留给接手的人的话放在更深一层，由你的守馆人看着。'), image: 'exhibit-hall', alt: T('Display plinths and vitrines in a quiet exhibition wing by a window onto a snowy lake', '安静的展厅里一排展台和玻璃柜，窗外是雪湖') })}
<section class="block"><div class="wrap">
  ${sectionHead(T('On display', '展出中'), T('Exhibits.', '展位。'))}
  <div class="grid two">${items.map((i) => itemCard(lang, i)).join('')}</div>
</div></section>
<section class="block"><div class="wrap split">
  <div class="reveal">
    ${sectionHead(T('What an exhibit holds', '一个展位里有什么'), T('Three layers, your choice in each.', '三层，每一层放什么由你定。'))}
    <dl class="kv">
      <dt>${T('Public', '公开层')}</dt><dd>${T('The story, the works, the links, who looks after it now.', '它的故事、作品、链接、现在谁在照看。')}</dd>
      <dt>${T('Recognised', '认可层')}</dt><dd>${T('A letter to whoever carries it on, the roadmap you never published, where the domain and the servers are and who to ask, a successor badge.', '写给接手的人的信、没公开过的路线图、域名和服务器在哪找谁、一枚"接班人"徽章。')}</dd>
      <dt>${T('Sealed', '封存层')}</dt><dd>${T('Anything that needs your keepers: kept offline, opened together.', '需要开启人一起才能打开的东西：离线保存，一起开启。')}</dd>
    </dl>
  </div>
  <div class="panel ice-edge reveal">
    <span class="num">${T('FRONT DESK', '前台')}</span>
    <h3>${T('Apply for an exhibit', '申请一个展位')}</h3>
    <p class="muted">${T('Fill in the public part, write what you leave for the right people, set your warden questions. Your browser locks the deeper layer before anything is sent; we never see it.', '填好公开的部分，写下留给对的人的东西，给守馆人出题。更深那一层在发出之前就由你的浏览器锁好，我们看不到。')}</p>
    <a class="btn mt-1" href="${href(lang, 'accession')}">${T('Go to the front desk', '去前台')}</a>
  </div>
</div></section>
${projects ? `<section class="block"><div class="wrap">
  ${sectionHead(T('Project cards', '项目卡片'), T('Listed projects.', '已登记的项目。'))}
  <div class="catalog">${projects}</div>
</div></section>` : ''}
<section class="block"><div class="wrap">
  ${sectionHead(T('The Long Shelf', '长架'), T('Works that are still looked after.', '一直有人照看的作品。'), T('Each of these lost a founder or a core maker, and someone carried on. This is what an exhibit is for. Facts checked on 2026-10-04, each with a source.', '这些作品都失去过创始人或核心作者，然后有人接着做了下去。展位就是为这样的事准备的。2026-10-04 核实，每条都有出处。'))}
  <div class="shelf reveal">${LONG_SHELF.map((r) => `<div class="shelf-row"><span class="yr">${r.year}</span><div><b>${esc(r.work)}</b><span class="who-made">${esc(T(r.maker_en, r.maker_zh))}</span></div><p>${esc(T(r.now_en, r.now_zh))}</p><a href="${r.src}" rel="noopener">${T('Source', '出处')}</a></div>`).join('')}</div>
  <div class="panel mt-3 reveal"><span class="num">${T('ONE SETTING, FIVE MINUTES', '一个设置，五分钟')}</span><h3>${T('Name a GitHub successor.', '给你的 GitHub 指定一位继任者。')}</h3><p class="muted">${T('Settings → Account → Successor settings. If you can no longer manage your account, your successor can archive or transfer your public repositories after GitHub checks the situation. They cannot log in as you and do not get your private repositories. Put the rest in your exhibit.', '设置 → Account → Successor settings。如果有一天你没法再管理账户，GitHub 核实情况后，继任者可以归档或转移你的公开仓库。他不能登录你的账户，也拿不到私有仓库。其余的，写进你的展位。')} ${ext('https://docs.github.com/en/account-and-profile/concepts/personal-repository-access-and-collaboration', T('GitHub docs', 'GitHub 文档'))}</p></div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'plaques',
  title: { en: 'Perpetual Plaques', zh: '永续铭牌' },
  description: { en: 'A plaque for a person: who they are, what they cared about, what they made. The people they recognise can read more and light a lamp.', zh: '给一个人的铭牌：他是谁、在乎什么、做过什么。被他认可的人能读到更多，也能为他点一盏灯。' },
  image: '/assets/img/plaque-hall.jpg',
  render: (lang, ctx) => {
    const T = t(lang);
    const items = ctx.items.filter((i) => i.kind === 'plaque');
    return `${pageHero({ lang, slug: 'plaques', title: T('Perpetual Plaques', '永续铭牌'), lede: T('A plaque is not an obituary. Living people have them too: a short record of who you are and what you care about, kept where the people you recognise can find it.', '铭牌不是讣告，活着的人也可以有。它简短地记下你是谁、在乎什么，放在你认可的人找得到的地方。'), image: 'plaque-hall', alt: T('A pale stone wall with small brass plaques and warm lamps, snow falling outside a tall window', '浅色石墙上一排小铜牌和暖灯，高窗外下着雪') })}
<section class="block"><div class="wrap">
  ${sectionHead(T('On the wall', '墙上'), T('Plaques.', '铭牌。'))}
  <div class="grid two">${items.map((i) => itemCard(lang, i)).join('')}</div>
</div></section>
<section class="block"><div class="wrap split">
  <div class="reveal">
    ${sectionHead(T('What a plaque holds', '一块铭牌上有什么'), T('As much as you choose.', '放多少，你自己定。'))}
    <dl class="kv">
      <dt>${T('Public', '公开层')}</dt><dd>${T('A name or a pen name, one line, the things you made, linked to your exhibits. The number of lamps lit.', '名字或笔名、一句话、你做过的东西（连到你的展位）、被点亮的灯数。')}</dd>
      <dt>${T('Recognised', '认可层')}</dt><dd>${T('Letters, stories, a voice note you recorded yourself, where a keepsake is and who to ask for it. The right to light a lamp and leave a word.', '信、故事、你亲自录的一段话、某件纪念物放在哪找谁领。点一盏灯、留一句话的资格。')}</dd>
      <dt>${T('Sealed', '封存层')}</dt><dd>${T('What should wait for a date, or for your keepers.', '要等到某个日子、或等开启人一起才能打开的东西。')}</dd>
    </dl>
    <p class="muted mt-1">${T('A plaque for someone else needs their consent, or, for someone who has passed away, the agreement of their close family. Every application is reviewed by a librarian.', '为别人立铭牌，需要本人同意；为已经过世的人立，需要直系亲属同意。每一份申请都由馆员审核。')}</p>
  </div>
  <div class="reveal">
    ${img('plaque-hall', T('Brass plaques and small lamps on a stone wall', '石墙上的铜牌和小灯'), 'figure wide', T('Hall of Plaques · lamps lit by recognised visitors', '铭牌厅 · 灯由被认可的访客点亮'))}
    <a class="btn ember mt-2" href="${href(lang, 'accession')}">${T('Apply for a plaque', '申请一块铭牌')}</a>
  </div>
</div></section>
<section class="block"><div class="wrap narrow reveal">
  <div class="notice">${T('Lamps are not likes. Only people your warden recognises can light one, so each lamp means someone who knew you came by.', '灯不是点赞。只有守馆人认可的人才能点，所以每一盏灯，都意味着一个认识你的人来过。')}</div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'wardens',
  title: { en: 'The Wardens', zh: '守馆人' },
  description: { en: 'Each exhibit and plaque has an AI warden at the door. It quotes you, asks what only the right people know, and hands over what you left. It never speaks as you.', zh: '每个展位和铭牌门口都有一位 AI 守馆人。它引用你的原话，问只有对的人知道的事，再把你留下的东西交出去。它从不冒充你。' },
  image: '/assets/img/lake-reading.jpg',
  render: (lang) => {
    const T = t(lang);
    return `${pageHero({ lang, slug: 'wardens', title: T('The Wardens', '守馆人'), lede: T('Every exhibit and every plaque has a warden at the door: an AI agent working from your rules and your words. It is how a will keeps working when you are busy, away, or simply not in the room.', '每个展位、每块铭牌门口都有一位守馆人：一个按你的规矩、用你的原话办事的 AI。你忙的时候、不在的时候、或者只是不在场的时候，你的意志靠它继续运转。'), image: 'lake-reading', alt: T('A reading hall with brass lamps and a window wall onto a frozen lake', '亮着铜台灯的阅览厅，整面窗外是冰湖') })}
<section class="block"><div class="wrap split">
  <div class="reveal">
    ${sectionHead(T('Duties', '职责'), T('What a warden does.', '守馆人做什么。'))}
    <ul class="clean">
      <li><span class="mark">01</span><span>${T('Greets visitors and answers questions about the public layer, quoting what you wrote, with the date.', '接待访客，回答关于公开层的问题，引用你写过的原话，并注明日期。')}</span></li>
      <li><span class="mark">02</span><span>${T('Asks your recognition questions, and does not hint or bargain.', '问你出的认可问题，不给提示，不讲价。')}</span></li>
      <li><span class="mark">03</span><span>${T('Hands over what you left: the letters, the badge, the directions, the right to light a lamp.', '把你留下的东西交出去：信、徽章、东西在哪的指引、点灯的资格。')}</span></li>
      <li><span class="mark">04</span><span>${T('Keeps the exhibit in order: checks links, notes what changed, and tells your successor what needs doing.', '让展位保持整齐：检查链接、记下变动、告诉接班人有什么事要做。')}</span></li>
    </ul>
  </div>
  <div class="reveal">
    ${sectionHead(T('Limits', '边界'), T('What a warden never does.', '守馆人从不做什么。'))}
    <ul class="clean">
      <li><span class="mark">×</span><span>${T('Speak as you. It says “they wrote”, never “I”. No cloned voice, no cloned face.', '冒充你说话。它只说"他写道"，从不说"我"。不克隆声音，不克隆面孔。')}</span></li>
      <li><span class="mark">×</span><span>${T('Decide for anyone. It passes on your words; the living decide what to do with them.', '替任何人做决定。它只转达你的话，怎么做由活着的人决定。')}</span></li>
      <li><span class="mark">×</span><span>${T('Hold your key. The key is made from the right answers, inside the visitor\'s own browser. We cannot open your recognised layer, and neither can the warden on its own.', '保管你的钥匙。钥匙由正确答案在访客自己的浏览器里算出来。我们打不开你的认可层，守馆人自己也打不开。')}</span></li>
      <li><span class="mark">×</span><span>${T('Open for money, pressure or persistence.', '因为钱、施压或软磨硬泡而开门。')}</span></li>
    </ul>
  </div>
</div></section>
<section class="block"><div class="wrap">
  ${sectionHead(T('Kinds of trial', '考验的方式'), T('You choose how the right people are known.', '对的人怎么被认出来，由你定。'))}
  <div class="catalog">
    ${card({ acc: 'R-01', title: T('Questions', '问题'), fields: [[T('How', '方式'), T('One to three questions only the right people can answer. The answers form the key.', '一到三个只有对的人才答得上的问题，答案本身就是钥匙。')], [T('Good for', '适合'), T('Family, old friends, former students', '家人、老朋友、教过的学生')]], stamp: T('Live', '已上线'), stampClass: 'ice' })}
    ${card({ acc: 'R-02', title: T('A named list', '指定名单'), fields: [[T('How', '方式'), T('People you name by email. The warden sends them a code.', '你按邮箱指定的人，守馆人给他们发验证码。')], [T('Good for', '适合'), T('A successor, a co-founder, a few close people', '接班人、合伙人、几位亲近的人')]], stamp: T('Next', '下一步'), stampClass: '' })}
    ${card({ acc: 'R-03', title: T('Contribution', '贡献记录'), fields: [[T('How', '方式'), T('Proof of real work on the project, such as merged changes on GitHub.', '对项目真实贡献的证明，比如在 GitHub 上被合并的改动。')], [T('Good for', '适合'), T('Open-source projects choosing a successor', '要选接班人的开源项目')]], stamp: T('Planned', '计划中'), stampClass: '' })}
  </div>
</div></section>
<section class="block"><div class="wrap narrow reveal">
  <div class="notice">${T('Status, plainly: the wardens on the example pages follow a script. A warden that holds a real conversation through a language model is being built. Either way, the rules are yours and the key never leaves the visitor\'s browser.', '老实说现状：示例页面上的守馆人是按脚本走的；能用大模型真正对话的守馆人正在做。无论哪种，规矩都由你定，钥匙都不会离开访客的浏览器。')}</div>
  <div class="btns"><a class="btn" href="${href(lang, 'plaques')}">${T('Try a warden', '试一位守馆人')}</a><a class="btn ghost" href="${href(lang, 'accession')}">${T('Set up your own', '设一位自己的')}</a></div>
</div></section>`;
  },
});


/* ------------------------------------------------------------------ */
page({
  slug: 'vault',
  title: { en: 'The Cold Vault', zh: '冷库' },
  description: { en: 'A non-custodial smart contract: your crypto assets stay in your own contract, and you alone decide who receives what share, and when.', zh: '非托管的智能合约：加密资产留在你自己的合约里，给谁、给多少、什么时候给，只由你决定。' },
  render: (lang) => {
    const T = t(lang);
    const wp = `${REPO}/blob/main/docs/${lang === 'zh' ? 'whitepaper.zh.md' : 'whitepaper.md'}`;
    return `${pageHero({ lang, slug: 'vault', title: T('The Cold Vault', '冷库'), lede: T('Wealth you leave behind should not sit with a stranger. A Cold Vault is a smart contract you deploy for yourself. Cold Library never holds it, cannot open it and takes nothing from it. The contract only follows the plan you wrote.', '你留下的财富，不该放在陌生人手里。冷库是你自己部署的智能合约。冷冻图书馆从不拿着它，打不开它，也不从里面拿一分钱。合约只按你写下的计划办事。'), image: 'drawers', alt: T('A frosted catalogue drawer with a brass label holder', '铜标签框上结了霜的目录抽屉') })}
<section class="block"><div class="wrap">
  ${sectionHead(T('How it works', '怎么运作'), T('You decide. The contract follows.', '你来决定，合约照办。'))}
  <div class="steps reveal">
    <div class="step"><h3>${T('Set the plan', '定计划')}</h3><p>${T('Heirs and their shares, up to twenty. Keepers who can confirm you are gone silent, and how many must agree. How long the silence, how long the veto window. Optionally a date, like a time capsule.', '继承人和各自的份额，最多二十位。能确认你失联的开启人，以及需要几位同意。多久算失联，否决期多长。也可以设一个日期，像时间胶囊。')}</p></div>
    <div class="step"><h3>${T('Live as usual', '照常生活')}</h3><p>${T('Deposit, withdraw, change the plan, any time. Every action counts as a check-in and cancels anything pending.', '随时存入、取回、改计划。你的每个操作都算一次报到，会撤销所有进行中的流程。')}</p></div>
    <div class="step"><h3>${T('If you go silent', '如果你没了音讯')}</h3><p>${T('After the silence period, your keepers confirm. A veto window follows: you can cancel by checking in, and each keeper can stop it once.', '失联期过后，开启人确认。接着是否决期：你只要报到一次就能撤销，每位开启人也能叫停一次。')}</p></div>
    <div class="step"><h3>${T('Heirs claim', '继承人领取')}</h3><p>${T('Each heir claims their own share with their own wallet. Assets that arrive later are split the same way. Nobody else can claim, whatever they know.', '每位继承人用自己的钱包领走自己那一份，之后才到账的资产也按同样比例分。其他人不管知道什么，都领不走。')}</p></div>
  </div>
</div></section>
<section class="block"><div class="wrap split">
  <div class="reveal">
    ${sectionHead(T('With an exhibit or a plaque', '和展位、铭牌连在一起'), T('The trial tells them how. Only their wallet can claim.', '考验告诉他们怎么领，只有他们的钱包能领。'))}
    <p class="lede">${T('Link a vault to your exhibit or plaque. When an heir passes your warden\'s trial, the recognised layer shows them the vault, the chain, their share and plain instructions. Guessing the answers gains nothing: the contract pays only the wallets you registered.', '把冷库和你的展位或铭牌连起来。继承人通过守馆人的考验后，认可层会告诉他：冷库地址、在哪条链上、他占几成，以及一份白话的领取说明。猜中答案也没用：合约只付给你登记过的钱包。')}</p>
  </div>
  <div class="reveal">${card({ acc: 'ColdVault.sol', title: T('The contract', '合约'), fields: [[T('Holds', '持有'), T('Native coin and ERC-20 tokens', '链上原生币和 ERC-20 代币')], [T('Admin, pause, upgrade', '管理员、暂停、升级'), T('None', '都没有')], [T('Fee', '手续费'), T('None', '没有')], [T('Tests', '测试'), T('27 unit and fuzz tests, full path on a local chain', '27 个单元和随机测试，完整流程在本地链跑通')], [T('Audit', '审计'), T('Not yet. Do not use real funds before it.', '还没有。审计之前不要放真钱。')]], stamp: T('Open source', '开源'), stampClass: 'ice' })}</div>
</div></section>
<section class="block" id="desk"><div class="wrap">
  ${sectionHead(T('The vault desk', '冷库操作台'), T('Use it with your own wallet.', '用你自己的钱包操作。'), T('Testnet only until the audit. Every action is signed in your wallet; this page never sees your keys.', '审计之前只开放测试网。每一步都在你自己的钱包里签名，这个页面看不到你的私钥。'))}
  <div class="vault-app" data-vault-app>
    <div class="v-bar"><span class="v-status" data-v-status>…</span><button class="btn" type="button" data-v-connect>${T('Connect wallet', '连接钱包')}</button><button class="btn ember" type="button" data-v-switch hidden>${T('Switch to the Sepolia testnet', '切换到 Sepolia 测试网')}</button></div>
    <p class="feedback" data-v-msg></p>
    <div data-v-connected hidden>
      <div class="grid two">
        <div>
          <h3>${T('My vaults', '我的冷库')}</h3>
          <div data-v-mine class="mt-1"></div>
          <h3 class="mt-3">${T('A vault I keep or inherit from', '我是开启人或继承人的冷库')}</h3>
          <form class="form mt-1" data-v-lookup><label>${T('Vault address', '冷库地址')}<input type="text" placeholder="0x…" required></label><button class="btn ghost" type="submit">${T('Open', '打开')}</button></form>
          <div data-v-found class="mt-1"></div>
        </div>
        <form class="form workbench" data-v-create>
          <fieldset><legend>${T('New vault', '新建冷库')}</legend>
            <label>${T('Link to an exhibit or plaque (optional)', '关联的展位或铭牌（可选）')}<input type="text" name="itemRef" maxlength="80" placeholder="coldlibrary:M-000001"></label>
            <div data-v-heirs></div>
            <button class="btn ghost" type="button" data-v-add-heir>${T('+ Heir', '+ 继承人')}</button>
            <div data-v-keepers></div>
            <button class="btn ghost" type="button" data-v-add-keeper>${T('+ Keeper', '+ 开启人')}</button>
            <label>${T('Confirmations needed', '需要几位开启人确认')}<input type="text" name="threshold" inputmode="numeric" value="2"></label>
            <label>${T('Silence period, days (7 or more)', '失联期，天（至少 7）')}<input type="text" name="heartbeat" inputmode="numeric" value="180"></label>
            <label>${T('Veto window, days', '否决期，天')}<input type="text" name="veto" inputmode="numeric" value="28"></label>
            <label>${T('Release on a date (optional)', '定时发放日期（可选）')}<input type="datetime-local" name="release"></label>
          </fieldset>
          <button class="btn ember" type="submit">${T('Create in my wallet', '在我的钱包里创建')}</button>
        </form>
      </div>
    </div>
  </div>
  <script src="/assets/vault.js" defer></script>
</div></section>
<section class="block"><div class="wrap narrow reveal">
  <div class="notice warn">${T('Status: the contracts are tested and live on the Sepolia testnet (factory 0x70C3…0cA3, source verified), but not audited and not on mainnet. Crypto-asset services are restricted or prohibited in some places, including mainland China; the vault is not offered where it is not lawful. A vault is not a legal will.', '现状：合约已经测试，并已部署到 Sepolia 测试网（工厂合约 0x70C3…0cA3，源代码已公开验证），但还没有审计，也没有上主网。加密资产相关服务在一些地方受到限制或被禁止，包括中国大陆；在不合法的地方不提供冷库。冷库不是法律遗嘱。')}</div>
  <div class="btns"><a class="btn" href="${wp}">${T('Read the whitepaper', '读技术白皮书')}</a><a class="btn ghost" href="${REPO}/tree/main/contracts">${T('Contract source', '合约源代码')}</a></div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'accession',
  title: { en: 'Front Desk', zh: '前台 · 入藏处' },
  description: { en: 'Apply for a perpetual exhibit or a perpetual plaque. Your browser locks the deeper layer before anything is sent.', zh: '申请永续展位或永续铭牌。更深那一层在发出之前就由你的浏览器锁好。' },
  render: (lang) => {
    const T = t(lang);
    return `${pageHero({ lang, slug: 'accession', title: T('Front Desk', '前台 · 入藏处'), lede: T('Nobody sits at this desk. Fill in the form, and a librarian hangs your exhibit or plaque after a short review. The deeper layer is locked by your own browser before it leaves; we only ever receive it locked.', '前台没有人。填好表，馆员简单审核后就会把你的展位或铭牌挂上去。更深的那一层在离开你的浏览器之前就锁好了，我们收到的永远是锁着的。') })}
<section class="block"><div class="wrap narrow">
  <noscript><div class="notice warn">${T('The application form needs JavaScript.', '申请表需要开启 JavaScript。')}</div></noscript>
  <form class="form workbench" data-workbench data-lang="${lang}">
    <fieldset><legend>${T('1 · What is it for', '1 · 给什么')}</legend>
      <div class="seg" role="radiogroup">
        <label><input type="radio" name="kind" value="exhibit" checked> <span>${T('A project · Perpetual Exhibit', '一个项目 · 永续展位')}</span></label>
        <label><input type="radio" name="kind" value="plaque"> <span>${T('A person · Perpetual Plaque', '一个人 · 永续铭牌')}</span></label>
      </div>
      <div class="seg mt-1" data-for-plaque hidden role="radiogroup">
        <label><input type="radio" name="whose" value="self" checked> <span>${T('For myself', '为我自己')}</span></label>
        <label><input type="radio" name="whose" value="other"> <span>${T('For someone else, with their consent or their family\'s', '为别人，已获本人或家属同意')}</span></label>
      </div>
    </fieldset>
    <fieldset><legend>${T('2 · Public layer · anyone can see', '2 · 公开层 · 任何人可见')}</legend>
      <label>${T('Title', '标题')}<input type="text" name="title" maxlength="60" required placeholder="${T('A project name, or a name or pen name', '项目名，或者人名、笔名')}"></label>
      <label>${T('One line', '一句话')}<input type="text" name="subtitle" maxlength="120" required placeholder="${T('What it is, or who they are', '它是什么，或者他是谁')}"></label>
      <label>${T('The story', '介绍')}<textarea name="story" rows="5" maxlength="2000" required></textarea></label>
      <label>${T('Links, one per line (optional)', '链接，每行一个（可选）')}<textarea name="links" rows="2" maxlength="600"></textarea></label>
    </fieldset>
    <fieldset><legend>${T('3 · Recognised layer · locked in your browser', '3 · 认可层 · 在你的浏览器里锁好')}</legend>
      <label>${T('A letter for the people you recognise', '写给被认可的人的话')}<textarea name="letter" rows="5" maxlength="4000" required></textarea></label>
      <label>${T('Where something is kept, and who to ask (optional)', '某样东西放在哪、找谁（可选）')}<textarea name="pointer" rows="2" maxlength="600" placeholder="${T('Where, and who to ask. Never passwords or recovery phrases.', '只写在哪、找谁。不要写密码或助记词。')}"></textarea></label>
      <label>${T('Badge they receive (optional)', '他们得到的徽章（可选）')}<input type="text" name="badge" maxlength="40" placeholder="${T('For example: Successor, Student of Ms Lin', '比如：接班人、林老师的学生')}"></label>
    </fieldset>
    <fieldset><legend>${T('4 · Your warden\'s questions', '4 · 给守馆人出题')}</legend>
      <p class="faint">${T('One to three questions only the right people can answer. Keep answers short: a number, a name, one word. Case, spaces and punctuation are ignored. The answers never leave this page; they become the key.', '一到三个只有对的人才答得上的问题。答案要短：一个数字、一个名字、一个词。大小写、空格、标点都不计较。答案不会离开这个页面，它们本身就是钥匙。')}</p>
      <div data-questions></div>
      <button class="btn ghost" type="button" data-add-q>${T('+ Add a question', '+ 再加一题')}</button>
    </fieldset>
    <fieldset><legend>${T('5 · Your email', '5 · 你的邮箱')}</legend>
      <label>${T('Email', '邮箱')}<input type="email" name="email" required autocomplete="email"></label>
      <label class="check"><input type="checkbox" name="consent" required> <span>${T('I am 18 or older. This is mine to share, or I have the consent described above. I understand nobody, including the library, can recover the recognised layer if the answers are forgotten.', '我已满 18 岁。这些内容我有权公开，或已取得上面说的同意。我知道如果忘了答案，包括本馆在内，谁都恢复不了认可层。')}</span></label>
    </fieldset>
    <button class="btn ember" type="submit">${T('Lock and send', '锁好并提交')}</button>
    <p class="feedback" data-wb-msg></p>
  </form>
  <form class="form hidden mt-2" data-wb-code>
    <label>${T('The six-digit code we just emailed you', '刚发到你邮箱的六位验证码')}<input class="code" type="text" inputmode="numeric" maxlength="7" required autocomplete="one-time-code"></label>
    <button class="btn ember" type="submit">${T('Confirm', '确认')}</button>
    <p class="feedback" data-wb-code-msg></p>
  </form>
</div></section>
<section class="block"><div class="wrap grid three">
  <div class="panel reveal"><span class="num">${T('REVIEW', '审核')}</span><h3>${T('A librarian hangs it.', '由馆员挂上墙。')}</h3><p class="muted">${T('We check the public layer only: that it is yours to share and harms nobody. We cannot read the locked layer.', '我们只看公开层：是不是你有权公开的、有没有伤害别人。锁着的那一层我们读不了。')}</p></div>
  <div class="panel reveal"><span class="num">${T('CHANGES', '修改')}</span><h3>${T('Change or take it down.', '随时修改或撤下。')}</h3><p class="muted">${T('Write to the front desk from the same email. Taking it down needs no reason.', '用同一个邮箱联系前台即可。撤下不需要理由。')}</p></div>
  <div class="panel reveal"><span class="num">${T('SEALED LAYER', '封存层')}</span><h3>${T('For things that must wait.', '要等的东西放这里。')}</h3><p class="muted">${T('Anything that should open on a date or only with your keepers is sealed offline with the reading-room tools.', '要到某个日子、或者要开启人一起才能打开的，用阅览室的工具离线封存。')}</p><a href="${href(lang, 'reading-room')}">${T('Reading Room →', '去阅览室 →')}</a></div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'stacks',
  title: { en: 'Closed Stacks', zh: '闭架书库' },
  description: { en: 'The sealed layer: an Ice Core is a file you seal on your own machine and open later, with your keepers or on a date.', zh: '封存层：冰芯是你在自己电脑上封存、以后再打开的档案，需要开启人一起，或到约定的日子。' },
  image: '/assets/img/hero-stacks.jpg',
  render: (lang) => {
    const T = t(lang);
    const sections = lang === 'zh'
      ? ['0 先读这里', '1 该找谁', '2 项目与交接', '3 账户（只写平台官方的托管和继承流程）', '4 东西放在哪、找谁', '5 心愿和它们的时效', '6 信件索引', '7 公开文集（愿意公开的）', '8 我不想要的', '9 给守馆人的规矩']
      : ['0 Read this first', '1 Who to call', '2 Projects and handover', '3 Accounts (official platform routes only)', '4 Where things are, and who to ask', '5 Wishes and how long they bind', '6 Letters index', '7 Open Stacks (what may be public)', '8 What I do not want', '9 Rules for wardens'];
    return `${pageHero({ lang, slug: 'stacks', title: T('Closed Stacks', '闭架书库'), lede: T('The sealed layer. An Ice Core is a file you write and seal on your own machine, for later: a time capsule, letters for a date, notes your keepers open together. It never sits on our shelves.', '封存层。冰芯是你在自己电脑上写好、封存、留给以后的档案：一个时间胶囊、约好日子才拆的信、要开启人一起打开的交代。它从不放在我们的架子上。'), image: 'hero-stacks', alt: T('Rows of card-catalogue cabinets in a cold archive', '冷库里一排排卡片目录柜') })}
<section class="block"><div class="wrap split">
  <div class="reveal">
    ${sectionHead(T('Contents', '内容'), T('Ten short sections.', '十个短章节。'), T('Written for the people and the wardens who will act on it.', '写给将来照着它办事的人和守馆人看。'))}
    <ul class="clean">${sections.map((s) => `<li><span class="mark">${esc(s.split(' ')[0])}</span><span>${esc(s.slice(s.indexOf(' ') + 1))}</span></li>`).join('')}</ul>
  </div>
  <div class="reveal">
    <div class="label"><span class="dot"></span>${T('On disk', '文件结构')}</div>
<pre class="mt-1">my-core/                ${T('# never share this folder', '# 这个文件夹不要给任何人')}
  COVER.md              ${T('# public, printable', '# 公开，可打印')}
  core/
    COLDLIBRARY.md      ${T('# for people and wardens', '# 给人和守馆人读')}
    core.json           ${T('# machine-checkable', '# 机器可校验')}
  letters/
    001.md
sealed/                 ${T('# what you hand over', '# 交出去的部分')}
  COVER.md
  core.age
  letters/001.age
  MANIFEST.json</pre>
    <p class="muted mt-1">${T('The tools never delete your plaintext. When the seal checks out, you remove it yourself.', '工具从不删除你的明文。核对封存无误后，由你自己删掉。')}</p>
  </div>
</div></section>
<section class="block"><div class="wrap">
  ${sectionHead(T('Cover and core', '封面与正文'), T('One page anyone may read. Everything else sealed.', '一页谁都能读，其余全部封存。'))}
  <div class="grid two">
    ${card({ acc: 'COVER.md', title: T('The cover', '封面'), fields: [[T('Says', '写明'), T('This is a Cold Library cover. It is not a legal will.', '这是冷冻图书馆的封面，不是法律遗嘱。')], [T('Opening', '开启'), T('2 of 3 keepers, or a date', '3 位开启人中的 2 位，或者某个日子')], [T('Box held by', '箱子在'), T('somewhere other than the keys', '和钥匙分开放')], [T('Never', '从不写'), T('names, assets, accounts', '人名、资产、账户')]], stamp: T('Public', '公开'), stampClass: 'ice' })}
    ${card({ acc: 'core.age', title: T('The core', '正文'), fields: [[T('Holds', '内含'), 'COLDLIBRARY.md · core.json'], [T('Cipher', '加密'), 'age · scrypt'], [T('Key', '钥匙'), T('256-bit, split with SLIP-39', '256 位，用 SLIP-39 拆分')], [T('Never', '从不写'), T('passwords, recovery phrases, amounts', '密码、助记词、金额')]], stamp: T('Sealed', '已封存') })}
  </div>
</div></section>
<section class="block tight"><div class="wrap narrow reveal">
  <div class="notice warn"><strong>${T('Pointers only.', '只写指向。')}</strong> ${T('Write where something is and who knows what to do. Never amounts, never passwords, never recovery phrases. A file with amounts becomes a treasure map, and treasure maps attract the wrong visitors.', '只写东西在哪、谁知道该怎么办。不写金额、不写密码、不写助记词。写了金额的档案就成了藏宝图，会招来不该来的人。')}</div>
  <div class="btns"><a class="btn" href="${href(lang, 'reading-room')}">${T('Get the tools', '取工具')}</a><button class="btn ghost" type="button" data-borrow data-msg="${T('The Closed Stacks do not lend. Not even to us.', '闭架书库不外借。对我们自己也不。')}">${T('Borrow', '借阅')}</button><a class="btn ghost" href="${REPO}/tree/main/spec/v0.1/examples">${T('See a fictional example', '看一个虚构的例子')}</a></div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'harbour',
  title: { en: 'The Cold Harbour', zh: '冷港' },
  description: { en: 'When sealed things are opened, and by whom: on a date, by your keepers together, or after a long silence with time to say no.', zh: '封存的东西什么时候打开、由谁打开：到某个日子、开启人一起，或者长时间没有音讯，并且留出叫停的时间。' },
  image: '/assets/img/harbour.jpg',
  render: (lang) => {
    const T = t(lang);
    const ways = [
      [T('On a date', '到某个日子'), T('A time capsule. A letter for a birthday in 2040. Nothing opens early.', '时间胶囊。写给 2040 年某个生日的信。日子不到，谁也打不开。'), T('A time-lock layer, or a custodian who holds it until then', '加一道时间锁，或交给保管方到期再给')],
      [T('Keepers together', '开启人一起'), T('Two of three keepers meet and open it, for a reason you wrote down.', '三位开启人中的两位凑在一起，按你写下的理由打开。'), T('2 of 3 keepers', '3 位开启人中的 2 位')],
      [T('After a long silence', '长时间没有音讯'), T('If you stop checking in, your keepers confirm, wait, and open in stages, starting with practical things only.', '如果你很久没有回来报到，开启人确认、等待，再分阶段打开，先只打开实务性的部分。'), T('Silence period, two keepers, veto window', '静默期、两位开启人确认、否决期')],
    ];
    return `${pageHero({ lang, slug: 'harbour', title: T('The Cold Harbour', '冷港'), lede: T('In Old English, a cold harbour was a cold shelter: a roof in the open, somewhere to wait out the weather. Here it is where sealed things wait until it is their time to leave.', '在古英语里，"冷港"的意思是一处冷的庇护所：野外的一片屋顶，让人在那里等风雪过去。在这里，它是封存的东西停靠的地方，等时候到了再出发。'), image: 'harbour', alt: T('A small wooden shelter with one lit window on a frozen harbour at blue hour', '蓝调时分冰封港湾边一间亮着一扇窗的小木屋') })}
<section class="block"><div class="wrap">
  ${sectionHead(T('Departures', '出发方式'), T('Three ways a sealed thing can open.', '封存的东西有三种打开方式。'))}
  <div class="catalog">${ways.map(([s, what, cond], i) => card({ acc: `B2-0${i + 1}`, title: s, fields: [[T('What', '是什么'), what], [T('Needs', '条件'), cond]] })).join('')}</div>
</div></section>
<section class="block"><div class="wrap">
  ${sectionHead(T('After a long silence', '长时间没有音讯'), T('Silence, reminder, confirmation, veto.', '静默、提醒、确认、否决。'), T('Defaults below. You can change them in your own file.', '下面是默认值，你可以在自己的文件里改。'))}
  <div class="steps reveal">
    <div class="step"><h3>${T('Silence', '静默')}</h3><p>${T('Six months with no signed check-in. Choose anything from three to eighteen.', '六个月没有签名报到。可以设成三到十八个月。')}</p></div>
    <div class="step"><h3>${T('Reminder', '提醒')}</h3><p>${T('Thirty days before, in neutral words.', '提前三十天提醒，措辞平常，不惊动人。')}</p></div>
    <div class="step"><h3>${T('Confirm', '确认')}</h3><p>${T('Two of three keepers confirm independently, after calling you and an emergency contact.', '三位开启人中的两位各自确认，在此之前要先给你和紧急联系人打电话。')}</p></div>
    <div class="step"><h3>${T('Veto', '否决')}</h3><p>${T('Twenty-eight days in which you or any keeper can stop it. One check-in from you cancels everything still pending.', '二十八天里，你或任何一位开启人都可以叫停。你只要报到一次，所有没走完的流程都会撤回。')}</p></div>
  </div>
</div></section>
<section class="block"><div class="wrap grid two">
  <div class="panel reveal"><span class="num">${T('IF IT GOES WRONG', '如果出了错')}</span><h3>${T('The misfire plan', '误触发预案')}</h3><p class="muted">${T('What has been opened cannot be closed again. So the first stage opens nothing personal. If a letter goes out by mistake, the keeper you named in advance contacts the recipient, apologises, and asks them to delete it.', '打开过的东西关不回去。所以第一阶段不打开任何私人内容。万一误发了信，由你事先指定的那位开启人联系收件人，道歉，并请对方删除。')}</p></div>
  <div class="panel reveal"><span class="num">${T('NOTICES', '通知')}</span><h3>${T('Our notices are boring on purpose.', '我们的通知故意写得很无聊。')}</h3><p class="muted">${T('A Cold Library notice never contains a link, never asks for money, never asks you to type or download anything. If a message claiming to be from us does any of these, it is not from us.', '冷冻图书馆的通知从不带链接，从不要钱，从不让你输入或下载任何东西。如果一封自称来自我们的消息做了其中任何一件事，它就不是我们发的。')}</p></div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'keepers',
  title: { en: 'Key Room', zh: '钥匙房' },
  description: { en: 'The sealed layer\'s key is split among people you trust. No single person can open anything.', zh: '封存层的钥匙被拆成几份，交给你信任的人。任何一个人单独都打不开。' },
  render: (lang) => {
    const T = t(lang);
    const custodians = [
      [T('A notary', '公证处'), T('Holds the sealed box and hands it over on agreed conditions. Has no key.', '保管封好的箱子，满足约定条件才交出来。手里没有钥匙。'), T('Ask first whether they accept encrypted media, and on what terms.', '先问清楚收不收加密介质，按什么条件交付。')],
      [T('Your own account', '你自己的账户'), T('The box sits in your cloud drive or mailbox. The platform\'s own inactive-account tool shares it with your contact.', '箱子放在你自己的网盘或邮箱里，由平台自带的"账户不活动"机制分享给你指定的联系人。'), T('Platform rules change. Check them once a year.', '平台规则会变，每年核对一次。')],
      [T('A time-lock layer', '时间锁'), T('An extra layer nobody can open before a set date.', '再套一层锁，约定日期之前谁都打不开。'), T('Depends on an outside network. Use it as an extra layer, not the only one.', '依赖外部网络，只能当附加层，不能当唯一一层。')],
      [T('Keepers only', '只交给开启人'), T('Keepers hold both the shares and the box.', '开启人同时拿着份额和箱子。'), T('Any two can open at any time. Waiting periods become promises between people.', '凑够两人就能随时打开，等待期只是人与人之间的约定。')],
    ];
    return `${pageHero({ lang, slug: 'keepers', title: T('Key Room', '钥匙房'), lede: T('The key to your sealed layer is split into shares. No single person can open anything. It takes two of three, or whatever number you choose, and the box itself is kept somewhere else.', '封存层的钥匙被拆成几份。任何一个人单独都打不开。默认要三份中的两份，人数你自己定；箱子本身则放在别处。'), image: 'reading-room', alt: T('A sealed box on a long table between two lamps', '两盏台灯之间，长桌上放着一个封好的盒子') })}
<section class="block"><div class="wrap split">
  <div class="reveal">
    ${sectionHead(T('Keepers', '开启人'), T('Choose people, not passwords.', '选人，不是选密码。'))}
    <ul class="clean">
      <li><span class="mark">01</span><span>${T('Three is a good number: someone technical, someone from your family, and someone who lives elsewhere.', '三个人比较合适：一位懂技术的，一位家人，一位住在别处的人。')}</span></li>
      <li><span class="mark">02</span><span>${T('Each keeper agrees first, and may step down at any time.', '每位开启人都要先同意，也随时可以退出。')}</span></li>
      <li><span class="mark">03</span><span>${T('A share lives on paper or steel. Never photographed, never sent in a chat app.', '份额写在纸上或刻在钢板上。不拍照，不发到任何聊天软件。')}</span></li>
      <li><span class="mark">04</span><span>${T('Once a year, each keeper checks their own share alone.', '每年一次，开启人各自单独核对自己那一份。')}</span></li>
    </ul>
  </div>
  ${img('drawers', T('A catalogue drawer with frost on its brass label holder', '铜标签框上结了霜的目录抽屉'), 'figure tall', T('Drawer 78 · temperature holding', '78 号抽屉 · 温度稳定'))}
</div></section>
<section class="block"><div class="wrap">
  ${sectionHead(T('Custodians', '保管方'), T('Who holds the box.', '箱子交给谁。'), T('Keeping the key and the box apart is the whole trick.', '钥匙和箱子分开放，这就是全部的诀窍。'))}
  <div class="catalog">${custodians.map(([n, d, limit], i) => card({ acc: `K-0${i + 1}`, title: n, fields: [[T('How', '方式'), d], [T('Limit', '局限'), limit]], stamp: i === 3 ? T('Read twice', '看两遍') : '' })).join('')}</div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'continuance',
  title: { en: 'Department of Continuance', zh: '传承科' },
  description: { en: 'How a will is carried on without ruling anyone: binding, then advisory, then carried on.', zh: '意志怎样传下去，而不去管束任何人：先照办，再参考，最后传承。' },
  render: (lang) => {
    const T = t(lang);
    return `${pageHero({ lang, slug: 'continuance', title: T('Department of Continuance', '传承科'), lede: T('A will lasts longest when it does not try to rule. First people do what you asked. Later they weigh it as advice. In the end it becomes something carried on: a way of working, a saying in the family, the spirit of a project.', '意志想要走得远，就不能去管束人。一开始，大家照你说的做；过几年，大家把它当建议来掂量；最后，它变成被传下去的东西：一种做事的方式、家里的一句老话、一个项目的精神。'), image: 'lake-dawn', alt: T('A still lake reflecting snow mountains at dawn', '清晨静止的湖面倒映着雪山') })}
<section class="block"><div class="wrap">
  ${halflife(lang)}
</div></section>
<section class="block"><div class="wrap grid three">
  <div class="panel reveal"><span class="num">0–2 ${T('YEARS', '年')}</span><h3>${T('Binding', '照办')}</h3><p class="muted">${T('Do what it says, unless the law or safety says otherwise.', '照着做，除非法律或安全另有要求。')}</p></div>
  <div class="panel reveal"><span class="num">2–10 ${T('YEARS', '年')}</span><h3>${T('Advisory', '参考')}</h3><p class="muted">${T('Weigh it as advice from someone who cared. The living decide.', '把它当作一个在乎你的人留下的建议来掂量。决定权在活着的人手里。')}</p></div>
  <div class="panel reveal"><span class="num">10+ ${T('YEARS', '年')}</span><h3>${T('Carried on', '传承')}</h3><p class="muted">${T('Quoted, remembered, built upon, never enforced. Wardens keep quoting it, with the date, for as long as the exhibit stands.', '被引用、被记住、被接着往下做，但不再被强制。只要展位还在，守馆人就会一直引用它，并注明日期。')}</p></div>
</div></section>
<section class="block"><div class="wrap split">
  <div class="reveal">
    ${sectionHead(T('Asymmetry', '不对称'), T('Publishing is hard. Letting go is easy.', '公开很难，放下很容易。'))}
    <p class="lede">${T('Kafka asked his friend to burn his manuscripts. The friend refused, and we have The Trial. A default cannot count on that kind of luck. So making something public needs the most care: your consent item by item, a cooling period, two keepers. Letting go of something purely private needs the least.', '卡夫卡让朋友烧掉手稿，朋友没照做，我们才有了《审判》。默认规则不能指望这种好运。所以"公开"要最谨慎：逐项经你同意、有冷静期、两位开启人签字；"放下纯属私人的东西"门槛最低。')}</p>
  </div>
  <div class="reveal">${card({ acc: 'CT-RULE-4', title: T('Rule for wardens', '给守馆人的规矩'), fields: [[T('Must', '必须'), T('Name the stage and cite the source, every time.', '每次都标出所处阶段，注明出处。')], [T('Example', '示例'), T('In March 2026 they wrote: “…” (exhibit notes · advisory)', '他在 2026 年 3 月写道："……"（展位附言 · 参考）')], [T('Never', '不得'), T('Speak in the first person. Decide for anyone.', '用第一人称说话；替任何人做决定。')]], stamp: T('Filed', '已归档') })}</div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'open-stacks',
  title: { en: 'Open Stacks', zh: '公开文集' },
  description: { en: 'Writing that people chose, item by item, to leave in the open.', zh: '人们逐项同意后公开留下的文字。' },
  render: (lang, ctx) => {
    const T = t(lang);
    const items = ctx.stacks.map((s) => card({ acc: s.accession, title: `<a href="${href(lang, 'open-stacks/' + s.slug)}">${esc(s[lang].title)}</a>`, fields: [[T('Author', '作者'), esc(s[lang].author)], [T('Shelved', '上架'), esc(s[lang].date)]], body: `<p class="mt-1">${esc(s[lang].excerpt)}</p>`, stamp: T('Open', '公开') })).join('');
    return `${pageHero({ lang, slug: 'open-stacks', title: T('Open Stacks', '公开文集'), lede: T('Some things are worth leaving where anyone can read them: a lesson, a letter to strangers, the one thing worth passing on. Everything on these shelves was put here by its author.', '有些东西值得留在谁都能读到的地方：一个教训、一封写给陌生人的信、一件值得传下去的事。这些书架上的每一样，都是作者自己放上来的。') })}
<section class="block"><div class="wrap">
  ${sectionHead(T('Shelf', '书架'), T('Recently shelved.', '最近上架。'))}
  <div class="catalog">${items}</div>
</div></section>
<section class="block"><div class="wrap grid three">
  <div class="panel reveal"><span class="num">01</span><h3>${T('How to shelve', '怎么上架')}</h3><p class="muted">${T('Open a pull request with your text and your consent line. A librarian files it and gives it a number.', '提交一个 pull request，附上文字和你的同意声明。馆员会登记并编号。')}</p><a href="${REPO}/tree/main/catalog/open-stacks">${T('The shelf on GitHub →', 'GitHub 上的书架 →')}</a></div>
  <div class="panel reveal"><span class="num">02</span><h3>${T('How to withdraw', '怎么撤回')}</h3><p class="muted">${T('Ask, and it comes down. No reasons needed. Copies others made are beyond our reach, and we say so plainly.', '提出就撤下，不需要理由。别人已经做的副本我们管不到，这一点我们直说。')}</p></div>
  <div class="panel reveal"><span class="num">03</span><h3>${T('Other people', '涉及他人')}</h3><p class="muted">${T('If a text names you or hurts you, tell a librarian. Third parties are anonymised, and objections are heard.', '如果某篇文字提到了你或伤害了你，请告诉馆员。涉及第三方的信息会去标识化，异议会被认真对待。')}</p></div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'reading-room',
  title: { en: 'Reading Room', zh: '阅览室' },
  description: { en: 'Tools to write, seal, check and open, on your own machine.', zh: '在你自己的电脑上整理、封存、核对、开启的工具。' },
  image: '/assets/img/lake-reading.jpg',
  render: (lang) => {
    const T = t(lang);
    return `${pageHero({ lang, slug: 'reading-room', title: T('Reading Room', '阅览室'), lede: T('Everything here runs on your own machine. Nothing you type reaches us. The sealing tools are not audited yet: try them on something small before you trust them with anything that matters.', '这里的一切都在你自己的电脑上运行，你输入的任何东西都不会到我们这里。封存工具还没有经过安全审计：先拿小东西试，再决定要不要托付重要的。'), image: 'reading-room', alt: T('A long table with two brass lamps and a window onto a snowy plain at dusk', '黄昏时分，长桌上两盏铜台灯，窗外是雪原') })}
<section class="block"><div class="wrap grid three">
  <div class="panel ice-edge reveal"><span class="num">${T('NO AI', '不用 AI')}</span><h3>${T('Printed questionnaire', '纸质问卷')}</h3><p class="muted">${T('Thirty questions on paper about what you want kept and carried on. The calmest way to start.', '三十道题，写在纸上：你想留下什么、想传下去什么。最从容的开始方式。')}</p><a href="${REPO}/blob/main/skills/exit-interview/${lang === 'zh' ? 'questionnaire.zh.md' : 'questionnaire.en.md'}">${T('Open the questionnaire →', '打开问卷 →')}</a></div>
  <div class="panel ice-edge reveal"><span class="num">${T('YOUR AI', '你自己的 AI')}</span><h3>${T('Inventory interview skill', '整理谈话技能')}</h3><p class="muted">${T('Give this skill to the assistant you already use. It asks, it outlines, it never writes in your voice.', '把这个技能交给你正在用的 AI 助手。它负责提问和列提纲，从不用你的口吻写。')}</p><a href="${REPO}/blob/main/skills/exit-interview/SKILL.md">${T('Read the skill →', '查看技能 →')}</a></div>
  <div class="panel ice-edge reveal"><span class="num">CLI</span><h3>${T('Command-line tool', '命令行工具')}</h3><p class="muted">${T('Seal, split, check and open the sealed layer, with the age and SLIP-39 reference implementations underneath.', '封存、拆分、核对、开启封存层。底层用的是 age 和 SLIP-39 的参考实现。')}</p><a href="${REPO}/tree/main/cli">${T('Install the tool →', '安装工具 →')}</a></div>
</div></section>
<section class="block"><div class="wrap split">
  <div class="reveal">
    ${sectionHead(T('At the desk', '在桌前'), T('Six commands.', '六个命令。'))}
<pre>python3 -m pip install ./cli

coldlibrary init my-core        ${T('# start a workspace', '# 新建工作区')}
coldlibrary validate my-core    ${T('# check before sealing', '# 封存前检查')}
coldlibrary seal my-core \\
  --threshold 2 --shares 3      ${T('# encrypt and split', '# 加密并拆分钥匙')}
coldlibrary check-share         ${T('# a keeper checks one share', '# 开启人核对自己那一份')}
coldlibrary verify sealed       ${T('# compare against MANIFEST', '# 对照 MANIFEST 校验')}
coldlibrary open sealed \\
  --share-file a --share-file b ${T('# two keepers, together', '# 两位开启人一起开启')}</pre>
  </div>
  <div class="reveal">
    <div class="notice warn"><strong>${T('A seven-day cooling period.', '七天冷静期。')}</strong> ${T('The first seal waits seven days after you start. Things written in a hurry deserve a second look.', '从开始写到第一次封存，中间要等七天。匆忙写下的东西，值得再看一遍。')}</div>
    <div class="notice mt-1">${T('Exact cryptography, file formats and every field are in the specification. If this page and the spec disagree, the spec wins.', '加密细节、文件格式和每一个字段都写在规范里。如果这一页和规范说法不一致，以规范为准。')} <a href="${REPO}/blob/main/spec/v0.1/${lang === 'zh' ? 'SPEC.zh.md' : 'SPEC.md'}">${T('Read the spec →', '阅读规范 →')}</a></div>
  </div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'librarians',
  title: { en: 'Register of Librarians', zh: '馆员名册' },
  description: { en: 'Librarians hang exhibits, review applications, look after wardens and translate. Numbers are unique and not given out in order.', zh: '馆员负责布展、审核申请、照看守馆人、做翻译。编号独一无二，不按注册顺序发放。' },
  render: (lang) => {
    const T = t(lang);
    const oath = lang === 'zh'
      ? ['我不保管别人的钥匙。', '我从不独自开箱。', '我转述原话，不替任何人说话。', '我不以此收钱。', '我每年回来看一眼。', '我尊重活着的人。', '我帮东西被记住，也帮它们安放。']
      : ['I hold no one\'s keys.', 'I never open a box alone.', 'I quote. I never speak for anyone.', 'I take no money for this.', 'I come back once a year to look.', 'I defer to the living.', 'I help things be remembered, and help them rest.'];
    return `${pageHero({ lang, slug: 'librarians', image: 'mountain-station', alt: T('A small station with one lit window on a snowy ridge under the aurora', '极光下雪山脊上一座亮着一扇窗的小站'), title: T('Register of Librarians', '馆员名册'), lede: T('Librarians keep this place. They hang exhibits, review applications, look after the wardens and translate. Each has a number. Numbers are not given out in order, and short or memorable ones are held back for events and contributors.', '馆员照看这个地方：布展、审核申请、照看守馆人、做翻译。每人有一个编号。编号不按注册顺序发放，短号和好记的号码留给活动和贡献者。') })}
<section class="block"><div class="wrap split">
  <div class="reveal">
    ${sectionHead(T('The register', '名册'), T('On duty.', '在岗。'))}
    <table class="register" data-register data-lang="${lang}">
      <thead><tr><th>${T('Number', '编号')}</th><th>${T('Name', '名字')}</th><th>${T('Since', '入馆')}</th></tr></thead>
      <tbody><tr><td class="no">No. 1</td><td class="name">${T('Founding Librarian', '创始馆员')}</td><td>2026-10-04</td></tr></tbody>
    </table>
    <p class="faint mt-1" data-register-note>${T('Only librarians who chose to be listed appear here, by pen name.', '这里只显示同意公开的馆员，用的是笔名。')}</p>
    <details class="panel mt-2" data-leave>
      <summary class="label">${T('Leave the register', '退出名册')}</summary>
      <p class="muted mt-1">${T('We send a code to your email. Once you enter it, your email is deleted and your number is retired, never to be reused.', '我们会给你的邮箱发一个验证码。输入后，你的邮箱会被删除，编号会被注销，永不复用。')}</p>
      <form class="form" data-leave-email><label>${T('Email', '邮箱')}<input type="email" required autocomplete="email"></label><button class="btn ghost" type="submit">${T('Send code', '发送验证码')}</button></form>
      <form class="form hidden mt-1" data-leave-code><label>${T('Code', '验证码')}<input class="code" type="text" inputmode="numeric" maxlength="7" required autocomplete="one-time-code"></label><button class="btn ember" type="submit">${T('Leave the register', '确认退出')}</button></form>
      <p class="feedback faint mt-1" data-leave-msg></p>
    </details>
  </div>
  <div class="reveal">
    <div class="panel ember-edge">
      <span class="num ember-text">${T('ORIENTATION', '入职')}</span>
      <h3>${T('One minute. No test. One oath.', '一分钟，不考试，一段誓词。')}</h3>
      <p class="muted">${T('Give a name or stay anonymous, pick a desk, take the oath, and get a card with your number. We keep your email only to send you a code and the occasional notice from the front desk. Our emails never contain links.', '留个名字或者匿名，挑一张桌子，念一遍誓词，领一张带编号的馆员证。你的邮箱只用来发验证码，以及前台偶尔的通知。我们的邮件从不带链接。')}</p>
      <a class="btn ember mt-1" href="${href(lang, 'librarians/join')}">${T('Get a librarian card', '领一张馆员证')}</a>
    </div>
  </div>
</div></section>
<section class="block"><div class="wrap grid two">
  <div class="panel reveal"><span class="num">${T('OFFICE OF NUMBERS', '馆员编号处')}</span><h3>${T('Numbers follow no pattern.', '编号没有规律。')}</h3><p class="muted">${T('Numbers are issued at random between 100000 and 999999. Everything below 100000 and every memorable number is locked in a cabinet for events and contributors: repeated digits, runs, mirrors, round numbers, and numbers that mean something here, such as 78, 520, 1004 and 2114. Reserved numbers cannot be sold, traded or transferred, and they carry no authority. A retired number is never issued again.', '编号在 100000 到 999999 之间随机发放。100000 以下的号码和所有好记的号码都锁在柜子里，留给活动和贡献者：重复数、顺子、回文、整数，以及在本馆有含义的数字，比如 78、520、1004、2114。靓号不能买卖、交换或转让，也不代表任何权限。注销的编号永不再发。')}</p></div>
  <div class="panel reveal"><span class="num">${T('CALENDAR', '馆历')}</span><h3>${T('Observances', '馆内节日')}</h3>
    <dl class="kv">
      <dt>03-31</dt><dd>${T('Duplicate Day. Keepers check that their share still exists.', '复本日：开启人确认自己那一份还在、还找得到。')}</dd>
      <dt>${T('Qingming', '清明')}</dt><dd>${T('Lamp Day. Visit a plaque you care about. Look at your own exhibit once.', '点灯日：去看看你在乎的那块铭牌，也回来看一眼自己的展位。')}</dd>
      <dt>05-20</dt><dd>${T('Keeper Day. Thank someone who holds a share for you.', '开启人日：谢谢那位替你保管一份钥匙的人。')}</dd>
      <dt>10-04</dt><dd>${T('Founding Day. The front desk stays empty, as usual.', '建馆日：前台照常没有人。')}</dd>
      <dt>${T('Solstice', '冬至')}</dt><dd>${T('Warm Room Day. The longest night; the whole building turns warm. Call someone. Do not mention the stacks.', '暖房日：一年中最长的夜，整座楼变暖。给一个人打个电话，不谈书库，只问好。')}</dd>
      <dt>12-31</dt><dd>${T('Tidy-up Day. Update your exhibit; retire what you no longer mean.', '整理日：更新你的展位，把不再适用的嘱托撤下来。')}</dd>
    </dl>
  </div>
</div></section>
<section class="block"><div class="wrap split">
  <div class="reveal">
    ${sectionHead(T('The oath', '誓词'), T('Seven lines.', '七句话。'))}
    <ul class="clean">${oath.map((l, i) => `<li><span class="mark">0${i + 1}</span><span>${esc(l)}</span></li>`).join('')}</ul>
  </div>
  <div class="reveal">
    ${sectionHead(T('Ranks', '等级'), T('Rank records what you did. It grants no power.', '等级只记录你做过什么，不给任何权限。'))}
    <dl class="kv">
      <dt>${T('Librarian', '馆员')}</dt><dd>${T('Finished orientation, took the oath, received a number.', '完成入职，念过誓词，领到编号。')}</dd>
      <dt>${T('Docent', '导览员')}</dt><dd>${T('Helped someone hang an exhibit or a plaque, confirmed by that person. Never paid, never pushed.', '帮别人挂上过一个展位或一块铭牌，并由对方确认。从不收钱，从不催促。')}</dd>
      <dt>${T('Warden-keeper', '守馆人照看员')}</dt><dd>${T('Looks after wardens: tests them, reports where they quote badly.', '照看守馆人：测试它们，报告哪里引用得不对。')}</dd>
      <dt>${T('Conservator', '修缮员')}</dt><dd>${T('Code, docs, translation, design, accessibility or a security report accepted into the project.', '代码、文档、翻译、设计、无障碍改进或安全报告被项目采纳。')}</dd>
      <dt>${T('Steward of the Stacks', '馆务托管人')}</dt><dd>${T('A long-standing conservator. Keeps the rules; gives no orders.', '长期的修缮员。负责守规矩，不负责发号施令。')}</dd>
    </dl>
    <p class="faint mt-1">${T('Badges, not ranks: Night Warden (a responsible security disclosure) · Interpreter (a translation) · Lamplighter (lit lamps on ten plaques they were recognised at). No rank can open anyone else\'s layers, the founder\'s included.', '徽章不算等级：守夜人（负责任地披露过安全问题）· 译员（贡献过一种语言的翻译）· 点灯人（在十块认可过自己的铭牌前点过灯）。任何等级都打不开别人的认可层和封存层，创始馆员也不例外。')}</p>
  </div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'librarians/join',
  title: { en: 'Orientation', zh: '入职' },
  description: { en: 'Librarian orientation: a name, a desk, the oath, your number. About a minute, no test.', zh: '馆员入职：留个名字，挑张桌子，念誓词，领编号。大约一分钟，不考试。' },
  render: (lang) => {
    const T = t(lang);
    return `<section class="page-hero"><div class="wrap">
  <div class="floor-big"><span class="floor">7</span>${T('Floor', '楼层')} · ${T('Orientation room', '入职室')}</div>
  <h1>${T('Orientation', '入职')}</h1>
  <p class="lede">${T('Please take a seat. The lights are low on purpose.', '请坐。灯故意调得很暗。')}</p>
</div></section>
<section class="block"><div class="wrap narrow">
  <noscript><div class="notice warn">${T('Orientation needs JavaScript. Everything else on this site works without it.', '入职需要开启 JavaScript。网站其他部分不需要。')}</div></noscript>
  <div class="terminal" id="orientation" data-lang="${lang}">
    <div class="t-head"><span>${T('Cold Library · Orientation Terminal 07', '冷冻图书馆 · 07 号入职终端')}</span><span data-o-step>01/04</span></div>
    <div data-o-screen></div>
  </div>
  <div class="libcard-wrap mt-3 hidden" data-card-wrap>
    <canvas class="libcard" width="1200" height="750" data-libcard></canvas>
    <div class="btns mt-0"><a class="btn" data-card-download download="cold-library-card.png" href="#">${T('Save card as PNG', '保存馆员证')}</a><a class="btn ghost" href="${href(lang, 'librarians')}">${T('To the register', '去名册')}</a></div>
  </div>
  <p class="faint mt-3">${T('Privacy: we store your email, pen name, number and the date. Nothing else. You can leave the register at any time; your number is retired and never reused.', '隐私：我们只保存你的邮箱、笔名、编号和日期，别的都不存。你随时可以离开名册，你的编号会被注销，永不复用。')}</p>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'ledger',
  title: { en: 'Ledger Room', zh: '账本室' },
  description: { en: 'Every cost, what we store, the shutdown plan, and what "perpetual" honestly means.', zh: '每一笔开支、我们存了什么、停运方案，以及"永续"老实说是什么意思。' },
  render: (lang) => {
    const T = t(lang);
    const rows = [
      [T('Funding', '资金来源'), T('The founding librarian, personally', '创始馆员个人出资')],
      [T('Investors', '投资人'), T('None, by rule', '没有，这是规矩')],
      [T('Sponsors from brokers, exchanges, funeral homes, insurers', '券商、交易所、殡葬、保险机构的赞助'), T('Refused, by rule', '一律拒绝，这是规矩')],
      [T('Price of an exhibit or a plaque', '展位或铭牌的价格'), T('Free', '免费')],
      [T('Domain', '域名'), T('coldlibrary.com · about US$10 a year', 'coldlibrary.com · 每年约 10 美元')],
      [T('Hosting and database', '托管和数据库'), T('Static pages and one small service, expected under US$5 a month', '静态页面加一个很小的服务，预计每月不到 5 美元')],
      [T('Annual operating cap', '年度运营上限'), T('CNY 20,000. Above it, features are cut.', '人民币 2 万元，超过就砍功能。')],
      [T('Tools audited', '工具是否审计'), T('Not yet', '还没有')],
      [T('Spec version', '规范版本'), 'v0.1'],
    ];
    return `${pageHero({ lang, slug: 'ledger', title: T('Ledger Room', '账本室'), lede: T('A library that asks for trust should show its books. Every cost is written here, and so is the plan for the day we cannot go on.', '一座要别人信任的图书馆，应该把账本摊开。每一笔开支都写在这里，我们做不下去那一天的安排也写在这里。') })}
<section class="block"><div class="wrap split">
  <div class="reveal">${rows.map(([k, v]) => `<div class="ledger-row"><span>${k}</span><span>${v}</span></div>`).join('')}
    <div class="panel mt-2"><span class="num">${T('PERPETUAL, HONESTLY', '永续，老实说')}</span><h3>${T('What “perpetual” means here.', '这里说的"永续"是什么意思。')}</h3><p class="muted">${T('Not a promise that a server runs forever. It means: the format is open, every exhibit and plaque can be exported and printed, the code is free to copy, librarians take over from each other, and copies are archived outside this site. As long as someone cares, it stays.', '不是承诺某台服务器永远开着。它的意思是：格式开放，每个展位和铭牌都能导出、能打印，代码谁都能复刻，馆员一代接一代地接班，副本存在本站之外。只要有人照看，它就一直在。')}</p></div>
  </div>
  <div class="reveal">
    <div class="panel"><span class="num">${T('IF WE CLOSE', '如果我们关门')}</span><h3>${T('The shutdown protocol', '停运协议')}</h3>
      <ul class="dash muted">
        <li>${T('At least twelve months of notice.', '至少提前十二个月公告。')}</li>
        <li>${T('Every owner receives their exhibit or plaque as files, still locked as before.', '每位主人都会收到自己展位或铭牌的完整文件，锁着的部分照旧锁着。')}</li>
        <li>${T('The spec and the code stay public, free to fork.', '规范和代码永远公开，任何人都可以复刻。')}</li>
        <li>${T('The domain passes to a named successor, or points to an archive.', '域名交给指定的继任者，或者指向一个存档。')}</li>
        <li>${T('The register is then deleted.', '最后删除名册数据。')}</li>
      </ul>
    </div>
    <div class="panel mt-2"><span class="num">${T('WHAT WE STORE', '我们存了什么')}</span><h3>${T('Stored, and not stored.', '存了什么，没存什么。')}</h3>
      <dl class="kv">
        <dt>${T('Stored', '存了')}</dt><dd>${T('Librarians: email, pen name, number, language, listed or not, dates. Exhibits and plaques: the public layer, the recognised layer as ciphertext we cannot read, the warden\'s questions, lamps and the notes left with them. A salted hash of your network address for one day, to stop abuse.', '馆员：邮箱、笔名、编号、语言、是否公开、日期。展位和铭牌：公开层、我们读不了的认可层密文、守馆人的问题、灯和留言。另外，为了防滥用，把你的网络地址加盐散列后保存一天。')}</dd>
        <dt>${T('Never stored', '从不保存')}</dt><dd>${T('The answers to warden questions, keys, shares, sealed files, funds, cookies, analytics. Cold Vaults are your own contracts on a public chain; we hold nothing in them.', '守馆人问题的答案、钥匙、份额、封存的文件、资金、Cookie、统计数据。冷库是你自己在公链上的合约，我们在里面什么都不持有。')}</dd>
      </dl>
    </div>
  </div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'rules',
  title: { en: 'House Rules', zh: '馆规' },
  description: { en: 'What Cold Library will never do: hold keys, read your locked layers, speak as anyone, ask for money in a notice, or pretend to be a legal will.', zh: '冷冻图书馆永远不会做的事：保管钥匙、读你锁着的内容、冒充任何人说话、在通知里要钱、假装自己是法律遗嘱。' },
  render: (lang) => {
    const T = t(lang);
    const never = lang === 'zh'
      ? ['替你保管钥匙、份额、封存文件或资金。资金只放在你自己的冷库合约里。', '读取你锁着的认可层，或保存守馆人问题的答案。', '让守馆人用第一人称冒充任何人，克隆声音或面孔。', '替任何人做决定，担任遗嘱执行人或受托人。', '说展位、铭牌或封存档案是法律遗嘱。', '在任何页面出现填写助记词、私钥或密码的输入框。', '在通知里放链接、向你要钱、让你下载任何东西。', '放统计脚本、追踪器或第三方代码。', '发币、从你的资产里抽成、拿风险投资、卖靓号、收券商交易所殡葬保险的钱。', '未经同意为任何人立铭牌。', '删除你的文件。']
      : ['Hold your keys, shares, sealed files or funds. Funds only sit in your own Cold Vault contract.', 'Read your recognised layer, or keep the answers to warden questions.', 'Let a warden speak as anyone in the first person, or clone a voice or a face.', 'Decide for anyone, or act as an executor or trustee.', 'Call an exhibit, a plaque or a sealed file a legal will.', 'Show an input field for a recovery phrase, a private key or a password.', 'Put a link in a notice, ask for money, or ask you to download anything.', 'Load analytics, trackers or third-party code.', 'Issue a token, take a fee from your assets, take venture money, sell numbers, or take money from brokers, exchanges, funeral homes or insurers.', 'Put up a plaque for anyone without consent.', 'Delete your files.'];
    return `${pageHero({ lang, slug: 'rules', image: 'corridor', alt: T('A long quiet corridor ending at a frosted vault door', '一条长长的安静走廊，尽头是结了霜的库门'), title: T('House Rules', '馆规'), lede: T('This page is kept by the Department of Things We Do Not Do, the busiest department in the building. If we ever break one of these rules, this page is the evidence.', '这一页由不办科负责，它是全馆最忙的科室。如果哪天我们违反了其中一条，这一页就是证据。') })}
<section class="block"><div class="wrap split">
  <div class="reveal">
    ${sectionHead(T('Never', '永远不会'), T('Cold Library will never:', '冷冻图书馆永远不会：'))}
    <ul class="clean">${never.map((l, i) => `<li><span class="mark">${String(i + 1).padStart(2, '0')}</span><span>${esc(l)}</span></li>`).join('')}</ul>
  </div>
  <div class="reveal">
    <div class="panel"><span class="num">${T('AGE', '年龄')}</span><h3>${T('Eighteen and over.', '只对 18 岁以上的人开放。')}</h3><p class="muted">${T('Applications and orientation ask you to confirm it.', '申请和入职时都会请你确认这一点。')}</p></div>
    <div class="panel mt-2"><span class="num">${T('CONSENT', '同意')}</span><h3>${T('Your plaque is yours.', '你的铭牌只属于你。')}</h3><p class="muted">${T('A plaque for someone else needs their consent, or for someone who has passed away, their close family\'s. Anyone named can ask a librarian to take it down.', '为别人立铭牌，需要本人同意；为已经过世的人立，需要直系亲属同意。被写到的人都可以请馆员撤下。')}</p></div>
    <div class="panel ember-edge mt-2"><span class="num ember-text">${T('THE WARM ROOM', '暖房')}</span><h3>${T('If you are not okay, start there.', '如果你现在不太好，先去那里。')}</h3><p class="muted">${T('Nothing here is meant for a bad night.', '这里没有任何东西是为糟糕的夜晚准备的。')}</p><a class="btn ember mt-1" href="${href(lang, 'warm-room')}">${T('The Warm Room', '去暖房')}</a></div>
  </div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'name',
  title: { en: 'The Name', zh: '名字' },
  description: { en: 'Why cold, why a library, and where the old word cold harbour comes from.', zh: '为什么是冷冻、为什么是图书馆，以及"冷港"这个老词从哪来。' },
  render: (lang) => {
    const T = t(lang);
    return `${pageHero({ lang, slug: 'name', title: T('The Name', '名字'), lede: T('Cold is how things last. A library is how they are found again.', '冷冻，是让东西留得久的办法；图书馆，是让东西被再次找到的办法。') })}
<section class="block"><div class="wrap grid two">
  <div class="panel reveal"><span class="num">78°14′N · −18 °C</span><h3>${T('Cold', '冷')}</h3><p class="muted">${T('Under a mountain in Svalbard, about 78 degrees north, seeds from around the world are kept at minus eighteen degrees; in June 2026 the vault passed 1.4 million samples. Nearby, in a former coal mine, the Arctic World Archive keeps data on film, including a snapshot of public code from 2020. In Antarctica, an ice-core sanctuary keeps samples of mountain glaciers for scientists who have not been born yet.', '在斯瓦尔巴的一座山里，大约北纬 78 度，来自全世界的种子在零下十八度保存；2026 年 6 月，库存超过了 140 万份。不远处一座废弃的煤矿里，北极世界档案馆把数据存在胶片上，其中包括 2020 年的一份公开代码快照。在南极，一座冰芯圣所正在为还没出生的科学家保存高山冰川的样本。')}</p>
  <p class="faint">${ext('https://www.seedvault.no/', 'seedvault.no')} · ${ext('https://www.arcticworldarchive.org/', 'arcticworldarchive.org')} · ${ext('https://www.cnrs.fr/en/press/ice-memory-foundation-opens-first-ever-sanctuary-mountain-ice-cores-antarctica-storing-these', 'CNRS · Ice Memory')}</p></div>
  <div class="panel reveal"><span class="num">2014 → 2114</span><h3>${T('Library', '图书馆')}</h3><p class="muted">${T('In 2014 the artist Katie Paterson planted a thousand trees outside Oslo. Each year one writer gives the Future Library a manuscript, which stays unread in a quiet room of the city\'s public library until 2114, when the trees become the paper. A library can promise to wait.', '2014 年，艺术家凯蒂·帕特森在奥斯陆城外种下一千棵树。每年有一位作家把一份手稿交给"未来图书馆"，手稿存放在奥斯陆公共图书馆的一间静室里，没人读过，一直要等到 2114 年，那时这些树会被做成纸。图书馆可以承诺等待。')}</p>
  <p class="faint">${ext('https://katiepaterson.org/artwork/future-library/', 'katiepaterson.org')}</p></div>
  <div class="panel reveal"><span class="num">CEALD + HEREBEORG</span><h3>${T('Cold harbour', '冷港')}</h3><p class="muted">${T('Coldharbour is an old English place name. Place-name scholars read it as Old English cald here-beorg: a cold shelter, a lodging in the open. Folklore pictures a roadside hut with no keeper and no fire, where you brought your own fuel; that part is a story, not a record. We kept the story as a house rule.', 'Coldharbour 是英国的一个老地名。地名学者把它解释为古英语 cald here-beorg：冷的庇护所，野外的住处。民间说法里，它是路边一间没人看守、没有炉火的歇脚屋，柴火要自己带——这一段是传说，不是史料。我们把这个传说留下来，当作馆规。')}</p>
  <p class="faint">${ext('https://bosworthtoller.com/52385', 'Bosworth-Toller · here-beorg')} · ${ext('https://en.wikipedia.org/wiki/Coldharbour', 'Wikipedia')}</p></div>
  <div class="panel reveal"><span class="num">冷冻 · −18 °C</span><h3>${T('冷冻图书馆', '冷冻图书馆')}</h3><p class="muted">${T('The Chinese name means “frozen library”. Seeds in Svalbard are frozen at minus eighteen degrees, and decades later they can still be sown. Freezing is a pause, not an end. That is what we want for the things people keep here.', '冷冻，是种子库对种子做的事：在零下十八度冻起来，几十年后拿出来，照样能播种。冷冻是暂停，不是结束。我们希望人们放在这里的东西也是这样。')}</p></div>
</div></section>
<section class="block"><div class="wrap narrow reveal">
  <p class="lede">${T('If you have watched a certain series about a company that splits people in two, the corridors may look familiar. We borrowed the corridors and left the company behind. Here nobody is split, nobody is erased, and no founder rules from a wing of wax figures.', '如果你看过某部讲一家公司把人切成两半的美剧，这些走廊可能会让你眼熟。我们只借了走廊，没借那家公司：在这里，没有人被切开，没有人被抹去，也没有哪位创始人从一座蜡像展厅里继续发号施令。')}</p>
  <p class="coords mt-2">Cold Library · ${T('est.', '建馆')} 2026-10-04 · 78°14′N 15°29′E</p>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'warm-room',
  title: { en: 'The Warm Room', zh: '暖房' },
  description: { en: 'If you are not okay, start here. Helplines and a few quiet words.', zh: '如果你现在不太好，先从这里开始。心理援助热线，和几句安静的话。' },
  image: '/assets/img/warm-room.jpg',
  bodyClass: 'warm-room',
  render: (lang) => {
    const T = t(lang);
    return `${pageHero({ lang, slug: 'warm-room', title: T('The Warm Room', '暖房'), lede: T('This is the warmest room in the building. If tonight is a hard night, stay here for a moment, and talk to someone.', '这是整座楼里最暖和的房间。如果今晚很难熬，在这里待一会儿，找个人说说话。'), image: 'warm-room', alt: T('A small room with an orange lamp and a wool blanket', '一盏橘色的灯和一条羊毛毯的小房间') })}
<section class="block"><div class="wrap narrow">
  <div class="reveal">
    <div class="hotline"><span>${T('Mainland China · national psychological assistance hotline', '中国大陆 · 全国统一心理援助热线')}</span><b>12356</b></div>
    <div class="hotline"><span>${T('United States · Suicide & Crisis Lifeline', '美国 · 自杀与危机生命线')}</span><b>988</b></div>
    <div class="hotline"><span>${T('Anywhere else · find a free, local helpline', '其他地区 · 查找当地的免费热线')}</span><b><a href="https://findahelpline.com" rel="noopener">findahelpline.com</a></b></div>
    <div class="hotline"><span>${T('In immediate danger', '有紧急危险时')}</span><b>${T('Local emergency number', '当地急救电话')}</b></div>
  </div>
  <div class="reveal mt-3">
    <p class="lede">${T('You can come back to the library later. It will still be here.', '你可以晚些时候再回到图书馆，它会一直在这里。')}</p>
    <p class="muted">${T('If you are looking after someone else\'s exhibit or plaque and it feels heavy: you do not have to do everything at once. Start with the people, then the rest.', '如果你在替别人照看展位或铭牌，觉得很沉：不用一次做完所有事。先照顾人，其余的慢慢来。')}</p>
  </div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: '404',
  title: { en: 'Not on this shelf', zh: '这个书架是空的' },
  description: { en: 'This shelf is empty.', zh: '这个书架是空的。' },
  render: (lang) => {
    const T = t(lang);
    return `<section class="page-hero"><div class="wrap">
  <div class="floor-big"><span class="floor">?</span>${T('Floor unknown', '楼层未知')}</div>
  <h1>${T('This shelf is empty.', '这个书架是空的。')}</h1>
  <p class="lede">${T('It may have been moved, or never been here. Things get misfiled; the directory is always open.', '东西可能挪了地方，也可能从来没在这里。偶尔会放错架，楼层指示一直开着。')}</p>
  <div class="btns"><button class="btn" type="button" data-open-directory>${T('Floor directory', '楼层指示')}</button><a class="btn ghost" href="${href(lang, '')}">${T('Back to the lobby', '回大厅')}</a></div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
export function stackItemPage(item) {
  return {
    slug: 'open-stacks/' + item.slug,
    title: { en: item.en.title, zh: item.zh.title },
    description: { en: item.en.excerpt, zh: item.zh.excerpt },
    render: (lang) => {
      const T = t(lang);
      const s = item[lang];
      return `<section class="page-hero"><div class="wrap narrow">
  <div class="floor-big"><span class="floor">M</span>${T('Open Stacks', '公开文集')} · ${esc(item.accession)}</div>
  <h1>${esc(s.title)}</h1>
  <p class="coords">${esc(s.author)} · ${esc(s.date)}</p>
</div></section>
<section class="block"><div class="wrap narrow prose">${md(s.body)}
<p class="mt-3"><a href="${href(lang, 'open-stacks')}">← ${T('Back to the Open Stacks', '回到公开文集')}</a></p></div></section>`;
    },
  };
}

/* ------------------------------------------------------------------ */
// One page per exhibit or plaque. The recognised layer arrives as ciphertext; site.js runs the warden.
export function itemPage(item) {
  const isEx = item.kind === 'exhibit';
  return {
    slug: (isEx ? 'exhibits/' : 'plaques/') + item.slug,
    title: item.title,
    description: item.subtitle,
    image: `/assets/img/${item.image}.jpg`,
    render: (lang) => {
      const T = t(lang);
      const L = (o) => (o ? o[lang] ?? o.en : '');
      const pub = item.public;
      const facts = (pub.facts || []).map((f) => `<dt>${esc(L(f.k))}</dt><dd>${esc(L(f.v))}</dd>`).join('');
      const links = (pub.links || []).map((l) => `<li><a href="${esc(l.url)}" rel="noopener">${esc(L(l.label))}</a></li>`).join('');
      const w = item.warden;
      const data = { id: item.id, kdf: w.kdf, locked: item.locked, questions: w.questions.map((q) => L(q.q)), hints: w.questions.map((q) => L(q.hint) || ''), greeting: L(w.greeting), name: L(w.name), example: !!item.example };
      return `<section class="page-hero with-image item-hero">
  <div class="hero-media"><img src="/assets/img/${esc(item.image)}.jpg" srcset="/assets/img/${esc(item.image)}-sm.jpg 820w, /assets/img/${esc(item.image)}.jpg 1536w" sizes="100vw" alt=""></div><canvas class="snow" data-snow="light" aria-hidden="true"></canvas>
  <div class="wrap">
    <div class="floor-big"><span class="floor">${isEx ? '3' : '2'}</span>${isEx ? T('Perpetual Exhibit', '永续展位') : T('Perpetual Plaque', '永续铭牌')} · ${esc(item.id)}${item.example ? ` <span class="tag-example">${T('Example · fictional', '示例 · 虚构')}</span>` : ''}</div>
    <h1>${esc(L(item.title))}</h1>
    <p class="lede">${esc(L(item.subtitle))}</p>
  </div>
</section>
<section class="block"><div class="wrap split item-body">
  <div class="reveal">
    <div class="label"><span class="dot"></span>${T('Public layer', '公开层')}</div>
    <div class="prose mt-1">${md(L(pub.story))}</div>
    ${facts ? `<dl class="kv mt-2">${facts}</dl>` : ''}
    ${links ? `<ul class="dash mt-1">${links}</ul>` : ''}
    <div class="lamps mt-3" data-lamps data-item="${esc(item.id)}">
      <div class="lamp-count"><span class="lamp-icon" aria-hidden="true"></span><b data-lamp-n>0</b> ${T('lamps lit', '盏灯亮着')}</div>
      <ul class="lamp-notes" data-lamp-notes></ul>
    </div>
  </div>
  <div class="reveal">
    <div class="terminal warden" data-warden data-lang="${lang}">
      <div class="t-head"><span>${T('Warden', '守馆人')} · ${esc(data.name)}</span><span data-w-state>${T('Locked', '已上锁')}</span></div>
      <div data-w-screen></div>
    </div>
    <script type="application/json" data-warden-data>${JSON.stringify(data).replace(/</g, '\\u003c')}</script>
    <p class="faint mt-1">${T('Your answers stay in this browser. They are turned into a key here and are never sent anywhere.', '你的回答只留在这个浏览器里，在这里被算成钥匙，不会发到任何地方。')}</p>
  </div>
</div></section>
<section class="block hidden" data-rewards><div class="wrap narrow">
  <div class="label ember"><span class="dot"></span>${T('Recognised layer', '认可层')}</div>
  <div class="prose mt-1" data-r-letter></div>
  <div class="notice mt-2 hidden" data-r-pointer></div>
  <div class="badge-card mt-2 hidden" data-r-badge><span class="num">${T('BADGE', '徽章')}</span><b data-r-badge-name></b><span class="code" data-r-badge-code></span><small>${esc(L(item.title))} · ${esc(item.id)}</small></div>
  <form class="form lamp-form mt-3" data-lamp-form>
    <label>${T('Leave a word with your lamp (optional, 140 characters)', '点灯时留一句话（可选，140 字以内）')}<textarea maxlength="140" rows="2"></textarea></label>
    <button class="btn ember" type="submit">${T('Light a lamp', '点一盏灯')}</button>
    <p class="feedback" data-lamp-msg></p>
  </form>
</div></section>`;
    },
  };
}
