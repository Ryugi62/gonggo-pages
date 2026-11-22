// SPEC §31 — 병합 빌드: 라이브 URL(옛 slug)은 하나도 없애지 않고, 지금 열린 공고(새·갱신)를 더한다.
// 9617fee: 새 export가 만료 행을 빼서 옛 /g/ URL 1,100개(검색 착지 45%)가 사라질 뻔했다 → 옛 목록은 마감 페이지로 남긴다.
import type { PublicListing } from '../domain/listing.ts';
import { reconcileDeadlineTime } from '../domain/freshness.ts';
import { assertPublicSafe } from './exportPublicListings.ts';

const urlKey = (u: string) => u.replace(/#.*$/, '').replace(/\/$/, '');
const order = (a: PublicListing, b: PublicListing) =>
  (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999') || a.name.localeCompare(b.name, 'ko');

export function mergeListings(prev: PublicListing[], fresh: PublicListing[]): PublicListing[] {
  const freshBySlug = new Map(fresh.map((l) => [l.slug, l]));
  const freshByUrl = new Map(fresh.map((l) => [urlKey(l.url), l]));
  const used = new Set<string>();
  const out: PublicListing[] = [];
  for (const p of prev) {
    const f = freshBySlug.get(p.slug) ?? freshByUrl.get(urlKey(p.url));
    if (f) {
      used.add(f.slug);
      out.push({ ...f, slug: p.slug }); // 갱신 값, 주소(slug)는 옛 것 그대로
    } else out.push(p); // 새 목록에 없는 옛 공고 = 마감 페이지로 보존
  }
  for (const f of fresh) if (!used.has(f.slug)) out.push(f);
  const seen = new Set<string>();
  const uniq = out.filter((l) => (seen.has(l.slug) ? false : (seen.add(l.slug), true)));
  const merged = uniq.map(reconcileDeadlineTime).sort(order);
  assertPublicSafe(merged);
  return merged;
}
