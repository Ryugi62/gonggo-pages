// 금지 토큰 — 공개물(내보내기 JSON)에 한 글자라도 나오면 안 되는 문자열.
// 영문 토큰은 영단어 안쪽(Google·Frontier·stakeholder)을 오탐하지 않도록 앞뒤가 영문자가 아닐 때만 잡는다.
import { tokenHash } from './tokenHash.ts';

export interface ForbiddenToken {
  label: string;
  re: RegExp;
}

const word = (w: string, flags = '') => new RegExp(`(?<![A-Za-z])${w}(?![A-Za-z])`, flags);

export const FORBIDDEN_TOKENS: ForbiddenToken[] = [
  // 사용자 지정 10종 중 일반 토큰 6종(개인 식별 4종은 아래 해시 목록)
  { label: '사용자결정', re: /사용자\s*결정/ },
  { label: 'tier', re: word('tier', 'i') },
  { label: 'opp-', re: /opp-/i },
  { label: 'GO', re: word('GO') },
  { label: 'GU', re: word('GU') },
  { label: 'hold', re: word('hold', 'i') },
  // 내부 메모 표지(방어 심층)
  { label: 'ryugi', re: /ryugi/i },
  { label: 'Jarvis', re: /jarvis/i },
  { label: 'aside', re: word('aside', 'i') },
  { label: 'gongo', re: /gongo/i },
  { label: 'gate', re: word('gate', 'i') },
  { label: 'measure_by', re: /measure_by/i },
  { label: '실측', re: /실측/ },
  { label: '판정', re: /판정/ },
  { label: '재발견', re: /재발견/ },
  { label: '스윕', re: /스윕/ },
  { label: '사람 몫', re: /사람\s*몫/ },
  { label: '★', re: /★/ },
  { label: '잔금', re: /잔금/ },
];

/**
 * 개인 식별 토큰(운영자 이름·이름 일부·상호·메일 아이디·학교 — 5개)은 공개 저장소에 평문으로 두지 않는다.
 * 대소문자 무시 지문만 두고, 본문을 같은 길이로 밀며 대조한다. 평문 목록은 운영자 로컬의
 * `privacy.local.json`(gitignore)에만 있고, 테스트가 그 목록 ↔ 이 지문이 1:1인지 확인한다.
 */
export const PRIVATE_TOKEN_HASHES: { len: number; hash: string }[] = [
  { len: 3, hash: '1e9e865375478a21' },
  { len: 2, hash: '8a742d19a3cb2a13' },
  { len: 3, hash: 'e6edf53b77359869' },
  { len: 5, hash: '8acbc8ee8f587784' },
  { len: 3, hash: '1fc93f7870d5f046' },
];

function findPrivate(text: string): string[] {
  const hits = new Set<string>();
  const lens = [...new Set(PRIVATE_TOKEN_HASHES.map((h) => h.len))];
  const want = new Map(PRIVATE_TOKEN_HASHES.map((h, i) => [h.hash, i]));
  for (const len of lens) {
    for (let i = 0; i + len <= text.length; i++) {
      const idx = want.get(tokenHash(text.slice(i, i + len)));
      if (idx !== undefined) hits.add(`개인식별#${idx + 1}`);
    }
  }
  return [...hits];
}

/** 텍스트에 들어 있는 금지 토큰 라벨 목록(없으면 빈 배열). */
export function findForbidden(text: string): string[] {
  return [...FORBIDDEN_TOKENS.filter((t) => t.re.test(text)).map((t) => t.label), ...findPrivate(text)];
}

export function isClean(text: string | null | undefined): boolean {
  return text == null || findForbidden(text).length === 0;
}
