/* Cold Library — the reading view. Deferred; every control already works without it.
   It remembers choices, adds Esc and a focus trap to the bottom sheets, follows the current section,
   draws progress, copies code and credit lines, prints, and moves along the shelf with ← and →. */
(function () {
  'use strict';
  var doc = document, work = doc.querySelector('article.work');
  if (!work) return;
  var ZH = (doc.body.getAttribute('data-lang') || 'en') === 'zh';
  function T(en, zh) { return ZH ? zh : en; }
  function store(k, v) { try { if (v == null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { /* storage blocked: choices last for this page only */ } }
  function $$(sel, el) { return Array.prototype.slice.call((el || work).querySelectorAll(sel)); }
  var group = work.getAttribute('data-group'), pl = work.getAttribute('data-pl');
  var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };

  /* ---------- remember choices; the radios themselves are the state ---------- */
  work.addEventListener('change', function (e) {
    var t = e.target;
    if (t.name === 'view') { if (!t.hasAttribute('data-nostore')) store('cl-view:' + group + '-' + pl, t.value); }
    else if (t.name === 'script') store('cl-script', t.value);
    else if (t.name === 'rs') store('cl-rs', t.value);
    else if (t.id === 'wrap-lines') store('cl-wrap', t.checked ? '1' : '0');
    else if (t.classList && t.classList.contains('sheet-cb')) sheet(t);
    if (t.name === 'view' || t.name === 'rs' || t.id === 'wrap-lines') { measureCode(); schedule(); }
  });
  // "Read side by side →" on a partial translation switches the view, then follows the anchor.
  $$('a[data-view]').forEach(function (a) {
    a.addEventListener('click', function () {
      var r = doc.getElementById('v-' + a.getAttribute('data-view'));
      if (r && !r.checked) { r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true })); }
    });
  });

  /* ---------- bottom sheets: Esc closes, focus stays inside, choosing a section closes ---------- */
  var openCb = null;
  function sheetEl(cb) { return cb.id === 'sheet-toc' ? work.querySelector('.rail > .toc') : work.querySelector('.toolbar'); }
  function focusables(el) { return $$('a[href], input:not([disabled]), button:not([disabled]), [tabindex="0"]', el).filter(function (x) { return x.offsetWidth || x.offsetHeight || x.getClientRects().length; }); }
  function sheet(cb) {
    if (cb.checked) {
      $$('.sheet-cb').forEach(function (o) { if (o !== cb) o.checked = false; });
      openCb = cb;
      var f = focusables(sheetEl(cb));
      var cur = sheetEl(cb).querySelector('[aria-current="location"]') || sheetEl(cb).querySelector('input:checked');
      (cur || f[0] || cb).focus();
    } else if (openCb === cb) { openCb = null; cb.focus(); }
  }
  function closeSheet() { if (!openCb) return false; var cb = openCb; cb.checked = false; openCb = null; cb.focus(); return true; }
  $$('.sheet-head .close').forEach(function (l) {
    l.tabIndex = 0;
    l.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); l.click(); } });
  });
  $$('.toc a').forEach(function (a) { a.addEventListener('click', function () { var cb = doc.getElementById('sheet-toc'); if (cb && cb.checked) { cb.checked = false; openCb = null; } }); });

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (closeSheet()) { e.preventDefault(); return; }
      var aa = doc.getElementById('aa-open');
      if (aa && aa.checked) { aa.checked = false; aa.focus(); e.preventDefault(); }
      return;
    }
    if (e.key === 'Tab' && openCb) {
      var f = focusables(sheetEl(openCb));
      if (!f.length) return;
      var i = f.indexOf(doc.activeElement);
      if (e.shiftKey && i <= 0) { f[f.length - 1].focus(); e.preventDefault(); }
      else if (!e.shiftKey && (i === f.length - 1 || i === -1)) { f[0].focus(); e.preventDefault(); }
      return;
    }
    // ← and → follow the shelf, unless a field is focused, text is selected or a sheet is open
    if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey || e.defaultPrevented || openCb) return;
    var a = doc.activeElement;
    if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable || (a.closest && a.closest('pre, .sideways, [role="radiogroup"]')))) return;
    var sel = window.getSelection && window.getSelection();
    if (sel && String(sel).length) return;
    var link = work.querySelector('.neigh a[rel="' + (e.key === 'ArrowLeft' ? 'prev' : 'next') + '"]');
    if (link) { e.preventDefault(); location.href = link.href; }
  });

  /* ---------- current section and progress ---------- */
  var parts = $$('.read .part');
  var prog = work.querySelector('[data-progress]');
  var where = prog && prog.querySelector('[data-where]'), left = prog && prog.querySelector('[data-left]');
  var noun = prog ? prog.getAttribute('data-noun') : '', count = prog ? +prog.getAttribute('data-count') : 0;
  var links = {};
  $$('.toc a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; });
  var mins = parts.map(function (p) { return parseFloat(p.getAttribute('data-min')) || 0; });
  var total = mins.reduce(function (a, b) { return a + b; }, 0);
  var namedIndex = [], k = 0;
  parts.forEach(function (p, i) { if (links[p.id]) k++; namedIndex[i] = Math.max(1, k); });
  var current = -1, pending = false;
  function schedule() { if (!pending && parts.length) { pending = true; raf(update); } }
  function update() {
    pending = false;
    var line = window.innerHeight * 0.3, idx = 0;
    for (var i = 0; i < parts.length; i++) {
      if (!parts[i].getClientRects().length) continue;
      if (parts[i].getBoundingClientRect().top <= line) idx = i; else break;
    }
    var r = parts[idx].getBoundingClientRect();
    var frac = r.height ? Math.min(1, Math.max(0, (line - r.top) / r.height)) : 0;
    var before = 0;
    for (var j = 0; j < idx; j++) before += mins[j];
    var done = before + frac * mins[idx];
    var atEnd = window.innerHeight + window.scrollY >= doc.documentElement.scrollHeight - 4;
    work.style.setProperty('--p', (total ? (atEnd ? 1 : done / total) : 0).toFixed(4));
    if (idx !== current) {
      current = idx;
      var id = null;
      for (var q = idx; q >= 0; q--) if (links[parts[q].id]) { id = parts[q].id; break; }
      Object.keys(links).forEach(function (key) { if (key === id) links[key].setAttribute('aria-current', 'location'); else links[key].removeAttribute('aria-current'); });
    }
    if (left) {
      var m = Math.max(0, Math.round(total - done));
      left.textContent = m < 1 ? T('Less than a minute left', '不到 1 分钟') : T(m + ' min left', '还剩 ' + m + ' 分钟');
    }
    if (where && count) where.textContent = T(noun + ' ' + namedIndex[idx] + ' of ' + count, '第 ' + namedIndex[idx] + ' ' + noun + '，共 ' + count + ' ' + noun);
  }
  if (parts.length) {
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(schedule, { rootMargin: '-30% 0px -69% 0px' });
      parts.forEach(function (p) { io.observe(p); });
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    schedule();
  }

  /* ---------- copy: code blocks and the credit line ---------- */
  function copy(text, btn) {
    var status = btn.parentNode.querySelector('.copy-status');
    var label = btn.getAttribute('data-label') || btn.textContent;
    btn.setAttribute('data-label', label);
    function done() {
      btn.textContent = T('Copied', '已复制');
      if (status) status.textContent = T('Copied', '已复制');
      clearTimeout(btn._t);
      btn._t = setTimeout(function () { btn.textContent = label; if (status) status.textContent = ''; }, 2000);
    }
    function fallback() {
      var ta = doc.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', ''); ta.className = 'vh';
      doc.body.appendChild(ta); ta.select();
      try { if (doc.execCommand('copy')) done(); } catch (e) { /* nothing to do */ }
      doc.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  }
  work.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-copy], [data-credit], [data-print]');
    if (!b) return;
    if (b.hasAttribute('data-print')) { window.print(); return; }
    if (b.hasAttribute('data-credit')) { copy(b.getAttribute('data-credit'), b); return; }
    var pre = b.closest('.code-wrap') && b.closest('.code-wrap').querySelector('pre');
    if (pre) copy(pre.textContent.replace(/\n$/, ''), b);
  });

  /* ---------- code: a right-edge fade while a block overflows ---------- */
  function measureCode() {
    $$('.code-box').forEach(function (box) {
      var pre = box.querySelector('pre');
      if (!pre || !pre.getClientRects().length) return;
      box.classList.toggle('overflows', pre.scrollWidth > pre.clientWidth + 1);
      box.classList.toggle('at-end', pre.scrollLeft + pre.clientWidth >= pre.scrollWidth - 1);
    });
  }
  $$('.code-box pre').forEach(function (pre) { pre.addEventListener('scroll', function () { pre.parentNode.classList.toggle('at-end', pre.scrollLeft + pre.clientWidth >= pre.scrollWidth - 1); }, { passive: true }); });
  measureCode();
  window.addEventListener('resize', measureCode);

  /* ---------- a gloss and its note, paired by id (any number) ---------- */
  function pairOn(e, on) {
    var g = e.target.closest && e.target.closest('.gl');
    if (!g) return;
    var n = doc.getElementById(g.getAttribute('aria-describedby'));
    if (n) n.classList.toggle('on', on);
  }
  work.addEventListener('mouseover', function (e) { pairOn(e, true); });
  work.addEventListener('mouseout', function (e) { pairOn(e, false); });
  work.addEventListener('focusin', function (e) { pairOn(e, true); });
  work.addEventListener('focusout', function (e) { pairOn(e, false); });

  /* ---------- print: the full record prints open ---------- */
  var wasClosed = [];
  window.addEventListener('beforeprint', function () { wasClosed = $$('details.full-record:not([open])'); wasClosed.forEach(function (d) { d.open = true; }); });
  window.addEventListener('afterprint', function () { wasClosed.forEach(function (d) { d.open = false; }); wasClosed = []; });
})();
