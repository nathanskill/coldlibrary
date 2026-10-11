/* Cold Library — behaviour for the building pages: today's reading, the warden trial, lamps, the front desk,
   the vault simulator, librarians, catalogue lookup, printing, and two small rooms.
   No dependencies, no tracking, no inline styles: state is a class, an attribute or a custom property.
   Theme, language hint, day counter, floor directory and menu live in /assets/js/chrome.js. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, body = doc.body;
  var LANG = body.getAttribute('data-lang') || 'en';
  var ZH = LANG === 'zh';
  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function T(en, zh) { return ZH ? zh : en; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } return v; }
  function $(sel, el) { return (el || doc).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(sel)); }
  function el(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function wait(ms) { return new Promise(function (r) { setTimeout(r, reduceMotion ? 0 : ms); }); }
  // The visitor's own calendar day, not UTC: a lamp lit after midnight in Shanghai is dated that morning.
  function today() { var d = new Date(); return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2); }
  function onMedia(mq, fn) { if (mq.addEventListener) mq.addEventListener('change', fn); else if (mq.addListener) mq.addListener(fn); }
  function token(name, fallback) { var v = getComputedStyle(root).getPropertyValue(name).trim(); return v || fallback; }

  /* ---------- today's reading: one pick from Claude's shelf per local day ---------- */
  // Every pick is in the page, hidden; the build day's pick is visible. Before a swap, the pick's own font CSS is
  // loaded and the browser gets up to 600 ms to fetch its glyphs, so the poem never flashes in a fallback face.
  (function () {
    var arts = $$('article.today[data-id]');
    if (!arts.length) return;
    var cur = 0;
    arts.forEach(function (a, i) { if (!a.hidden) cur = i; });
    function dayIndex() {
      var f = (($('[data-day]') || body).getAttribute('data-founded') || '2026-10-04').split('-'), d = new Date();
      return Math.max(1, Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(+f[0], +f[1] - 1, +f[2])) / 86400000) + 1);
    }
    function ready(a) {
      var href = a.getAttribute('data-font'), p = Promise.resolve();
      if (href && !$$('link[rel="stylesheet"]').some(function (l) { return l.getAttribute('href') === href; })) {
        p = new Promise(function (res) { var l = doc.createElement('link'); l.rel = 'stylesheet'; l.href = href; l.onload = l.onerror = function () { res(); }; doc.head.appendChild(l); });
      }
      return p.then(function () {
        if (!doc.fonts || !doc.fonts.load) return;
        var text = (a.querySelector('.today-text') || a).textContent.replace(/\s+/g, '') + (a.querySelector('.today-title') || a).textContent;
        var fam = getComputedStyle(a.querySelector('.today-text') || a).fontFamily;
        return doc.fonts.load('400 20px ' + fam, text.slice(0, 600));
      });
    }
    var busy = false;
    function show(i, focus) {
      if (busy || i === cur) return;
      busy = true;
      var a = arts[i];
      Promise.race([ready(a).catch(function () {}), new Promise(function (r) { setTimeout(r, 600); })]).then(function () {
        arts.forEach(function (x, k) { x.hidden = k !== i; });
        cur = i; busy = false;
        if (focus) { var b = a.querySelector('[data-today-next]'); if (b) b.focus({ preventScroll: true }); }
      });
    }
    arts.forEach(function (a) {
      var b = a.querySelector('[data-today-next]');
      if (!b || arts.length < 2) return;
      b.hidden = false;
      b.addEventListener('click', function () { show((cur + 1) % arts.length, true); });
    });
    show((dayIndex() - 1) % arts.length, false);
  })();

  /* ---------- half-life ---------- */
  $$('[data-halflife]').forEach(function (box) {
    var range = $('[data-hl-range]', box), yearsEl = $('[data-hl-years]', box), stageEl = $('[data-hl-stage]', box), sent = $('[data-hl-sentence]', box);
    if (!range || !sent) return;
    var labels; try { labels = JSON.parse(range.getAttribute('data-labels')); } catch (e) { labels = ['Binding', 'Advisory', 'Carried on']; }
    var first = sent.textContent, carried = sent.getAttribute('data-carried') || first;
    function update() {
      var y = parseFloat(range.value), stage = y < 2 ? 0 : (y < 10 ? 1 : 2);
      yearsEl.textContent = (y % 1 === 0 ? y : y.toFixed(1)); stageEl.textContent = labels[stage];
      sent.textContent = stage === 2 ? carried : first;
      sent.classList.toggle('s1', stage === 1); sent.classList.toggle('s2', stage === 2);
      sent.style.setProperty('--hl-o', stage === 1 ? String(1 - (y - 2) / 8 * 0.35) : '1');
    }
    range.addEventListener('input', update); update();
  });

  /* ---------- register ---------- */
  var reg = $('[data-register]');
  if (reg) {
    fetch('/api/librarians/list?lang=' + LANG, { headers: { accept: 'application/json' } }).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
      if (!data || !data.librarians || !data.librarians.length) return;
      var tb = $('[data-register-rows]', reg) || $('tbody', reg); tb.innerHTML = '';
      data.librarians.forEach(function (l) {
        if (String(l.uid) === '1' || String(l.uid) === '2') return;   // the founding rows are printed by the page
        var tr = el('tr'); tr.appendChild(el('td', 'id', 'No. ' + l.uid)); tr.appendChild(el('td', '', l.penName)); tr.appendChild(el('td', 'tabular', l.since + '–'));
        tb.appendChild(tr);
      });
    }).catch(function () {});
  }
  function postJSON(url, data) {
    return fetch(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(data) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { ok: r.ok, status: r.status, data: j }; }); })
      .catch(function () { return { ok: false, status: 0, data: { message: T('The front desk could not be reached.', '联系不上前台。') } }; });
  }
  var leave = $('[data-leave]');
  if (leave) {
    var fEmail = $('[data-leave-email]', leave), fCode = $('[data-leave-code]', leave), lmsg = $('[data-leave-msg]', leave), leaveEmail = '';
    fEmail.addEventListener('submit', function (e) {
      e.preventDefault(); leaveEmail = $('input', fEmail).value.trim(); lmsg.textContent = T('Sending…', '正在发送……');
      postJSON('/api/librarians/register', { email: leaveEmail, purpose: 'leave', locale: LANG }).then(function (r) {
        if (r.ok) { fEmail.hidden = true; fCode.hidden = false; lmsg.textContent = T('If that email is on the register, a code is on its way.', '如果这个邮箱在名册里，验证码已经在路上了。'); $('input', fCode).focus(); }
        else lmsg.textContent = (r.data && r.data.message) || T('Please try again later.', '请稍后再试。');
      });
    });
    fCode.addEventListener('submit', function (e) {
      e.preventDefault();
      postJSON('/api/librarians/confirm', { email: leaveEmail, code: $('input', fCode).value.replace(/\D/g, '') }).then(function (r) {
        if (r.ok) { fCode.hidden = true; lmsg.textContent = T('Done. Your email is deleted and your number is retired.', '已完成。你的邮箱已删除，编号已注销。'); }
        else lmsg.textContent = (r.data && r.data.message) || T('That code did not match.', '验证码不对。');
      });
    });
  }

  /* ---------- crypto shared by the warden and the front desk ---------- */
  // Same scheme as tools/seal-item.mjs: PBKDF2-SHA256 over normalised answers, AES-256-GCM.
  var ITER = 210000;
  function norm(s) { try { return String(s).normalize('NFKC').toLowerCase().replace(/[\s\p{P}\p{S}]/gu, ''); } catch (e) { return String(s).toLowerCase().replace(/[\s.,!?'"“”‘’。，、！？：:；;()（）-]/g, ''); } }
  function b64d(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
  function b64e(u) { var s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }
  function hex(u) { return Array.prototype.map.call(u, function (x) { return ('0' + x.toString(16)).slice(-2); }).join(''); }
  function deriveKey(answers, salt, iter, usage) {
    var enc = new TextEncoder().encode(answers.map(norm).join('␞'));
    return crypto.subtle.importKey('raw', enc, 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt, iterations: iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, [usage]);
    });
  }
  function sha256hex(s) { return crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)).then(function (d) { return hex(new Uint8Array(d)); }); }
  function lock(answers, payload) {
    var salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
    return deriveKey(answers, salt, ITER, 'encrypt').then(function (key) {
      return crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, new TextEncoder().encode(JSON.stringify(payload)));
    }).then(function (ct) { return { kdf: { alg: 'PBKDF2-SHA256', salt: b64e(salt), iter: ITER }, locked: { alg: 'AES-256-GCM', iv: b64e(iv), ct: b64e(new Uint8Array(ct)) } }; });
  }

  /* ---------- lamps ---------- */
  function loadLamps(box) {
    var id = box.getAttribute('data-item');
    fetch('/api/lamps?item=' + encodeURIComponent(id), { headers: { accept: 'application/json' } }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d) return;
      var ul = $('[data-lamp-notes]', box); ul.innerHTML = '';
      (d.notes || []).forEach(function (n) { var li = el('li'); li.appendChild(el('span', '', n.text)); li.appendChild(el('small', '', (n.at || '').slice(0, 10) + ' · ' + T('a recognised visitor', '一位被认出的来访者'))); ul.appendChild(li); });
      var silent = Math.max(0, (d.count || 0) - (d.notes || []).length);
      if (silent) { var li2 = el('li'); li2.appendChild(el('span', '', T(silent + (silent > 1 ? ' lamps lit without a word' : ' lamp lit without a word'), silent + ' 盏灯，没有留言'))); ul.appendChild(li2); }
      var empty = $('[data-lamp-empty]', box); if (empty) empty.hidden = (d.count || 0) > 0 || (d.notes || []).length > 0;
    }).catch(function () {});
  }
  $$('[data-lamps]').forEach(loadLamps);

  /* ---------- badge: a flat card drawn in this browser, in the page's own colours ---------- */
  function badgeSVG(name, code, item) {
    var ns = 'http://www.w3.org/2000/svg';
    var c = { surface: token('--surface', 'white'), ink: token('--ink', 'black'), ink3: token('--ink-3', 'gray'), brass: token('--brass', 'goldenrod'), line: token('--line-2', 'silver') };
    var s = doc.createElementNS(ns, 'svg'); s.setAttribute('viewBox', '0 0 320 200'); s.setAttribute('xmlns', ns); s.setAttribute('role', 'img'); s.setAttribute('aria-label', name);
    function n(tag, attrs, text) { var e = doc.createElementNS(ns, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (text != null) e.textContent = text; s.appendChild(e); return e; }
    n('rect', { x: 0.5, y: 0.5, width: 319, height: 199, rx: 2, fill: c.surface, stroke: c.line });
    n('rect', { x: 0.5, y: 0.5, width: 319, height: 2, fill: c.brass });
    n('text', { x: 24, y: 40, 'font-family': 'IBM Plex Sans, PingFang SC, sans-serif', 'font-size': 12, fill: c.ink3 }, ZH ? '冷冻图书馆 · 徽章' : 'Cold Library · Badge');
    n('text', { x: 24, y: 104, 'font-family': 'IBM Plex Serif, Songti SC, serif', 'font-size': 26, fill: c.ink }, name);
    n('text', { x: 24, y: 136, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 13, fill: c.ink3 }, code || '');
    n('text', { x: 24, y: 172, 'font-family': 'IBM Plex Mono, monospace', 'font-size': 11, fill: c.ink3 }, item + ' · ' + today());
    return s;
  }

  /* ---------- the warden: one component, many doors ---------- */
  function Warden(host, data, opts) {
    opts = opts || {};
    var card = $('[data-warden]', host), screen = $('[data-w-screen]', host), state = $('[data-w-state]', host), rewards = $('[data-rewards]', host), sealed = $('[data-sealed]', host);
    var answers = [], kept = [];
    function say(text, cls) { var p = el('p', 'w-line pace' + (cls ? ' ' + cls : ''), text); screen.appendChild(p); return p; }
    function setState(cls, label) { card.classList.remove('open', 'checking'); if (cls) card.classList.add(cls); state.textContent = label; }
    var engaged = opts.focus === true;   // never steal focus on page load; follow the visitor once they answer
    function ask(i) {
      say(T('Question ' + (i + 1) + ': ', '第 ' + (i + 1) + ' 题：') + data.questions[i], 'q');
      var f = el('form', 'w-form'); var inp = el('input'); inp.type = 'text'; inp.maxLength = 80; inp.autocomplete = 'off'; inp.setAttribute('aria-label', data.questions[i]);
      if (kept[i]) inp.value = kept[i];
      var b = el('button', opts.draft ? 'btn small secondary' : 'btn small', T('Answer', '回答')); b.type = 'submit';
      f.appendChild(inp); f.appendChild(b); screen.appendChild(f);
      if (engaged) inp.focus({ preventScroll: true });
      f.addEventListener('submit', function (e) {
        e.preventDefault(); e.stopPropagation(); var v = inp.value.trim(); if (!norm(v)) { inp.focus(); return; }
        engaged = true; f.remove(); say('› ' + v, 'you'); answers.push(v);
        if (i + 1 < data.questions.length) wait(350).then(function () { ask(i + 1); }); else judge();
      });
    }
    function judge() {
      setState('checking', T('Checking', '核对中')); var c = say(T('Checking, in this browser…', '正在这个浏览器里核对……'), 'faint');
      var open = opts.open || function (a) {
        return deriveKey(a, b64d(data.kdf.salt), data.kdf.iter, 'decrypt').then(function (key) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64d(data.locked.iv) }, key, b64d(data.locked.ct)); })
          .then(function (buf) { return JSON.parse(new TextDecoder().decode(buf)); });
      };
      open(answers).then(function (payload) {
        c.remove(); setState('open', T('Open', '已打开')); say(T('Recognised. What was left for you is beside this desk.', '已认出。留给你的东西就在旁边。'), 'ok');
        reveal(payload);
      }).catch(function () {
        c.remove(); setState('', T('Locked', '已上锁'));
        say(T('That doesn’t match. The warden does not say which answer was wrong.', '对不上。守馆人不会说是哪一题错了。'), 'no');
        kept = answers.slice(); answers = [];
        var again = el('button', 'btn small secondary', T('Try again', '再试一次')); again.type = 'button';
        again.addEventListener('click', function () { again.remove(); engaged = true; ask(0); }); screen.appendChild(again);
      });
    }
    function L(o) { return o ? (o[LANG] || o.en || '') : ''; }
    function reveal(payload) {
      if (sealed) sealed.hidden = true;
      rewards.hidden = false;
      var stamp = $('[data-r-stamp]', rewards); if (stamp) stamp.textContent = T('Recognised · ', '已认出 · ') + today();
      var letter = $('[data-r-letter]', rewards); letter.innerHTML = '';
      L(payload.letter).split(/\n{2,}/).forEach(function (para) { var p = el('p'); para.split('\n').forEach(function (line, k) { if (k) p.appendChild(el('br')); p.appendChild(doc.createTextNode(line)); }); letter.appendChild(p); });
      requestAnimationFrame(function () { requestAnimationFrame(function () { letter.classList.add('clear'); letter.classList.remove('frost'); }); });
      if (payload.pointer && L(payload.pointer)) { $('[data-r-pointer-text]', rewards).textContent = L(payload.pointer); $('[data-r-pointer]', rewards).hidden = false; }
      if (payload.badge && L(payload.badge)) {
        var holder = $('[data-r-badge-svg]', rewards); holder.innerHTML = '';
        var svg = badgeSVG(L(payload.badge), payload.badge_code, data.id || T('draft', '草稿')); holder.appendChild(svg);
        $('[data-r-badge]', rewards).hidden = false;
        var dl = $('[data-r-badge-dl]', rewards);
        dl.onclick = function () {
          var blob = new Blob([new XMLSerializer().serializeToString(svg)], { type: 'image/svg+xml' });
          var a = el('a'); a.href = URL.createObjectURL(blob); a.download = 'cold-library-badge-' + (data.id || 'draft') + '.svg'; body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
        };
      }
      var form = $('[data-lamp-form]', rewards), msg = $('[data-lamp-msg]', rewards);
      if (opts.draft) { if (form) form.hidden = true; }
      else if (form && !form._bound) {
        form._bound = true;
        form.addEventListener('submit', function (e) {
          e.preventDefault(); e.stopPropagation(); var b = $('button', form); b.disabled = true; msg.textContent = T('Lighting…', '正在点灯……');
          postJSON('/api/lamps', { item: data.id, token: payload.lamp_token, note: $('textarea', form).value.trim(), locale: LANG }).then(function (r) {
            if (r.ok) { form.classList.add('done'); msg.textContent = data.example ? T('Your lamp is lit. It is a practice item, and its lamps say so.', '你的灯亮了。这是练习用的条目，它的灯也会标明。') : T('Your lamp is lit.', '你的灯亮了。'); $$('[data-lamps]').forEach(loadLamps); }
            else { b.disabled = false; msg.textContent = (r.data && r.data.message) || T('Please try again later.', '请稍后再试。'); }
          });
        });
      }
      if (!opts.noScroll) rewards.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
    }
    // Start: the greeting and questions were printed for readers without JavaScript; replace them with the live desk.
    screen.innerHTML = '';
    say(data.greeting);
    ask(0);
  }
  $$('[data-trial]').forEach(function (host) {
    var raw = $('[data-warden-data]', host); if (!raw) return;
    try { new Warden(host, JSON.parse(raw.textContent), { focus: false, noScroll: false }); } catch (e) {}
  });

  /* ---------- catalogue lookup: E-/M- items, S- works, G- plates ---------- */
  var cache = {};
  function getJSON(url) {
    if (cache[url]) return cache[url];
    cache[url] = fetch(url, { headers: { accept: 'application/json' } }).then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); });
    cache[url].catch(function () { delete cache[url]; });
    return cache[url];
  }
  $$('[data-lookup]').forEach(function (f) {
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var v = $('input', f).value.trim().toUpperCase().replace(/\s+/g, ''), msg = f.parentNode.querySelector('[data-lookup-msg]');
      function say(s) { if (msg) msg.textContent = s; }
      var m = v.match(/^([EMSG])-?0*(\d{1,6})$/);
      if (!m) { say(T('A catalogue number looks like S-001001, G-009001, E-000001 or M-000001.', '馆藏号的样子是 S-001001、G-009001、E-000001 或 M-000001。')); return; }
      var id = m[1] + '-' + ('000000' + m[2]).slice(-6), base = ZH ? '/zh/' : '/';
      var papers = {}; try { papers = JSON.parse(f.getAttribute('data-papers') || '{}') || {}; } catch (err) { papers = {}; }
      if (papers[id]) { location.href = base + papers[id]; return; }
      say(T('Looking…', '正在查……'));
      if (m[1] === 'E' || m[1] === 'M') {
        getJSON('/items/index.json').then(function (ix) {
          var path = ix[id];
          if (!path) { say(T('Nothing is hung under ' + id + ' yet.', id + ' 下面还没有挂东西。')); return; }
          location.href = base + path;
        }).catch(function () { say(T('The catalogue could not be read. Try again.', '目录读不出来，请再试一次。')); });
        return;
      }
      getJSON('/open-stacks/index.json').then(function (ix) {
        var list = (m[1] === 'S' ? ix.works : ix.plates) || [], hit = null;
        for (var i = 0; i < list.length; i++) if (list[i].i === id) { hit = list[i]; break; }
        if (!hit) { say(T('Nothing is shelved under ' + id + '.', id + ' 下面没有藏品。')); return; }
        location.href = base + 'open-stacks/' + (m[1] === 'G' ? 'plates/' : '') + hit.s;
      }).catch(function () { say(T('The catalogue could not be read. Try again.', '目录读不出来，请再试一次。')); });
    });
  });

  /* ---------- lobby starter: the title stays in this browser ---------- */
  var starter = $('[data-starter]');
  if (starter) starter.addEventListener('submit', function () {
    var title = $('[data-starter-title]', starter).value.trim(), kind = (starter.querySelector('input[name="kind"]:checked') || {}).value || 'exhibit';
    var d = {}; try { d = JSON.parse(store('cl-draft') || '{}') || {}; } catch (e) { d = {}; }
    d.kind = kind === 'plaque' ? (d.kind === 'other' ? 'other' : 'self') : 'exhibit';
    if (title) d.title = title;
    store('cl-draft', JSON.stringify(d));
  });

  /* ---------- printing a door card or a slip: only the target and its ancestors print ---------- */
  function printOnly(target) {
    if (!target) { window.print(); return; }
    var path = [], n = target.parentElement;
    while (n && n !== body) { n.classList.add('print-path'); path.push(n); n = n.parentElement; }
    target.classList.add('print-target'); body.classList.add('printing');
    function done() {
      body.classList.remove('printing'); target.classList.remove('print-target');
      path.forEach(function (p) { p.classList.remove('print-path'); });
      window.removeEventListener('afterprint', done);
    }
    window.addEventListener('afterprint', done);
    window.print();
  }
  $$('[data-print-door]').forEach(function (b) { b.addEventListener('click', function () { printOnly($('[data-door-card]')); }); });
  $$('[data-print]').forEach(function (b) { b.addEventListener('click', function () { printOnly(b.closest('[data-done]') || b); }); });

  /* ---------- the vault desk: say what to do when there is no wallet ---------- */
  var vapp = $('[data-vault-app]');
  if (vapp && !window.ethereum) { var ve = $('[data-v-empty]', vapp); if (ve) ve.hidden = false; }

  /* ---------- the front desk: six short steps ---------- */
  var desk = $('[data-desk]');
  if (desk) frontDesk(desk);
  function frontDesk(form) {
    // Fields by name through form.elements: on the form itself, names like "title" collide with built-in properties.
    var fl = {};
    ['title', 'subtitle', 'story', 'letter', 'pointer', 'badge', 'email', 'adult', 'rules', 'third'].forEach(function (n) { fl[n] = form.elements.namedItem(n); });
    var steps = $$('.step', form), cur = 0, subId = null, email = '';
    var qbox = $('[data-questions]', form), msg = $('[data-desk-msg]', form), draftState = $('[data-draft-state]', form), clearBtn = $('[data-clear-draft]', form);
    var countEl = $('[data-step-count]', form), bar = $$('.stepbar li', form);
    var INSPIRE = ZH
      ? ['接手的人最先该知道什么？', '接手的人千万别改的是什么？', '大家因为什么记得这个人？', '如果只能留下一句话，是哪一句？', '它每天让谁的日子好过了一点？', '你最想谢谢谁？', '哪一件小事最能说明它？', '十年以后，你希望别人怎么说起它？']
      : ['What should whoever takes this over know first?', 'What should a successor never change?', 'What is this person known for?', 'If only one sentence survived, which one?', 'Whose day does it make a little easier?', 'Who would you most like to thank?', 'Which small thing says the most about it?', 'In ten years, how would you like it described?'];
    var TEMPLATES = ZH ? ['只有他们知道的地方：', '一个外号：', '一个数字：', ''] : ['A place only they would know: ', 'A nickname: ', 'A number: ', ''];
    function show(n, moved) {
      cur = Math.max(0, Math.min(steps.length - 1, n));
      steps.forEach(function (s, i) { s.classList.toggle('current', i === cur); });
      bar.forEach(function (b, i) { b.classList.toggle('on', i <= cur); });
      if (countEl) countEl.textContent = T('Step ' + (cur + 1) + ' of ' + steps.length + ' · ', '第 ' + (cur + 1) + ' 步，共 ' + steps.length + ' 步 · ') + (steps[cur].getAttribute('data-name') || '');
      if (cur === 4) prepareTry();
      if (!moved) return;
      // Keep focus inside the step just shown: its first field, the chosen kind, or the step itself.
      var first = cur === 0 ? form.querySelector('input[name="kind"]:checked') : steps[cur].querySelector('input:not([type=radio]):not([type=checkbox]), textarea');
      if (!first) { steps[cur].setAttribute('tabindex', '-1'); first = steps[cur]; }
      first.focus({ preventScroll: true });
      form.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
    }
    function kind() { var r = form.querySelector('input[name="kind"]:checked'); return r ? r.value : 'exhibit'; }
    function addQ(q, a) {
      var n = $$('.qrow', qbox).length; if (n >= 3) return;
      var row = el('div', 'qrow');
      var l1 = el('label'); l1.appendChild(doc.createTextNode(T('Question ', '问题 ') + (n + 1))); var qi = el('input'); qi.type = 'text'; qi.maxLength = 120; qi.name = 'q'; qi.value = q || TEMPLATES[n % TEMPLATES.length]; l1.appendChild(qi);
      var l2 = el('label'); l2.appendChild(doc.createTextNode(T('Answer', '答案'))); var ai = el('input'); ai.type = 'text'; ai.maxLength = 60; ai.name = 'a'; ai.autocomplete = 'off'; ai.value = a || ''; l2.appendChild(ai);
      row.appendChild(l1); row.appendChild(l2); qbox.appendChild(row);
      $('[data-add-q]', form).hidden = $$('.qrow', qbox).length >= 3;
    }
    function questions() { return $$('.qrow', qbox).map(function (r) { return { q: $('input[name="q"]', r).value.trim(), a: $('input[name="a"]', r).value.trim() }; }).filter(function (x) { return x.q && norm(x.a); }); }
    function hasWarden() { return fl.letter.value.trim() && questions().length > 0; }
    // draft: autosaved here, never sent until the last step; answers are never saved
    function save() {
      var d = { kind: kind(), title: fl.title.value, subtitle: fl.subtitle.value, story: fl.story.value, letter: fl.letter.value, pointer: fl.pointer.value, badge: fl.badge.value, qs: $$('.qrow', qbox).map(function (r) { return { q: $('input[name="q"]', r).value }; }) };
      draftState.textContent = store('cl-draft', JSON.stringify(d)) !== null ? T('Draft saved on this device.', '草稿存在这台设备上。') : T('This browser does not keep drafts. Finish in one sitting.', '这个浏览器不保存草稿，请一次写完。');
      clearBtn.hidden = false;
      preview();
    }
    function restore() {
      var raw = store('cl-draft'); if (!raw) { addQ(); return; }
      try {
        var d = JSON.parse(raw);
        var k = form.querySelector('input[name="kind"][value="' + (d.kind || 'exhibit') + '"]'); if (k) k.checked = true;
        ['title', 'subtitle', 'story', 'letter', 'pointer', 'badge'].forEach(function (f) { if (d[f] && fl[f]) fl[f].value = d[f]; });
        (d.qs && d.qs.length ? d.qs : [{}]).forEach(function (q) { addQ(q.q); });
        draftState.textContent = T('Draft restored from this device. Answers are never saved.', '已从这台设备恢复草稿。答案从不保存。'); clearBtn.hidden = false;
      } catch (e) { addQ(); }
    }
    function preview() {
      var k = kind();
      $('[data-pv-kind]').textContent = k === 'exhibit' ? T('Perpetual Exhibit', '永续展位') : T('Perpetual Plaque', '永续铭牌');
      $('[data-pv-title]').textContent = fl.title.value.trim() || T('Your title', '你的标题');
      $('[data-pv-line]').textContent = fl.subtitle.value.trim() || T('Your one line', '你的一句话');
      $('[data-pv-meta]').textContent = hasWarden() ? T('Behind the warden: a letter', '守馆人身后：一封信') + (fl.pointer.value.trim() ? T(' · a place to go', ' · 一个要去的地方') : '') + (fl.badge.value.trim() ? T(' · a badge', ' · 一枚徽章') : '') : T('No warden yet', '还没有守馆人');
      $('[data-third]', form).hidden = k !== 'other';
      $$('[data-chip]', form).forEach(function (x) { var on = x.getAttribute('data-chip') === fl.badge.value.trim(); x.classList.toggle('on', on); x.setAttribute('aria-pressed', on ? 'true' : 'false'); });
    }
    // The preview is a disclosure on narrow screens and always open beside the form on wide ones.
    var pvd = $('[data-preview]');
    if (pvd && window.matchMedia) {
      var wide = window.matchMedia('(min-width: 900px)');
      if (!wide.matches) pvd.open = false;
      onMedia(wide, function () { if (wide.matches) pvd.open = true; });
    }
    // query string ?kind=exhibit|plaque from the exhibits and plaques pages
    var qk = (location.search.match(/kind=(exhibit|plaque)/) || [])[1];
    restore();
    if (qk) { var r0 = form.querySelector('input[name="kind"][value="' + (qk === 'plaque' ? 'self' : 'exhibit') + '"]'); if (r0) r0.checked = true; }
    preview();
    form.addEventListener('input', save); form.addEventListener('change', save);
    clearBtn.addEventListener('click', function () { store('cl-draft', null); location.reload(); });
    $$('[data-next]', form).forEach(function (b) { b.addEventListener('click', function () {
      if (cur === 1 && (!fl.title.value.trim() || !fl.subtitle.value.trim())) { (fl.title.value.trim() ? fl.subtitle : fl.title).focus(); return; }
      show(cur + 1, true);
    }); });
    $$('[data-prev]', form).forEach(function (b) { b.addEventListener('click', function () { show(cur - 1, true); }); });
    $$('[data-skip]', form).forEach(function (b) { b.addEventListener('click', function () { show(cur + (cur === 3 ? 2 : 1), true); }); });
    $('[data-add-q]', form).addEventListener('click', function () { addQ(); });
    var ip = 0; $('[data-inspire]', form).addEventListener('click', function () { $('[data-inspire-out]', form).textContent = INSPIRE[ip++ % INSPIRE.length]; });
    $$('[data-chip]', form).forEach(function (c) { c.addEventListener('click', function () { fl.badge.value = c.getAttribute('data-chip'); save(); }); });
    function payload(token) {
      var badge = fl.badge.value.trim();
      return { letter: { en: fl.letter.value, zh: fl.letter.value }, pointer: fl.pointer.value.trim() ? { en: fl.pointer.value.trim(), zh: fl.pointer.value.trim() } : null, badge: badge ? { en: badge, zh: badge } : null, badge_code: badge ? 'B-' + hex(crypto.getRandomValues(new Uint8Array(3))).toUpperCase() : null, lamp_token: token };
    }
    // Step 5: lock the draft here and let the owner run their own warden.
    function prepareTry() {
      var host = $('[data-try-host]', form);
      if (!hasWarden()) { host.innerHTML = ''; host.appendChild(el('p', 'meta', T('Add a letter and at least one question with its answer in step 4 to try it.', '在第 4 步写一封信、出至少一道题并写好答案，才能在这里试。'))); return; }
      var qs = questions(), p = payload('draft');
      host.innerHTML = '';
      var tpl = el('div', 'trial-try');
      tpl.innerHTML = '<div class="box wdesk" data-warden aria-live="polite"><div class="wdesk-head"><span class="who"></span><span class="w-state" data-w-state></span></div><div class="w-lines" data-w-screen></div></div>'
        + '<div class="rewards" data-rewards hidden><p class="r-stamp"><span class="stamp ok" data-r-stamp></span></p><div class="letter frost" data-r-letter></div><div class="pointer" data-r-pointer hidden><p class="meta"></p><p data-r-pointer-text></p></div><div data-r-badge hidden><div class="badge-svg" data-r-badge-svg></div><button class="btn small secondary" type="button" data-r-badge-dl></button></div><form class="lamp-form" data-lamp-form hidden></form></div>';
      $('.who', tpl).textContent = T('Your warden · draft', '你的守馆人 · 草稿'); $('[data-w-state]', tpl).textContent = T('Locked', '已上锁');
      $('.pointer .meta', tpl).textContent = T('Where it is', '东西在哪'); $('[data-r-badge-dl]', tpl).textContent = T('Download the badge', '下载徽章');
      host.appendChild(tpl);
      lock(qs.map(function (x) { return x.a; }), p).then(function (sealedDraft) {
        new Warden(host, { id: null, kdf: sealedDraft.kdf, locked: sealedDraft.locked, questions: qs.map(function (x) { return x.q; }), greeting: T('Hello. Answer like a visitor would.', '你好。像访客那样回答。') }, { draft: true, focus: false, noScroll: true });
      }).catch(function () { host.innerHTML = ''; host.appendChild(el('p', 'meta', T('This browser cannot lock the layer. Please try a current browser.', '这个浏览器没法上锁，请换一个新一点的浏览器。'))); });
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      // The try-as-visitor warden lives inside this form; only the desk's own button hands anything in.
      if (e.target !== form) return;
      // Enter in a field before the last step means "Next", never "hand it in".
      if (cur < steps.length - 1) { var nx = steps[cur].querySelector('[data-next]'); if (nx) nx.click(); return; }
      if (!fl.email.value.trim() || !fl.adult.checked || !fl.rules.checked || (kind() === 'other' && !fl.third.checked)) { msg.textContent = T('Please fill in the email and tick the boxes.', '请填好邮箱，并勾选上面的方框。'); return; }
      var b = $('[data-desk-submit]', form); b.disabled = true; b.setAttribute('aria-busy', 'true');
      msg.textContent = hasWarden() ? T('Locking in your browser…', '正在你的浏览器里上锁……') : T('Sending…', '正在发送……');
      var token = hex(crypto.getRandomValues(new Uint8Array(16)));
      var item = { title: fl.title.value.trim(), subtitle: fl.subtitle.value.trim(), story: fl.story.value.trim(), links: [] };
      var work = hasWarden()
        ? lock(questions().map(function (x) { return x.a; }), payload(token)).then(function (sealedItem) { return sha256hex(token).then(function (h) { item.questions = questions().map(function (x) { return x.q; }); item.kdf = sealedItem.kdf; item.locked = sealedItem.locked; item.lamp_hash = h; }); })
        : Promise.resolve();
      function idle() { b.disabled = false; b.removeAttribute('aria-busy'); }
      work.then(function () {
        email = fl.email.value.trim();
        return postJSON('/api/items/submit', { email: email, locale: LANG, kind: kind() === 'exhibit' ? 'exhibit' : 'plaque', whose: kind() === 'other' ? 'other' : (kind() === 'self' ? 'self' : null), item: item, adult: true, consent: true, third_party_consent: kind() === 'other' ? fl.third.checked : undefined });
      }).then(function (r) {
        b.removeAttribute('aria-busy');
        if (r.ok && r.data.id) { subId = r.data.id; msg.textContent = T('A code is on its way to ' + email + '.', '验证码正在发往 ' + email + '。'); $('[data-code-row]', form).hidden = false; $('[data-code]', form).focus(); }
        else { idle(); msg.textContent = (r.data && r.data.message) || T('Something went wrong. Please try again in a minute.', '出了点问题，请过一分钟再试。'); }
      }).catch(function () { idle(); msg.textContent = T('This browser cannot lock the layer. Please try a current browser.', '这个浏览器没法上锁，请换一个新一点的浏览器。'); });
    });
    var sendBtn = $('[data-desk-submit]', form); if (sendBtn) sendBtn.disabled = false;
    $('[data-code]', form).addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); $('[data-confirm]', form).click(); } });
    $('[data-confirm]', form).addEventListener('click', function () {
      var cb = this;
      if (cb.disabled || !subId) return;
      cb.disabled = true; cb.setAttribute('aria-busy', 'true');
      msg.textContent = T('Checking…', '正在核对……');
      postJSON('/api/items/confirm', { id: subId, email: email, code: $('[data-code]', form).value.replace(/\D/g, ''), locale: LANG }).then(function (r) {
        cb.disabled = false; cb.removeAttribute('aria-busy');
        if (!r.ok) { msg.textContent = (r.data && r.data.message) || T('That code did not match.', '验证码不对。'); return; }
        store('cl-draft', null);
        form.classList.add('finished');
        $('[data-slip-text]', form).textContent = T('Application ' + subId + ' is on the librarian’s desk. ' + today() + ' · ', subId + ' 号申请已经放在馆员桌上。' + today() + ' · ') + fl.title.value.trim();
        $('[data-done]', form).hidden = false; $('[data-done]', form).scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      });
    });
    show(0, false);
  }

  /* ---------- the vault, with a fake clock ---------- */
  var sim = $('[data-sim]');
  if (sim) {
    var S = { day: 0, silent: 0, confirms: 0, vetoLeft: 0, state: 'active' };
    var HB = 180, VETO = 28;
    var draw = function (log) {
      $('[data-sim-day]', sim).textContent = S.day;
      sim.classList.toggle('confirming', S.state === 'confirming'); sim.classList.toggle('released', S.state === 'released');
      var pct = S.state === 'active' ? Math.min(100, Math.round(S.silent / HB * 100)) : S.state === 'confirming' ? Math.round((VETO - S.vetoLeft) / VETO * 100) : 100;
      $('[data-sim-fill]', sim).style.setProperty('--p', String(pct / 100));
      $('[data-sim-state]', sim).textContent = S.state === 'active' ? (S.silent >= HB ? T('Silent past the period · keepers may confirm (' + S.confirms + '/2)', '静默期已满 · 开启人可以确认（' + S.confirms + '/2）') : T('Active · silent ' + S.silent + ' of ' + HB + ' days', '正常 · 已静默 ' + S.silent + ' / ' + HB + ' 天'))
        : S.state === 'confirming' ? T('Veto window · ' + S.vetoLeft + ' days left · you can still stop it', '否决期 · 还剩 ' + S.vetoLeft + ' 天 · 你还能叫停') : T('Released · each heir claims their own 50%', '已发放 · 每位继承人领走自己的 50%');
      if (log) $('[data-sim-log]', sim).textContent = log;
    };
    $$('[data-sim-act]', sim).forEach(function (b) { b.addEventListener('click', function () {
      var a = b.getAttribute('data-sim-act'), log = '';
      if (a === 'reset') { S = { day: 0, silent: 0, confirms: 0, vetoLeft: 0, state: 'active' }; log = T('Back to day 0.', '回到第 0 天。'); }
      else if (S.state === 'released' && a !== 'claim') log = T('Released. Nobody can change it now; heirs claim.', '已经发放，谁也改不了了，由继承人领取。');
      else if (a === 'wait') {
        S.day += 30;
        if (S.state === 'active') { S.silent += 30; log = S.silent >= HB ? T('The silence period has passed. Keepers may now confirm.', '静默期满了，开启人现在可以确认。') : S.silent >= HB - 30 ? T('Reminders go out: thirty days left.', '提醒发出：还剩三十天。') : T('Thirty quiet days.', '安静的三十天。'); }
        else if (S.state === 'confirming') { S.vetoLeft = Math.max(0, S.vetoLeft - 30); if (!S.vetoLeft) { S.state = 'released'; log = T('The veto window closed. Released.', '否决期结束，已发放。'); } }
      } else if (a === 'confirm') {
        if (S.state !== 'active') log = T('Already confirmed.', '已经确认过了。');
        else if (S.silent < HB) log = T('Too early. Keepers can only confirm after the silence period.', '太早了。静默期满之前，开启人不能确认。');
        else { S.confirms++; log = T('Keeper ' + S.confirms + ' of 2 confirmed.', '第 ' + S.confirms + ' 位开启人已确认（共需 2 位）。'); if (S.confirms >= 2) { S.state = 'confirming'; S.vetoLeft = VETO; log = T('Two keepers confirmed. A 28-day veto window begins.', '两位开启人已确认，28 天否决期开始。'); } }
      } else if (a === 'checkin') { S.silent = 0; S.confirms = 0; S.vetoLeft = 0; S.state = 'active'; log = T('You checked in. Everything pending is cancelled and the clock starts again.', '你报到了。所有没走完的流程都撤回，重新计时。'); }
      else if (a === 'claim') log = S.state === 'released' ? T('Each heir claimed 50% with their own wallet. Nobody else could.', '每位继承人用自己的钱包领走了 50%。别人谁也领不走。') : T('Nothing to claim yet. The vault is not released.', '还领不了，冷库还没有发放。');
      draw(log);
    }); });
    draw();
  }

  /* ---------- librarian orientation ---------- */
  var term = $('#orientation');
  if (term) orientation(term);
  function orientation(term) {
    var screen = $('[data-o-screen]', term), stepEl = $('[data-o-step]', term);
    var state = { name: '', anon: false, desk: '', email: '', uid: null, since: null, provisional: false };
    var DESKS = [
      [T('By the window, facing the lake', '靠窗，面朝冰湖'), T('Window', '靠窗'), T('The view is excellent. The draught is included.', '风景很好，漏风免费。')],
      [T('Deep in the closed stacks', '闭架书库深处'), T('Closed stacks', '闭架书库'), T('Quiet. Nobody will find you there. That is the idea.', '很安静，没人找得到你。这正是重点。')],
      [T('Next to the Warm Room', '暖房隔壁'), T('Warm Room', '暖房隔壁'), T('Sensible. Go in as often as you like.', '明智。想去几次都行。')],
      [T('The front desk', '前台'), T('Front desk', '前台'), T('Bold. It is always open. Welcome.', '大胆。前台一直开着。欢迎。')],
    ];
    var OATH = ZH
      ? ['我不保管别人的钥匙。', '我从不独自开箱。', '我转述原话，不替任何人说话。', '我不以此收钱。', '我每年回来看一眼。', '我尊重活着的人。', '我帮东西被记住，也帮它们安放。']
      : ['I hold no one’s keys.', 'I never open a box alone.', 'I quote. I never speak for anyone.', 'I take no money for this.', 'I come back once a year to look.', 'I defer to the living.', 'I help things be remembered, and help them rest.'];
    var TOTAL = 4, hurry = false;
    term.addEventListener('click', function (e) { if (!e.target.closest('button, input, label, a')) hurry = true; });
    function setStep(n) { stepEl.textContent = '0' + n + '/0' + TOTAL; }
    function clear() { screen.innerHTML = ''; }
    function progress(n) { var p = el('div', 'progress'); for (var i = 0; i < TOTAL; i++) p.appendChild(el('i', i < n ? 'on' : '')); return p; }
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
      type([T('Hello. Welcome to the Cold Library.', '你好，欢迎来到冷冻图书馆。'), T('This takes about a minute. There is no test.', '大约一分钟，不考试。'), T('What should the register call you? A pen name is fine.', '名册上怎么称呼你？笔名也行。')], function () {
        var f = el('form', 't-form');
        var inp = el('input'); inp.type = 'text'; inp.maxLength = 40; inp.autocomplete = 'nickname'; inp.placeholder = T('Your name or a pen name', '名字或笔名'); inp.setAttribute('aria-label', T('Your name', '你的名字'));
        var row = el('div', 't-btns'); var b = el('button', 'btn', T('Continue', '继续')); b.type = 'submit'; var skip = el('button', 'btn secondary', T('Stay anonymous', '匿名就好')); skip.type = 'button';
        row.appendChild(b); row.appendChild(skip); f.appendChild(inp); f.appendChild(row); screen.appendChild(f); screen.appendChild(progress(0));
        skip.addEventListener('click', function () { state.name = T('Anonymous Librarian', '无名馆员'); state.anon = true; desk(); });
        f.addEventListener('submit', function (e) { e.preventDefault(); var v = inp.value.replace(/\s+/g, ' ').trim(); if (!v) return skip.click(); state.name = v.slice(0, 40); state.anon = false; desk(); });
      });
    }
    function desk() {
      clear(); setStep(2);
      type([state.anon ? T('Very well. Anonymous it is.', '好的，那就匿名。') : T('Thank you, ' + state.name + '.', '谢谢你，' + state.name + '。'), T('Pick a desk. Any desk. There are no wrong answers.', '挑一张桌子，随便挑，没有错误答案。')], function () {
        var box = el('div', 'choices'); var fb = el('p', 'feedback'); fb.setAttribute('aria-live', 'polite');
        DESKS.forEach(function (d, ci) {
          var b = el('button', 'choice', String.fromCharCode(65 + ci) + '  ' + d[0]); b.type = 'button';
          b.addEventListener('click', function () { state.desk = d[1]; b.classList.add('right'); fb.textContent = d[2]; $$('button.choice', box).forEach(function (x) { x.disabled = true; }); setTimeout(oath, reduceMotion ? 300 : 1200); });
          box.appendChild(b);
        });
        screen.appendChild(box); screen.appendChild(fb); screen.appendChild(progress(1));
      });
    }
    function oath() {
      clear(); setStep(3);
      type([T('Here is the oath. Nothing to memorise.', '这是誓词，不用背。')], function () {
        var list = el('div', 'oath-lines');
        OATH.forEach(function (l, i) { list.appendChild(el('div', 't-line', '0' + (i + 1) + '  ' + l)); });
        var row = el('div', 't-btns'); var b = el('button', 'btn', T('I will', '我愿意')); b.type = 'button'; row.appendChild(b);
        screen.appendChild(list); screen.appendChild(row); screen.appendChild(progress(2));
        b.addEventListener('click', register);
      });
    }
    function register() {
      clear(); setStep(4);
      type([T('Last step. Where should the front desk send your number?', '最后一步：前台把编号寄到哪里？'), T('Our emails never contain links, and never ask for money, passwords or recovery phrases.', '我们的邮件从不带链接，也从不索要钱、密码或助记词。')], function () {
        var f = el('form', 't-form');
        var em = el('input'); em.type = 'email'; em.required = true; em.autocomplete = 'email'; em.placeholder = T('Your email', '你的邮箱'); em.setAttribute('aria-label', T('Email', '邮箱')); if (state.email) em.value = state.email;
        var c1 = el('label', 'check'); var list = el('input'); list.type = 'checkbox'; list.checked = !state.anon; c1.appendChild(list); c1.appendChild(el('span', '', T('Show me in the public register as ' + state.name + '.', '在公开名册上显示为“' + state.name + '”。')));
        var row = el('div', 't-btns'); var b = el('button', 'btn', T('I am 18 or older · Send my code', '我已满 18 岁 · 发送验证码')); b.type = 'submit'; row.appendChild(b);
        var msg = el('p', 'feedback'); msg.setAttribute('aria-live', 'polite');
        [em, c1, row].forEach(function (x) { f.appendChild(x); }); screen.appendChild(f); screen.appendChild(msg); screen.appendChild(progress(3));
        f.addEventListener('submit', function (e) {
          e.preventDefault(); state.email = em.value.trim(); b.disabled = true; msg.textContent = T('Sending…', '正在发送……');
          postJSON('/api/librarians/register', { email: state.email, penName: state.name, locale: LANG, listed: list.checked, adult: true, oath: true }).then(function (r) {
            if (r.ok) return code();
            if (r.status === 503) { state.provisional = true; msg.textContent = T('The front desk is not taking registrations right now. Here is a provisional card; your number will come later.', '前台暂时不能登记。先给你一张临时馆员证，编号稍后再发。'); return setTimeout(finish, 1600); }
            b.disabled = false; msg.textContent = (r.data && r.data.message) || T('Something went wrong. Please try again in a minute.', '出了点问题，请过一分钟再试。');
          });
        });
      });
    }
    function code() {
      clear(); setStep(4);
      type([T('A six-digit code is on its way to ' + state.email + '.', '六位验证码正在发往 ' + state.email + '。'), T('It expires in fifteen minutes. If it is not there, look in spam.', '十五分钟内有效。没收到的话，看看垃圾邮件。')], function () {
        var f = el('form', 't-form');
        var inp = el('input', 'code'); inp.type = 'text'; inp.inputMode = 'numeric'; inp.autocomplete = 'one-time-code'; inp.maxLength = 7; inp.required = true; inp.placeholder = '000000'; inp.setAttribute('aria-label', T('Code', '验证码'));
        var row = el('div', 't-btns'); var b = el('button', 'btn', T('Confirm', '确认')); b.type = 'submit'; var back = el('button', 'btn secondary', T('Use another email', '换个邮箱')); back.type = 'button';
        row.appendChild(b); row.appendChild(back); var msg = el('p', 'feedback'); msg.setAttribute('aria-live', 'polite');
        f.appendChild(inp); f.appendChild(row); screen.appendChild(f); screen.appendChild(msg); screen.appendChild(progress(3));
        inp.focus(); back.addEventListener('click', register);
        inp.addEventListener('input', function () { if (inp.value.replace(/\D/g, '').length === 6 && !b.disabled) { if (f.requestSubmit) f.requestSubmit(); else b.click(); } });
        f.addEventListener('submit', function (e) {
          e.preventDefault(); b.disabled = true; msg.textContent = T('Checking…', '正在核对……');
          postJSON('/api/librarians/confirm', { email: state.email, code: inp.value.replace(/\D/g, '') }).then(function (r) {
            if (r.ok && r.data && r.data.uid) { state.uid = r.data.uid; state.since = r.data.since; state.name = r.data.penName || state.name; return finish(); }
            b.disabled = false; msg.textContent = (r.data && r.data.message) || T('That code did not match.', '验证码不对。');
          });
        });
      });
    }
    function finish() {
      clear(); setStep(4);
      var lines = state.uid
        ? [T('Congratulations. Your number is No. ' + state.uid + '.', '恭喜。你的编号是第 ' + state.uid + ' 号。'), T('It follows no pattern. Please do not look for one.', '它没有规律，请不要寻找规律。'), T('That is all for today. Please return to your life outside. It is warmer there.', '今天就到这里。请回到外面的生活里去，那边比较暖和。')]
        : [T('Welcome, ' + state.name + '.', '欢迎你，' + state.name + '。'), T('Your provisional card is below.', '你的临时馆员证在下面。'), T('Please return to your life outside. It is warmer there.', '请回到外面的生活里去，那边比较暖和。')];
      type(lines, function () { screen.appendChild(progress(4)); drawCard(); });
    }
    function drawCard() {
      var wrap = $('[data-card-wrap]'), cv = $('[data-libcard]'), dl = $('[data-card-download]');
      if (!wrap || !cv) return; wrap.hidden = false;
      var ready = (doc.fonts && doc.fonts.ready) ? doc.fonts.ready : Promise.resolve();
      ready.then(function () { paintCard(cv, state); dl.href = cv.toDataURL('image/png'); });
      wrap.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    }
    stepName();
  }

  /* ---------- librarian card: the flat library card, in the page's own colours ---------- */
  function paintCard(cv, s) {
    var c = cv.getContext('2d'), W = 1200, H = 750;
    var sans = '"Plex Sans","PingFang SC","Hiragino Sans GB","Microsoft YaHei","Noto Sans CJK SC",sans-serif';
    var serif = '"Plex Serif","Songti SC","Noto Serif CJK SC",serif';
    var mono = '"Plex Mono",ui-monospace,Menlo,monospace';
    var surface = token('--surface', 'white'), ink = token('--ink', 'black'), ink2 = token('--ink-2', 'dimgray'), ink3 = token('--ink-3', 'gray'), line = token('--line-2', 'silver'), brass = token('--brass', 'goldenrod'), lamp = token('--lamp', 'orange');
    c.fillStyle = surface; c.fillRect(0, 0, W, H);
    c.strokeStyle = line; c.lineWidth = 3; c.strokeRect(1.5, 1.5, W - 3, H - 3);
    c.fillStyle = brass; c.fillRect(0, 0, W, 6);
    // the logo: flat roof, glass band, reflection, one lit window
    c.save(); c.translate(80, 70); c.scale(2.2, 2.2); c.strokeStyle = ink; c.lineWidth = 1.3; c.lineCap = 'round';
    [[3, 7, 37, 7], [5, 7, 5, 18], [5, 18, 35, 18], [35, 18, 35, 7], [1, 21.5, 39, 21.5]].forEach(function (p) { c.beginPath(); c.moveTo(p[0], p[1]); c.lineTo(p[2], p[3]); c.stroke(); });
    c.fillStyle = lamp; c.fillRect(23.6, 12.6, 4.8, 4.6); c.restore();
    c.fillStyle = ink3; c.textBaseline = 'alphabetic';
    c.font = '400 30px ' + sans; c.fillText(ZH ? '冷冻图书馆 · 馆员证' : 'Cold Library · Librarian', 190, 118);
    c.fillStyle = ink; c.font = '400 150px ' + mono; c.fillText(s.uid ? 'No. ' + s.uid : (ZH ? 'No. 待发' : 'No. —'), 80, 380);
    c.font = '400 54px ' + serif; c.fillText(s.name || '', 80, 500);
    c.fillStyle = ink2; c.font = '500 30px ' + sans;
    c.fillText((s.desk ? (ZH ? '工位：' + s.desk : 'Desk: ' + s.desk) : '') + (s.provisional ? (ZH ? ' · 临时' : ' · provisional') : ''), 80, 580);
    c.fillStyle = ink3; c.font = '400 28px ' + (ZH ? sans : mono); c.fillText((ZH ? '始于 ' : 'since ') + (s.since || today()), 80, 660);
  }

  /* ---------- small rooms ---------- */
  (function thermostat() {
    var seq = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'], pos = 0;
    function note(text) { var n = el('div', 'house-note', text); n.setAttribute('role', 'status'); body.appendChild(n); setTimeout(function () { n.classList.add('show'); }, 30); setTimeout(function () { n.classList.remove('show'); setTimeout(function () { n.remove(); }, 600); }, 5200); }
    doc.addEventListener('keydown', function (e) {
      var k = e.key && e.key.length === 1 ? e.key.toLowerCase() : e.key;
      pos = (k === seq[pos]) ? pos + 1 : (k === seq[0] ? 1 : 0);
      if (pos === seq.length) { pos = 0; var on = root.getAttribute('data-warm') !== 'on'; root.setAttribute('data-warm', on ? 'on' : 'off'); note(on ? T('You found the thermostat. It was always there.', '你找到了暖气开关。它一直都在。') : T('Back to the usual temperature.', '恢复了平常的温度。')); }
    });
    var d = new Date(), h = d.getHours();
    if (d.getMonth() === 11 && (d.getDate() === 21 || d.getDate() === 22)) root.setAttribute('data-warm', 'on');
    if (h >= 0 && h < 4) {
      var lamp = el('button', 'night-lamp'); lamp.type = 'button'; lamp.title = T('Dismiss', '关掉');
      lamp.appendChild(el('span', 'bulb')); lamp.appendChild(doc.createTextNode(T('We are not the ones on the night shift. You are. Get some sleep.', '值夜的不是我们，是你。早点睡。')));
      var off = function () { lamp.classList.add('out'); setTimeout(function () { lamp.remove(); }, 400); };
      lamp.addEventListener('click', off); setTimeout(off, 12000); body.appendChild(lamp);
    }
  })();
  try {
    console.log('%cCold Library', 'font: 500 14px sans-serif; letter-spacing: .1em;');
    console.log(T('Hello, inspector. This site keeps no keys and no cookies, and your warden answers never leave this tab. Check for yourself.\nSource: https://github.com/nathanskill/coldlibrary', '你好，正在检查的人。本站不保存钥匙和 Cookie，你给守馆人的回答也不会离开这个标签页，你可以自己查。\n源代码：https://github.com/nathanskill/coldlibrary'));
  } catch (e) {}
})();
