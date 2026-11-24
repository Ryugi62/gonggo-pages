import type { Category, EligibilityTag } from '../domain/category.ts';
import type { PublicListing } from '../domain/listing.ts';
import { topicsOf, isSameContest } from '../domain/topic.ts';

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
  related: (l: PublicListing, n?: number, anchor?: string) => PublicListing[];
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
  /** 같은 세부 분야 → 같은 분류 → 같은 태그 → 전체 순으로 n개(기본 6, 같은 칸 안에서는 마감일이 가까운 순). 색인에 열린 공고만 넣으면 열린 것만 나온다 */
  /** anchor = 기준 날짜(YYYY-MM-DD). 마감된 공고는 오늘+며칠을 줘서 「오늘 끝나는」 공고만 나오지 않게 한다 */
  const related = (l: PublicListing, n = 6, anchor?: string): PublicListing[] => {
    const t0 = anchor ? Date.parse(`${anchor}T12:00:00Z`) : time(l);
    const near = (pool: PublicListing[]) =>
      pool
        .filter((x) => x.slug !== l.slug)
        .map((x) => ({ x, gap: Math.abs(time(x) - t0) || 0 }))
        .sort((a, b) => (Number.isFinite(a.gap) ? a.gap : 9e15) - (Number.isFinite(b.gap) ? b.gap : 9e15))
        .map((p) => p.x);
    // 순서: ① 같은 유형 + 같은 세부 분야(주제어 겹침 많은 순, 마감 가까운 순) ② 같은 유형 ③ 같은 자격 태그 ④ 전체
    const mine = topicsOf(l);
    const shared = (x: PublicListing) => topicsOf(x).filter((t) => mine.includes(t)).length;
    const picks: PublicListing[] = [];
    const add = (pool: PublicListing[]) => { for (const x of pool) if (picks.length < n && !picks.includes(x) && !isSameContest(l, x) && !picks.some((p) => isSameContest(p, x))) picks.push(x); }; // §34 AC-135 같은 대회는 하나만
    const sameCat = byCategory.get(l.category) ?? [];
    if (mine.length) {
      const topical = near(sameCat).filter((x) => shared(x) > 0);
      add(topical.map((x, i) => ({ x, i })).sort((a, b) => shared(b.x) - shared(a.x) || a.i - b.i).map((p) => p.x));
    }
    add(near(sameCat));
    for (const t of l.tags) add(near(byTag.get(t) ?? []));
    add(near(sorted));
    return picks;
  };

  return { sorted, byCategory, byWeek, byTag, rolling, related };
}
