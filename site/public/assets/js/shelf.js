/* Cold Library — Open Stacks lists: filters, sort and view on shelf and search pages (spec §5.2, §6.6), the plate
   kind filter's URL, and copy buttons. State lives in the URL (history.replaceState). Without JS every row shows
   and the filter bar stays hidden. No dependencies; storage is never touched. */
(function () {
  'use strict';
  var d = document, ZH = d.body.getAttribute('data-lang') === 'zh';
  function T(en, zh) { return ZH ? zh : en; }
  function $(s, el) { return (el || d).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || d).querySelectorAll(s)); }
  function attr(el, k) { return el.getAttribute(k) || ''; }
  var P = new URLSearchParams(location.search);
  function setURL(p) {
    var q = p.toString();
    try { history.replaceState(history.state, '', location.pathname + (q ? '?' + q : '') + location.hash); } catch (e) { /* file:// or a sandbox */ }
  }

  /* ---- copy buttons: data-copy-from="<selector>" copies that element's text; data-copy="<text>" copies the text ---- */
  $$('[data-copy-from], [data-copy]').forEach(function (b) {
    if (!navigator.clipboard || !window.isSecureContext) return;
    var label = b.textContent, timer, status = b.parentNode && $('[data-copy-status]', b.parentNode);
    b.hidden = false;
    b.addEventListener('click', function () {
      var sel = attr(b, 'data-copy-from'), src = sel ? $(sel) : null;
      navigator.clipboard.writeText(src ? src.textContent.trim() : attr(b, 'data-copy')).then(function () {
        b.textContent = attr(b, 'data-done') || T('Copied', '已复制');
        if (status) status.textContent = b.textContent;
        clearTimeout(timer);
        timer = setTimeout(function () { b.textContent = label; if (status) status.textContent = ''; }, 2000);
      }, function () {});
    });
  });

  /* ---- plates: CSS filters by the checked kind radio; this keeps ?kind= in step ---- */
  $$('[data-kinds] input[name="kind"]').forEach(function (r) {
    if (r.value && r.value === P.get('kind') && !r.disabled) r.checked = true;
    r.addEventListener('change', function () { if (r.value) P.set('kind', r.value); else P.delete('kind'); setURL(P); });
  });

  var root = $('[data-filter]');
  if (!root) return;

  /* ---- the rows and what each one is ---- */
  var labels = {};
  try { labels = JSON.parse(($('script[type="application/json"][id$="-labels"]', root) || {}).textContent || '{}'); } catch (e) { labels = {}; }
  var onShelf = attr(root, 'data-filter') === 'shelf';
  var rows = $$('[data-group] [data-id]', root);
  rows.forEach(function (r, i) { r._i = i; r._home = r.parentNode; });
  var total = rows.length;
  var eras = labels.eraRanges || [];
  function eraOf(y) { for (var i = 0; i < eras.length; i++) if (y >= eras[i][1] && y < eras[i][2]) return eras[i][0]; return ''; }
  function langOf(l) { return /^lzh/.test(l) ? 'lzh' : /^zh/.test(l) ? 'zh' : l.split('-')[0]; }
  function val(r, k) {
    if (k === 'era') return eraOf(+attr(r, 'data-year'));
    if (k === 'lang') return langOf(attr(r, 'data-lang'));
    return attr(r, 'data-' + k);
  }
  var KEYS = onShelf ? ['form', 'era', 'lang', 'tag'] : ['shelf', 'form', 'era', 'lang', 'tag'];
  var S = { sort: P.get('sort') || '', view: P.get('view') === 'grid' ? 'grid' : 'list', pick: P.get('pick') === '1', tr: !!P.get('tr') };
  KEYS.forEach(function (k) { S[k] = P.get(k) || ''; });
  var Q = null; /* the search result set, from search.js: { id: score } */

  function ok(r, skip) {
    for (var i = 0; i < KEYS.length; i++) {
      var k = KEYS[i];
      if (k === skip || !S[k]) continue;
      if (k === 'tag' ? (' ' + attr(r, 'data-tags') + ' ').indexOf(' ' + S.tag + ' ') < 0 : val(r, k) !== S[k]) return false;
    }
    if (skip !== 'pick' && S.pick && attr(r, 'data-pick') !== '1') return false;
    if (skip !== 'tr' && S.tr && !(+attr(r, 'data-tr') > 0)) return false;
    return !Q || Object.prototype.hasOwnProperty.call(Q, attr(r, 'data-id'));
  }

  /* ---- sorting ---- */
  var coll;
  try { coll = new Intl.Collator(ZH ? 'zh-Hans-CN-u-co-pinyin' : 'en', { sensitivity: 'base', numeric: true }); } catch (e) { coll = { compare: function (a, b) { return a < b ? -1 : a > b ? 1 : 0; } }; }
  function titleOf(r) { if (r._t == null) { var a = $('.r-title a', r); r._t = (a ? a.textContent : '').trim(); } return r._t; }
  function num(r, k) { return +attr(r, 'data-' + k); }
  function sortKey() { return Q && (!S.sort || S.sort === 'rank') ? 'rank' : (S.sort && S.sort !== 'rank' ? S.sort : 'id'); }
  function cmp(a, b) {
    switch (sortKey()) {
      case 'rank': return (Q[attr(b, 'data-id')] || 0) - (Q[attr(a, 'data-id')] || 0) || a._i - b._i;
      case 'year': return num(a, 'year') - num(b, 'year') || a._i - b._i;
      case 'year-desc': return num(b, 'year') - num(a, 'year') || a._i - b._i;
      case 'title': return coll.compare(titleOf(a), titleOf(b)) || a._i - b._i;
      case 'author': return coll.compare(attr(a, 'data-author'), attr(b, 'data-author')) || num(a, 'year') - num(b, 'year') || a._i - b._i;
      case 'min': return num(a, 'min') - num(b, 'min') || a._i - b._i;
      default: return a._i - b._i;
    }
  }

  /* ---- controls ---- */
  var fbtns = $$('[data-f]', root), tbtns = $$('[data-t]', root);
  var sel = $('[data-sort]', root), rankOpt = sel && $('option[value="rank"]', sel);
  if (sel && S.sort && !$('option[value="' + S.sort.replace(/[^a-z-]/g, '') + '"]', sel)) S.sort = '';
  var views = $$('[data-view]', root);
  var panel = $('[data-fpanel]', root), nactive = $('[data-nactive]', root);
  var countEl = $('[data-count]', root), chips = $('[data-chips]', root), empty = $('[data-empty]', root);
  var results = $('[data-results]', root), resultsWrap = $('[data-results-wrap]', root), more = $('[data-more]', root);
  var groups = $$('[data-group]', root);
  var grid = $('[data-grid]', root), tpl = $('template[data-grid-tpl]', root), cells = null;
  var MAX = 48;

  fbtns.forEach(function (b) {
    b.addEventListener('click', function () {
      if (b.disabled) return;
      var k = attr(b, 'data-f'), v = attr(b, 'data-v');
      S[k] = S[k] === v ? '' : v;
      apply();
    });
  });
  tbtns.forEach(function (b) { b.addEventListener('click', function () { if (b.disabled && !S[attr(b, 'data-t')]) return; var k = attr(b, 'data-t'); S[k] = !S[k]; apply(); }); });
  if (sel) sel.addEventListener('change', function () { S.sort = sel.value; apply(); });
  views.forEach(function (r) {
    r.checked = r.value === S.view;
    r.addEventListener('change', function () { if (r.checked) { S.view = r.value; apply(); } });
  });
  $$('[data-clear]', root).forEach(function (b) { b.addEventListener('click', clearFilters); });
  function clearFilters() { KEYS.forEach(function (k) { S[k] = ''; }); S.pick = false; S.tr = false; apply(); }

  /* on phones the bar is a <details> "Filter and sort"; from 600px up it is always open */
  if (panel && window.matchMedia) {
    var wide = window.matchMedia('(min-width: 600px)');
    var sync = function () { panel.open = wide.matches; };
    sync();
    if (wide.addEventListener) wide.addEventListener('change', sync); else if (wide.addListener) wide.addListener(sync);
  }
  /* a hairline under the bar only while it is stuck under the header */
  var bar = $('[data-fbar]', root), sent = $('[data-fsent]', root);
  if (bar && sent && window.IntersectionObserver) {
    var head = $('.site-head'), hh = head ? head.offsetHeight : 0;
    new IntersectionObserver(function (es) {
      es.forEach(function (e) { bar.classList.toggle('stuck', !e.isIntersecting && e.boundingClientRect.top < hh + 1); });
    }, { rootMargin: '-' + (hh + 1) + 'px 0px 0px 0px' }).observe(sent);
  }

  function labelOf(k, v) {
    var b = $('[data-f="' + k + '"][data-v="' + (window.CSS && CSS.escape ? CSS.escape(v) : v) + '"]', root);
    if (b) return attr(b, 'data-label');
    return (labels[k] && labels[k][v]) || v;
  }
  function togLabel(k) { var b = $('[data-t="' + k + '"]', root); return b ? attr(b, 'data-label') : k; }
  function activeList() {
    var a = [];
    KEYS.forEach(function (k) { if (S[k]) a.push([k, labelOf(k, S[k])]); });
    if (S.pick) a.push(['pick', togLabel('pick') || T('Claude’s picks', 'Claude 选的')]);
    if (S.tr) a.push(['tr', togLabel('tr') || T('Has Chinese translation', '有现代中文译文')]);
    return a;
  }

  /* ---- apply: filter, count, order, place, describe ---- */
  function apply() {
    var vis = rows.filter(function (r) { return ok(r); });
    var all = rows.slice().sort(cmp);
    vis.sort(cmp);
    var flat = !!(Q && results);
    var shown = flat ? vis.slice(0, MAX) : vis;
    var on = {};
    shown.forEach(function (r) { on[attr(r, 'data-id')] = 1; });
    if (flat) {
      all.forEach(function (r) { r.hidden = !on[attr(r, 'data-id')]; if (r.hidden && r.parentNode !== r._home) r._home.appendChild(r); });
      shown.forEach(function (r) { results.appendChild(r); });
    } else {
      all.forEach(function (r) { r.hidden = !on[attr(r, 'data-id')]; r._home.appendChild(r); });
    }
    if (resultsWrap) resultsWrap.hidden = !flat;
    if (more) { more.hidden = !(flat && vis.length > MAX); more.textContent = T('Showing the first ' + MAX + ' of ' + vis.length + '. Add a word to narrow the search.', '先显示前 ' + MAX + ' 条，共 ' + vis.length + ' 条。再加一个词可以缩小范围。'); }
    groups.forEach(function (g) {
      var n = $$('[data-id]:not([hidden])', g).length, c = $('[data-gcount]', g);
      g.hidden = flat || !n || (S.view === 'grid' && !!grid);
      if (c) c.textContent = n;
    });

    /* the grid view: cards from the template, in the same order and with the same filter */
    if (grid && tpl) {
      if (S.view === 'grid' && !cells) {
        grid.appendChild(tpl.content.cloneNode(true));
        cells = {};
        $$('[data-cell]', grid).forEach(function (c) { cells[attr(c, 'data-cell')] = c; });
        var css = attr(grid, 'data-font-css');
        if (css && !$('link[rel="stylesheet"][href="' + css + '"]')) { var l = d.createElement('link'); l.rel = 'stylesheet'; l.href = css; d.head.appendChild(l); }
      }
      grid.hidden = S.view !== 'grid';
      if (cells) all.forEach(function (r) { var c = cells[attr(r, 'data-id')]; if (c) { c.hidden = !on[attr(r, 'data-id')]; grid.appendChild(c); } });
    }

    /* facet counts: each value counts the rows that match every other active filter */
    fbtns.forEach(function (b) {
      var k = attr(b, 'data-f'), v = attr(b, 'data-v'), n = 0;
      rows.forEach(function (r) { if (ok(r, k) && (!v || val(r, k) === v)) n++; });
      var c = $('[data-n]', b);
      if (c) c.textContent = n;
      var pressed = S[k] === v;
      b.setAttribute('aria-pressed', pressed ? 'true' : 'false');
      b.disabled = !!v && !n && !pressed;
      if (b.disabled) { b.setAttribute('aria-disabled', 'true'); b.title = T('None with the other filters', '在其他筛选条件下没有作品'); } else { b.removeAttribute('aria-disabled'); b.removeAttribute('title'); }
    });
    tbtns.forEach(function (b) {
      var k = attr(b, 'data-t'), n = 0;
      rows.forEach(function (r) { if (ok(r, k) && (k === 'pick' ? attr(r, 'data-pick') === '1' : +attr(r, 'data-tr') > 0)) n++; });
      var c = $('[data-n]', b);
      if (c) c.textContent = n;
      b.setAttribute('aria-pressed', S[k] ? 'true' : 'false');
      b.disabled = !n && !S[k];
      if (b.disabled) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
    });
    if (sel) { if (rankOpt) rankOpt.disabled = !Q; sel.value = sortKey(); }

    /* chips for the active filters, and "Clear all" */
    var act = activeList();
    if (nactive) nactive.textContent = act.length ? '(' + act.length + ')' : '';
    if (chips) {
      chips.textContent = '';
      act.forEach(function (a) {
        var c = d.createElement('button');
        c.type = 'button'; c.className = 'chip';
        c.setAttribute('aria-label', T('Remove filter: ', '移除筛选：') + a[1]);
        c.appendChild(d.createTextNode(a[1] + ' '));
        var x = d.createElement('span'); x.setAttribute('aria-hidden', 'true'); x.textContent = '×'; c.appendChild(x);
        c.addEventListener('click', function () { if (a[0] === 'pick' || a[0] === 'tr') S[a[0]] = false; else S[a[0]] = ''; apply(); });
        chips.appendChild(c);
      });
      if (act.length > 1) {
        var all2 = d.createElement('button');
        all2.type = 'button'; all2.className = 'linkish'; all2.textContent = T('Clear all', '全部清除');
        all2.addEventListener('click', clearFilters);
        chips.appendChild(all2);
      }
      chips.hidden = !act.length;
    }

    /* the count line and the empty state (search.js writes both while a query is active) */
    if (countEl && !Q) countEl.textContent = vis.length === total ? T(total + ' works', '共 ' + total + ' 部作品') : T('Showing ' + vis.length + ' of ' + total, '显示 ' + total + ' 部中的 ' + vis.length + ' 部');
    if (empty) {
      empty.hidden = !!Q || vis.length > 0;
      if (!empty.hidden) {
        var msg = $('[data-empty-msg]', empty);
        if (msg) msg.textContent = emptyText(act);
        var sa = $('[data-search-all]', empty);
        if (sa) { var p = new URLSearchParams(); KEYS.forEach(function (k) { if (S[k]) p.set(k, S[k]); }); if (S.pick) p.set('pick', '1'); if (S.tr) p.set('tr', 'zh'); sa.href = (ZH ? '' : '/en') + '/open-stacks/search' + (p.toString() ? '?' + p : ''); }
      }
    }

    /* the URL */
    var u = new URLSearchParams();
    if (F.q) u.set('q', F.q);
    KEYS.forEach(function (k) { if (S[k]) u.set(k, S[k]); });
    if (S.pick) u.set('pick', '1');
    if (S.tr) u.set('tr', 'zh');
    if (S.sort && S.sort !== 'id' && S.sort !== 'rank') u.set('sort', S.sort);
    if (grid && S.view === 'grid') u.set('view', 'grid');
    setURL(u);
    if (F.after) F.after({ query: !!Q, flat: flat, k: vis.length, shown: shown, total: total, filters: act.length });
  }
  function emptyText(act) {
    var where = onShelf ? T(' on this shelf yet.', '') : T(' yet.', '');
    if (ZH) return (onShelf ? '这个书架上' : '开架书库里') + '还没有符合这些条件的作品：' + act.map(function (a) { return a[1]; }).join('、') + '。';
    var f = S.form ? labelOf('form', S.form).toLowerCase() : 'works';
    var s = 'No ' + f;
    if (S.lang) s += ' in ' + labelOf('lang', S.lang);
    if (S.era) { var e = labelOf('era', S.era); s += ' from ' + (/^\d+s$/.test(e) ? 'the ' + e : e.charAt(0).toLowerCase() + e.slice(1)); }
    if (S.tag) s += ' about ' + labelOf('tag', S.tag).toLowerCase();
    if (S.pick) s += ' from Claude’s picks';
    if (S.tr) s += ' with a Chinese translation';
    if (S.shelf) s += ' on the ' + labelOf('shelf', S.shelf) + ' shelf';
    return s + where;
  }

  /* the interface search.js uses on the search page */
  var F = window.CLF = {
    q: P.get('q') || '',
    rows: rows,
    root: root,
    S: S,
    after: null,
    apply: apply,
    setQuery: function (q, scores) { F.q = q || ''; Q = scores || null; apply(); },
  };
  apply();
})();
