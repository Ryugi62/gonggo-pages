// SPEC §31 — 데이터 신선도. 순수: 열림 판정·원문 인용에서 마감 시각 읽기.
import type { PublicListing } from './listing.ts';

/** 열림 = 상시이거나 마감일 ≥ 오늘 */
export const isOpen = (l: Pick<PublicListing, 'deadline' | 'rolling'>, today: string): boolean =>
  l.rolling || (!!l.deadline && l.deadline >= today);

const pad = (n: number) => String(n).padStart(2, '0');

/**
 * 원문 인용에 「마감일(월·일) … N시까지 / HH:MM 마감」이 있으면 그 시각(HH:MM).
 * 마감일이 아닌 날짜 뒤의 시각은 읽지 않는다 — 시각 불일치(상단 23:59 대 원문 18시) 방지.
 */
export function quoteDeadlineTime(quote: string | null, deadline: string): string | null {
  if (!quote) return null;
  const m = Number(deadline.slice(5, 7));
  const d = Number(deadline.slice(8, 10));
  const dateRe = new RegExp(`(?<!\\d)0?${m}\\s*[.월/\\-]\\s*0?${d}(?!\\d)`, 'g');
  const timeRe = /(오전|오후)?\s*(\d{1,2})\s*(?:시\s*(?:(\d{1,2})\s*분)?|:(\d{2}))\s*(?:까지|마감|전까지)/;
  let best: string | null = null;
  for (const hit of quote.matchAll(dateRe)) {
    const rest = quote.slice((hit.index ?? 0) + hit[0].length, (hit.index ?? 0) + hit[0].length + 24);
    const t = rest.match(timeRe);
    if (!t) continue;
    let h = Number(t[2]);
    const min = Number(t[3] ?? t[4] ?? 0);
    if (t[1] === '오후' && h < 12) h += 12;
    if (h > 24 || min > 59) continue;
    best = `${pad(h === 24 ? 23 : h)}:${pad(h === 24 ? 59 : min)}`;
  }
  return best;
}

/** 원문 시각이 있으면 마감 시각을 그에 맞춘다(원문이 맞다) */
export function reconcileDeadlineTime<T extends PublicListing>(l: T): T {
  if (!l.deadline) return l;
  const t = quoteDeadlineTime(l.eligibilityQuote, l.deadline);
  return t && t !== l.deadlineTime ? { ...l, deadlineTime: t } : l;
}
