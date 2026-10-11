/* Runs right after the toolbar: restore a stored view, script and size before the text is parsed. */
(function(){var d=document,w=d.querySelector('article.work');if(!w)return;
function g(k){try{return localStorage.getItem(k)}catch(e){return null}}
function c(id){var e=d.getElementById(id);if(e&&!e.disabled&&!e.hasAttribute('data-nostore'))e.checked=true}
var v=g('cl-view:'+w.getAttribute('data-group')+'-'+w.getAttribute('data-pl'));if(v)c('v-'+v);
v=g('cl-script');if(v)c('s-'+v);v=g('cl-rs');if(v)c('rs-'+v);
var x=d.getElementById('wrap-lines');if(x){v=g('cl-wrap');x.checked=v?v==='1':!!(window.matchMedia&&matchMedia('(max-width:599px)').matches)}})();
