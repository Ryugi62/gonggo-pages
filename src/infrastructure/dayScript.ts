// SPEC §34 AC-132 — 빌드 뒤 날이 지나도 화면이 맞게: 배지·지난 행 걷기·건수·빈 상태·마감 CTA. 한 곳, 시험은 가짜 DOM에 오늘을 주입.
// 쓰는 DOM은 좁게: querySelectorAll · getAttribute · setAttribute · removeAttribute · classList · textContent · hidden.
export const DAY_SCRIPT = `(function(){
var t=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul'}).format(new Date());
var at=function(d){return Date.parse(d+'T12:00:00Z')};
var diff=function(d){return Math.round((at(d)-at(t))/864e5)};
var closedNow=false;
document.querySelectorAll('[data-deadline]').forEach(function(el){
var n=diff(el.getAttribute('data-deadline'));var lg=el.classList.contains('lg');
el.textContent=n<0?(lg?'마감됐어요':'마감'):n===0?'D-day':'D-'+n;
el.classList.toggle('closed',n<0);el.classList.toggle('soon',n>=0&&n<=3);
if(lg&&n<0)closedNow=true});
if(closedNow)document.querySelectorAll('[data-closed-href]').forEach(function(a){
a.setAttribute('href',a.getAttribute('data-closed-href'));a.textContent=a.getAttribute('data-closed-label')||a.textContent;
a.removeAttribute('target');a.removeAttribute('rel');a.removeAttribute('ping');a.removeAttribute('data-intent')});
var seen={},shown={};
document.querySelectorAll('[data-row-deadline]').forEach(function(r){
var g=r.getAttribute('data-group')||'';seen[g]=true;
if(diff(r.getAttribute('data-row-deadline'))<0){r.hidden=true;return}
var cap=+(r.getAttribute('data-cap')||0);shown[g]=(shown[g]||0)+1;
if(cap&&shown[g]>cap){r.hidden=true;shown[g]=cap}});
document.querySelectorAll('[data-count]').forEach(function(el){var g=el.getAttribute('data-count');if(seen[g])el.textContent=String(shown[g]||0)});
document.querySelectorAll('[data-empty]').forEach(function(el){var g=el.getAttribute('data-empty');if(seen[g])el.hidden=(shown[g]||0)>0});
document.querySelectorAll('[data-hist]').forEach(function(el){try{var h=JSON.parse(el.getAttribute('data-hist'));var n=+el.getAttribute('data-total');for(var d in h)if(diff(d)<0)n-=h[d];el.textContent=String(n).replace(/\\B(?=(\\d{3})+(?!\\d))/g,',')}catch(e){}});
})();`;
