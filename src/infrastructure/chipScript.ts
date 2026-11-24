// SPEC §35 AC-144 — 목록 칩은 분류를 유지한 채 그 자리에서 좁힌다(주소 ?t=<slug>, 건수 다시 셈, 뒤로 복원). JS가 없으면 칩은 기존 /t/ 링크.
// 지난 행(hidden)은 칩을 풀어도 세지 않는다. 필터로 감춘 행은 data-off(CSS display:none).
export const CHIP_SCRIPT = `(function(){
var chips=Array.prototype.slice.call(document.querySelectorAll('[data-chip]'));
if(!chips.length)return;
var rows=document.querySelectorAll('[data-row-deadline]');
var cur=null;
function apply(slug){
cur=slug||null;var name=null;
chips.forEach(function(c){var on=c.getAttribute('data-slug')===cur;if(on)name=c.getAttribute('data-tag');c.classList.toggle('on',on);c.setAttribute('aria-pressed',on?'true':'false')});
var n=0;
rows.forEach(function(r){var tags=(r.getAttribute('data-tags')||'').split(',');var off=!!cur&&tags.indexOf(name)<0;
if(off)r.setAttribute('data-off','');else r.removeAttribute('data-off');
if(!off&&!r.hidden)n++});
document.querySelectorAll('[data-count="list"]').forEach(function(el){el.textContent=String(n)});
document.querySelectorAll('[data-empty="list"]').forEach(function(el){el.hidden=n>0})}
function fromUrl(){var m=/[?&]t=([a-z-]+)/.exec(location.search);return m?m[1]:null}
chips.forEach(function(c){c.addEventListener('click',function(e){
e.preventDefault();var s=c.getAttribute('data-slug');var next=cur===s?null:s;apply(next);
history.pushState({t:next},'',location.pathname+(next?'?t='+next:''))})});
window.addEventListener('popstate',function(){apply(fromUrl())});
apply(fromUrl());
})();`;
