// SPEC §35 AC-148 — 조사(이/가·은/는·을/를)는 이 한 곳에서만 붙인다. 순수.
const hasBatchim = (word: string): boolean => {
  const c = word.trim().slice(-1).charCodeAt(0);
  return c >= 0xac00 && c <= 0xd7a3 ? (c - 0xac00) % 28 !== 0 : false;
};

export function josa(word: string, pair: '이/가' | '은/는' | '을/를'): string {
  const [a, b] = pair.split('/');
  return `${word}${hasBatchim(word) ? a : b}`;
}

/** 태그 화면 제목 — 「창업자가 낼 수 있는 공고」·「누구나 낼 수 있는 공고」 */
export function tagHeading(name: string): string {
  return name === '누구나' ? '누구나 낼 수 있는 공고' : `${josa(name, '이/가')} 낼 수 있는 공고`;
}
