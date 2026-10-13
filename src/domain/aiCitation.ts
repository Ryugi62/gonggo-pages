// AI 검색 인용 장치(SPEC §17) — 답변 엔진이 집어 갈 첫 요약. 재료는 공고명·분류·마감·기존 판독 문장(aiUseSentence)뿐, 새 판정은 만들지 않는다.
import type { PublicListing } from './listing.ts';
import { formatDate } from './format.ts';
import { aiUseSentence } from './searchLanding.ts';

export function deadlineLabel(l: Pick<PublicListing, 'deadline' | 'deadlineTime'>): string | null {
  return l.deadline ? `${formatDate(l.deadline)}${l.deadlineTime ? ` ${l.deadlineTime}` : ''}` : null;
}

/** 2문장: 무슨 공고인지 + AI 사용 판독(기존 문장 그대로) */
export function leadSummary(l: PublicListing): [string, string] {
  const d = deadlineLabel(l);
  const first = d ? `「${l.name}」 — ${d} 마감하는 ${l.category} 공고예요.` : `「${l.name}」 — 상시 모집하는 ${l.category} 공고예요.`;
  return [first, aiUseSentence(l.aiUse)];
}
