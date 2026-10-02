import type { Category, EligibilityTag } from '../domain/category.ts';
import type { PublicListing } from '../domain/listing.ts';

/** 마감일이 속한 주의 월요일(YYYY-MM-DD). 날짜만 다루므로 UTC 정오 기준 계산 */
export function deadlineWeek(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7; // 월=0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

export interface SiteIndex {
  sorted: PublicListing[];
  byCategory: Map<Category, PublicListing[]>;
  byWeek: Map<string, PublicListing[]>;
  byTag: Map<EligibilityTag, PublicListing[]>;
  rolling: PublicListing[];
  related: (l: PublicListing) => PublicListing[];
}

const order = (a: PublicListing, b: PublicListing) =>
  (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999') || a.name.localeCompare(b.name, 'ko');

const push = <K, V>(m: Map<K, V[]>, k: K, v: V) => {
  const arr = m.get(k);
  if (arr) arr.push(v);
  else m.set(k, [v]);
};

/** UC-2 */
export function buildSiteIndex(listings: PublicListing[]): SiteIndex {
  const sorted = [...listings].sort(order);
  const byCategory = new Map<Category, PublicListing[]>();
  const byWeekRaw = new Map<string, PublicListing[]>();
  const byTag = new Map<EligibilityTag, PublicListing[]>();
  for (const l of sorted) {
    push(byCategory, l.category, l);
    if (l.deadline) push(byWeekRaw, deadlineWeek(l.deadline), l);
    for (const t of l.tags) push(byTag, t, l);
  }
  const byWeek = new Map([...byWeekRaw.entries()].sort(([a], [b]) => a.localeCompare(b)));
  const rolling = sorted.filter((l) => l.rolling);

  const time = (x: PublicListing) => (x.deadline ? Date.parse(`${x.deadline}T12:00:00Z`) : Number.POSITIVE_INFINITY);
  /** 같은 분류 → 같은 태그 → 전체 순으로, 마감일이 가까운 공고 6개 */
  const related = (l: PublicListing): PublicListing[] => {
    const t0 = time(l);
    const near = (pool: PublicListing[]) =>
      pool
        .filter((x) => x.slug !== l.slug)
        .map((x) => ({ x, gap: Math.abs(time(x) - t0) || 0 }))
        .sort((a, b) => (Number.isFinite(a.gap) ? a.gap : 9e15) - (Number.isFinite(b.gap) ? b.gap : 9e15))
        .map((p) => p.x);
    const picks: PublicListing[] = [];
    const pools = [byCategory.get(l.category) ?? [], ...l.tags.map((t) => byTag.get(t) ?? []), sorted];
    for (const pool of pools) for (const x of near(pool)) if (picks.length < 6 && !picks.includes(x)) picks.push(x);
    return picks;
  };

  return { sorted, byCategory, byWeek, byTag, rolling, related };
}
