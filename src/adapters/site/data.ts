// 어댑터: 커밋된 공개 파일(data/listings.json) → 화면용 색인. 원천 jsonl은 읽지 않는다.
import file from '../../../data/listings.json';
import { buildSiteIndex } from '../../application/buildSiteIndex.ts';
import { founderWeek } from '../../application/founderWeek.ts';
import { weeklyDigest } from '../../application/weeklyDigest.ts';
import { aiOkList } from '../../application/aiOkList.ts';
import { buildCalendarFeeds } from '../../application/calendarFeeds.ts';
import { FEED_ORIGIN, SITE_URL } from '../../infrastructure/config.ts';
import { CATEGORIES, TAGS } from '../../domain/category.ts';
import { clauseCollections, COLLECTION_PATHS } from '../../domain/clausePreview.ts';
import type { PublicListing } from '../../domain/listing.ts';

export const generatedAt: string = file.generatedAt;
export const listings = file.listings as unknown as PublicListing[];
export const index = buildSiteIndex(listings);
export const categories = CATEGORIES.filter((c) => index.byCategory.get(c.name)?.length);
export const tags = TAGS.filter((t) => index.byTag.get(t.name)?.length);
export const weeks = [...index.byWeek.keys()];
export const week = founderWeek(listings, generatedAt);
export const digest = weeklyDigest(listings, generatedAt);
export const aiOk = aiOkList(listings, generatedAt);
export const collections = clauseCollections(listings);
export const calendarFeeds = buildCalendarFeeds(listings, generatedAt, { site: SITE_URL.replace(/\/$/, '') });
export const feedUrl = (slug: string) => `${FEED_ORIGIN.replace(/\/$/, '')}/cal/${slug}.ics`;
export const hasFeed = (slug: string) => calendarFeeds.some((f) => f.slug === slug);

export function sitePaths(): string[] {
  return [
    '/',
    '/check/',
    '/about/',
    '/week/',
    ...(digest.length ? [`/digest/${generatedAt}/`] : []),
    ...(aiOk.length ? [`/ai-ok/${generatedAt}/`] : []),
    ...COLLECTION_PATHS,
    ...categories.map((c) => `/c/${c.slug}/`),
    ...tags.map((t) => `/t/${t.slug}/`),
    ...weeks.map((w) => `/w/${w}/`),
    ...(index.rolling.length ? ['/rolling/'] : []),
    ...index.sorted.map((l) => `/g/${l.slug}/`),
  ];
}
