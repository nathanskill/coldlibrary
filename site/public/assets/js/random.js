/* Cold Library — /open-stacks/random: open one work at random from the list in the page (a JSON data block).
   location.replace(), so the back button returns to where the visitor came from. Without JS the page lists twelve works. */
(function () {
  'use strict';
  var el = document.getElementById('random-works');
  if (!el) return;
  try {
    var list = JSON.parse(el.textContent || '[]');
    if (list.length) location.replace(list[Math.floor(Math.random() * list.length)]);
  } catch (e) { /* the twelve works below stay */ }
})();
