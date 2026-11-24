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

const MARK_BASE = '\\d{1,2}[).]\\s|[①-⑳]|[■□●○◆◇▶▪※•*]\\s?';

/** SPEC §36 AC-151 — 자격 인용을 줄로(표시만): 번호·글머리 앞에서 나누고 `**`를 지운다. `- `는 목록처럼 2번 이상 나올 때만 마커로 본다 */
export function quoteLines(q: string): string[] {
  const t = cleanDisplay(q).replace(/\*\*/g, '').replace(/\r/g, '');
  const dash = (t.match(/(^|\s)-\s/g) ?? []).length >= 2;
  const re = new RegExp(`\\s+(?=(?:${MARK_BASE}${dash ? '|-\\s' : ''}))`);
  return t.split('\n').flatMap((ln) => ln.split(re)).map((x) => x.trim()).filter(Boolean);
}

/** SPEC §36 AC-151 — 자격 문장: 원문 인용, 없으면 찾은 ELIGIBILITY 조항 문장, 둘 다 없으면 null */
export function eligibilityText(l: { eligibilityQuote: string | null; clauses: { kind: string; quote: string }[] }): string | null {
  return l.eligibilityQuote ?? l.clauses.find((c) => c.kind === 'ELIGIBILITY')?.quote ?? null;
}

/** SPEC §37 AC-166 — 화면 표시용 제목: 꼬리 「 분야 : …」·머리 「(은혜준비)」류만 뗀다(title 태그·구조화 데이터·URL은 원래 이름 그대로). 통째로 지우지 않는다 */
export function displayTitle(name: string): string {
  let t = cleanDisplay(name).trim();
  const cut = t.replace(/\s+분야\s*:.*$/, '').trim();
  if (cut.length >= 4) t = cut;
  const head = t.replace(/^\((?!주\)|유\)|사\)|재\))[^)]{1,12}\)\s+/, '').trim();
  if (head.length >= 4) t = head;
  return t;
}
