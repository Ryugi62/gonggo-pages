const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const at = (d: string) => new Date(`${d}T12:00:00Z`);

export function dDay(deadline: string, today: string): number {
  return Math.round((at(deadline).getTime() - at(today).getTime()) / 86_400_000);
}

export function dDayLabel(deadline: string | null, today: string): string {
  if (!deadline) return '상시';
  const n = dDay(deadline, today);
  if (n < 0) return '마감';
  return n === 0 ? 'D-day' : `D-${n}`;
}

export function formatDate(date: string): string {
  const d = at(date);
  return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일(${DOW[d.getUTCDay()]})`;
}

export function weekLabel(monday: string): string {
  const s = at(monday);
  const e = new Date(s.getTime() + 6 * 86_400_000);
  return `${s.getUTCMonth() + 1}월 ${s.getUTCDate()}일 ~ ${e.getUTCMonth() + 1}월 ${e.getUTCDate()}일`;
}
