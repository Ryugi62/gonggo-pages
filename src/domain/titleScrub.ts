// 공고 제목 앞머리에 붙은 원 사이트 관리자 메모(「지혜 //」「게시판 이동 안내 전화 완료 //」)를 공개 전에 걷어 낸다. 순수 함수.
const MEMO_HEAD = /^[^/:]{1,30}?\s?\/\/\s*/;
const HIDDEN_HEAD = /^요청에\s*의한\s*비공개/;
const DUP_HEAD = /^\s*중복\s*\/\//;

export interface ScrubbedTitle { name: string; drop: boolean; reason: 'duplicate' | 'hidden' | null }

/** drop = 공개 목록에서 뺀다(중복 표시 공고·요청에 의한 비공개). 제목 중간의 //(URL 등)는 건드리지 않는다. */
export function scrubTitle(raw: string): ScrubbedTitle {
  const t = raw.trim();
  if (HIDDEN_HEAD.test(t)) return { name: t, drop: true, reason: 'hidden' };
  if (DUP_HEAD.test(t)) return { name: t.replace(DUP_HEAD, '').trim(), drop: true, reason: 'duplicate' };
  const m = t.match(MEMO_HEAD);
  // 메모는 한글이 들어 있고 공백이 낀다(「지혜 //」). 「A//B」·URL은 메모가 아니다.
  if (!m || !/[가-힣]/.test(m[0]) || !/\s/.test(m[0].replace(/^\s+/, '')) ) return { name: t, drop: false, reason: null };
  const rest = t.slice(m[0].length).trim();
  return { name: rest.length >= 2 ? rest : t, drop: rest.length < 2, reason: null };
}
