/* Cold Library — the page chrome: theme, language hint, day counter, floor directory, menu.
   No dependencies, no tracking. Storage calls are wrapped: the page works when storage is blocked. */
(function () {
  'use strict';
  var doc = document, root = doc.documentElement, body = doc.body;
  var ZH = (body.getAttribute('data-lang') || 'en') === 'zh';
  function T(en, zh) { return ZH ? zh : en; }
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch (e) { return null; } }
  function $$(sel, el) { return Array.prototype.slice.call((el || doc).querySelectorAll(sel)); }

  /* theme: follows the system until the visitor chooses */
  function effectiveDark() {
    var t = root.getAttribute('data-theme');
    if (t) return t === 'dark';
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  $$('[data-toggle-theme]').forEach(function (b) {
    b.addEventListener('click', function () { var next = effectiveDark() ? 'light' : 'dark'; root.setAttribute('data-theme', next); store('cl-theme', next); });
  });

  /* language: remember the choice; suggest the other version once, with a dot, when the browser disagrees */
  $$('[data-switch-lang]').forEach(function (a) { a.addEventListener('click', function () { store('cl-lang', a.getAttribute('data-switch-lang')); }); });
  (function () {
    if (store('cl-lang')) return;
    var nav = (navigator.language || '').toLowerCase();
    if ((!ZH && nav.indexOf('zh') === 0) || (ZH && nav && nav.indexOf('zh') !== 0)) $$('.lang-link').forEach(function (a) { a.classList.add('suggest'); });
  })();

  /* day counter, in the visitor's own calendar day */
  $$('[data-day]').forEach(function (n) {
    var f = (n.getAttribute('data-founded') || '2026-10-04').split('-');
    var start = Date.UTC(+f[0], +f[1] - 1, +f[2]), d = new Date();
    var day = Math.max(1, Math.floor((Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - start) / 86400000) + 1);
    n.textContent = T('day ' + day, '第 ' + day + ' 天');
  });

  /* floor directory: a small dialog */
  var dir = doc.getElementById('directory'), lastFocus = null;
  function openDir() { if (!dir) return; lastFocus = doc.activeElement; dir.hidden = false; var first = dir.querySelector('a[aria-current="page"]') || dir.querySelector('a'); if (first) first.focus(); }
  function closeDir() { if (!dir || dir.hidden) return; dir.hidden = true; if (lastFocus && lastFocus.focus) lastFocus.focus(); }
  $$('[data-open-directory]').forEach(function (b) { b.addEventListener('click', openDir); });
  $$('[data-close-directory]').forEach(function (b) { b.addEventListener('click', closeDir); });
  if (dir) dir.addEventListener('click', function (e) { if (e.target === dir) closeDir(); });

  /* menu: closes on Escape and on a click outside */
  doc.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    closeDir();
    $$('details.menu[open]').forEach(function (m) { m.open = false; var s = m.querySelector('summary'); if (s) s.focus(); });
  });
  doc.addEventListener('click', function (e) {
    $$('details.menu[open]').forEach(function (m) { if (!m.contains(e.target)) m.open = false; });
  });
})();
