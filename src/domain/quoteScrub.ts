// SPEC §32 AC-116 — 자격 인용에서 내부 분석 메모를 버리고 원문 자격 문장만 남긴다. 순수.
import { findInternalJudgement } from './privacy.ts';

const MEMO_START = /AI\s*과거\s*수상작/;
const ELIG_PHRASE = /(?:참가|응모|지원|신청)\s*(?:자격|대상)\s*(?:은|는|이|:|：)\s*[^,]{2,}/;

/**
 * 메모 표지(「AI 과거 수상작 분석…」)가 있으면 그 앞부분에서 「참가 자격은 …」 문장만 남기고, 자격 문장이 없으면 통째로 버린다(null).
 * 표지가 없어도 내부 낱말(분석 결과·수상 가능성·블라인드 …)이 있으면 문단 전체가 메모라 null.
 */
export function scrubQuote(raw: string): string | null {
  let q = raw;
  const i = q.search(MEMO_START);
  if (i >= 0) {
    const head = q.slice(0, i);
    const m = head.match(ELIG_PHRASE);
    if (!m) return null;
    q = head.slice(m.index!);
  }
  q = q.replace(/[\s,，&·]+$/, '').trim();
  if (findInternalJudgement(q).length) return null;
  return q.length >= 2 ? q : null;
}
