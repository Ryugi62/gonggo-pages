// 어댑터: 커밋된 공개 파일(data/listings.json) → 화면용 색인. 원천 jsonl은 읽지 않는다.
import file from '../../../data/listings.json';
import { buildSiteIndex } from '../../application/buildSiteIndex.ts';
import { CATEGORIES, TAGS } from '../../domain/category.ts';
import type { PublicListing } from '../../domain/listing.ts';

export const generatedAt: string = file.generatedAt;
export const listings = file.listings as unknown as PublicListing[];
export const index = buildSiteIndex(listings);
export const categories = CATEGORIES.filter((c) => index.byCategory.get(c.name)?.length);
export const tags = TAGS.filter((t) => index.byTag.get(t.name)?.length);
export const weeks = [...index.byWeek.keys()];

export function sitePaths(): string[] {
  return [
    '/',
    '/check/',
    '/about/',
    ...categories.map((c) => `/c/${c.slug}/`),
    ...tags.map((t) => `/t/${t.slug}/`),
    ...weeks.map((w) => `/w/${w}/`),
    ...(index.rolling.length ? ['/rolling/'] : []),
    ...index.sorted.map((l) => `/g/${l.slug}/`),
  ];
}
