// SPEC §34 AC-139 — 화면에 보일 때만 고치는 글자. 데이터 파일은 그대로. 순수.
/** `\&`·`&amp;`(이중 포함)를 `&`로 */
export function cleanDisplay(s: string): string {
  let t = s.replace(/\\&/g, '&');
  for (let i = 0; i < 3; i++) t = t.replace(/&amp;/g, '&');
  return t;
}

const DANGLING = /[\s,，·、:：;-]*(?:및|또는|그리고|혹은|등의|등|…|\.{3})?[\s,，·、:：;-]*$/;
const END = /[.。!?」』)다요음함임됨니다]$/;

/** 인용 꼬리가 접속어·쉼표·말줄임에서 끊겼으면 꼬리만 걷고, 문장 끝이 아니면 마지막 문장 경계까지 자른다 */
export function tidyQuote(q: string): string {
  const t = cleanDisplay(q).trim();
  if (END.test(t)) return t;
  const body = t.replace(DANGLING, '').trim();
  if (END.test(body)) return body;
  const cut = Math.max(body.lastIndexOf('. '), body.lastIndexOf('다 '), body.lastIndexOf('요 '));
  if (body.length >= 20 && cut >= body.length * 0.4) return body.slice(0, cut + 1).trim();
  return body;
}
