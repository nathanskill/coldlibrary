/* Cold Library — Open Stacks search (spec §5.7): "/" to search; ranks index.json + lines.json, marks matches;
   shelf.js (window.CLF) filters, orders and counts. Copy comes from #fs-labels. */
(() => {
  'use strict';
  var d = document, B = d.body, ZH = B.getAttribute('data-lang') === 'zh';
  function $(s, el) { return (el || d).querySelector(s); }
  function $$(s, el) { return [].slice.call((el || d).querySelectorAll(s)); }
  var input = $('[data-search-form] input[type="search"]');
  d.addEventListener('keydown', (e) => {
    var a = d.activeElement;
    if (e.key !== '/' || e.ctrlKey || e.metaKey || e.altKey || !B.classList.contains('stacks') || (a && (a.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)))) return;
    e.preventDefault();
    if (input) { input.focus(); input.select(); } else location.href = (ZH ? '/zh' : '') + '/open-stacks/search';
  });
  var page = $('[data-search-page]'), F = window.CLF;
  if (!page || !F || !input) return;

  /* NFKC, lower case, no marks; CJK drops punctuation; m: output → input index */
  var PUN = /[\s\p{P}\p{S}]/u, HAN = /[⺀-鿿぀-ヿ가-힯豈-﫿]|[\ud840-\ud87f]/;
  function fold(c) { var k = c.charCodeAt(0); return k < 128 ? c.toLowerCase() : k >= 0x4e00 && k <= 0x9fff ? c : c.normalize('NFKD').replace(/\p{M}/gu, '').normalize('NFKC').toLowerCase(); }
  function norm(s, cjk, map) {
    var o = '', m = [], i = 0, sp = true;
    for (var ch of String(s || '')) {
      var f = fold(ch);
      for (var j = 0; j < f.length; j++) {
        var c = f.charAt(j);
        if (PUN.test(c)) { if (cjk || sp || c === "'" || c === '’') continue; c = ' '; sp = true; } else sp = false;
        o += c; m.push(i);
      }
      i += ch.length;
    }
    if (o.slice(-1) === ' ') { o = o.slice(0, -1); m.pop(); }
    return map ? { s: o, m: m } : o;
  }
  function terms(q) { return q.split(/\s+/).map((w) => ({ c: HAN.test(w), s: norm(w, HAN.test(w)) })).filter((x) => x.s && (x.c || x.s.length > 1)); }

  var labels = {};
  try { labels = JSON.parse($('#fs-labels').textContent); } catch (e) { /* optional */ }
  var M = labels.msg || {}, TAG = labels.tag || {};
  function fill(k, v) { return String(M[k] || '').replace('{n}', v.n).replace('{q}', v.q); }
  var docs = null, plates = [], xdocs = [], lines = null, busy = false, failed = false;
  function get(u) { return fetch(u).then((r) => { if (!r.ok) throw r; return r.json(); }); }
  function load() {
    if (busy) return;
    busy = true;
    get('/open-stacks/catalog.json').then((j) => { xdocs = j.entries || []; if (docs) run(); }, () => { /* books and albums are optional */ });
    get('/open-stacks/index.json').then((j) => { docs = j.works || []; plates = j.plates || []; run(); return get('/open-stacks/lines.json'); })
      .then((j) => { lines = j; run(); }, () => { if (!docs) { failed = true; docs = []; } lines = lines || {}; run(); });
  }
  function nf(o, k, c) {
    var key = '_' + k + (c ? 1 : 0);
    if (o[key] == null) {
      if (k === 'l' && !lines) return '';
      var v = k === 't' ? String(o.t || '').split(' / ') : k === 'l' ? lines[o.i] || '' : k === 'g' ? (o.g || []).map((g) => (TAG[g] || '') + ' ' + g.replace(/-/g, ' ')).join(' | ') : k === 'e' ? (o.e || '') + ' | ' + (o.ez || '') : o[k] || '';
      o[key] = Array.isArray(v) ? v.map((x) => norm(x, c)) : norm(v, c);
    }
    return o[key];
  }
  function one(o, x) {
    var t = nf(o, 't', x.c), at = t.map((v) => v === x.s ? 0 : v.indexOf(x.s));
    if (at.indexOf(0) >= 0) return t.indexOf(x.s) >= 0 ? 100 : 60;
    if (at.some((i) => i > 0)) return 45;
    var f = ['a', 30, 'g', 20, 'l', 10, 'e', 5];
    for (var i = 0; i < f.length; i += 2) if (nf(o, f[i], x.c).indexOf(x.s) >= 0) return f[i + 1];
    return 0;
  }
  function score(o, ts, min) { var s = 0; for (var i = 0; i < ts.length; i++) { var v = one(o, ts[i]); if (v < (min || 1)) return 0; s += v; } return s; }

  function esc(s) { var e = d.createElement('i'); e.textContent = s; return e.innerHTML; }
  function hl(raw, ts) {
    var rs = [], o = '', p = 0;
    ts.forEach((x) => {
      var n = norm(raw, x.c, true), f = 0, at;
      while ((at = n.s.indexOf(x.s, f)) >= 0) { var b = n.m[at + x.s.length - 1]; rs.push([n.m[at], b + (raw.codePointAt(b) > 0xffff ? 2 : 1)]); f = at + x.s.length; }
    });
    rs.sort((a, b) => a[0] - b[0]).forEach((r) => { var a = Math.max(r[0], p); if (r[1] > a) { o += esc(raw.slice(p, a)) + '<mark>' + esc(raw.slice(a, r[1])) + '</mark>'; p = r[1]; } });
    return o + esc(raw.slice(p));
  }
  /* the matched line (simplified first on /zh/) or excerpt */
  function snippet(o, ts) {
    var ls = ((lines && lines[o.i]) || '').split('\n'), ex = [o.e, o.ez].filter(Boolean);
    if (ZH) { ls.reverse(); ex.reverse(); }
    for (var t = 0; t < ts.length; t++) {
      var x = ts[t];
      if (nf(o, 't', x.c).some((v) => v.indexOf(x.s) >= 0)) continue;
      var parts = ls.map((l) => norm(l, x.c)), at = parts.join(x.c ? '' : ' ').indexOf(x.s), off = 0, k;
      if (at >= 0) for (k = 0; k < parts.length; k++) { off += parts[k].length + (x.c ? 0 : 1); if (at < off) return ls[k]; }
      for (k = 0; k < ex.length; k++) if (norm(ex[k], x.c).indexOf(x.s) >= 0) return ex[k];
    }
    return '';
  }
  var marked = [];
  function mark(row, ts, line) {
    $$('[data-m]', row).forEach((el) => { if (el._o == null) el._o = el.textContent; el.innerHTML = hl(el._o, ts); marked.push(el); });
    if (line) { var s = d.createElement('span'); s.className = 'os-snip'; s.innerHTML = hl(line, ts); ($('.r-title', row) || row).appendChild(s); }
  }

  var cur = { ts: [], hits: {}, plates: [], xs: [] }, timer;
  var count = $('[data-count]', page), zero = $('[data-zero]', page), pres = $('[data-presults]', page), prow = {};
  $$('[data-pid]', page).forEach((r) => { prow[r.getAttribute('data-pid')] = r; });
  var xres = $('[data-xresults]', page), xrow = {};
  $$('[data-xid]', page).forEach((r) => { xrow[r.getAttribute('data-xid')] = r; });
  var clear = $('.os-clearq') || d.createElement('b');

  function run() {
    var q = input.value.trim(), ts = terms(q), sc = null;
    clear.hidden = !input.value;
    cur = { ts: ts, hits: {}, plates: [], xs: [] };
    if (ts.length && !docs) load();
    if (ts.length && docs && !failed) {
      sc = {};
      docs.forEach((o) => { var s = score(o, ts); if (s) { sc[o.i] = s; cur.hits[o.i] = o; } });
      cur.plates = plates.map((p) => [p.i, score(p, ts, 30)]).filter((x) => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 12);
      cur.xs = xdocs.map((p) => [p.i, score(p, ts, 30)]).filter((x) => x[1]).sort((a, b) => b[1] - a[1]).slice(0, 24);
    }
    F.setQuery(q, sc);
  }
  function say(k, v) {
    var t = fill(k, { n: v.n, q: '\u0000' }).split('\u0000');
    count.textContent = t[0];
    if (t.length > 1) { var b = d.createElement('strong'); b.textContent = v.q; count.appendChild(b); count.appendChild(d.createTextNode(t[1] + (v.w || ''))); }
  }
  F.after = (st) => {
    marked.forEach((el) => { el.textContent = el._o; });
    marked = [];
    $$('.os-snip', page).forEach((s) => { s.parentNode.removeChild(s); });
    var q = F.q, ts = cur.ts, pl = st.query && !st.filters ? cur.plates : [], xl = st.query && !st.filters ? cur.xs : [];
    for (var id in prow) prow[id].hidden = true;
    pl.forEach((x) => { var r = prow[x[0]]; if (r) { r.hidden = false; r.parentNode.appendChild(r); mark(r, ts); } });
    pres.hidden = !pl.length;
    for (var xid in xrow) xrow[xid].hidden = true;
    xl.forEach((x) => { var r = xrow[x[0]]; if (r) { r.hidden = false; r.parentNode.appendChild(r); mark(r, ts); } });
    if (xres) xres.hidden = !xl.length;
    zero.hidden = true;
    if (!st.query) {
      if (ts.length) say(failed ? 'fail' : 'searching', { n: st.total });
      return;
    }
    st.shown.forEach((r) => { var o = cur.hits[r.getAttribute('data-id')]; mark(r, ts, o ? snippet(o, ts) : ''); });
    var n = st.k + pl.length + xl.length;
    say(n === 1 ? 'one' : 'many', { n: n, q: q, w: lines ? '' : M.lines });
    if (n) return;
    zero.hidden = false;
    $('[data-zero-msg]', zero).textContent = fill(st.filters ? 'zeroF' : 'zero', { q: q });
    $('[data-clear]', zero).hidden = !st.filters;
  };

  function reset() { input.value = ''; run(); input.focus(); }
  input.addEventListener('focus', load);
  input.addEventListener('input', () => { clear.hidden = !input.value; load(); clearTimeout(timer); timer = setTimeout(run, 120); });
  input.addEventListener('search', run);
  input.addEventListener('keydown', (e) => { if (e.key === 'Escape') { if (input.value) reset(); else input.blur(); } });
  input.form.addEventListener('submit', (e) => { e.preventDefault(); clearTimeout(timer); run(); });
  clear.addEventListener('click', reset);
  $$('[data-clear-q]', page).forEach((b) => { b.addEventListener('click', reset); });
  if (F.q) { input.value = F.q; run(); }
})();
