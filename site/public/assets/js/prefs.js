/* Runs in <head> before paint: mark JS as available and apply a stored theme. Nothing else. */
(function () {
  document.documentElement.classList.add('js');
  try {
    var t = localStorage.getItem('cl-theme');
    if (t === 'light' || t === 'dark') document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();
