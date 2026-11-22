// 어댑터: 커밋된 공개 파일(data/listings.json) → 화면용 색인. 원천 jsonl은 읽지 않는다.
import file from '../../../data/listings.json';
import { buildSiteIndex } from '../../application/buildSiteIndex.ts';
import { founderWeek } from '../../application/founderWeek.ts';
import { weeklyDigest } from '../../application/weeklyDigest.ts';
import { aiOkList } from '../../application/aiOkList.ts';
import { soloList, SOLO_MIN } from '../../application/soloList.ts';
import { buildCalendarFeeds } from '../../application/calendarFeeds.ts';
import { FEED_ORIGIN, SITE_URL } from '../../infrastructure/config.ts';
import { CATEGORIES, TAGS } from '../../domain/category.ts';
import { clauseCollections, COLLECTION_PATHS } from '../../domain/clausePreview.ts';
import type { PublicListing } from '../../domain/listing.ts';
import { isOpen } from '../../domain/freshness.ts';

export const generatedAt: string = file.generatedAt;
/** 지금까지 공개한 모든 공고 — /g/<slug>/ 상세 URL은 마감 뒤에도 소멸 0(SPEC §31) */
export const allListings = file.listings as unknown as PublicListing[];
/** 열린 공고(상시 또는 마감일 ≥ 정리 기준일) — 목록·색인·피드·비슷한 공고는 열린 것만 */
export const listings = allListings.filter((l) => isOpen(l, file.generatedAt));
export const index = buildSiteIndex(listings);
export const categories = CATEGORIES.filter((c) => index.byCategory.get(c.name)?.length);
export const tags = TAGS.filter((t) => index.byTag.get(t.name)?.length);
export const weeks = [...index.byWeek.keys()];
export const week = founderWeek(listings, generatedAt);
export const digest = weeklyDigest(listings, generatedAt);
export const aiOk = aiOkList(listings, generatedAt);
const soloAll = soloList(listings, generatedAt);
export const solo = soloAll.length >= SOLO_MIN ? soloAll : []; // 3건 미만이면 게시하지 않는다(SPEC §23)
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
    ...(solo.length ? [`/solo/${generatedAt}/`] : []),
    ...COLLECTION_PATHS,
    ...categories.map((c) => `/c/${c.slug}/`),
    ...tags.map((t) => `/t/${t.slug}/`),
    ...weeks.map((w) => `/w/${w}/`),
    ...(index.rolling.length ? ['/rolling/'] : []),
    ...allListings.map((l) => `/g/${l.slug}/`),
  ];
}
