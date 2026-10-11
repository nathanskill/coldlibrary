/* Runs right after the toolbar, before the text is parsed: restore a stored view, script and size.
   A stored choice is applied only if its radio exists, is enabled and may be restored (no data-nostore). */
(function(){var d=document,w=d.querySelector('article.work');if(!w)return;
function g(k){try{return localStorage.getItem(k)}catch(e){return null}}
function c(p,v,ok){if(!v||ok.indexOf(v)<0)return;var e=d.getElementById(p+v);if(e&&!e.disabled&&!e.hasAttribute('data-nostore'))e.checked=true}
c('v-',g('cl-view:'+w.getAttribute('data-group')+'-'+w.getAttribute('data-pl')),['orig','par','tr','tr2']);
c('s-',g('cl-script'),['hant','hans']);c('rs-',g('cl-rs'),['s','m','l']);
var x=d.getElementById('wrap-lines');if(x){var v=g('cl-wrap');x.checked=v?v==='1':!!(window.matchMedia&&matchMedia('(max-width:599px)').matches)}})();
