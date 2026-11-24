// SPEC §31 — 데이터 신선도. 순수: 열림 판정·원문 인용에서 마감 시각 읽기.
import type { PublicListing } from './listing.ts';

/** 열림 = 상시이거나 마감일 ≥ 오늘 */
/** SPEC §36 AC-150 — 마감 시각: 00:00은 「시각 없음」(그날 23:59까지). 빌드·DAY_SCRIPT 속성·칩·목록이 이 한 함수를 쓴다 */
export const deadlineTimeOf = (t: string | null | undefined): string | null => (t && t !== '00:00' ? t : null);

export const isOpen = (l: Pick<PublicListing, 'deadline' | 'rolling'> & { deadlineTime?: string | null }, today: string, nowHM?: string): boolean => {
  if (l.rolling) return true;
  if (!l.deadline) return false;
  if (l.deadline > today) return true;
  if (l.deadline < today) return false;
  // 오늘 마감 — 시각이 있고 지금이 그 시각 이후면 닫힘(SPEC §35 AC-142, 00:00은 오늘 0시라 이미 지남)
  const tm = deadlineTimeOf(l.deadlineTime);
  return !(nowHM && tm && tm <= nowHM);
};

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

/** SPEC §34 AC-132·§35 AC-142 — 배지 상태. 큰 배지(lg)도 지난 날짜면 「마감됐어요」, 오늘 마감인데 시각이 지났어도 마감 */
export function badgeState(deadline: string, today: string, large: boolean, time?: string | null, nowHM?: string): { n: number; label: string; closed: boolean; soon: boolean } {
  const at = (d: string) => Date.parse(`${d}T12:00:00Z`);
  let n = Math.round((at(deadline) - at(today)) / 86_400_000);
  const tm = deadlineTimeOf(time);
  if (n === 0 && tm && nowHM && tm <= nowHM) n = -1;
  const label = n < 0 ? (large ? '마감됐어요' : '마감') : n === 0 ? 'D-day' : `D-${n}`;
  return { n, label, closed: n < 0, soon: n >= 0 && n <= 3 };
}

/** SPEC §35 AC-142 — 마감 시각 표시: 00:00은 싣지 않고 원문 확인 안내만(전날 밤 끝일 수 있어 하루 늦게 읽힌다) */
export function deadlineDisplay(l: Pick<PublicListing, 'deadline' | 'deadlineTime'>): { time: string | null; note: string | null } {
  if (!l.deadline || !l.deadlineTime) return { time: null, note: null };
  return l.deadlineTime === '00:00' ? { time: null, note: '마감 시각은 원문에서 확인' } : { time: l.deadlineTime, note: null };
}
