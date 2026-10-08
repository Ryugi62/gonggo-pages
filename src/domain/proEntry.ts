// 목록 페이지 /pro 맥락 입구(SPEC §16) — 홈·분류·주간 페이지에서 /pro로 가는 링크 1개.
// 문구는 /pro v2(§14)와 같은 결: 고객이 묻는 말 + 「답마다 근거가 된 공고 원문 조항」. 오픈 전이라 「오픈 준비 중」을 늘 붙인다.
import type { Category } from './category.ts';

/** 입구 출처 — /pro/?from= 값. 상세 페이지는 이미 `g`. */
export type ProEntryFrom = 'home' | 'c' | 'week';

export interface ProEntry { href: string; title: string; sub: string }

const ASK: Record<Category, string> = {
  지원사업: '받을 수 있나?',
  장학: '받을 수 있나?',
  공모전: '내도 되나?',
  해커톤: '참가해도 되나?',
  대외활동: '참가해도 되나?',
};
const PROMISE = '답마다 근거가 된 공고 원문 조항을 붙여 드려요 (Pro) →';
const SUB = '오픈 준비 중 · 창립 회원 신청은 돈이 나가지 않아요';

export function proEntry(from: ProEntryFrom, category?: Category): ProEntry {
  const head =
    from === 'c' && category ? `이 ${category} 공고, 나 ${ASK[category]}`
    : from === 'week' ? '마감 앞둔 이 공고들, 나 내도 되나?'
    : '「이 공고, 나 내도 되나?」';
  return { href: `/pro/?from=${from}`, title: `${head} ${PROMISE}`, sub: SUB };
}
