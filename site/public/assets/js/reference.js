/* Cold Library — the Reference Room (2026-11-01). On a category page: filter by kind, by words and by licence.
   On /reference: search every entry from /reference/index.json, loaded on first use. Without JavaScript every
   entry is still listed on its category page. Talks to nothing but this site. */
(() => {
  'use strict';
  var d = document, ZH = d.body.getAttribute('data-lang') === 'zh', BASE = ZH ? '' : '/en';
  function $(s, el) { return (el || d).querySelector(s); }
  function $$(s, el) { return [].slice.call((el || d).querySelectorAll(s)); }
  function T(en, zh) { return ZH ? zh : en; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }
  function words(q) { return q.toLowerCase().split(/\s+/).filter(Boolean); }
  var FREE = { 'public-domain': 1, permissive: 1 };

  /* ---------- a category page: kind, words, licence ---------- */
  var form = $('[data-ref-filters]');
  if (form) {
    form.hidden = false;
    var rows = $$('.ref'), groups = $$('[data-ref-group]'), out = $('[data-ref-count]', form), f = $('[data-ref-f]', form), free = $('[data-ref-free]', form), none = $('[data-ref-empty]');
    var apply = () => {
      var k = ($('input[name="k"]:checked', form) || {}).value || '', ws = words(f.value), only = free.checked, n = 0;
      rows.forEach((r) => {
        var q = r.getAttribute('data-q');
        var ok = (!k || r.getAttribute('data-k') === k) && (!only || FREE[r.getAttribute('data-r')]) && ws.every((w) => q.indexOf(w) >= 0);
        r.hidden = !ok; if (ok) n++;
      });
      groups.forEach((g) => { g.hidden = !$$('.ref', g).some((r) => !r.hidden); });
      out.textContent = T(n + (n === 1 ? ' entry' : ' entries'), n + ' 条');
      if (none) none.hidden = n > 0;
    };
    form.addEventListener('change', apply);
    form.addEventListener('input', apply);
    form.addEventListener('submit', (e) => e.preventDefault());
  }

  /* ---------- /reference: search across the room ---------- */
  var sf = $('[data-ref-search]'), box = $('[data-ref-results]');
  if (sf && box) {
    sf.hidden = false;
    var input = $('input', sf), list = $('[data-ref-list]', box), count = $('[data-ref-count]', box), docs = null, waiting = false;
    var CATS = { literature: T('Literature', '文学'), faith: T('Faith', '信仰'), history: T('History', '历史'), aesthetics: T('Aesthetics', '美学'), music: T('Music', '音乐'), tools: T('Tools', '工具') };
    var KINDS = { text: T('Texts', '全文'), dataset: T('Datasets', '数据集'), api: T('APIs', '接口'), font: T('Typefaces', '字体'), tool: T('Tools', '工具'), list: T('Lists', '书单') };
    var RIGHTS = { 'public-domain': T('Public domain', '公有领域'), permissive: T('Permissive licence', '宽松许可'), 'share-alike': T('Share-alike licence', '相同方式共享'), limited: T('Restricted licence', '受限许可'), custom: T('Own terms', '自定条款'), unstated: T('No licence stated', '未声明许可证') };
    var fmt = (n) => { try { return new Intl.NumberFormat(ZH ? 'zh-CN' : 'en', { notation: 'compact', maximumFractionDigits: 1 }).format(n); } catch (e) { return String(n); } };
    var hay = (x) => [x.r, x.n.en, x.n.zh, x.d, x.t.join(' '), CATS[x.c], KINDS[x.k]].join(' ').toLowerCase();
    var row = (x) => {
      var p = x.r.split('/'), lic = x.l && x.l !== 'NOASSERTION' && x.l !== 'OTHER' ? '<span class="ref-lic">' + esc(x.l) + '</span> ' : '';
      var sep = '<span class="sep" aria-hidden="true">·</span><wbr>';
      return '<li class="ref"><h3 class="ref-name"><a href="https://github.com/' + esc(x.r) + '" rel="noopener"><span class="ref-owner">' + esc(p[0]) + '/</span>' + esc(p[1]) + '</a> <span class="ref-kind">' + esc(KINDS[x.k]) + '</span></h3>' +
        '<p class="ref-note">' + esc(ZH ? x.n.zh : x.n.en) + '</p>' +
        '<p class="meta ref-facts">' + [lic + esc(RIGHTS[x.g]), '★ ' + esc(fmt(x.s)), (x.a ? T('archived, last change ', '已归档，最后更新 ') : T('updated ', '更新于 ')) + esc(x.u.slice(0, 7)),
          '<a href="' + BASE + '/reference/' + esc(x.c) + '#' + esc(x.i) + '">' + esc(CATS[x.c]) + '</a>', '<span class="id">' + esc(x.i) + '</span>'].join(sep) + '</p></li>';
    };
    var run = () => {
      var ws = words(input.value);
      if (!ws.length) { box.hidden = true; list.innerHTML = ''; return; }
      if (!docs) { if (!waiting) load(); return; }
      var hits = docs.filter((x) => ws.every((w) => x._h.indexOf(w) >= 0)).map((x) => {
        var name = x.r.toLowerCase(), note = (x.n.en + ' ' + x.n.zh).toLowerCase(), s = 0;
        ws.forEach((w) => { s += name.indexOf(w) >= 0 ? 3 : note.indexOf(w) >= 0 ? 2 : 1; });
        return { x: x, s: s + Math.log(x.s + 1) / 10 };
      }).sort((a, b) => b.s - a.s);
      box.hidden = false;
      count.textContent = hits.length ? T(hits.length + (hits.length === 1 ? ' entry' : ' entries') + (hits.length > 60 ? ', the first 60 shown' : ''), hits.length + ' 条' + (hits.length > 60 ? '，先显示前 60 条' : '')) : T('Nothing matches. Try fewer or other words.', '没有符合的条目，换几个字试试。');
      list.innerHTML = hits.slice(0, 60).map((h) => row(h.x)).join('');
    };
    var load = () => {
      waiting = true;
      fetch('/reference/index.json').then((r) => (r.ok ? r.json() : Promise.reject(r.status))).then((j) => {
        docs = (j.entries || []).map((x) => { x._h = hay(x); return x; }); run();
      }, () => { box.hidden = false; count.textContent = T('Search could not load. Every entry is listed on its category page.', '搜索没加载出来。每一条都列在各自的分类页上。'); });
    };
    input.addEventListener('input', run);
    input.addEventListener('focus', () => { if (!docs && !waiting) load(); }, { once: true });
    sf.addEventListener('submit', (e) => { e.preventDefault(); run(); });
  }
})();
