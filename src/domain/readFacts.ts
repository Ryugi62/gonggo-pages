// SPEC §31 — 읽는 법 4칸의 「이 공고」 한 줄. 재료는 공개 필드(주최·상금·대상·마감)뿐, 새 판정은 만들지 않는다.
import type { PublicListing } from './listing.ts';
import type { Axis } from './readCard.ts';
import { formatDate } from './format.ts';
import { isClean } from './privacy.ts';

export function axisFacts(l: PublicListing, today: string): Record<Axis, string> {
  const closed = !!l.deadline && l.deadline < today;
  const when = l.deadline ? `${formatDate(l.deadline)}${l.deadlineTime ? ` ${l.deadlineTime}` : ''}` : null;
  return {
    needs: l.organizer ? `이 공고는 ${l.organizer}에서 열어요.` : `이 공고는 ${l.category} 공고예요.`,
    strategy: l.prize ? `이 공고의 상금·혜택은 「${l.prize}」이에요.` : '이 공고의 상금·혜택은 원문에서 확인해 주세요.',
    idea: l.tags.length ? `이 공고는 ${l.tags.join('·')} 대상으로 정리돼 있어요.` : '이 공고의 대상은 원문 자격 문장에서 확인해 주세요.',
    polish: closed ? `이 공고는 ${when} 마감돼서 지금은 낼 수 없어요.` : when ? `이 공고의 마감은 ${when}이에요.` : '이 공고는 상시 모집이에요.',
  };
}

export function assertReadFactsClean(f: Record<Axis, string>): void {
  for (const t of Object.values(f)) if (!isClean(t) || /\d+\s*점/.test(t)) throw new Error(`읽는 법 한 줄 금지 표기: ${t}`);
}
