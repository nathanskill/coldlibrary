/* Cold Library — readers' scores, tribute lamps, the Record Room filters and today's album (2026-10-15).
   Talks only to this site's /api/ratings and /api/tributes. A random device id in localStorage lets a reader
   change their own rating; nothing else is stored, and nothing identifies the reader. Without storage the
   stars and lamps stay hidden and the page still reads. */
(() => {
  'use strict';
  var d = document, ZH = d.body.getAttribute('data-lang') === 'zh', MIN = 5;
  function $(s, el) { return (el || d).querySelector(s); }
  function $$(s, el) { return [].slice.call((el || d).querySelectorAll(s)); }
  function T(en, zh) { return ZH ? zh : en; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); return v; } catch (e) { return null; } }
  function device() {
    var id = store('cl-device');
    if (id && /^[0-9a-f]{32}$/.test(id)) return id;
    var b = new Uint8Array(16); (window.crypto || {}).getRandomValues ? crypto.getRandomValues(b) : b.forEach((x, i) => { b[i] = Math.random() * 256; });
    id = [].map.call(b, (x) => ('0' + x.toString(16)).slice(-2)).join('');
    return store('cl-device', id) === id ? id : null;
  }
  function today() { var t = new Date(); return t.getFullYear() + '-' + (t.getMonth() + 1) + '-' + t.getDate(); }
  function getJSON(u) { return fetch(u, { headers: { accept: 'application/json' } }).then((r) => { if (!r.ok) throw r; return r.json(); }); }
  function post(u, body) { return fetch(u, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json().then((j) => { if (!r.ok) throw j; return j; })); }
  var dev = device();

  /* ---------- readers' scores ---------- */
  var strips = $$('[data-rate]'), cells = $$('[data-rate-row]');
  var ids = strips.map((s) => s.getAttribute('data-rate')).concat(cells.map((c) => c.getAttribute('data-rate-row')));
  ids = ids.filter((x, i) => x && ids.indexOf(x) === i);
  function fmt(n, sum) { return (sum / n * 2).toFixed(1); }
  function show(id, st) {
    var n = st ? st[0] : 0, sum = st ? st[1] : 0;
    strips.filter((s) => s.getAttribute('data-rate') === id).forEach((s) => {
      var v = $('[data-rate-avg]', s), c = $('[data-rate-n]', s);
      if (n >= MIN) { v.textContent = fmt(n, sum); c.textContent = T(n + ' ratings', n + ' 人评分'); }
      else { v.textContent = '—'; c.textContent = n ? T('Not enough ratings yet (' + n + ')', '评分人数不足（' + n + ' 人）') : T('No ratings yet', '还没有人打分'); }
    });
    cells.filter((c) => c.getAttribute('data-rate-row') === id).forEach((c) => {
      c.textContent = n >= MIN ? T('readers ', '读者 ') + fmt(n, sum) : '';
      c.title = n >= MIN ? T(n + ' ratings', n + ' 人评分') : '';
    });
  }
  for (var i = 0; i < ids.length; i += 100) {
    (function (chunk) {
      getJSON('/api/ratings?ids=' + encodeURIComponent(chunk.join(','))).then((j) => { chunk.forEach((id) => show(id, (j.stats || {})[id])); }, () => { /* the librarian's score still reads */ });
    })(ids.slice(i, i + 100));
  }
  if (dev) strips.forEach((s) => {
    var id = s.getAttribute('data-rate'), box = $('[data-rate-mine]', s), msg = $('[data-rate-msg]', s), stars = $('.stars', s);
    if (!box || !stars) return;
    box.hidden = false;
    var mine = store('cl-r:' + id);
    if (mine) { var r = $('input[value="' + mine + '"]', stars); if (r) r.checked = true; msg.textContent = T('Your rating', '你打过分'); }
    $$('input', stars).forEach((r) => r.addEventListener('change', () => {
      var v = +r.value;
      stars.setAttribute('aria-busy', 'true');
      msg.textContent = T('Saving…', '正在记下…');
      post('/api/ratings', { id: id, stars: v, device: dev, locale: ZH ? 'zh' : 'en' }).then((j) => {
        store('cl-r:' + id, String(v));
        msg.textContent = T('Saved. You can change it any time.', '记下了，可以随时改。');
        show(id, [j.n, j.sum]);
      }, (e) => {
        msg.textContent = (e && e.message) || T('Could not save. Try again later.', '没能记下，请稍后再试。');
        var old = store('cl-r:' + id); $$('input', stars).forEach((x) => { x.checked = old && x.value === old; });
      }).then(() => { stars.removeAttribute('aria-busy'); });
    }));
  });

  /* ---------- tribute lamps ---------- */
  var lamps = $$('[data-lamp]');
  if (lamps.length && dev) {
    var keys = lamps.map((l) => l.getAttribute('data-lamp'));
    var count = (l, n) => { $('[data-lamp-n]', l).textContent = n ? T(n === 1 ? 'One lamp is lit.' : n + ' lamps are lit.', '已有 ' + n + ' 盏灯。') : T('No lamp yet.', '还没有人点灯。'); };
    getJSON('/api/tributes?keys=' + encodeURIComponent(keys.join(','))).then((j) => {
      lamps.forEach((l) => {
        var k = l.getAttribute('data-lamp'), btn = $('[data-lamp-btn]', l);
        l.hidden = false;
        count(l, (j.counts || {})[k] || 0);
        if (store('cl-l:' + k) === today()) { l.classList.add('lit'); btn.disabled = true; }
        btn.addEventListener('click', () => {
          btn.disabled = true;
          post('/api/tributes', { key: k, device: dev, locale: ZH ? 'zh' : 'en' }).then((r) => {
            store('cl-l:' + k, today()); l.classList.add('lit'); count(l, r.count);
          }, (e) => { btn.disabled = false; $('[data-lamp-n]', l).textContent = (e && e.message) || T('The lamp did not light. Try again later.', '灯没有点亮，请稍后再试。'); });
        });
      });
    }, () => { /* lamps stay hidden */ });
  }

  /* ---------- the Record Room: filter by genre and decade, order by score or year ---------- */
  var mf = $('[data-mfilters]'), grid = $('[data-acards]');
  if (mf && grid) {
    mf.hidden = false;
    var cards = $$('.acard', grid), out = $('[data-mcount]', mf), sort = $('[data-msort]', mf);
    var apply = () => {
      var g = ($('input[name="g"]:checked', mf) || {}).value || '', dd = ($('input[name="d"]:checked', mf) || {}).value || '', k = 0;
      cards.forEach((c) => {
        var ok = (!g || (' ' + c.getAttribute('data-genres') + ' ').indexOf(' ' + g + ' ') >= 0) && (!dd || c.getAttribute('data-decade') === dd);
        c.hidden = !ok; if (ok) k++;
      });
      var by = sort && sort.checked ? (a, b) => a.getAttribute('data-year') - b.getAttribute('data-year') : (a, b) => b.getAttribute('data-score') - a.getAttribute('data-score') || a.getAttribute('data-year') - b.getAttribute('data-year');
      cards.slice().sort(by).forEach((c) => grid.appendChild(c));
      out.textContent = T(k + (k === 1 ? ' album' : ' albums'), k + ' 张专辑');
    };
    mf.addEventListener('change', apply);
  }

  /* ---------- the lobby: one album a day, by the visitor's own date ---------- */
  var days = $$('[data-today-album]');
  if (days.length) {
    var t0 = new Date(), n = Math.floor(Date.UTC(t0.getFullYear(), t0.getMonth(), t0.getDate()) / 86400000);
    days.forEach((a, i) => { a.hidden = i !== n % days.length; });
  }
})();
