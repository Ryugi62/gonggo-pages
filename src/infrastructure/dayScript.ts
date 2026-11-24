// SPEC §34 AC-132·§35 AC-142·143 — 빌드 뒤 날이 지나도 화면이 맞게: 배지·지난 행 걷기·건수·빈 상태·마감 CTA·끝난 원문 길.
// 오늘 마감이라도 적힌 시각(data-deadline-time·data-row-time)이 지금(KST)보다 이르면 지난 것으로 본다.
// 쓰는 DOM은 좁게: querySelectorAll · getAttribute · setAttribute · removeAttribute · hasAttribute · classList · textContent · hidden.
export const DAY_SCRIPT = `(function(){
var t=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date());
var hm=new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Seoul',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date());
var at=function(d){return Date.parse(d+'T12:00:00Z')};
var diff=function(d,tm){var n=Math.round((at(d)-at(t))/864e5);if(n===0&&tm&&tm<=hm)n=-1;return n};
var closedNow=false;
document.querySelectorAll('[data-deadline]').forEach(function(el){
var n=diff(el.getAttribute('data-deadline'),el.getAttribute('data-deadline-time'));var lg=el.classList.contains('lg');
el.textContent=n<0?(lg?'마감됐어요':'마감'):n===0?'D-day':'D-'+n;
el.classList.toggle('closed',n<0);el.classList.toggle('soon',n>=0&&n<=3);
if(lg&&n<0)closedNow=true});
if(closedNow){
document.querySelectorAll('[data-closed-href]').forEach(function(a){
a.setAttribute('href',a.getAttribute('data-closed-href'));a.textContent=a.getAttribute('data-closed-label')||a.textContent;
a.removeAttribute('target');a.removeAttribute('rel');a.removeAttribute('ping');a.removeAttribute('data-intent')});
document.querySelectorAll('[data-closed-show]').forEach(function(el){el.hidden=false})}
var seen={},shown={};
document.querySelectorAll('[data-row-deadline]').forEach(function(r){
var g=r.getAttribute('data-group')||'';seen[g]=true;
if(diff(r.getAttribute('data-row-deadline'),r.getAttribute('data-row-time'))<0){r.hidden=true;return}
if(r.hasAttribute('data-off'))return;
var cap=+(r.getAttribute('data-cap')||0);shown[g]=(shown[g]||0)+1;
if(cap&&shown[g]>cap){r.hidden=true;shown[g]=cap}});
var first={};document.querySelectorAll('[data-row-deadline]').forEach(function(r){var g=r.getAttribute('data-group')||'';r.removeAttribute('data-top');if(!r.hidden&&!r.hasAttribute('data-off')&&!first[g]){first[g]=true;r.setAttribute('data-top','')}});
document.querySelectorAll('[data-count]').forEach(function(el){var g=el.getAttribute('data-count');if(seen[g])el.textContent=String(shown[g]||0)});
document.querySelectorAll('[data-empty]').forEach(function(el){var g=el.getAttribute('data-empty');if(seen[g])el.hidden=(shown[g]||0)>0});
document.querySelectorAll('[data-hist]').forEach(function(el){try{var h=JSON.parse(el.getAttribute('data-hist'));var n=+el.getAttribute('data-total');for(var d in h)if(diff(d)<0)n-=h[d];el.textContent=String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g,',')}catch(e){}});
})();`;
