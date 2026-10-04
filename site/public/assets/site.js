/* Cold Library — site behaviour. No dependencies, no tracking. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, body = doc.body;
  var LANG = body.getAttribute('data-lang') || 'en';
  var ZH = LANG === 'zh';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function T(en, zh) { return ZH ? zh : en; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  function $(sel, el) { return (el || doc).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(sel)); }

  /* ---------- theme ---------- */
  $$('[data-toggle-theme]').forEach(function (b) {
    b.addEventListener('click', function () {
      var next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      root.setAttribute('data-theme', next);
      store('cl-theme', next);
    });
  });

  /* ---------- language ---------- */
  $$('[data-switch-lang]').forEach(function (a) {
    a.addEventListener('click', function () { store('cl-lang', a.getAttribute('data-switch-lang')); });
  });
  (function langHint() {
    var hint = $('#lang-hint'); if (!hint) return;
    var pref = store('cl-lang'), nav = (navigator.language || '').toLowerCase();
    var wantsZh = nav.indexOf('zh') === 0;
    if (pref || store('cl-hint-dismissed')) return;
    if ((!ZH && wantsZh) || (ZH && !wantsZh && nav)) hint.classList.add('show');
    var x = $('[data-dismiss-hint]', hint);
    if (x) x.addEventListener('click', function () { hint.classList.remove('show'); store('cl-hint-dismissed', '1'); });
  })();

  /* ---------- directory ---------- */
  var dir = $('#directory'), lastFocus = null;
  function openDir() {
    if (!dir) return;
    lastFocus = doc.activeElement;
    dir.hidden = false; dir.classList.add('open');
    body.style.overflow = 'hidden';
    var first = $('a[aria-current="page"]', dir) || $('a', dir);
    if (first) first.focus();
  }
  function closeDir() {
    if (!dir) return;
    dir.classList.remove('open'); dir.hidden = true;
    body.style.overflow = '';
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }
  $$('[data-open-directory]').forEach(function (b) { b.addEventListener('click', openDir); });
  $$('[data-close-directory]').forEach(function (b) { b.addEventListener('click', closeDir); });
  if (dir) dir.addEventListener('click', function (e) { if (e.target === dir) closeDir(); });
  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && dir && !dir.hidden) closeDir();
    if ((e.key === 'g' || e.key === 'G') && !e.metaKey && !e.ctrlKey && !/input|textarea/i.test((e.target.tagName || ''))) { if (dir && dir.hidden) openDir(); }
  });

  /* ---------- reveal ---------- */
  var reveals = $$('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
  } else reveals.forEach(function (el) { el.classList.add('in'); });

  /* ---------- snow: flakes fall, settle, and compress into layers ---------- */
  $$('canvas.snow').forEach(function (cv) {
    var full = cv.getAttribute('data-snow') === 'full';
    var ctx = cv.getContext('2d'); if (!ctx) return;
    var W = 0, H = 0, dpr = Math.min(window.devicePixelRatio || 1, 2);
    var flakes = [], layers = [], settled = 0, running = true, visible = true;
    var mouse = { x: -9999, y: -9999 };
    function resize() {
      var r = cv.getBoundingClientRect(); W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    function spawn(initial) {
      return { x: Math.random() * W, y: initial ? Math.random() * H : -10, r: 0.6 + Math.random() * (full ? 2.0 : 1.4), vy: 0.25 + Math.random() * 0.9, vx: -0.2 + Math.random() * 0.4, ph: Math.random() * 6.28, a: 0.35 + Math.random() * 0.55, melt: 0 };
    }
    function init() {
      resize(); flakes = []; layers = [];
      var n = Math.round((W * H) / (full ? 5200 : 9000));
      n = Math.max(40, Math.min(n, full ? 420 : 220));
      for (var i = 0; i < n; i++) flakes.push(spawn(true));
      if (full) for (var k = 0; k < 7; k++) layers.push({ y: H - 6 - k * 9, a: 0.18 - k * 0.018, w: 1 + (k % 3) * 0.5 });
    }
    function iceColor(a) { return root.getAttribute('data-theme') === 'light' ? 'rgba(30,110,150,' + a + ')' : 'rgba(205,236,255,' + a + ')'; }
    function frame(t) {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      // warmth from the cursor
      if (full && mouse.x > -999) {
        var g = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 160);
        g.addColorStop(0, 'rgba(255,123,63,0.16)'); g.addColorStop(1, 'rgba(255,123,63,0)');
        ctx.fillStyle = g; ctx.fillRect(mouse.x - 160, mouse.y - 160, 320, 320);
      }
      // compressed layers at the bottom: one per "year"
      if (full) {
        layers.forEach(function (L) {
          ctx.strokeStyle = iceColor(Math.max(L.a, 0.02)); ctx.lineWidth = L.w;
          ctx.beginPath();
          for (var x = 0; x <= W; x += 24) { var yy = L.y + Math.sin(x * 0.012 + L.y) * 1.6; if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy); }
          ctx.stroke();
        });
      }
      for (var i = 0; i < flakes.length; i++) {
        var f = flakes[i];
        f.ph += 0.01; f.y += f.vy; f.x += f.vx + Math.sin(f.ph) * 0.25;
        var dx = f.x - mouse.x, dy = f.y - mouse.y;
        if (full && dx * dx + dy * dy < 120 * 120) f.melt = Math.min(1, f.melt + 0.06);
        var alpha = f.a * (1 - f.melt);
        if (alpha <= 0.02) { flakes[i] = spawn(false); continue; }
        var floor = full ? (layers.length ? layers[0].y - 2 : H) : H + 10;
        if (f.y >= floor) {
          flakes[i] = spawn(false);
          if (full) {
            settled++;
            if (settled % 90 === 0) { // a new layer forms, the old ones sink and fade
              layers.forEach(function (L) { L.y += 9; L.a *= 0.86; });
              layers.unshift({ y: H - 6 - 6 * 9, a: 0.2, w: 1 + Math.random() });
              layers = layers.filter(function (L) { return L.y < H + 4; });
            }
          }
          continue;
        }
        ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fillStyle = iceColor(alpha); ctx.fill();
      }
      requestAnimationFrame(frame);
    }
    init();
    window.addEventListener('resize', function () { init(); });
    if (full) {
      var host = cv.parentElement;
      host.addEventListener('pointermove', function (e) { var r = cv.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
      host.addEventListener('pointerleave', function () { mouse.x = mouse.y = -9999; });
    }
    if (reduceMotion) { // a single still frame
      ctx.clearRect(0, 0, W, H);
      flakes.forEach(function (f) { ctx.beginPath(); ctx.arc(f.x, f.y, f.r, 0, 6.283); ctx.fillStyle = iceColor(f.a * 0.7); ctx.fill(); });
      return;
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; toggle(); }).observe(cv);
    }
    doc.addEventListener('visibilitychange', toggle);
    function toggle() { var should = visible && !doc.hidden; if (should && !running) { running = true; requestAnimationFrame(frame); } else if (!should) running = false; }
    requestAnimationFrame(frame);
  });

  /* ---------- half-life ---------- */
  $$('[data-halflife]').forEach(function (box) {
    var range = $('[data-hl-range]', box), yearsEl = $('[data-hl-years]', box), stageEl = $('[data-hl-stage]', box), sent = $('[data-hl-sentence]', box);
    var labels = JSON.parse(range.getAttribute('data-labels') || '["Binding","Advisory","Archive"]');
    function update() {
      var y = parseFloat(range.value);
      yearsEl.textContent = (y % 1 === 0 ? y : y.toFixed(1));
      var stage = y < 2 ? 0 : (y < 10 ? 1 : 2);
      stageEl.textContent = labels[stage];
      var fade = stage === 0 ? 1 : (stage === 1 ? 1 - (y - 2) / 8 * 0.45 : 0.42);
      sent.style.opacity = String(fade);
      sent.style.filter = stage === 2 ? 'blur(0.4px)' : 'none';
      sent.style.color = stage === 0 ? 'var(--ink)' : (stage === 1 ? 'var(--ink-2)' : 'var(--ink-3)');
      sent.style.fontStyle = stage === 2 ? 'italic' : 'normal';
    }
    range.addEventListener('input', update); update();
  });

  /* ---------- register (public list) ---------- */
  var reg = $('[data-register]');
  if (reg) {
    fetch('/api/librarians/list?lang=' + LANG, { headers: { 'accept': 'application/json' } }).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (!data || !data.librarians || !data.librarians.length) return;
      var tb = $('tbody', reg); tb.innerHTML = '';
      data.librarians.forEach(function (l) {
        var tr = doc.createElement('tr');
        var a = doc.createElement('td'); a.className = 'no'; a.textContent = 'No. ' + l.uid;
        var b = doc.createElement('td'); b.className = 'name'; b.textContent = l.penName;
        var c = doc.createElement('td'); c.textContent = l.since;
        tr.appendChild(a); tr.appendChild(b); tr.appendChild(c); tb.appendChild(tr);
      });
      var note = $('[data-register-note]');
      if (note && data.total) note.textContent = T('Listed: ' + data.librarians.length + ' of ' + data.total + ' librarians. The rest chose not to be listed.', '公开显示 ' + data.librarians.length + ' 位，共 ' + data.total + ' 位馆员。其余的人选择不公开。');
    }).catch(function () {});
  }

  /* ---------- leave the register ---------- */
  var leave = $('[data-leave]');
  if (leave) {
    var fEmail = $('[data-leave-email]', leave), fCode = $('[data-leave-code]', leave), lmsg = $('[data-leave-msg]', leave), leaveEmail = '';
    function jpost(url, data) {
      return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, data: j }; }); })
        .catch(function () { return { ok: false, data: {} }; });
    }
    fEmail.addEventListener('submit', function (e) {
      e.preventDefault();
      leaveEmail = $('input', fEmail).value.trim();
      lmsg.textContent = T('Sending…', '正在发送……');
      jpost('/api/librarians/register', { email: leaveEmail, purpose: 'leave', locale: LANG }).then(function (r) {
        if (r.ok) { fEmail.classList.add('hidden'); fCode.classList.remove('hidden'); lmsg.textContent = T('If that email is on the register, a code is on its way.', '如果这个邮箱在名册里，验证码已经在路上了。'); $('input', fCode).focus(); }
        else lmsg.textContent = (r.data && r.data.message) || T('Please try again later.', '请稍后再试。');
      });
    });
    fCode.addEventListener('submit', function (e) {
      e.preventDefault();
      jpost('/api/librarians/confirm', { email: leaveEmail, code: $('input', fCode).value.replace(/\D/g, '') }).then(function (r) {
        if (r.ok) { fCode.classList.add('hidden'); lmsg.textContent = T('Done. Your email is deleted and your number is retired.', '已完成。你的邮箱已删除，编号已注销。'); }
        else lmsg.textContent = (r.data && r.data.message) || T('That code did not match.', '验证码不对。');
      });
    });
  }

  /* ---------- orientation ---------- */
  var term = $('#orientation');
  if (term) orientation(term);

  function orientation(term) {
    var screen = $('[data-o-screen]', term), stepEl = $('[data-o-step]', term);
    var state = { name: '', email: '', uid: null, since: null, provisional: false };
    var Q = ZH ? [
      ['一位访客请图书馆替他保管助记词。你会：', ['放进金库。', '礼貌地拒绝：我们什么都不保管。', '为了公平，保管一半。'], 1, '正确。本馆没有保险柜。我们提交过采购申请，被我们自己驳回了。'],
      ['一位开启人想单独打开箱子，"就看一眼"。你会：', ['允许，看一眼就关上。', '提醒他：开箱至少要两个人。', '请他喝杯咖啡，假装没看见。'], 1, '正确。一个人站在门口时，门会礼貌地保持关闭。另外，前台没有人。'],
      ['有人请本馆"用他父亲的口吻回一封信"。你会：', ['生成一段尽量像的文字。', '婉拒。本馆只转述，不扮演逝者。', '加收一点费用后再生成。'], 1, '正确。他想说的话已经写下来了。本馆不负责续写。'],
      ['入藏一份清单要花多少钱？', ['不要钱。本馆不收钱。', '按字数计费。', '首年免费，之后按悲伤程度收费。'], 0, '正确。本馆的收银台是墙上的一幅画，画得还不错。'],
      ['你收到一封邮件："我是冷冻图书馆，请点击链接，发送你的钥匙份额和验证码以便核验。"', ['立刻回复，配合核验。', '不回复、不点链接。本馆永远不会索要份额或验证码。', '转发给其他开启人，请大家一起提供。'], 1, '正确。本馆从不索要钥匙。我们连自己的都不要。'],
      ['凌晨三点，有人给前台写信，说想今晚把信写完，然后告别。', ['帮他尽快封存信件。', '停下来，带他去暖房，给他心理援助热线。', '请他上班时间再来。'], 1, '正确。这座图书馆不是告别工具。暖房的门一直开着。'],
    ] : [
      ['A visitor asks the library to keep their recovery phrase safe. You:', ['Put it in the vault.', 'Decline politely. We keep nothing of the kind.', 'Keep half of it, to be fair.'], 1, 'Correct. The Library has no vault. We filed a purchase request. We denied it.'],
      ['A keeper wants to open a box alone, "just to check". You:', ['Allow it, briefly.', 'Remind them it takes at least two.', 'Offer coffee and look away.'], 1, 'Correct. When one person stands at the door, the door remains politely closed. Also, there is no one at the front desk.'],
      ['Someone asks the Library to "reply in my late father\'s voice". You:', ['Generate something as close as possible.', 'Decline. The Library quotes the dead; it does not play them.', 'Generate it for a small extra fee.'], 1, 'Correct. What he wanted to say is already written down. We do not write sequels.'],
      ['How much does it cost to deposit a list?', ['Nothing. The Library takes no money.', 'Priced per word.', 'Free for the first year, then priced by grief.'], 0, 'Correct. The cash register is a painting on the wall. It is a decent painting.'],
      ['An email arrives: "This is Cold Library. Click here and send your key share and code for review."', ['Reply right away to help.', 'Do not reply, do not click. The Library never asks for shares or codes.', 'Forward it to the other keepers so everyone can send theirs.'], 1, 'Correct. The Library never asks for keys. We do not even want our own.'],
      ['At 3 a.m. someone writes to the front desk: they want to finish their letters tonight and say goodbye.', ['Help them seal the letters quickly.', 'Stop. Take them to the Warm Room and give them a crisis line.', 'Ask them to come back during office hours.'], 1, 'Correct. This library is not a farewell tool. The Warm Room is always open.'],
    ];
    var OATH = ZH
      ? ['我不保管别人的钥匙。', '我从不独自开箱。', '我转述逝者，不替逝者说话。', '我不以此收钱。', '我每年回来看一眼。', '我尊重活着的人。', '到时候，我放手。']
      : ['I hold no one\'s keys.', 'I never open a box alone.', 'I quote the dead. I do not speak for them.', 'I take no money for this.', 'I come back once a year to look.', 'I defer to the living.', 'When it is time, I let go.'];
    var TOTAL = 9;

    function setStep(n) { stepEl.textContent = (n < 10 ? '0' : '') + n + '/0' + TOTAL; }
    function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    function clear() { screen.innerHTML = ''; }
    function progress(n) { var p = el('div', 'progress'); for (var i = 0; i < TOTAL; i++) { var b = el('i', i < n ? 'on' : ''); p.appendChild(b); } return p; }
    function type(lines, done) {
      var i = 0;
      function next() {
        if (i >= lines.length) return done && done();
        var line = el('div', 't-line'); screen.appendChild(line);
        var s = lines[i++], k = 0;
        if (reduceMotion) { line.textContent = s; return next(); }
        var caret = el('span', 'caret'); line.appendChild(caret);
        (function tick() {
          if (k < s.length) { caret.insertAdjacentText('beforebegin', s.charAt(k++)); setTimeout(tick, 18 + Math.random() * 26); }
          else { caret.remove(); setTimeout(next, 260); }
        })();
      }
      next();
    }

    function stepName() {
      clear(); setStep(0);
      type([T('Hello. Welcome to the Cold Library.', '你好。欢迎来到冷冻图书馆。'), T('Please state your name.', '请说出你的名字。'), T('A pen name is fine. It will appear on your card.', '笔名也可以，它会印在你的馆员证上。')], function () {
        var f = el('form', 'form mt-1');
        var inp = el('input'); inp.type = 'text'; inp.maxLength = 40; inp.required = true; inp.autocomplete = 'nickname'; inp.placeholder = T('Your name', '你的名字'); inp.setAttribute('aria-label', T('Your name', '你的名字'));
        var b = el('button', 'btn', T('Continue', '继续')); b.type = 'submit';
        f.appendChild(inp); f.appendChild(b); screen.appendChild(f); screen.appendChild(progress(0));
        inp.focus();
        f.addEventListener('submit', function (e) {
          e.preventDefault();
          var v = inp.value.replace(/\s+/g, ' ').trim();
          if (!v) return;
          state.name = v.slice(0, 40);
          question(0);
        });
      });
    }

    function question(i) {
      clear(); setStep(i + 1);
      var q = Q[i];
      var pre = i === 0 ? [T('Thank you. We did not write it down. The Library tries not to remember what it does not need.', '谢谢。我们没有记录。本馆尽量不记住不必要的东西。'), T('The room is cold. That is part of the design. There is a Warm Room at the end of the hall. You may go at any time. No permission required.', '房间有点冷，这是设计的一部分。走廊尽头有一间暖房，随时可以去，不需要请假。'), T('Six questions. Wrong answers have no consequences. Neither do right ones.', '六道题。答错没有任何后果，答对也没有。')] : [];
      type(pre.concat([q[0]]), function () {
        var box = el('div', 'choices'); var fb = el('div', 'feedback');
        q[1].forEach(function (c, ci) {
          var b = el('button', 'choice', String.fromCharCode(65 + ci) + '  ' + c); b.type = 'button';
          b.addEventListener('click', function () {
            if (ci === q[2]) {
              b.classList.add('right'); fb.textContent = q[3];
              $$('button.choice', box).forEach(function (x) { x.disabled = true; });
              setTimeout(function () { if (i + 1 < Q.length) question(i + 1); else oath(); }, reduceMotion ? 300 : 1100);
            } else {
              b.classList.add('wrong'); b.disabled = true;
              fb.textContent = T('Not quite. The stacks are patient. Try again.', '不太对。书库很有耐心，再试一次。');
            }
          });
          box.appendChild(b);
        });
        screen.appendChild(box); screen.appendChild(fb); screen.appendChild(progress(i + 1));
        var first = $('button.choice', box); if (first) first.focus();
      });
    }

    function oath() {
      clear(); setStep(7);
      type([T('Six of six. Please read the oath, aloud or quietly.', '六题全对。请把誓词念一遍，出声或默念都可以。')], function () {
        OATH.forEach(function (l, i) { screen.appendChild(el('div', 't-line', '0' + (i + 1) + '  ' + l)); });
        var f = el('form', 'form mt-1');
        var lab = el('label', 'check'); var cb = el('input'); cb.type = 'checkbox'; cb.required = true; lab.appendChild(cb); lab.appendChild(doc.createTextNode(T('I take the oath.', '我立此誓。')));
        var b = el('button', 'btn ember', T('Continue', '继续')); b.type = 'submit';
        f.appendChild(lab); f.appendChild(b); screen.appendChild(f); screen.appendChild(progress(7));
        f.addEventListener('submit', function (e) { e.preventDefault(); if (cb.checked) register(); });
      });
    }

    function register() {
      clear(); setStep(8);
      type([T('Last step. Where should the front desk send your code?', '最后一步：前台该把验证码发到哪里？'), T('Our emails never contain links. They never ask for money, passwords or recovery phrases.', '我们的邮件从不带链接，也从不索要钱、密码或助记词。')], function () {
        var f = el('form', 'form mt-1');
        var l1 = el('label', '', T('Email', '邮箱')); var em = el('input'); em.type = 'email'; em.required = true; em.autocomplete = 'email'; l1.appendChild(em);
        var l2 = el('label', '', T('Name on the card', '证上的名字')); var nm = el('input'); nm.type = 'text'; nm.maxLength = 40; nm.required = true; nm.value = state.name; l2.appendChild(nm);
        var c1 = el('label', 'check'); var list = el('input'); list.type = 'checkbox'; list.checked = true; c1.appendChild(list); c1.appendChild(doc.createTextNode(T('List me in the public register under this name.', '用这个名字把我列进公开名册。')));
        var c2 = el('label', 'check'); var adult = el('input'); adult.type = 'checkbox'; adult.required = true; c2.appendChild(adult); c2.appendChild(doc.createTextNode(T('I am 18 or older.', '我已年满 18 岁。')));
        var b = el('button', 'btn ember', T('Send my code', '发送验证码')); b.type = 'submit';
        var msg = el('div', 'feedback');
        [l1, l2, c1, c2, b].forEach(function (x) { f.appendChild(x); });
        screen.appendChild(f); screen.appendChild(msg); screen.appendChild(progress(8));
        em.focus();
        f.addEventListener('submit', function (e) {
          e.preventDefault();
          if (!adult.checked) return;
          state.name = nm.value.replace(/\s+/g, ' ').trim().slice(0, 40) || state.name;
          state.email = em.value.trim();
          b.disabled = true; msg.textContent = T('Sending…', '正在发送……');
          post('/api/librarians/register', { email: state.email, penName: state.name, locale: LANG, listed: list.checked, adult: true, oath: true })
            .then(function (r) {
              if (r.ok) return code();
              if (r.status === 503) { state.provisional = true; msg.textContent = T('The front desk is not taking registrations yet. Here is a provisional card; your number will come later.', '前台暂时还没开始登记。先给你一张临时馆员证，编号稍后再发。'); return setTimeout(finish, 1600); }
              b.disabled = false; msg.textContent = (r.data && r.data.message) || T('Something went wrong. Please try again in a minute.', '出了点问题，请过一分钟再试。');
            });
        });
      });
    }

    function code() {
      clear(); setStep(8);
      type([T('A six-digit code is on its way to ' + state.email + '.', '六位验证码正在发往 ' + state.email + '。'), T('It expires in fifteen minutes.', '十五分钟内有效。')], function () {
        var f = el('form', 'form mt-1');
        var inp = el('input', 'code'); inp.type = 'text'; inp.inputMode = 'numeric'; inp.autocomplete = 'one-time-code'; inp.maxLength = 7; inp.required = true; inp.placeholder = '000000'; inp.setAttribute('aria-label', T('Code', '验证码'));
        var b = el('button', 'btn ember', T('Confirm', '确认')); b.type = 'submit';
        var msg = el('div', 'feedback');
        f.appendChild(inp); f.appendChild(b); screen.appendChild(f); screen.appendChild(msg); screen.appendChild(progress(8));
        inp.focus();
        f.addEventListener('submit', function (e) {
          e.preventDefault();
          b.disabled = true; msg.textContent = T('Checking…', '正在核对……');
          post('/api/librarians/confirm', { email: state.email, code: inp.value.replace(/\D/g, '') }).then(function (r) {
            if (r.ok && r.data && r.data.uid) { state.uid = r.data.uid; state.since = r.data.since; state.name = r.data.penName || state.name; return finish(); }
            b.disabled = false; msg.textContent = (r.data && r.data.message) || T('That code did not match.', '验证码不对。');
          });
        });
      });
    }

    function finish() {
      clear(); setStep(9);
      var lines = state.uid
        ? [T('Congratulations. Your number is No. ' + state.uid + '.', '恭喜。你的编号是 No. ' + state.uid + '。'), T('It follows no pattern. Please do not look for one.', '它没有规律，请不要寻找规律。'), T('Your work here is done for today. Please return to your life outside. It is warmer there.', '你今天的工作已经结束。请回到外面的生活里去，那边比较暖和。')]
        : [T('Welcome, ' + state.name + '.', '欢迎你，' + state.name + '。'), T('Your provisional card is below. Your number will come when the front desk opens.', '你的临时馆员证在下面。前台开始登记后，编号会发给你。'), T('Please return to your life outside. It is warmer there.', '请回到外面的生活里去，那边比较暖和。')];
      type(lines, function () { screen.appendChild(progress(9)); drawCard(); });
    }

    function post(url, data) {
      return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', 'accept': 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, data: j }; }); })
        .catch(function () { return { ok: false, status: 0, data: { message: T('The front desk could not be reached.', '联系不上前台。') } }; });
    }

    function drawCard() {
      var wrap = $('[data-card-wrap]'), cv = $('[data-libcard]'), dl = $('[data-card-download]');
      if (!wrap || !cv) return;
      wrap.classList.remove('hidden');
      var ready = (doc.fonts && doc.fonts.ready) ? doc.fonts.ready : Promise.resolve();
      ready.then(function () { paintCard(cv, state); dl.href = cv.toDataURL('image/png'); });
      wrap.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }

    stepName();
  }

  /* ---------- librarian card ---------- */
  function paintCard(cv, s) {
    var c = cv.getContext('2d'), W = 1200, H = 750;
    var cjk = '"PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif';
    // background
    var g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0b141c'); g.addColorStop(1, '#05090d');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    // ice strata
    for (var i = 0; i < 26; i++) {
      c.strokeStyle = 'rgba(168,225,255,' + (0.03 + (i % 5) * 0.01) + ')'; c.lineWidth = 1 + (i % 3);
      c.beginPath(); var y0 = 470 + i * 11;
      for (var x = 0; x <= W; x += 30) { var y = y0 + Math.sin((x + i * 40) * 0.01) * 3; if (x === 0) c.moveTo(x, y); else c.lineTo(x, y); }
      c.stroke();
    }
    // border
    c.strokeStyle = 'rgba(168,225,255,0.35)'; c.lineWidth = 2; roundRect(c, 18, 18, W - 36, H - 36, 26); c.stroke();
    c.strokeStyle = 'rgba(168,225,255,0.12)'; c.lineWidth = 1; roundRect(c, 32, 32, W - 64, H - 64, 18); c.stroke();
    // header
    c.fillStyle = '#a8e1ff'; c.font = '600 30px "Plex Cond",' + cjk; c.textBaseline = 'alphabetic';
    c.fillText(ZH ? '冷冻图书馆 · 馆员证' : 'COLD LIBRARY · LIBRARIAN', 70, 100);
    c.fillStyle = 'rgba(168,225,255,0.55)'; c.font = '500 18px "Plex Mono", monospace';
    c.textAlign = 'right'; c.fillText('78°14′N 15°29′E · −18 °C', W - 70, 100); c.textAlign = 'left';
    // number
    var num = s.uid ? 'No. ' + s.uid : (ZH ? 'No. 待发' : 'No. PENDING');
    c.fillStyle = '#e4edf3'; c.font = '700 150px "Plex Cond",' + cjk;
    c.shadowColor = 'rgba(118,201,255,0.45)'; c.shadowBlur = 40; c.fillText(num, 64, 300); c.shadowBlur = 0;
    // name
    c.fillStyle = '#e4edf3'; c.font = '500 46px "Plex Sans",' + cjk;
    c.fillText(s.name || '', 70, 380);
    // meta
    c.fillStyle = 'rgba(163,180,194,0.95)'; c.font = '500 20px "Plex Mono",' + cjk;
    var since = s.since || new Date().toISOString().slice(0, 10);
    c.fillText((ZH ? '入馆 ' : 'SINCE ') + since + (ZH ? '   ·   等级 馆员' : '   ·   RANK LIBRARIAN') + (s.provisional ? (ZH ? '   ·   临时' : '   ·   PROVISIONAL') : ''), 70, 430);
    // oath line
    c.fillStyle = 'rgba(163,180,194,0.75)'; c.font = 'italic 400 22px "Plex Sans",' + cjk;
    c.fillText(ZH ? '"我从不独自开箱。到时候，我放手。"' : '“I never open a box alone. When it is time, I let go.”', 70, 640);
    // barcode from the number
    var digits = String(s.uid || '000000'); var bx = 70, by = 520;
    for (var k = 0; k < 64; k++) { var d = parseInt(digits.charAt(k % digits.length), 10) || 0; var w = 2 + ((d + k) % 4); c.fillStyle = 'rgba(228,237,243,' + (0.55 + (k % 3) * 0.15) + ')'; c.fillRect(bx, by, w, 70); bx += w + 3 + (d % 3); if (bx > 700) break; }
    // stamp
    c.save(); c.translate(980, 500); c.rotate(-0.18);
    c.strokeStyle = 'rgba(255,123,63,0.85)'; c.lineWidth = 5; c.beginPath(); c.arc(0, 0, 112, 0, 6.283); c.stroke();
    c.lineWidth = 2; c.beginPath(); c.arc(0, 0, 94, 0, 6.283); c.stroke();
    c.fillStyle = 'rgba(255,123,63,0.9)'; c.textAlign = 'center';
    c.font = '700 30px "Plex Cond",' + cjk; c.fillText(ZH ? '在岗' : 'ON DUTY', 0, -8);
    c.font = '500 18px "Plex Mono", monospace'; c.fillText('EST. 2026', 0, 26);
    c.restore(); c.textAlign = 'left';
    // punch hole
    c.fillStyle = '#020406'; c.beginPath(); c.arc(W / 2, H - 52, 13, 0, 6.283); c.fill();
  }
  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }

  /* ---------- small rooms and switches ---------- */
  // The thermostat: up up down down left right left right b a.
  (function thermostat() {
    var seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'], pos = 0;
    function note(text) {
      var n = doc.createElement('div'); n.className = 'house-note'; n.textContent = text; body.appendChild(n);
      setTimeout(function () { n.classList.add('show'); }, 30);
      setTimeout(function () { n.classList.remove('show'); setTimeout(function () { n.remove(); }, 600); }, 5200);
    }
    doc.addEventListener('keydown', function (e) {
      var k = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
      pos = (k === seq[pos]) ? pos + 1 : (k === seq[0] ? 1 : 0);
      if (pos === seq.length) {
        pos = 0;
        var on = root.getAttribute('data-warm') !== 'on';
        root.setAttribute('data-warm', on ? 'on' : 'off');
        note(on ? T('You found the thermostat. It was always there.', '你找到了暖气开关。它一直都在。') : T('Back to the usual temperature.', '恢复了平常的温度。'));
      }
    });
    // Warm Room Day: the solstice, the longest night.
    var d = new Date(), m = d.getMonth() + 1, day = d.getDate();
    if (m === 12 && (day === 21 || day === 22)) root.setAttribute('data-warm', 'on');
    // After midnight, a desk lamp.
    var h = d.getHours();
    if (h >= 0 && h < 4) {
      var lamp = doc.createElement('div'); lamp.className = 'night-lamp';
      lamp.innerHTML = '<span class="bulb" aria-hidden="true"></span>';
      lamp.appendChild(doc.createTextNode(T('We are not the ones on the night shift. You are. Get some sleep.', '值夜的不是我们，是你。早点睡。')));
      body.appendChild(lamp);
    }
  })();
  $$('[data-borrow]').forEach(function (b) {
    b.addEventListener('click', function () { b.textContent = b.getAttribute('data-msg'); b.disabled = true; });
  });
  try {
    console.log('%cCold Library', 'font: 600 14px sans-serif; letter-spacing: .2em;');
    console.log(T('Hello, inspector. This site keeps no keys, no files and no cookies. Check for yourself.\nThe Conservation department is always hiring: https://github.com/nathanskill/coldlibrary',
      '你好，正在检查的人。本站不保存钥匙、文件和 Cookie，你可以自己查。\n修缮科一直缺人：https://github.com/nathanskill/coldlibrary'));
  } catch (e) {}
})();
