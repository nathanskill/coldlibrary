import { t, esc, href, REPO, pageHero, sectionHead, card, floorsGrid, md } from './lib.mjs';

const ext = (url, label) => `<a href="${url}" rel="noopener">${label}</a>`;

export const PAGES = [];

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

const page = (p) => PAGES.push(p);

/* ------------------------------------------------------------------ */
page({
  slug: '',
  title: { en: 'Lobby', zh: '大厅' },
  description: {
    en: 'If you could not be reached tomorrow, would anyone know what to do? Write down your accounts, projects and letters, seal them on your own computer, and split the key among people you trust. Free and open source.',
    zh: '如果明天你联系不上了，有人知道该怎么办吗？把账户、项目和想说的话写下来，在自己电脑上封存，钥匙分给信得过的人。免费、开源，我们什么都不保管。',
  },
  render: (lang) => {
    const T = t(lang);
    return `
<section class="hero hero-cine">
  <div class="hero-media" data-parallax="0.18"><img src="/assets/img/hero-glacier.jpg" srcset="/assets/img/hero-glacier-sm.jpg 820w, /assets/img/hero-glacier.jpg 1536w" sizes="100vw" alt="${T('A vast library carved into a glacier above a frozen lake at night, under the aurora; one person with a lantern walks toward it', '夜里，一座刻进冰川的巨大图书馆立在冰湖上方，极光满天，一个人提着灯走过冰面')}" fetchpriority="high"></div>
  <div class="aurora" aria-hidden="true"><i></i><i></i><i></i></div>
  <canvas class="snow" data-snow="full" aria-hidden="true"></canvas>
  <div class="wrap">
    <div class="label"><span class="dot"></span>${T('Cold Library · a handover file for the day you cannot be reached', '冷冻图书馆 · 身后事交接清单')}</div>
    <h1 class="display hero-q mt-1">${T('If you could not be reached tomorrow, would anyone know what to do?', '如果明天你联系不上了，<br>有人知道该怎么办吗？')}</h1>
    <p class="lede">${T('Where your accounts are. Who takes over your project. What you want to say, and to whom. Write it down, seal it on your own computer, and split the key among people you trust. It opens only when two of them agree. Free, open source, and we never hold anything.', '账户在哪，项目交给谁，想对谁说什么。把它写下来，在你自己的电脑上封存，钥匙分给几位信得过的人，至少两人凑齐才能打开。免费、开源，我们什么都不保管。')}</p>
    <div class="btns">
      <a class="btn ember" href="${href(lang, 'stacks')}">${T('Start my list', '开始写我的清单')} <span class="k">→</span></a>
      <a class="btn" href="${href(lang, 'librarians/join')}">${T('Get a librarian card', '领一张馆员证')}</a>
      <button class="btn ghost" type="button" data-open-directory>${T('Floor directory', '楼层指示')}</button>
    </div>
    <div class="hero-meta"><span>${T('Free', '免费')}</span><span>${T('Open source', '开源')}</span><span>${T('Sealed offline', '离线封存')}</span><span>${T('Opens only when two agree', '两人凑齐才能打开')}</span><span>${T('No cookies', '没有 Cookie')}</span></div>
  </div>
  <div class="scroll-cue" aria-hidden="true"></div>
</section>

<section class="block name-line">
  <div class="wrap">
    <div class="name-split reveal">
      <div><span class="big">${T('Cold', '冷冻')}</span><p>${T('Sealed while you are here. Nobody can open it, not your keepers alone, and not us.', '你在的时候，封着。谁也打不开，开启人单独不行，我们也不行。')}</p></div>
      <div class="plus" aria-hidden="true">+</div>
      <div><span class="big">${T('Library', '图书馆')}</span><p>${T('When it is time, it is read properly: in order, by the right people, and only what you chose.', '到了该读的时候，被好好读到：按顺序，由对的人，只读你同意的部分。')}</p></div>
    </div>
  </div>
</section>

<section class="block story">
  <div class="wrap">
    ${sectionHead(T('In four pictures', '四个画面'), T('What the library does.', '这座图书馆做什么。'))}
    <div class="story-grid">
      <article class="story-card reveal"><img src="/assets/img/ice-letter-sm.jpg" srcset="/assets/img/ice-letter-sm.jpg 820w, /assets/img/ice-letter.jpg 1536w" sizes="(max-width: 900px) 100vw, 50vw" alt="${T('A sealed envelope with an orange wax seal inside a block of clear ice', '一封盖着橙色火漆的信，封在一块透明的冰里')}" loading="lazy"><div class="story-text"><span class="num">01 · ${T('Seal', '封存')}</span><h3>${T('What you want said, kept cold.', '想说的话，先冻起来。')}</h3><p>${T('Letters, instructions, the list of things only you know. Encrypted on your own computer. Nobody reads it while you are here.', '信、交代、只有你知道的那些事。在你自己的电脑上加密，你在的时候，谁也读不到。')}</p></div></article>
      <article class="story-card reveal"><img src="/assets/img/three-keys-sm.jpg" srcset="/assets/img/three-keys-sm.jpg 820w, /assets/img/three-keys.jpg 1536w" sizes="(max-width: 900px) 100vw, 50vw" alt="${T('Three hands each holding a piece of one broken brass key', '三只手各拿着一把铜钥匙的一截')}" loading="lazy"><div class="story-text"><span class="num">02 · ${T('Split the key', '分钥匙')}</span><h3>${T('Three people. Any two.', '三个人，任意两个。')}</h3><p>${T('The key is split into three shares on paper. Any two keepers together can open the box. One alone cannot, and neither can we.', '钥匙拆成三份，写在纸上交给三个人。任意两人凑齐才能打开，一个人不行，我们也不行。')}</p></div></article>
      <article class="story-card reveal"><img src="/assets/img/snow-desk-sm.jpg" srcset="/assets/img/snow-desk-sm.jpg 820w, /assets/img/snow-desk.jpg 1536w" sizes="(max-width: 900px) 100vw, 50vw" alt="${T('A lone desk in a snowfield at night with a notebook, a laptop, keys and a lit lamp', '夜里雪原上一张孤零零的书桌，上面有笔记本、电脑、钥匙和一盏亮着的灯')}" loading="lazy"><div class="story-text"><span class="num">03 · ${T('Hand over', '交接')}</span><h3>${T('No one left staring at locked doors.', '别让家人对着一堆锁发呆。')}</h3><p>${T('Which accounts exist and who to ask. Which subscriptions to stop. Who takes over the project, the domain, the cat. Pointers only, never passwords.', '有哪些账户、该找谁；哪些订阅要停；项目、域名、猫交给谁。只写在哪、找谁，从不写密码。')}</p></div></article>
      <article class="story-card reveal"><img src="/assets/img/thaw-sm.jpg" srcset="/assets/img/thaw-sm.jpg 820w, /assets/img/thaw.jpg 1536w" sizes="(max-width: 900px) 100vw, 50vw" alt="${T('Ice breaking up on a lake at sunrise, a paper boat on the open water', '日出时湖冰开化，一只纸船漂在水面上')}" loading="lazy"><div class="story-text"><span class="num">04 · ${T('Let go', '放手')}</span><h3>${T('Then the ice melts.', '然后，冰会化。')}</h3><p>${T('Every wish has a half-life: first followed, then advice, then only remembered. The living get to go on living.', '每条嘱托都有时效：先照办，再参考，最后只是记住。活着的人可以继续生活。')}</p></div></article>
    </div>
  </div>
</section>

<section class="block">
  <div class="wrap">
    ${sectionHead(T('Who it is for', '写给谁'), T('Anyone whose life has a few locked doors.', '人生里有几扇上锁的门的人。'))}
    <div class="who reveal">
      <div><b>${T('Holding digital assets', '有数字资产的人')}</b><span>${T('Wallets and accounts that simply vanish if nobody knows they exist.', '钱包和账户，没人知道它存在，就等于没了。')}</span></div>
      <div><b>${T('Running a project', '在做项目的人')}</b><span>${T('Domains, servers, users, an open-source repo that others depend on.', '域名、服务器、用户，别人依赖的开源仓库。')}</span></div>
      <div><b>${T('Living far from family', '一个人在外地生活')}</b><span>${T('The people who would have to sort things out know the least.', '真要收拾残局的人，知道得最少。')}</span></div>
      <div><b>${T('A parent', '做了父母的人')}</b><span>${T('A few sentences for later, released only when it is time.', '有几句话想留到以后，到了时候才交出去。')}</span></div>
    </div>
  </div>
</section>

<section class="cine-band" aria-label="${T('The Closed Stacks', '闭架书库')}">
  <div class="cine-media" data-parallax="0.12"><img src="/assets/img/ice-archive.jpg" srcset="/assets/img/ice-archive-sm.jpg 820w, /assets/img/ice-archive.jpg 1536w" sizes="100vw" alt="${T('An endless archive of drawers inside a glacier, one librarian with a warm lamp on a ladder', '冰川里望不到头的抽屉档案馆，一位馆员提着暖灯站在梯子上')}" loading="lazy"></div>
  <div class="wrap">
    <div class="label"><span class="dot"></span>${T('B1 · The Closed Stacks', 'B1 · 闭架书库')}</div>
    <h2 class="section-title mt-1">${T('Kept cold. Read when it is time.', '冻着保存，到时候再读。')}</h2>
    <a class="btn mt-2" href="${href(lang, 'stacks')}">${T('How an Ice Core works', '交接清单怎么用')} <span class="k">→</span></a>
  </div>
</section>

<section class="block">
  <div class="wrap split">
    <div class="reveal">
      <div class="label lake"><span class="dot"></span>${T('Outside the windows', '窗外')}</div>
      <h2 class="section-title mt-1">${T('A lake, a snowline, a forest.', '一片湖，一条雪线，一片林。')}</h2>
      <p class="lede">${T('The library stands where the cold does the work. The lake freezes every winter and keeps a clear surface for reading the sky. Above the snowline on the mountains, snow stays and slowly becomes ice. And at the edge of the grounds a young spruce forest grows in rows, the way the Future Library in Norway grows the paper for 2114. Nothing here is in a hurry.', '图书馆建在冷替你干活的地方。湖每年冬天都会结冰，冰面清澈，可以照见天空。山上雪线以上的雪不会化，年复一年压成冰。院子边上有一片年轻的云杉林，一排一排长着，就像挪威的"未来图书馆"为 2114 年种下的那片树。这里没有什么是着急的。')}</p>
      <a class="btn ghost mt-1" href="${href(lang, 'name')}">${T('Why cold', '为什么是冷')}</a>
    </div>
    <div class="grid two reveal">
      <figure class="figure tall"><img src="/assets/img/forest-rows-sm.jpg" alt="${T('Young spruce trees in rows under deep snow', '深雪里一排排年轻的云杉')}" loading="lazy"><figcaption>${T('The forest · paper for later', '森林 · 留给以后的纸')}</figcaption></figure>
      <figure class="figure tall"><img src="/assets/img/lake-dawn-sm.jpg" alt="${T('A still lake reflecting snow mountains at dawn', '清晨静止的湖面倒映着雪山')}" loading="lazy"><figcaption>${T('The lake · above the snowline', '湖 · 雪线以上')}</figcaption></figure>
    </div>
  </div>
</section>

<section class="block">
  <div class="wrap">
    ${sectionHead(T('Three promises', '三条承诺'), T('What you can hold us to.', '你可以拿来要求我们的事。'))}
    <div class="grid two">
      <div class="reveal">
        <div class="promise"><span class="n">01</span><div><h3>${T('This is not a will.', '这不是遗嘱。')}</h3><p>${T('Your property follows your legal will or the law. An Ice Core tells people where things are and who to ask. It does not decide who gets them.', '你的财产按法律遗嘱或法定继承处理。交接清单只告诉别人东西在哪、该找谁，不决定东西归谁。')}</p></div></div>
        <div class="promise"><span class="n">02</span><div><h3>${T('We never hold your keys.', '我们从不保管钥匙。')}</h3><p>${T('We cannot open your box. Nobody here can. The key is split among people you choose, and the sealed box is held by someone else again.', '我们打不开你的箱子，这里没有任何人能打开。钥匙拆给你选的几个人，封好的箱子再交给另一方保管。')}</p></div></div>
        <div class="promise"><span class="n">03</span><div><h3>${T('We quote you. We never play you.', '只转述，不扮演。')}</h3><p>${T('No voice clones, no faces, no chatbot that speaks in your name. Agents may read your words aloud, with the date and the source.', '不克隆声音，不做数字脸，不做以你的口吻说话的聊天机器人。agent 可以转述你的原话，并注明日期和出处。')}</p></div></div>
      </div>
      <div class="reveal">
        <div class="truths">
          <span class="label ember"><span class="dot"></span>${T('And three plain truths', '还有三句实话')}</span>
          <p>${T('If you keep everything with your keepers, any two of them can open the box at any time. Your safety is the people you choose.', '如果你把一切都交给开启人，他们中任意两人随时都能打开箱子。你的安全，取决于你选的人。')}</p>
          <p>${T('If you use an AI for the interview, your answers pass through that provider. The asset section is written by hand.', '如果用 AI 做整理谈话，你的回答会经过那家服务商。资产部分由你亲手填写。')}</p>
          <p>${T('This library may close one day. That is why the format is open, and why every page of it can be printed.', '这座图书馆有一天也可能关门。所以格式是开放的，每一页都能打印出来。')}</p>
        </div>
        <figure class="figure wide mt-3"><img src="/assets/img/drawers-sm.jpg" alt="${T('A catalog drawer with frost on its brass label holder', '铜标签框上结了霜的目录抽屉')}" loading="lazy"><figcaption>${T('Drawer 78 · temperature holding', '78 号抽屉 · 温度稳定')}</figcaption></figure>
      </div>
    </div>
  </div>
</section>

<section class="block">
  <div class="wrap">
    ${sectionHead(T('Procedure', '流程'), T('Four steps. All of them offline.', '四步，全部离线完成。'), T('Nothing you write here passes through this website.', '你写下的任何东西，都不会经过这个网站。'))}
    <div class="steps reveal">
      <div class="step"><h3>${T('Write', '写下来')}</h3><p>${T('The Exit Interview asks short questions: who to call, what to stop, what to say. About twenty minutes. Stop whenever you like.', '整理谈话问你一些短问题：该找谁、该停掉什么、想说什么。大约二十分钟，随时可以停。')}</p></div>
      <div class="step"><h3>${T('Seal', '封存')}</h3><p>${T('The tools encrypt your file on your own machine and split the key into shares. Two of three, unless you choose otherwise.', '工具在你自己的电脑上加密文件，把钥匙拆成几份。默认任意两份能打开，一共三份。')}</p></div>
      <div class="step"><h3>${T('Hand over', '交出去')}</h3><p>${T('Each keeper gets one share on paper. The sealed box goes to a notary, your own account, or a time-lock.', '每位开启人拿一份写在纸上的份额。封好的箱子交给公证处、你自己的账户，或者加一道时间锁。')}</p></div>
      <div class="step"><h3>${T('Let go', '放手')}</h3><p>${T('If you go silent, keepers confirm, wait, and open in stages. Each wish fades from binding to advice to memory.', '如果你长时间没有音讯，开启人确认、等待，再分阶段打开。每条心愿都会从"照办"慢慢变成"参考"，最后只是"记住"。')}</p></div>
    </div>
  </div>
</section>

<section class="block">
  <div class="wrap split">
    <div class="reveal">
      <div class="label"><span class="dot"></span>${T('Floor 6 · Department of Half-life', '6 楼 · 时效科')}</div>
      <h2 class="section-title mt-1">${T('Every wish has a half-life.', '每条心愿都有时效。')}</h2>
      <p class="lede">${T('Drag the years forward. Watch the same sentence move from an instruction to a memory.', '把年份往后拖，看同一句话怎样从"指令"变成"记忆"。')}</p>
      <a class="btn mt-2" href="${href(lang, 'half-life')}">${T('Visit the department', '去时效科')}</a>
    </div>
    <div class="panel halflife reveal" data-halflife>
      <div class="hl-status"><span>${T('Years since', '离开后')} <b data-hl-years>0</b> ${T('years', '年')}</span><span>${T('Stage', '阶段')}: <b data-hl-stage>${T('Binding', '照办')}</b></span></div>
      <p class="hl-sentence" data-hl-sentence>${T('“Keep the website online. Renew the domain every year.”', '"网站继续开着，域名每年续费。"')}</p>
      <input class="hl-range" type="range" min="0" max="20" step="0.5" value="0" aria-label="${T('Years since', '离开后的年数')}" data-hl-range data-labels='${JSON.stringify(lang === 'zh' ? ['照办', '参考', '存档'] : ['Binding', 'Advisory', 'Archive'])}'>
      <div class="hl-ticks"><span>${T('Binding · 0–2 y', '照办 · 0–2 年')}</span><span>${T('Advisory · to 10 y', '参考 · 到第 10 年')}</span><span>${T('Archive', '存档')}</span></div>
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
    <figure class="figure wide reveal"><img src="/assets/img/corridor-sm.jpg" alt="${T('A long institutional corridor leading to a frosted vault door', '一条长长的走廊，尽头是结了霜的金库门')}" loading="lazy"><figcaption>${T('Corridor B · to the Closed Stacks', 'B 走廊 · 通往闭架书库')}</figcaption></figure>
    <div class="reveal">
      <div class="label"><span class="dot"></span>${T('Not a memorial', '这里不是纪念馆')}</div>
      <h2 class="section-title mt-1">${T('No candles. No countdowns.', '没有蜡烛，没有倒计时。')}</h2>
      <p class="lede">${T('This is a library. Things are filed, kept cold, and read when it is time. The corridors may remind you of an office from a television series. We kept the corridors and left the company behind: here, the dead do not give orders to the living.', '这是一座图书馆。东西被编目、冻起来，到时候再被读到。走廊可能让你想起某部美剧里的那家公司。我们只借了走廊，没借那家公司：在这里，逝者不给活着的人下命令。')}</p>
      <a class="btn ghost mt-1" href="${href(lang, 'rules')}">${T('Read the house rules', '看馆规')}</a>
    </div>
  </div>
</section>

<section class="block">
  <div class="wrap split">
    <div class="reveal">
      <div class="label ember"><span class="dot"></span>${T('Floor 7 · Register of Librarians', '7 楼 · 馆员名册')}</div>
      <h2 class="section-title mt-1">${T('Become a librarian.', '成为一名馆员。')}</h2>
      <p class="lede">${T('Librarians file projects, review deposits, run drills and translate. It takes about a minute, mostly clicks, and there is no test. Your number is yours alone, and it is not given out in order.', '馆员负责登记项目、审核寄存、组织演练、做翻译。入职大约一分钟，基本是点一点，不考试。你的编号独一无二，而且不按注册顺序发放。')}</p>
      <div class="btns"><a class="btn ember" href="${href(lang, 'librarians/join')}">${T('Get a librarian card', '领一张馆员证')}</a><a class="btn ghost" href="${href(lang, 'librarians')}">${T('See the register', '看名册')}</a></div>
    </div>
    <div class="reveal">${card({ acc: 'No. 1', title: T('Founding Librarian', '创始馆员'), fields: [[T('Floor', '楼层'), T('All of them', '全部')], [T('Since', '入馆'), '2026-10-04'], [T('Duty', '职责'), T('Keeps the lights low and the rules short.', '把灯调暗，把规矩写短。')]], stamp: T('On duty', '在岗') })}</div>
  </div>
</section>
`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'accession',
  title: { en: 'Front Desk', zh: '前台 · 入藏处' },
  description: { en: 'Deposit an Ice Core, a project, or a piece of writing. None of them are kept by us.', zh: '寄存交接清单、项目或一篇文字。这些都不由我们保管。' },
  render: (lang) => {
    const T = t(lang);
    return `${pageHero({ lang, slug: 'accession', title: T('Front Desk', '前台 · 入藏处'), lede: T('Nobody sits at this desk. That is a promise, not a staffing issue. Three things can be deposited here, and none of them are kept by us: we record where they are, and the rules for when they may be opened.', '前台没有人。这是承诺，不是缺员。这里可以寄存三样东西，它们都不由我们保管：我们只记录东西在哪，以及什么时候可以打开。') })}
<section class="block"><div class="wrap">
  ${sectionHead(T('Deposits', '寄存'), T('Choose a counter.', '选一个窗口。'))}
  <div class="grid three">
    <div class="panel ice-edge reveal"><span class="num">B1 · ${T('PRIVATE', '私密')}</span><h3>${T('An Ice Core', '一份交接清单')}</h3><p class="muted">${T('Your own file: who to call, what to stop, what to say, and letters to leave. You write it and seal it on your own machine. It never comes to us.', '你自己的档案：该找谁、该停掉什么、想说什么，以及留下的信。你在自己的电脑上写好、封存，它永远不会到我们这里。')}</p><a class="btn mt-1" href="${href(lang, 'reading-room')}">${T('Go to the Reading Room', '去阅览室')}</a></div>
    <div class="panel ice-edge reveal"><span class="num">3 · ${T('PUBLIC', '公开')}</span><h3>${T('A project', '一个项目')}</h3><p class="muted">${T('A personal or open-source project, with its maintainers, its handover notes, its successor and its archives. We record links. We never store your code.', '个人项目或开源项目：谁在维护、交接文档在哪、谁来接班、存档在哪。我们只登记链接，从不保存你的代码。')}</p><a class="btn mt-1" href="${href(lang, 'projects')}">${T('Go to the Project Wing', '去项目馆')}</a></div>
    <div class="panel ice-edge reveal"><span class="num">2 · ${T('PUBLIC', '公开')}</span><h3>${T('A piece of writing', '一篇文字')}</h3><p class="muted">${T('Something you want left in the open: a lesson, a letter to strangers, the one thing worth passing on. Added item by item, with your consent. You can withdraw it.', '你想公开留下的东西：一个教训、一封写给陌生人的信、一件值得传下去的事。逐项经你同意才收录，随时可以撤回。')}</p><a class="btn mt-1" href="${href(lang, 'open-stacks')}">${T('Go to the Open Stacks', '去开架区')}</a></div>
  </div>
</div></section>
<section class="block"><div class="wrap split">
  <div class="reveal">
    ${sectionHead(T('Accession numbers', '入藏编号'), T('Everything gets a number.', '每样东西都有编号。'))}
    <dl class="kv">
      <dt>P-000001</dt><dd>${T('Projects in the Project Wing.', '项目馆里的项目。')}</dd>
      <dt>S-000001</dt><dd>${T('Writings in the Open Stacks.', '开架区里的文字。')}</dd>
      <dt>No. 1</dt><dd>${T('Librarians. Numbers are unique and not given out in order. Short and memorable numbers are held back for events and contributors.', '馆员。编号独一无二，不按注册顺序发放。短号和好记的号码留给活动和贡献者。')}</dd>
      <dt>${T('Ice Cores', '交接清单')}</dt><dd>${T('No number here. Their seq lives inside your own file.', '这里不编号。它们的版本号写在你自己的文件里。')}</dd>
    </dl>
  </div>
  <div class="reveal">${card({ acc: 'P-000001', title: T('Accession slip', '入藏单'), fields: [[T('Item', '物品'), 'Cold Library'], [T('Kind', '类别'), T('Project', '项目')], [T('Received', '收到'), '2026-10-04'], [T('Kept by', '保管'), T('Its maintainers', '维护者自己')], [T('Shelf', '架位'), T('Project Wing · 3', '项目馆 · 3 楼')]], stamp: T('Received', '已收') })}</div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'stacks',
  title: { en: 'Closed Stacks', zh: '闭架书库' },
  description: { en: 'An Ice Core is one person\'s file: a public cover, a sealed core and sealed letters. It never sits on our shelves.', zh: '交接清单是一个人的档案：公开的封面、封存的正文和封存的信。它从不放在我们的架子上。' },
  image: '/assets/img/hero-stacks.jpg',
  render: (lang) => {
    const T = t(lang);
    const sections = lang === 'zh'
      ? ['0 先读这里', '1 该找谁', '2 项目与交接', '3 账户（只写官方身后流程）', '4 资产（只写在哪、找谁）', '5 心愿和它们的时效', '6 信件索引', '7 开架区（愿意公开的）', '8 我不想要的', '9 给 agent 的规矩']
      : ['0 Read this first', '1 Who to call', '2 Projects and handover', '3 Accounts (official after-death routes only)', '4 Assets (where, and who to ask)', '5 Wishes and their half-life', '6 Letters index', '7 Open Stacks (what may be public)', '8 What I do not want', '9 Rules for agents'];
    return `${pageHero({ lang, slug: 'stacks', title: T('Closed Stacks', '闭架书库'), lede: T('An Ice Core is one person\'s file. You write it, seal it, and give the keys to people you trust. It never sits on our shelves: the closed stacks are wherever you keep it.', '交接清单是一个人的档案。你写好、封存，把钥匙交给信任的人。它从不放在我们的架子上：你把它放在哪，哪里就是闭架书库。'), image: 'ice-archive', alt: T('An endless archive of drawers inside a glacier, one librarian with a warm lamp on a ladder', '冰川里望不到头的抽屉档案馆，一位馆员提着暖灯站在梯子上') })}
<section class="block"><div class="wrap split">
  <div class="reveal">
    ${sectionHead(T('Contents', '内容'), T('Ten short sections.', '十个短章节。'), T('Written for the people and the machines that will act on it. Not a memoir.', '写给将来照着它办事的人和机器看的，不是回忆录。'))}
    <ul class="clean">${sections.map((s) => `<li><span class="mark">${esc(s.split(' ')[0])}</span><span>${esc(s.slice(s.indexOf(' ') + 1))}</span></li>`).join('')}</ul>
  </div>
  <div class="reveal">
    <div class="label"><span class="dot"></span>${T('On disk', '文件结构')}</div>
<pre class="mt-1">my-core/                ${T('# never share this folder', '# 这个文件夹不要给任何人')}
  COVER.md              ${T('# public, printable', '# 公开，可打印')}
  core/
    COLDLIBRARY.md      ${T('# for people and agents', '# 给人和 agent 读')}
    core.json           ${T('# machine-checkable', '# 机器可校验')}
  letters/
    001-to-someone.md
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
    ${card({ acc: 'COVER.md', title: T('The cover', '封面'), fields: [[T('Says', '写明'), T('This is a Cold Library cover. It is not a will.', '这是冷冻图书馆的封面，不是遗嘱。')], [T('Opening', '开启'), T('2 of 3 keepers, after the silence period', '静默期过后，3 位开启人中的 2 位')], [T('Box held by', '箱子在'), T('a notary', '公证处')], [T('Never', '从不写'), T('names, assets, accounts', '人名、资产、账户')]], stamp: T('Public', '公开'), stampClass: 'ice' })}
    ${card({ acc: 'core.age', title: T('The core', '正文'), fields: [[T('Holds', '内含'), 'COLDLIBRARY.md · core.json'], [T('Cipher', '加密'), 'age · scrypt'], [T('Key', '钥匙'), T('256-bit, split with SLIP-39', '256 位，用 SLIP-39 拆分')], [T('Never', '从不写'), T('passwords, recovery phrases, amounts', '密码、助记词、金额')]], stamp: T('Sealed', '已封存') })}
  </div>
</div></section>
<section class="block tight"><div class="wrap narrow reveal">
  <div class="notice warn"><strong>${T('Assets are pointers only.', '资产只写指向。')}</strong> ${T('Write where something is and who knows what to do. Never amounts, never passwords, never recovery phrases. A file that lists amounts becomes a treasure map, and treasure maps attract the wrong visitors.', '只写东西在哪、谁知道该怎么办。不写金额、不写密码、不写助记词。写了金额的清单就成了藏宝图，会招来不该来的人。')}</div>
  <div class="btns"><a class="btn" href="${href(lang, 'reading-room')}">${T('Get the tools', '取工具')}</a><button class="btn ghost" type="button" data-borrow data-msg="${T('The Closed Stacks do not lend. Not even to us.', '闭架书库不外借。对我们自己也不。')}">${T('Borrow', '借阅')}</button><a class="btn ghost" href="${REPO}/tree/main/spec/v0.1/examples">${T('See a fictional example', '看一个虚构的例子')}</a></div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'harbour',
  title: { en: 'The Cold Harbour', zh: '冷港' },
  description: { en: 'Sealed letters wait in the Cold Harbour until it is their time. How silence is confirmed, how vetoes work, and what is released at each stage.', zh: '封好的信停在冷港，等时候到了再出发。怎样确认失联、怎样否决、每个阶段放出什么。' },
  image: '/assets/img/harbour.jpg',
  render: (lang) => {
    const T = t(lang);
    const stages = [
      [T('Unreachable', '联系不上'), T('Only one sentence: “They cannot be reached right now.” No content.', '只有一句话："暂时联系不上他/她。"不放任何内容。'), T('2 of 3 keepers confirm', '3 位开启人中 2 位确认')],
      [T('Incapacity', '失能'), T('Project handover and bills: domains, servers, notices to clients. No letters.', '只放项目交接和账单：域名、服务器、给客户的通知。不放信。'), T('Quorum, then the veto window', '人数凑齐，再过否决期')],
      [T('After death', '身后'), T('The asset map goes to the executor or administrator. Letters are released.', '资产地图交给遗嘱执行人或遗产管理人，信件放出。'), T('Quorum, veto window, and the custodian\'s own conditions', '人数凑齐、过否决期，并满足保管方的条件')],
      [T('Public', '公开'), T('Open Stacks items and irreversible instructions that affect the living.', '公开文集，以及会影响活人的不可逆指令。'), T('Consent per item while alive, 180-day cooling, 2 keeper signatures. Keepers may decline.', '生前逐项同意、180 天冷静期、2 位开启人签字。开启人可以拒绝。')],
    ];
    return `${pageHero({ lang, slug: 'harbour', title: T('The Cold Harbour', '冷港'), lede: T('In Old English, a cold harbour was a cold shelter: a roof in the open, somewhere to wait out the weather. Here it is where sealed letters wait until it is their time to leave.', '在古英语里，"冷港"的意思是一处冷的庇护所：野外的一片屋顶，让人在那里等风雪过去。在这里，它是封好的信停靠的地方，等时候到了再出发。'), image: 'ice-letter', alt: T('A sealed envelope with an orange wax seal inside a block of clear ice', '一封盖着橙色火漆的信，封在一块透明的冰里') })}
<section class="block"><div class="wrap">
  ${sectionHead(T('Before anything leaves', '出发之前'), T('Silence, reminder, confirmation, veto.', '静默、提醒、确认、否决。'), T('Defaults below. You can change them in your own file.', '下面是默认值，你可以在自己的文件里改。'))}
  <div class="steps reveal">
    <div class="step"><h3>${T('Silence', '静默')}</h3><p>${T('Six months with no signed check-in. Choose anything from three to eighteen.', '六个月没有签名报到。可以设成三到十八个月。')}</p></div>
    <div class="step"><h3>${T('Reminder', '提醒')}</h3><p>${T('Thirty days before, in neutral words. Nothing that would alarm someone sharing your phone.', '提前三十天提醒，用中性的措辞，不让共用你手机的人看出端倪。')}</p></div>
    <div class="step"><h3>${T('Confirm', '确认')}</h3><p>${T('Two of three keepers confirm independently, after calling you and an emergency contact.', '三位开启人中的两位各自确认，在此之前要先给你和紧急联系人打电话。')}</p></div>
    <div class="step"><h3>${T('Veto', '否决')}</h3><p>${T('Twenty-eight days in which you or any keeper can stop it. One signed check-in from you cancels everything still pending.', '二十八天里，你或任何一位开启人都可以叫停。你只要签名报到一次，所有没走完的流程都会撤回。')}</p></div>
  </div>
</div></section>
<section class="block"><div class="wrap">
  ${sectionHead(T('Departures', '出发班次'), T('What leaves at each stage.', '每个阶段放出什么。'))}
  <div class="catalog">${stages.map(([s, what, cond], i) => card({ acc: `B2-0${i + 1}`, title: s, fields: [[T('Releases', '放出'), what], [T('Needs', '条件'), cond]] })).join('')}
  ${card({ acc: 'B2-05', title: T('Destroy (private)', '销毁（仅隐私）'), fields: [[T('Covers', '范围'), T('Diaries, drafts, private chats', '日记、草稿、私人聊天')], [T('Needs', '条件'), T('The lowest threshold. Keepers may not refuse.', '门槛最低。开启人不能拒绝。')], [T('Better', '更好的办法'), T('Never seal it in the first place.', '一开始就别封进去。')]], stamp: T('Asymmetric', '不对称') })}</div>
</div></section>
<section class="block"><div class="wrap grid two">
  <div class="panel reveal"><span class="num">${T('IF IT GOES WRONG', '如果出了错')}</span><h3>${T('The misfire plan', '误触发预案')}</h3><p class="muted">${T('What has been released cannot be recalled. So the first stage releases no content at all. If a letter goes out by mistake, the keeper you named in advance contacts the recipient, apologises, and asks them to delete it.', '放出去的东西收不回来。所以第一阶段不放任何内容。万一误发了信，由你事先指定的那位开启人联系收件人，道歉，并请对方删除。')}</p></div>
  <div class="panel reveal"><span class="num">${T('NOTICES', '通知')}</span><h3>${T('Our notices are boring on purpose.', '我们的通知故意写得很无聊。')}</h3><p class="muted">${T('A Cold Library notice never contains a link, never asks for money, never asks you to type or download anything. If a message claiming to be from us does any of these, it is not from us. The Bureau of Impersonation answers every letter that says “send us your key”: we do not have it, and we never want it.', '冷冻图书馆的通知从不带链接，从不要钱，从不让你输入或下载任何东西。如果一封自称来自我们的消息做了其中任何一件事，它就不是我们发的。冒名甄别科会回复每一封"请把钥匙交给我们"的来信：我们没有钥匙，也永远不要。')}</p></div>
  <div class="panel reveal"><span class="num">${T('LETTERS', '信')}</span><h3>${T('Written by you.', '由你亲笔写。')}</h3><p class="muted">${T('An AI may help you outline. It does not write in your voice. Any passage it drafted is marked, and the reader sees that mark.', 'AI 可以帮你列提纲，但不替你的口吻写。它起草过的段落会被标出来，收信人能看到这个标记。')}</p></div>
  <div class="panel reveal"><span class="num">${T('LAW', '法律')}</span><h3>${T('Unreachable is not dead.', '联系不上，不等于去世。')}</h3><p class="muted">${T('Keepers confirming silence is not a legal finding of death, and nothing here pretends otherwise.', '开启人确认失联，不是法律上的宣告死亡。这里没有任何地方假装它是。')}</p></div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'keepers',
  title: { en: 'Key Room', zh: '钥匙房' },
  description: { en: 'Your key is split into shares among people you trust. No single person can open anything.', zh: '你的钥匙被拆成几份，交给你信任的人。任何一个人单独都打不开。' },
  render: (lang) => {
    const T = t(lang);
    const custodians = [
      [T('A notary', '公证处'), T('Holds the sealed box and hands it over on agreed conditions, such as a death certificate. Has no key.', '保管封好的箱子，满足约定条件（比如见到死亡证明）才交出来。手里没有钥匙。'), T('Ask your notary first: whether they accept encrypted media, and on what terms.', '先问清楚公证处：收不收加密介质，按什么条件交付。')],
      [T('Your own account', '你自己的账户'), T('The box sits in your cloud drive or mailbox. After long inactivity, the platform\'s own after-death tool shares it with your contact.', '箱子放在你自己的网盘或邮箱里。账户长期不活动后，由平台自带的身后机制分享给你指定的联系人。'), T('Platform rules change. Check them once a year.', '平台规则会变，每年核对一次。')],
      [T('A time-lock layer', '时间锁'), T('An extra layer that nobody can open before a set date. Renewed each time you check in.', '再套一层锁，约定日期之前谁都打不开。每次报到时顺延。'), T('Depends on an outside network staying up. Use it as an extra layer, not the only one.', '依赖外部网络一直运行，只能当附加层，不能当唯一一层。')],
      [T('Keepers only', '只交给开启人'), T('Keepers hold both the shares and the box.', '开启人同时拿着份额和箱子。'), T('Any quorum can open at any time. Silence and veto become promises between people. You must tick “I understand”.', '凑够人数就能随时打开，静默期和否决期只是人与人之间的约定。你必须勾选"我知道"。')],
    ];
    return `${pageHero({ lang, slug: 'keepers', title: T('Key Room', '钥匙房'), lede: T('Your key is split into shares. No single person can open anything. It takes two of three, or whatever number you choose, and the box itself is held somewhere else.', '你的钥匙被拆成几份。任何一个人单独都打不开。默认要三份中的两份，人数你可以自己定；箱子本身则放在别处。') , image: 'three-keys', alt: T('Three hands each holding a piece of one broken brass key', '三只手各拿着一把铜钥匙的一截')})}
<section class="block"><div class="wrap split">
  <div class="reveal">
    ${sectionHead(T('Keepers', '开启人'), T('Choose people, not passwords.', '选人，不是选密码。'))}
    <ul class="clean">
      <li><span class="mark">01</span><span>${T('Three is a good number: someone technical, someone from your family, and someone who lives elsewhere.', '三个人比较合适：一位懂技术的，一位家人，一位住在别处的人。')}</span></li>
      <li><span class="mark">02</span><span>${T('Each keeper agrees first, and may step down at any time.', '每位开启人都要先同意，也随时可以退出。')}</span></li>
      <li><span class="mark">03</span><span>${T('A share lives on paper or steel. Never photographed, never sent in a chat app.', '份额写在纸上或刻在钢板上。不拍照，不发到任何聊天软件。')}</span></li>
      <li><span class="mark">04</span><span>${T('Once a year, each keeper checks their own share alone. Keepers never gather to compare.', '每年一次，开启人各自单独核对自己那一份。开启人从不聚在一起核对。')}</span></li>
      <li><span class="mark">05</span><span>${T('A keeper may refuse to publish anything, or to shut anything down. A keeper may not refuse to destroy what is purely private.', '开启人可以拒绝公开任何东西，也可以拒绝关停任何东西；但不能拒绝销毁纯属隐私的东西。')}</span></li>
    </ul>
  </div>
  <figure class="figure tall reveal"><img src="/assets/img/reading-room-sm.jpg" alt="${T('A sealed box on a long table between two lamps', '两盏台灯之间，长桌上放着一个封好的盒子')}" loading="lazy"><figcaption>${T('Box on the table · two keys required', '桌上的箱子 · 需要两把钥匙')}</figcaption></figure>
</div></section>
<section class="block"><div class="wrap">
  ${sectionHead(T('Custodians', '保管方'), T('Who holds the box.', '箱子交给谁。'), T('Keeping the key and the box apart is the whole trick. Without it, waiting periods are only promises.', '钥匙和箱子分开放，这就是全部的诀窍。做不到这一点，所有等待期都只是口头约定。'))}
  <div class="catalog">${custodians.map(([n, d, limit], i) => card({ acc: `K-0${i + 1}`, title: n, fields: [[T('How', '方式'), d], [T('Limit', '局限'), limit]], stamp: i === 3 ? T('Read twice', '看两遍') : '' })).join('')}</div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'half-life',
  title: { en: 'Department of Half-life', zh: '时效科' },
  description: { en: 'Every wish has a half-life: binding, then advisory, then archive. Why the dead should not rule the living.', zh: '每条心愿都有时效：先照办，再参考，最后存档。为什么逝者不该统治活着的人。' },
  render: (lang) => {
    const T = t(lang);
    return `${pageHero({ lang, slug: 'half-life', title: T('Department of Half-life', '时效科'), lede: T('A wish should matter most just after you have gone, and less as the years pass. The living need room. This department measures how long each wish may bind them.', '你刚走的时候，你的心愿最该被照办；时间越久，就越该退到一边。活着的人需要空间。这个科室负责测量每条心愿能约束他们多久。'), image: 'thaw', alt: T('Ice breaking up on a lake at sunrise, a paper boat on the open water', '日出时湖冰开化，一只纸船漂在水面上') })}
<section class="block"><div class="wrap">
  <div class="panel halflife reveal" data-halflife>
    <div class="hl-status"><span>${T('Years since', '离开后')} <b data-hl-years>0</b> ${T('years', '年')}</span><span>${T('Stage', '阶段')}: <b data-hl-stage>${T('Binding', '照办')}</b></span></div>
    <p class="hl-sentence" data-hl-sentence>${T('“Keep the website online. Renew the domain every year.”', '"网站继续开着，域名每年续费。"')}</p>
    <input class="hl-range" type="range" min="0" max="20" step="0.5" value="0" aria-label="${T('Years since', '离开后的年数')}" data-hl-range data-labels='${JSON.stringify(lang === 'zh' ? ['照办', '参考', '存档'] : ['Binding', 'Advisory', 'Archive'])}'>
    <div class="hl-ticks"><span>${T('Binding · 0–2 y', '照办 · 0–2 年')}</span><span>${T('Advisory · to 10 y', '参考 · 到第 10 年')}</span><span>${T('Archive', '存档')}</span></div>
  </div>
</div></section>
<section class="block"><div class="wrap grid three">
  <div class="panel reveal"><span class="num">0–2 ${T('YEARS', '年')}</span><h3>${T('Binding', '照办')}</h3><p class="muted">${T('Do what it says, unless the law or safety says otherwise.', '照着做，除非法律或安全另有要求。')}</p></div>
  <div class="panel reveal"><span class="num">2–10 ${T('YEARS', '年')}</span><h3>${T('Advisory', '参考')}</h3><p class="muted">${T('Weigh it as advice from someone who loved you. The living decide.', '把它当成一个爱你的人留下的建议来掂量。决定权在活着的人手里。')}</p></div>
  <div class="panel reveal"><span class="num">10+ ${T('YEARS', '年')}</span><h3>${T('Archive', '存档')}</h3><p class="muted">${T('Remembered, quoted, never enforced. The Department of Letting Go, next door, helps old lists expire on purpose. We believe things should end.', '被记住，被引用，不再被执行。隔壁的放手科负责让旧清单按时到期、作废。本馆相信，东西应该有终点。')}</p></div>
</div></section>
<section class="block"><div class="wrap split">
  <div class="reveal">
    ${sectionHead(T('Asymmetry', '不对称'), T('Publishing is hard. Forgetting is easy.', '公开很难，遗忘很容易。'))}
    <p class="lede">${T('Kafka asked his friend to burn his manuscripts. The friend refused, and we have The Trial. A default cannot count on that kind of luck. So making something public needs the most: consent per item while you are alive, a cooling period, two keepers. Destroying something purely private needs the least, and no keeper can refuse it.', '卡夫卡让朋友烧掉手稿。朋友没照做，我们才有了《审判》。默认规则不能指望这种好运。所以"公开"门槛最高：生前逐项同意、冷静期、两位开启人签字。"销毁纯隐私"门槛最低，而且没有开启人能拒绝。')}</p>
  </div>
  <div class="reveal">${card({ acc: 'HL-RULE-4', title: T('Rule for agents', '给 agent 的规矩'), fields: [[T('Must', '必须'), T('Label the stage and cite the source, every time.', '每次都标出所处阶段，注明出处。')], [T('Example', '示例'), T('In March 2026 they wrote: “…” (core §3 · advisory · AI-assisted)', '他在 2026 年 3 月写道："……"（正文 §3 · 参考 · AI 整理）')], [T('Never', '不得'), T('Speak in the first person. Decide for the family.', '用第一人称说话；替家人做决定。')]], stamp: T('Filed', '已归档') })}</div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'open-stacks',
  title: { en: 'Open Stacks', zh: '开架区' },
  description: { en: 'Writing that people chose, item by item, to leave in the open. A library, not a memorial.', zh: '人们逐项同意后公开留下的文字。这是图书馆，不是纪念馆。' },
  render: (lang, ctx) => {
    const T = t(lang);
    const items = ctx.stacks.map((s) => card({ acc: s.accession, title: `<a href="${href(lang, 'open-stacks/' + s.slug)}">${esc(s[lang].title)}</a>`, fields: [[T('Author', '作者'), esc(s[lang].author)], [T('Shelved', '上架'), esc(s[lang].date)]], body: `<p class="mt-1">${esc(s[lang].excerpt)}</p>`, stamp: T('Open', '开架') })).join('');
    return `${pageHero({ lang, slug: 'open-stacks', title: T('Open Stacks', '开架区'), lede: T('Most of what we write melts. Some of it is worth leaving where anyone can read it. Everything on these shelves was put here by its author, item by item.', '我们写下的大部分东西都会化掉，但有一些值得留在谁都能读到的地方。这些书架上的每一样，都是作者自己逐项放上来的。') })}
<section class="block"><div class="wrap">
  ${sectionHead(T('Shelf', '书架'), T('Recently shelved.', '最近上架。'))}
  <div class="catalog">${items}</div>
</div></section>
<section class="block"><div class="wrap grid three">
  <div class="panel reveal"><span class="num">01</span><h3>${T('How to shelve', '怎么上架')}</h3><p class="muted">${T('Open a pull request in the repository with your text and your consent line. A librarian files it and gives it a number.', '在仓库里提交一个 pull request，附上文字和你的同意声明。馆员会登记并编号。')}</p><a href="${REPO}/tree/main/catalog/open-stacks">${T('The shelf on GitHub →', 'GitHub 上的书架 →')}</a></div>
  <div class="panel reveal"><span class="num">02</span><h3>${T('How to withdraw', '怎么撤回')}</h3><p class="muted">${T('Ask, and it comes down. No reasons needed. Copies others made are beyond our reach, and we say so plainly.', '提出就撤下，不需要理由。别人已经做的副本我们管不到，这一点我们直说。')}</p></div>
  <div class="panel reveal"><span class="num">03</span><h3>${T('Families', '家属')}</h3><p class="muted">${T('If a text names you or hurts you, tell a librarian. Third parties are anonymised, and objections are heard.', '如果某篇文字提到了你或伤害了你，请告诉馆员。涉及第三方的信息会去标识化，异议会被认真对待。')}</p></div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'projects',
  title: { en: 'Project Wing', zh: '项目馆' },
  description: { en: 'Personal and open-source projects, their maintainers, their handover notes, their successors and their archives. We record links, never code.', zh: '个人项目和开源项目：维护者、交接文档、接班人和存档。我们只登记链接，从不保存代码。' },
  image: '/assets/img/forest-rows.jpg',
  render: (lang, ctx) => {
    const T = t(lang);
    const items = ctx.projects.map((p) => card({
      acc: p.accession,
      title: `<a href="${esc(p.url)}" rel="noopener">${esc(p.name)}</a>`,
      fields: [
        [T('What', '是什么'), esc(p.summary[lang] || p.summary.en)],
        [T('Kept by', '维护'), esc(p.maintainers.map((m) => m.name).join(', '))],
        [T('Handover', '交接'), p.handoff_doc ? `<a href="${esc(p.handoff_doc)}" rel="noopener">${T('notes', '文档')}</a>` : '—'],
        [T('Successor', '接班'), esc(p.successor.named ? T('named', '已指定') : (p.successor.note?.[lang] || T('not yet', '尚未指定')))],
        [T('Archives', '存档'), p.archives.map((a) => `<a href="${esc(a.url)}" rel="noopener">${esc(a.type)}</a>`).join(' · ')],
        [T('Since', '入藏'), esc(p.since)],
      ],
      stamp: p.status === 'active' ? T('Active', '在维护') : esc(p.status),
      stampClass: 'ice',
    })).join('');
    return `${pageHero({ lang, slug: 'projects', title: T('Project Wing', '项目馆'), lede: T('Projects outlive their makers more often than plans do. This wing records who keeps a project going, where its handover notes are, who carries on, and where copies are archived. We record links. We never store your code.', '项目比计划更常活过它的作者。这一翼登记：谁在维护一个项目、交接文档在哪、谁来接班、副本存在哪。我们只登记链接，从不保存你的代码。'), image: 'forest-rows', alt: T('A young spruce forest planted in rows, deep snow, one warm light far away', '一排排年轻的云杉，深雪，远处一点暖光') })}
<section class="block"><div class="wrap">
  ${sectionHead(T('Catalog', '目录'), T('On the shelves.', '已上架。'))}
  <div class="catalog">${items}</div>
</div></section>
<section class="block"><div class="wrap split">
  <div class="reveal">
    ${sectionHead(T('Succession', '接班'), T('Five things that keep a project alive.', '让一个项目活下去的五件事。'))}
    <ul class="clean">
      <li><span class="mark">01</span><span>${T('A handover file in the repository, such as AGENTS.md: what it is, how to build it, how to release it, who to ask.', '仓库里放一份交接文档，比如 AGENTS.md：它是什么、怎么构建、怎么发布、该问谁。')}</span></li>
      <li><span class="mark">02</span><span>${T('A named second maintainer with real access, not just good intentions.', '一位有名有姓、真正有权限的第二维护者，而不只是一份好意。')}</span></li>
      <li><span class="mark">03</span><span>${T('The platform\'s own successor settings, where they exist.', '平台自带的继任者设置，有就用上。')}</span></li>
      <li><span class="mark">04</span><span>${T('Archived copies outside the platform you build on.', '在你开发所用的平台之外，再存一份副本。')}</span></li>
      <li><span class="mark">05</span><span>${T('Domains and billing written into somebody\'s Ice Core, so the lights stay on.', '把域名和账单写进某个人的交接清单，好让灯继续亮着。')}</span></li>
    </ul>
  </div>
  <div class="panel ice-edge reveal">
    <span class="num">${T('ACCESSION REQUEST', '入藏申请')}</span>
    <h3>${T('List a project', '登记一个项目')}</h3>
    <p class="muted">${T('Open an accession request on GitHub. Tell us the link, the maintainers, where the handover notes live and where copies are archived. A librarian files the card.', '在 GitHub 上提交一份入藏申请，告诉我们链接、维护者、交接文档在哪、副本存在哪。馆员会为它建一张卡片。')}</p>
    <a class="btn mt-1" href="${REPO}/issues/new?template=project-accession.yml">${T('Open an accession request', '提交入藏申请')}</a>
  </div>
</div></section>
<section class="block"><div class="wrap">
  ${sectionHead(T('The Long Shelf', '长架'), T('Works that outlived their makers.', '比作者活得更久的作品。'), T('Each of these lost a founder or a core maker, and someone carried on. Facts checked on 2026-10-04, each with a source. Shown with respect, not as a warning.', '这些项目都失去过创始人或核心作者，然后有人接着做了下去。2026-10-04 核实，每条都有出处。陈列它们是出于敬意，不是为了吓人。'))}
  <div class="shelf reveal">${LONG_SHELF.map((r) => `<div class="shelf-row"><span class="yr">${r.year}</span><div><b>${esc(r.work)}</b><span class="who-made">${esc(T(r.maker_en, r.maker_zh))}</span></div><p>${esc(T(r.now_en, r.now_zh))}</p><a href="${r.src}" rel="noopener">${T('Source', '出处')}</a></div>`).join('')}</div>
  <div class="panel mt-3 reveal"><span class="num">${T('ONE SETTING, FIVE MINUTES', '一个设置，五分钟')}</span><h3>${T('Name a GitHub successor.', '给你的 GitHub 指定一位继任者。')}</h3><p class="muted">${T('Settings → Account → Successor settings. If you can no longer manage your account, your successor can archive your public repositories or transfer them, after GitHub checks a death certificate (7 days) or an obituary (21 days). They cannot log in as you and do not get your private repositories. Write the rest into your Ice Core.', '设置 → Account → Successor settings。当你无法再管理账户时，继任者在 GitHub 核实死亡证明（等 7 天）或讣告（等 21 天）后，可以归档或转移你的公开仓库。他不能登录你的账户，也拿不到私有仓库。其余的，写进你的交接清单。')} ${ext('https://docs.github.com/en/account-and-profile/concepts/personal-repository-access-and-collaboration', T('GitHub docs', 'GitHub 文档'))}</p></div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'reading-room',
  title: { en: 'Reading Room', zh: '阅览室' },
  description: { en: 'Offline tools to write, seal, check and open an Ice Core. Everything runs on your own machine.', zh: '整理、封存、核对、开启交接清单的离线工具。全部在你自己的电脑上运行。' },
  image: '/assets/img/lake-reading.jpg',
  render: (lang) => {
    const T = t(lang);
    return `${pageHero({ lang, slug: 'reading-room', title: T('Reading Room', '阅览室'), lede: T('Everything here runs on your own machine. Nothing you type reaches us. The tools are not audited yet: use them for drills before you trust them with anything real.', '这里的一切都在你自己的电脑上运行，你输入的任何东西都不会到我们这里。工具还没有经过安全审计：先用来演练，再决定要不要托付真东西。'), image: 'lake-reading', alt: T('A reading hall with brass lamps and a window wall onto a frozen lake and snow mountains', '阅览大厅里亮着铜台灯，整面落地窗外是冰湖和雪山') })}
<section class="block"><div class="wrap grid three">
  <div class="panel ice-edge reveal"><span class="num">${T('NO AI', '不用 AI')}</span><h3>${T('Printed questionnaire', '纸质问卷')}</h3><p class="muted">${T('Thirty questions on paper. The safest way to start.', '三十道题，写在纸上。最稳妥的开始方式。')}</p><a href="${REPO}/blob/main/skills/exit-interview/${lang === 'zh' ? 'questionnaire.zh.md' : 'questionnaire.en.md'}">${T('Open the questionnaire →', '打开问卷 →')}</a></div>
  <div class="panel ice-edge reveal"><span class="num">${T('YOUR AI', '你自己的 AI')}</span><h3>${T('Exit Interview skill', '整理谈话技能')}</h3><p class="muted">${T('Give this skill to the assistant you already use. It asks, it outlines, it never writes in your voice, and it stops if you are not okay.', '把这个技能交给你正在用的 AI 助手。它负责提问和列提纲，从不用你的口吻写，发现你状态不好就会停下。')}</p><a href="${REPO}/blob/main/skills/exit-interview/SKILL.md">${T('Read the skill →', '查看技能 →')}</a></div>
  <div class="panel ice-edge reveal"><span class="num">CLI</span><h3>${T('Command-line tool', '命令行工具')}</h3><p class="muted">${T('Seal, split, check and open, with the age and SLIP-39 reference implementations underneath.', '封存、拆分、核对、开启。底层用的是 age 和 SLIP-39 的参考实现。')}</p><a href="${REPO}/tree/main/cli">${T('Install the tool →', '安装工具 →')}</a></div>
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
    <div class="notice warn"><strong>${T('A seven-day cooling period.', '七天冷静期。')}</strong> ${T('The first seal waits seven days after you start. Things written in a bad week deserve a second look.', '从开始写到第一次封存，中间要等七天。在糟糕的一周里写下的东西，值得再看一遍。')}</div>
    <div class="notice mt-1">${T('Exact cryptography, file formats and every field are in the specification. If this page and the spec disagree, the spec wins.', '加密细节、文件格式和每一个字段都写在规范里。如果这一页和规范说法不一致，以规范为准。')} <a href="${REPO}/blob/main/spec/v0.1/${lang === 'zh' ? 'SPEC.zh.md' : 'SPEC.md'}">${T('Read the spec →', '阅读规范 →')}</a></div>
  </div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'librarians',
  title: { en: 'Register of Librarians', zh: '馆员名册' },
  description: { en: 'Librarians file projects, review deposits, run drills and translate. Numbers are unique and not given out in order.', zh: '馆员负责登记项目、审核寄存、组织演练、做翻译。编号独一无二，不按注册顺序发放。' },
  render: (lang) => {
    const T = t(lang);
    const oath = lang === 'zh'
      ? ['我不保管别人的钥匙。', '我从不独自开箱。', '我转述逝者，不替逝者说话。', '我不以此收钱。', '我每年回来看一眼。', '我尊重活着的人。', '到时候，我放手。']
      : ['I hold no one\'s keys.', 'I never open a box alone.', 'I quote the dead. I do not speak for them.', 'I take no money for this.', 'I come back once a year to look.', 'I defer to the living.', 'When it is time, I let go.'];
    return `${pageHero({ lang, slug: 'librarians', image: 'mountain-station', alt: T('A small station with one lit window on a snowy ridge under the aurora', '极光下雪山脊上一座亮着一扇窗的小站'), title: T('Register of Librarians', '馆员名册'), lede: T('Librarians keep this place. They file projects, review deposits, run drills and translate. Each has a number. Numbers are not given out in order, and short or memorable ones are held back for events and contributors.', '馆员照看这个地方：登记项目、审核寄存、组织演练、做翻译。每人有一个编号。编号不按注册顺序发放，短号和好记的号码留给活动和贡献者。') })}
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
  <div class="panel reveal"><span class="num">${T('OFFICE OF NUMBERS', '馆员编号处')}</span><h3>${T('Numbers follow no pattern.', '编号没有规律。')}</h3><p class="muted">${T('Numbers are issued at random between 100000 and 999999. Everything below 100000 and every memorable number is locked in a cabinet for events and contributors: repeated digits, runs, mirrors, round numbers, and numbers that mean something here, such as 78, 520, 1004 and 2114. Reserved numbers cannot be sold, traded or transferred, and they carry no authority. Each one is granted with a public reason. A retired number is never issued again.', '编号在 100000 到 999999 之间随机发放。100000 以下的号码和所有好记的号码都锁在柜子里，留给活动和贡献者：重复数、顺子、回文、整数，以及在本馆有含义的数字，比如 78、520、1004、2114。靓号不能买卖、交换或转让，也不代表任何权限，每一个都会公开写明发放理由。注销的编号永不再发。')}</p></div>
  <div class="panel reveal"><span class="num">${T('CALENDAR', '馆历')}</span><h3>${T('Observances', '馆内节日')}</h3>
    <dl class="kv">
      <dt>03-31</dt><dd>${T('Duplicate Day. Keepers check that their share still exists.', '复本日：开启人确认自己那一份还在、还找得到。')}</dd>
      <dt>${T('Qingming', '清明')}</dt><dd>${T('Annual Review Day. Look at your list once. Check your keepers can still be reached.', '年检日：回来看一眼自己的清单，确认开启人还联系得上。')}</dd>
      <dt>05-20</dt><dd>${T('Keeper Day. Thank someone who holds a share for you.', '开启人日：谢谢那位替你保管一份钥匙的人。')}</dd>
      <dt>10-04</dt><dd>${T('Founding Day. The front desk stays empty, as usual.', '建馆日：前台照常没有人。')}</dd>
      <dt>${T('Solstice', '冬至')}</dt><dd>${T('Warm Room Day. The longest night; the whole building turns warm. Call a keeper. Do not mention the list.', '暖房日：一年中最长的夜，整座楼变暖。给开启人打个电话，不谈清单，只问好。')}</dd>
      <dt>12-31</dt><dd>${T('Letting Go Day. Retire what you no longer need.', '放手日：把不再需要的嘱托撤下来。')}</dd>
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
      <dt>${T('Reviewed Librarian', '年检馆员')}</dt><dd>${T('Came back for a first Annual Review.', '回来做过第一次年检。')}</dd>
      <dt>${T('Docent', '导览员')}</dt><dd>${T('Helped someone deposit, confirmed by that person. Never paid, never pushed.', '帮别人完成过一次入藏，并由对方确认。从不收钱，从不催促。')}</dd>
      <dt>${T('Conservator', '修缮员')}</dt><dd>${T('Code, docs, translation, design, accessibility or a security report accepted into the project.', '代码、文档、翻译、设计、无障碍改进或安全报告被项目采纳。')}</dd>
      <dt>${T('Steward of the Stacks', '馆务托管人')}</dt><dd>${T('A long-standing conservator. Keeps the rules; gives no orders.', '长期的修缮员。负责守规矩，不负责发号施令。')}</dd>
    </dl>
    <p class="faint mt-1">${T('Badges, not ranks: Night Warden (a responsible security disclosure) · Interpreter (a translation) · Released (retired an old list on purpose) · Dormant (away for two years; a state, not a penalty). No rank can open anyone else\'s box, the founder\'s included.', '徽章不算等级：守夜人（负责任地披露过安全问题）· 译员（贡献过一种语言的翻译）· 已放手（亲手让一份旧清单到期作废）· 冬眠中（两年没来，这是状态，不是惩罚）。任何等级都打不开别人的箱子，创始馆员也不例外。')}</p>
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
  description: { en: 'Every cost, every drill and the shutdown plan, in the open.', zh: '每一笔开支、每一次演练和停运方案，全部公开。' },
  render: (lang) => {
    const T = t(lang);
    const rows = [
      [T('Funding', '资金来源'), T('The founding librarian, personally', '创始馆员个人出资')],
      [T('Investors', '投资人'), T('None, by rule', '没有，这是规矩')],
      [T('Sponsors from brokers, exchanges, funeral homes, insurers', '券商、交易所、殡葬、保险机构的赞助'), T('Refused, by rule', '一律拒绝，这是规矩')],
      [T('Domain', '域名'), T('coldlibrary.com · about US$10 a year', 'coldlibrary.com · 每年约 10 美元')],
      [T('Hosting', '网站托管'), T('Static pages and one small registration service', '静态页面加一个很小的注册服务')],
      [T('Register database', '名册数据库'), T('Usage-based, expected under US$2 a month', '按用量计费，预计每月不到 2 美元')],
      [T('Annual operating cap', '年度运营上限'), T('CNY 20,000. Above it, features are cut.', '人民币 2 万元，超过就砍功能。')],
      [T('Last full drill', '上次完整演练'), T('None yet', '还没有')],
      [T('Tools audited', '工具是否审计'), T('No. Use for drills.', '没有。仅用于演练。')],
      [T('Spec version', '规范版本'), 'v0.1'],
    ];
    return `${pageHero({ lang, slug: 'ledger', title: T('Ledger Room', '账本室'), lede: T('A library that asks for trust should show its books. Every cost and every drill is written here.', '一座要别人信任的图书馆，应该把账本摊开。每一笔开支、每一次演练都写在这里。') })}
<section class="block"><div class="wrap split">
  <div class="reveal">${rows.map(([k, v]) => `<div class="ledger-row"><span>${k}</span><span>${v}</span></div>`).join('')}</div>
  <div class="reveal">
    <div class="panel"><span class="num">${T('IF WE CLOSE', '如果我们关门')}</span><h3>${T('The shutdown protocol', '停运协议')}</h3>
      <ul class="dash muted">
        <li>${T('At least twelve months of notice.', '至少提前十二个月公告。')}</li>
        <li>${T('The spec and the code stay public, forever free to fork.', '规范和代码永远公开，任何人都可以复刻。')}</li>
        <li>${T('The domain passes to a named successor, or points to an archive page.', '域名交给指定的继任者，或者指向一个存档页面。')}</li>
        <li>${T('Every librarian gets a final notice; the register is then deleted.', '每位馆员会收到最后一封通知，然后名册数据会被删除。')}</li>
        <li>${T('Your Ice Core is unaffected: it was never here.', '你的交接清单不受影响：它本来就不在这里。')}</li>
      </ul>
    </div>
    <div class="panel mt-2"><span class="num">${T('WHAT WE STORE', '我们存了什么')}</span><h3>${T('Stored, and not stored.', '存了什么，没存什么。')}</h3>
      <dl class="kv">
        <dt>${T('Stored', '存了')}</dt><dd>${T('For librarians only: email, pen name, number, language, whether you are listed, and dates. A salted hash of your network address for one day, to stop abuse.', '只针对馆员：邮箱、笔名、编号、语言、是否公开、日期。另外，为了防滥用，会把你的网络地址加盐散列后保存一天。')}</dd>
        <dt>${T('Never stored', '从不保存')}</dt><dd>${T('Ice Cores, letters, keys, shares, plaintext, interview answers, cookies, analytics.', '交接清单、信、钥匙、份额、明文、整理谈话的回答、Cookie、统计数据。')}</dd>
      </dl>
    </div>
    <div class="notice mt-1">${T('No cookies. No analytics. No third-party scripts. Fonts are served from this domain.', '没有 Cookie，没有统计分析，没有第三方脚本。字体从本站加载。')}</div>
  </div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'rules',
  title: { en: 'House Rules', zh: '馆规' },
  description: { en: 'What Cold Library will never do: hold keys, impersonate the dead, ask for money in a notice, or pretend to be a will.', zh: '冷冻图书馆永远不会做的事：保管钥匙、扮演逝者、在通知里要钱、假装自己是遗嘱。' },
  render: (lang) => {
    const T = t(lang);
    const never = lang === 'zh'
      ? ['保管钥匙、份额、明文、箱子、资产或钱。', '担任遗嘱执行人、遗产管理人、受托人或代理人。', '说一份交接清单就是法律遗嘱。', '用第一人称替逝者说话，克隆声音或面孔，或者陪家属聊天。', '在任何页面出现填写助记词、私钥或密码的输入框。', '在通知里放链接、向你要钱、让你输入或下载任何东西。', '在网站上做任何在线加密。', '放统计脚本、追踪器或第三方代码。', '发币、拿风险投资、按资产规模收费、收券商交易所殡葬保险的钱。', '删除你的文件。']
      : ['Hold keys, shares, plaintext, boxes, assets or money.', 'Act as an executor, administrator, trustee or agent.', 'Call an Ice Core a legal will.', 'Speak for the dead in the first person, clone a voice or a face, or chat with the family.', 'Show an input field for a recovery phrase, a private key or a password.', 'Put a link in a notice, ask for money, or ask you to type or download anything.', 'Run any online cryptography on this website.', 'Load analytics, trackers or third-party code.', 'Issue a token, take venture money, charge by the size of your assets, or take money from brokers, exchanges, funeral homes or insurers.', 'Delete your files.'];
    return `${pageHero({ lang, slug: 'rules', image: 'corridor', alt: T('A long institutional corridor ending at a frosted vault door', '一条长长的走廊，尽头是结了霜的金库门'), title: T('House Rules', '馆规'), lede: T('This page is kept by the Department of Things We Do Not Do, the busiest department in the building. If we ever break one of these rules, this page is the evidence.', '这一页由不办科负责，它是全馆最忙的科室。如果哪天我们违反了其中一条，这一页就是证据。') })}
<section class="block"><div class="wrap split">
  <div class="reveal">
    ${sectionHead(T('Never', '永远不会'), T('Cold Library will never:', '冷冻图书馆永远不会：'))}
    <ul class="clean">${never.map((l, i) => `<li><span class="mark">${String(i + 1).padStart(2, '0')}</span><span>${esc(l)}</span></li>`).join('')}</ul>
  </div>
  <div class="reveal">
    <div class="panel ember-edge"><span class="num ember-text">${T('NOT A FAREWELL TOOL', '这不是告别工具')}</span><h3>${T('If you are not okay, stop here.', '如果你现在不太好，先停在这里。')}</h3><p class="muted">${T('Nothing here is meant for a bad night. If you are thinking about ending your life, please go to the Warm Room first, or call someone now.', '这里没有任何东西是为糟糕的夜晚准备的。如果你在想结束自己的生命，请先去暖房，或者现在就给人打个电话。')}</p><a class="btn ember mt-1" href="${href(lang, 'warm-room')}">${T('The Warm Room', '去暖房')}</a></div>
    <div class="panel mt-2"><span class="num">${T('AGE', '年龄')}</span><h3>${T('Eighteen and over.', '只对 18 岁以上的人开放。')}</h3><p class="muted">${T('The interview checks that you are an adult and alone before it begins.', '整理谈话开始前，会先确认你已成年，并且是一个人在场。')}</p></div>
  </div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: 'name',
  title: { en: 'The Name', zh: '名字' },
  description: { en: 'Why cold, why a library, why 78° north, and where the old word cold harbour comes from.', zh: '为什么是冷、为什么是图书馆、为什么是北纬 78 度，以及"冷港"这个老词从哪来。' },
  render: (lang) => {
    const T = t(lang);
    return `${pageHero({ lang, slug: 'name', title: T('The Name', '名字'), lede: T('Cold is how things last. A library is how they are found again.', '冷，是东西能留得久的办法；图书馆，是东西能被再次找到的办法。') })}
<section class="block"><div class="wrap grid two">
  <div class="panel reveal"><span class="num">78°14′N · −18 °C</span><h3>${T('Cold', '冷')}</h3><p class="muted">${T('Under a mountain in Svalbard, about 78 degrees north, seeds from around the world are kept at minus eighteen degrees. Nearby, in a former coal mine, the Arctic World Archive keeps data on film, including a snapshot of public code from 2020. In Antarctica, an ice-core sanctuary now keeps samples of mountain glaciers for scientists who have not been born yet.', '在斯瓦尔巴的一座山里，大约北纬 78 度，来自全世界的种子在零下十八度保存。不远处一座废弃的煤矿里，北极世界档案馆把数据存在胶片上，其中包括 2020 年的一份公开代码快照。在南极，一座冰芯圣所正在为还没出生的科学家保存高山冰川的样本。')}</p>
  <p class="faint">${ext('https://www.seedvault.no/', 'seedvault.no')} · ${ext('https://www.arcticworldarchive.org/', 'arcticworldarchive.org')} · ${ext('https://www.cnrs.fr/en/press/ice-memory-foundation-opens-first-ever-sanctuary-mountain-ice-cores-antarctica-storing-these', 'CNRS · Ice Memory')}</p></div>
  <div class="panel reveal"><span class="num">2014 → 2114</span><h3>${T('Library', '图书馆')}</h3><p class="muted">${T('In 2014 the artist Katie Paterson planted a thousand trees outside Oslo. Each year one writer gives the Future Library a manuscript, which stays unread in a quiet room of the city\'s public library until 2114, when the trees become the paper. A library can promise to wait.', '2014 年，艺术家凯蒂·帕特森在奥斯陆城外种下一千棵树。每年有一位作家把一份手稿交给"未来图书馆"，手稿存放在奥斯陆公共图书馆的一间静室里，没人读过，一直要等到 2114 年，那时这些树会被做成纸。图书馆可以承诺等待。')}</p>
  <p class="faint">${ext('https://katiepaterson.org/now/future-library/', 'katiepaterson.org')}</p></div>
  <div class="panel reveal"><span class="num">CEALD + HEREBEORG</span><h3>${T('Cold harbour', '冷港')}</h3><p class="muted">${T('Coldharbour is an old English place name. Place-name scholars read it as Old English cald here-beorg: a cold shelter, a lodging in the open. Folklore pictures a roadside hut with no keeper and no fire, where you brought your own fuel; that part is a story, not a record. We kept the story as a house rule.', 'Coldharbour 是英国的一个老地名。地名学者把它解释为古英语 cald here-beorg：冷的庇护所，野外的住处。民间说法里，它是路边一间没人看守、没有炉火的歇脚屋，柴火要自己带——这一段是传说，不是史料。我们把这个传说留下来，当作馆规。')}</p>
  <p class="faint">${ext('https://southoxfordhistory.org.uk/images/photos/Local_history_section/Abingdon_Road/Coldharbour_notes_on_place_name_by_Tim_Healey_Oct_2018.pdf', 'South Oxford History')} · ${ext('https://en.wikipedia.org/wiki/Coldharbour', 'Wikipedia')}</p></div>
  <div class="panel reveal"><span class="num">冷冻 · −18 °C</span><h3>${T('冷冻图书馆', '冷冻图书馆')}</h3><p class="muted">${T('The Chinese name means “frozen library”. Seeds in Svalbard are frozen at minus eighteen degrees, and decades later they can still be sown. Freezing is a pause, not an end. That is what we want for the things people leave here.', '冷冻，是种子库对种子做的事：在零下十八度冻起来，几十年后拿出来，照样能播种。冷冻是暂停，不是结束。我们希望人们留在这里的东西也是这样。')}</p></div>
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
  description: { en: 'If you are not okay, start here. Crisis lines and a few quiet words.', zh: '如果你现在不太好，先从这里开始。心理援助热线，和几句安静的话。' },
  image: '/assets/img/warm-room.jpg',
  bodyClass: 'warm-room',
  render: (lang) => {
    const T = t(lang);
    return `${pageHero({ lang, slug: 'warm-room', title: T('The Warm Room', '暖房'), lede: T('This is the only warm room in the building. If you are thinking about ending your life, please stay here for a moment. This library is not a farewell tool.', '这是整座楼里唯一一间暖和的房间。如果你在想结束自己的生命，请在这里待一会儿。这座图书馆不是告别工具。'), image: 'warm-room', alt: T('A small room with an orange lamp and a wool blanket', '一盏橘色的灯和一条羊毛毯的小房间') })}
<section class="block"><div class="wrap narrow">
  <div class="reveal">
    <div class="hotline"><span>${T('Mainland China · national psychological assistance hotline', '中国大陆 · 全国统一心理援助热线')}</span><b>12356</b></div>
    <div class="hotline"><span>${T('United States · Suicide & Crisis Lifeline', '美国 · 自杀与危机生命线')}</span><b>988</b></div>
    <div class="hotline"><span>${T('Anywhere else · find a free, local helpline', '其他地区 · 查找当地的免费热线')}</span><b><a href="https://findahelpline.com" rel="noopener">findahelpline.com</a></b></div>
    <div class="hotline"><span>${T('In immediate danger', '有紧急危险时')}</span><b>${T('Local emergency number', '当地急救电话')}</b></div>
  </div>
  <div class="reveal mt-3">
    <p class="lede">${T('You can come back to the library later. It will still be cold. It can wait.', '你可以晚些时候再回到图书馆。它还会是冷的，它可以等。')}</p>
    <p class="muted">${T('If someone you love has died and you are holding their keys: you do not have to do everything at once. The rules allow for waiting. Start with the people, then the bills, then the rest.', '如果你爱的人走了，而你手里拿着他们的钥匙：不用一次做完所有事。规矩允许等待。先照顾人，再处理账单，其余的慢慢来。')}</p>
  </div>
</div></section>`;
  },
});

/* ------------------------------------------------------------------ */
page({
  slug: '404',
  title: { en: 'Released', zh: '已放手' },
  description: { en: 'This shelf is empty.', zh: '这个书架是空的。' },
  render: (lang) => {
    const T = t(lang);
    return `<section class="page-hero"><div class="wrap">
  <div class="floor-big"><span class="floor">?</span>${T('Floor unknown', '楼层未知')}</div>
  <h1>${T('This page has been released.', '这一页已被放手。')}</h1>
  <p class="lede">${T('It did its job. Or it never had one. Either is fine. Things also get misfiled here; the directory is always open.', '它完成了自己的使命，或者从来没有过，都可以。东西偶尔也会被放错架，楼层指示一直开着。')}</p>
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
  <div class="floor-big"><span class="floor">2</span>${T('Open Stacks', '开架区')} · ${esc(item.accession)}</div>
  <h1>${esc(s.title)}</h1>
  <p class="coords">${esc(s.author)} · ${esc(s.date)}</p>
</div></section>
<section class="block"><div class="wrap narrow prose">${md(s.body)}
<p class="mt-3"><a href="${href(lang, 'open-stacks')}">← ${T('Back to the Open Stacks', '回到开架区')}</a></p></div></section>`;
    },
  };
}
