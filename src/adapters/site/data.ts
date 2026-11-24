// 어댑터: 커밋된 공개 파일(data/listings.json) → 화면용 색인. 원천 jsonl은 읽지 않는다.
import file from '../../../data/listings.json';
import keptDates from '../../../data/digest-dates.json';
import { publishedDates } from '../../application/publishedDates.ts';
import { buildSiteIndex } from '../../application/buildSiteIndex.ts';
import { founderWeek } from '../../application/founderWeek.ts';
import { weeklyDigest } from '../../application/weeklyDigest.ts';
import { aiOkList } from '../../application/aiOkList.ts';
import { soloList, SOLO_MIN } from '../../application/soloList.ts';
import { buildCalendarFeeds } from '../../application/calendarFeeds.ts';
import { FEED_ORIGIN, SITE_URL, buildDay, buildTime } from '../../infrastructure/config.ts';
import { CATEGORIES, TAGS } from '../../domain/category.ts';
import { deadlineWeek } from '../../application/buildSiteIndex.ts';
import { clauseCollections, COLLECTION_PATHS } from '../../domain/clausePreview.ts';
import type { PublicListing } from '../../domain/listing.ts';
import { isOpen } from '../../domain/freshness.ts';
import { dedupeSameTitle } from '../../domain/topic.ts';

/** 정리 기준일(글자·/digest/ /ai-ok/ /solo/ 경로) — 열림·D-n 판정은 today(빌드 날, SPEC §34 AC-131) */
export const generatedAt: string = file.generatedAt;
/** 날짜 경로 = 새 정리 기준일 + 이미 공개한 날짜(SPEC §38, canonical은 새 날짜) */
export const datedPaths: string[] = [file.generatedAt, ...publishedDates(keptDates, null, file.generatedAt)];
export const today: string = buildDay();
/** 오늘 마감인 공고의 시각 판정(SPEC §35 AC-142) */
export const nowHM: string = buildTime();
/** 지금까지 공개한 모든 공고 — /g/<slug>/ 상세 URL은 마감 뒤에도 소멸 0(SPEC §31) */
export const allListings = file.listings as unknown as PublicListing[];
/** 열린 공고(상시 또는 마감일 ≥ 정리 기준일) — 목록·색인·피드·비슷한 공고는 열린 것만 */
/** 공개 목록 = 열린 공고에서 제목·마감이 같은 것을 한 줄로 합친 것 — 홈 총수·분류·목록·자격 찾기·색인이 모두 이것 하나를 쓴다(SPEC §37 AC-159). 상세 주소(allListings)는 전부 남는다 */
export const listings = dedupeSameTitle(allListings.filter((l) => isOpen(l, today, nowHM)));
export const index = buildSiteIndex(listings);
export const categories = CATEGORIES.filter((c) => index.byCategory.get(c.name)?.length);
export const tags = TAGS.filter((t) => index.byTag.get(t.name)?.length);
export const weeks = [...index.byWeek.keys()];
/** 지금은 비어도 주소는 남긴다(사이트맵 소멸 0) — 모든 공고가 가진 주·태그·분류 */
export const allWeeks = [...new Set(allListings.filter((l) => l.deadline).map((l) => deadlineWeek(l.deadline!)))].sort();
export const allTags = TAGS.filter((t) => allListings.some((l) => l.tags.includes(t.name)));
export const allCategories = CATEGORIES.filter((c) => allListings.some((l) => l.category === c.name));
export const week = founderWeek(listings, today);
export const digest = weeklyDigest(listings, today);
export const aiOk = aiOkList(listings, today);
const soloAll = soloList(listings, today);
export const solo = soloAll.length >= SOLO_MIN ? soloAll : []; // 3건 미만이면 게시하지 않는다(SPEC §23)
export const collections = clauseCollections(listings);
export const calendarFeeds = buildCalendarFeeds(listings, today, { site: SITE_URL.replace(/\/$/, '') });
export const feedUrl = (slug: string) => `${FEED_ORIGIN.replace(/\/$/, '')}/cal/${slug}.ics`;
export const hasFeed = (slug: string) => calendarFeeds.some((f) => f.slug === slug);

export function sitePaths(): string[] {
  return [
    '/',
    '/check/',
    '/about/',
    '/week/',
    `/digest/${generatedAt}/`,
    `/ai-ok/${generatedAt}/`,
    `/solo/${generatedAt}/`,
    ...COLLECTION_PATHS,
    ...allCategories.map((c) => `/c/${c.slug}/`),
    ...allTags.map((t) => `/t/${t.slug}/`),
    ...allWeeks.map((w) => `/w/${w}/`),
    ...(index.rolling.length ? ['/rolling/'] : []),
    ...allListings.map((l) => `/g/${l.slug}/`),
  ];
}
