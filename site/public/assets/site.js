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

  /* ---------- parallax ---------- */
  var plx = $$('[data-parallax]');
  if (plx.length && !reduceMotion) {
    var ticking = false;
    function paint() {
      ticking = false;
      var vh = window.innerHeight;
      plx.forEach(function (n) {
        var r = n.parentNode.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) return;
        var k = parseFloat(n.getAttribute('data-parallax')) || 0.15;
        n.style.transform = 'translate3d(0,' + ((r.top + r.height / 2 - vh / 2) * -k).toFixed(1) + 'px,0)';
      });
    }
    window.addEventListener('scroll', function () { if (!ticking) { ticking = true; requestAnimationFrame(paint); } }, { passive: true });
    paint();
  }

  /* ---------- orientation ---------- */
  var term = $('#orientation');
  if (term) orientation(term);

  function orientation(term) {
    var screen = $('[data-o-screen]', term), stepEl = $('[data-o-step]', term);
    var state = { name: '', anon: false, desk: '', email: '', uid: null, since: null, provisional: false };
    // [choice, label on the card, reply]. Every desk is a good desk.
    var DESKS = [
      [T('By the window, facing the lake', '靠窗，面朝冰湖'), T('Window', '靠窗'), T('The view is excellent. The draught is included.', '风景很好，漏风免费。')],
      [T('Deep in the Closed Stacks', '闭架书库深处'), T('Closed Stacks', '闭架书库'), T('Quiet. Nobody will find you there. That is the idea.', '很安静，没人找得到你。这正是重点。')],
      [T('Next to the Warm Room', '暖房隔壁'), T('Warm Room', '暖房隔壁'), T('Sensible. Go in as often as you like.', '明智。想去几次都行。')],
      [T('The Front Desk', '前台'), T('Front Desk', '前台'), T('Bold. It has been empty since 2026. Welcome.', '大胆。前台从 2026 年起就没人。欢迎。')],
    ];
    var OATH = ZH
      ? ['我不保管别人的钥匙。', '我从不独自开箱。', '我转述逝者，不替逝者说话。', '我不以此收钱。', '我每年回来看一眼。', '我尊重活着的人。', '到时候，我放手。']
      : ['I hold no one\'s keys.', 'I never open a box alone.', 'I quote the dead. I do not speak for them.', 'I take no money for this.', 'I come back once a year to look.', 'I defer to the living.', 'When it is time, I let go.'];
    var TOTAL = 4, hurry = false;
    // A click anywhere on the screen finishes the typing.
    term.addEventListener('click', function (e) { if (!e.target.closest('button, input, label, a')) hurry = true; });

    function setStep(n) { stepEl.textContent = '0' + n + '/0' + TOTAL; }
    function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    function clear() { screen.innerHTML = ''; }
    function progress(n) { var p = el('div', 'progress'); for (var i = 0; i < TOTAL; i++) { var b = el('i', i < n ? 'on' : ''); p.appendChild(b); } return p; }
    function type(lines, done) {
      var i = 0; hurry = false;
      function next() {
        if (i >= lines.length) return done && done();
        var line = el('div', 't-line'); screen.appendChild(line);
        var s = lines[i++], k = 0;
        if (reduceMotion || hurry) { line.textContent = s; return next(); }
        var caret = el('span', 'caret'); line.appendChild(caret);
        (function tick() {
          if (hurry) { caret.insertAdjacentText('beforebegin', s.slice(k)); k = s.length; }
          if (k < s.length) { caret.insertAdjacentText('beforebegin', s.charAt(k++)); setTimeout(tick, 12 + Math.random() * 16); }
          else { caret.remove(); setTimeout(next, hurry ? 0 : 160); }
        })();
      }
      next();
    }

    function stepName() {
      clear(); setStep(1);
      type([T('Hello. Welcome to the Cold Library.', '你好，欢迎来到冷冻图书馆。'), T('This takes about a minute. There is no test.', '大约一分钟，不考试。'), T('What should we call you? A pen name is fine.', '怎么称呼你？笔名也行。')], function () {
        var f = el('form', 'form mt-1');
        var inp = el('input'); inp.type = 'text'; inp.maxLength = 40; inp.autocomplete = 'nickname'; inp.placeholder = T('Your name or a pen name', '名字或笔名'); inp.setAttribute('aria-label', T('Your name', '你的名字'));
        var row = el('div', 'btns mt-0');
        var b = el('button', 'btn', T('Continue', '继续')); b.type = 'submit';
        var skip = el('button', 'btn ghost', T('Stay anonymous', '匿名就好')); skip.type = 'button';
        row.appendChild(b); row.appendChild(skip);
        f.appendChild(inp); f.appendChild(row); screen.appendChild(f); screen.appendChild(progress(0));
        inp.focus();
        skip.addEventListener('click', function () { state.name = T('Anonymous Librarian', '无名馆员'); state.anon = true; desk(); });
        f.addEventListener('submit', function (e) {
          e.preventDefault();
          var v = inp.value.replace(/\s+/g, ' ').trim();
          if (!v) return skip.click();
          state.name = v.slice(0, 40); state.anon = false;
          desk();
        });
      });
    }

    function desk() {
      clear(); setStep(2);
      type([state.anon ? T('Very well. Anonymous it is.', '好的，那就匿名。') : T('Thank you, ' + state.name + '.', '谢谢你，' + state.name + '。'), T('Pick a desk. Any desk. There are no wrong answers.', '挑一张桌子，随便挑，没有错误答案。')], function () {
        var box = el('div', 'choices'); var fb = el('div', 'feedback');
        DESKS.forEach(function (d, ci) {
          var b = el('button', 'choice', String.fromCharCode(65 + ci) + '  ' + d[0]); b.type = 'button';
          b.addEventListener('click', function () {
            state.desk = d[1]; b.classList.add('right'); fb.textContent = d[2];
            $$('button.choice', box).forEach(function (x) { x.disabled = true; });
            setTimeout(oath, reduceMotion ? 300 : 1300);
          });
          box.appendChild(b);
        });
        screen.appendChild(box); screen.appendChild(fb); screen.appendChild(progress(1));
      });
    }

    function oath() {
      clear(); setStep(3);
      type([T('Here is the oath. Nothing to memorise.', '这是誓词，不用背。')], function () {
        var list = el('div', 'oath-lines');
        OATH.forEach(function (l, i) { var d = el('div', 't-line', '0' + (i + 1) + '  ' + l); d.style.animationDelay = (i * 90) + 'ms'; list.appendChild(d); });
        var b = el('button', 'btn ember mt-1', T('I take the oath', '我立此誓')); b.type = 'button';
        screen.appendChild(list); screen.appendChild(b); screen.appendChild(progress(2));
        b.addEventListener('click', register);
      });
    }

    function register() {
      clear(); setStep(4);
      type([T('Last step. Where should the front desk send your number?', '最后一步：前台把编号寄到哪里？'), T('Our emails never contain links, and never ask for money, passwords or recovery phrases.', '我们的邮件从不带链接，也从不索要钱、密码或助记词。')], function () {
        var f = el('form', 'form mt-1');
        var em = el('input'); em.type = 'email'; em.required = true; em.autocomplete = 'email'; em.placeholder = T('Your email', '你的邮箱'); em.setAttribute('aria-label', T('Email', '邮箱'));
        if (state.email) em.value = state.email;
        var c1 = el('label', 'check'); var list = el('input'); list.type = 'checkbox'; list.checked = !state.anon; c1.appendChild(list);
        c1.appendChild(doc.createTextNode(T('Show me in the public register as ' + state.name + '.', '在公开名册上显示为「' + state.name + '」。')));
        var b = el('button', 'btn ember', T('I am 18 or older · Send my code', '我已满 18 岁 · 发送验证码')); b.type = 'submit';
        var msg = el('div', 'feedback');
        [em, c1, b].forEach(function (x) { f.appendChild(x); });
        screen.appendChild(f); screen.appendChild(msg); screen.appendChild(progress(3));
        em.focus();
        f.addEventListener('submit', function (e) {
          e.preventDefault();
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
      clear(); setStep(4);
      type([T('A six-digit code is on its way to ' + state.email + '.', '六位验证码正在发往 ' + state.email + '。'), T('It expires in fifteen minutes. If it is not there, look in spam.', '十五分钟内有效。没收到的话，看看垃圾邮件。')], function () {
        var f = el('form', 'form mt-1');
        var inp = el('input', 'code'); inp.type = 'text'; inp.inputMode = 'numeric'; inp.autocomplete = 'one-time-code'; inp.maxLength = 7; inp.required = true; inp.placeholder = '000000'; inp.setAttribute('aria-label', T('Code', '验证码'));
        var row = el('div', 'btns mt-0');
        var b = el('button', 'btn ember', T('Confirm', '确认')); b.type = 'submit';
        var back = el('button', 'btn ghost', T('Use another email', '换个邮箱')); back.type = 'button';
        row.appendChild(b); row.appendChild(back);
        var msg = el('div', 'feedback');
        f.appendChild(inp); f.appendChild(row); screen.appendChild(f); screen.appendChild(msg); screen.appendChild(progress(3));
        inp.focus();
        back.addEventListener('click', register);
        // Six digits typed or pasted: confirm without another click.
        inp.addEventListener('input', function () { if (inp.value.replace(/\D/g, '').length === 6 && !b.disabled) f.requestSubmit ? f.requestSubmit() : b.click(); });
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
      clear(); setStep(4);
      var lines = state.uid
        ? [T('Congratulations. Your number is No. ' + state.uid + '.', '恭喜。你的编号是 No. ' + state.uid + '。'), T('It follows no pattern. Please do not look for one.', '它没有规律，请不要寻找规律。'), T('Your work here is done for today. Please return to your life outside. It is warmer there.', '你今天的工作已经结束。请回到外面的生活里去，那边比较暖和。')]
        : [T('Welcome, ' + state.name + '.', '欢迎你，' + state.name + '。'), T('Your provisional card is below. Your number will come when the front desk opens.', '你的临时馆员证在下面。前台开始登记后，编号会发给你。'), T('Please return to your life outside. It is warmer there.', '请回到外面的生活里去，那边比较暖和。')];
      type(lines, function () { screen.appendChild(progress(4)); drawCard(); });
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
    if (s.desk) c.fillText(ZH ? '工位 ' + s.desk : 'DESK ' + s.desk.toUpperCase(), 70, 468);
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
