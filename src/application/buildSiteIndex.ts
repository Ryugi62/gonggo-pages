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
  /** SPEC §37 AC-167 — 비슷한 공고 = 같은 분류(주제어가 있으면 겹치는 것)만, 마감 가까운 순(상시는 뒤). 같은 대회는 하나만. 안 맞으면 채우지 않고 비운다 */
  const related = (l: PublicListing, n = 6, _anchor?: string): PublicListing[] => {
    const mine = topicsOf(l);
    const shared = (x: PublicListing) => topicsOf(x).filter((t) => mine.includes(t)).length;
    let pool = (byCategory.get(l.category) ?? []).filter((x) => x.slug !== l.slug);
    if (mine.length) { const t = pool.filter((x) => shared(x) > 0); if (t.length) pool = t; }
    const picks: PublicListing[] = [];
    for (const x of [...pool].sort((a, b) => time(a) - time(b))) {
      if (picks.length >= n) break;
      if (isSameContest(l, x) || picks.some((p) => isSameContest(p, x))) continue; // §34 AC-135 같은 대회는 하나만
      picks.push(x);
    }
    return picks;
  };

  return { sorted, byCategory, byWeek, byTag, rolling, related };
}
