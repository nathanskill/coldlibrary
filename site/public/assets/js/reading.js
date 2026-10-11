/* Cold Library — the reading view. Deferred; every control already works without it.
   It remembers choices, adds Esc and a focus trap to the bottom sheets, follows the current section,
   draws progress, copies code and credit lines, prints the glosses as a list, and moves along the shelf
   with ← and →. Copy it shows comes from the page (data-* templates), so there is no second copy of the words here. */
(function () {
  'use strict';
  var doc = document, work = doc.querySelector('article.work');
  if (!work) return;
  var ZH = (doc.body.getAttribute('data-lang') || 'en') === 'zh';
  function T(en, zh) { return ZH ? zh : en; }
  function store(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked: the choice lasts for this page */ } }
  function $$(sel, el) { return Array.prototype.slice.call((el || work).querySelectorAll(sel)); }
  function shown(el) { return !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length)); }
  var group = work.getAttribute('data-group'), pl = work.getAttribute('data-pl');
  var raf = window.requestAnimationFrame || function (f) { return setTimeout(f, 16); };
  // A label that acts as a button (sheet Close, "Read side by side"): reachable and pressable from the keyboard.
  function pressable(l) {
    l.tabIndex = 0;
    l.setAttribute('role', 'button');
    l.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); l.click(); } });
  }

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
  // "Read side by side →" on a partial translation is a label for the radio; then it goes to the translated part.
  $$('label[data-goto]').forEach(function (l) {
    pressable(l);
    l.addEventListener('click', function () {
      var to = doc.getElementById(l.getAttribute('data-goto'));
      if (to) setTimeout(function () { to.scrollIntoView(); }, 0);
    });
  });

  /* ---------- bottom sheets: Esc closes, focus stays inside, choosing a section closes ---------- */
  var openCb = null;
  function sheetEl(cb) { return cb.id === 'sheet-toc' ? work.querySelector('.rail > .toc') : work.querySelector('.toolbar'); }
  function focusables(el) { return $$('a[href], input:not([disabled]), button:not([disabled]), summary, [tabindex="0"]', el).filter(shown); }
  function sheet(cb) {
    var el = sheetEl(cb);
    if (cb.checked && el) {
      $$('.sheet-cb').forEach(function (o) { if (o !== cb) o.checked = false; });
      openCb = cb;
      var aa = cb.id === 'sheet-tools' && el.querySelector('details.aa');
      if (aa) aa.open = true;
      var cur = el.querySelector('[aria-current="location"]') || el.querySelector('input:checked');
      var first = cur && shown(cur) ? cur : focusables(el)[0];
      if (first) first.focus();
    } else if (openCb === cb) { openCb = null; cb.focus(); }
  }
  function closeSheet() { if (!openCb) return false; var cb = openCb; cb.checked = false; openCb = null; cb.focus(); return true; }
  $$('label.close').forEach(pressable);
  $$('.toc a').forEach(function (a) { a.addEventListener('click', function () { var cb = doc.getElementById('sheet-toc'); if (cb && cb.checked) { cb.checked = false; openCb = null; } }); });

  doc.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (closeSheet()) { e.preventDefault(); return; }
      var aa = work.querySelector('details.aa[open]');
      if (aa) { aa.open = false; aa.querySelector('summary').focus(); e.preventDefault(); }
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
    if (a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable || (a.closest && a.closest('pre, .sideways, [role="radiogroup"], details[open]')))) return;
    var sel = window.getSelection && window.getSelection();
    if (sel && String(sel).length) return;
    var link = work.querySelector('.neigh a[rel="' + (e.key === 'ArrowLeft' ? 'prev' : 'next') + '"]');
    if (link) { e.preventDefault(); location.href = link.href; }
  });

  /* ---------- current section and progress ---------- */
  var parts = $$('.read .part');
  var prog = work.querySelector('[data-progress]');
  var where = prog && prog.querySelector('.pw'), left = prog && prog.querySelector('.pleft');
  var fmtWhere = prog && prog.getAttribute('data-where'), fmtLeft = prog && prog.getAttribute('data-left'), lastLeft = prog && prog.getAttribute('data-done');
  var links = {}, count = 0;
  $$('.toc a[href^="#"]').forEach(function (a) { links[a.getAttribute('href').slice(1)] = a; count++; });
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
    if (left && fmtLeft) {
      var m = Math.max(0, Math.round(total - done));
      left.textContent = m < 1 && lastLeft ? lastLeft : fmtLeft.replace('{m}', String(Math.max(1, m)));
    }
    if (where && fmtWhere && count) where.textContent = fmtWhere.replace('{i}', String(namedIndex[idx])).replace('{n}', String(count));
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
      try { if (doc.execCommand('copy')) done(); } catch (e) { /* nothing more to try */ }
      doc.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback); else fallback();
  }
  work.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-copy], [data-credit], [data-print]');
    if (!b) return;
    if (b.hasAttribute('data-print')) { window.print(); return; }
    if (b.hasAttribute('data-credit')) { copy(b.getAttribute('data-credit'), b); return; }
    var wrap = b.closest('.code-wrap'), pre = wrap && wrap.querySelector('pre');
    if (pre) copy(pre.textContent.replace(/\n$/, ''), b);
  });

  /* ---------- code: a right-edge fade while a block overflows ---------- */
  function edge(pre) { pre.parentNode.classList.toggle('at-end', pre.scrollLeft + pre.clientWidth >= pre.scrollWidth - 1); }
  function measureCode() {
    $$('.code-box > pre').forEach(function (pre) {
      if (!pre.getClientRects().length) return;
      pre.parentNode.classList.toggle('overflows', pre.scrollWidth > pre.clientWidth + 1);
      edge(pre);
    });
  }
  $$('.code-box > pre').forEach(function (pre) { pre.addEventListener('scroll', function () { edge(pre); }, { passive: true }); });
  measureCode();
  window.addEventListener('resize', measureCode);

  /* ---------- a glossed phrase and its note light up together (paired by aria-describedby) ---------- */
  function pairOn(e, on) {
    var g = e.target.closest && e.target.closest('.gl');
    if (!g || (e.relatedTarget && g.contains(e.relatedTarget))) return;
    var n = doc.getElementById(g.getAttribute('aria-describedby'));
    if (n) n.classList.toggle('on', on);
  }
  work.addEventListener('mouseover', function (e) { pairOn(e, true); });
  work.addEventListener('mouseout', function (e) { pairOn(e, false); });

  /* ---------- print: the glosses as a numbered list after the text, the full record open ---------- */
  var printed = null, wasClosed = [];
  window.addEventListener('beforeprint', function () {
    wasClosed = $$('details.full-record:not([open])');
    wasClosed.forEach(function (d) { d.open = true; });
    var read = work.querySelector('.read');
    var notes = $$('.read .gn').filter(shown);
    if (!read || !notes.length) return;
    printed = doc.createElement('ol');
    printed.className = 'gl-print';
    printed.setAttribute('aria-hidden', 'true');
    notes.forEach(function (n) {
      var li = doc.createElement('li'), num = n.querySelector('.gnum');
      li.value = parseInt(num ? num.textContent : '', 10) || 1;
      li.lang = n.lang;
      Array.prototype.forEach.call(n.childNodes, function (c) { if (c !== num && !(c.nodeType === 1 && !shown(c))) li.appendChild(c.cloneNode(true)); });
      printed.appendChild(li);
    });
    read.parentNode.insertBefore(printed, read.nextSibling);
  });
  window.addEventListener('afterprint', function () {
    wasClosed.forEach(function (d) { d.open = false; });
    wasClosed = [];
    if (printed && printed.parentNode) printed.parentNode.removeChild(printed);
    printed = null;
  });
})();
