import type { PublicListing } from '../domain/listing.ts';
import { CATEGORIES, TAGS } from '../domain/category.ts';
import { founderWeek } from './founderWeek.ts';
import { deadlineEvent, serializeCalendar } from '../domain/ics.ts';

// 구독 피드 구성(SPEC §11 C2): 전체 + 분류 + 대상 태그 + 이번 주 창업. 마감일 ≥ 오늘인 공고만, 빈 피드는 만들지 않는다.

export interface CalendarFeed {
  slug: string;
  name: string;
  items: PublicListing[];
  /** 이 피드에 실제로 적용된 창(오늘~N일). 크기 상한 때문에 90보다 작을 수 있다. */
  windowDays: number;
}

const byDeadline = (a: PublicListing, b: PublicListing) =>
  a.deadline!.localeCompare(b.deadline!) || a.name.localeCompare(b.name, 'ko') || a.slug.localeCompare(b.slug);

/** 구독 피드는 오늘~90일 안 마감만(캘린더 앱 용량·가까운 마감 우선). */
export const FEED_WINDOW_DAYS = 90;
/** 피드 파일 상한(SPEC §11 C2) — 넘으면 창을 마감 날짜 단위로 줄인다(2026-10-15). */
export const FEED_MAX_BYTES = 1024 * 1024;
export const ALL_FEED_NAME = '공고콕 — 접수 중인 공고 마감';

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const utf8Bytes = (s: string) => new TextEncoder().encode(s).length;

/** 전체 피드를 실제 직렬화해 잰 바이트 — 피드 페이지(/cal/<slug>.ics)와 같은 함수·같은 인자. */
export function feedBytes(name: string, items: PublicListing[], site: string, stamp: string): number {
  return utf8Bytes(serializeCalendar({ name, events: items.map((l) => deadlineEvent(l, site, { brief: true })), stamp }));
}

export interface FeedOptions {
  /** 상세 주소의 호스트. 주면 전체 피드를 실제로 재서 상한을 넘으면 창을 줄인다. */
  site?: string;
  maxBytes?: number;
}

/** 상한 안에 드는 가장 넓은 창(0~90일). 전체 피드가 상위 집합이라 분류·태그 피드도 함께 상한 안에 든다. */
export function fitWindowDays(listings: PublicListing[], today: string, site: string, maxBytes: number): number {
  const inWindow = (n: number) => listings.filter((l) => l.deadline && l.deadline >= today && l.deadline <= addDays(today, n)).sort(byDeadline);
  const fits = (n: number) => feedBytes(ALL_FEED_NAME, inWindow(n), site, today) <= maxBytes;
  if (fits(FEED_WINDOW_DAYS)) return FEED_WINDOW_DAYS;
  let lo = 0; // 오늘 마감만 — 이것도 넘으면 0을 돌려주고 산출물 테스트(≤1MB)가 잡는다
  let hi = FEED_WINDOW_DAYS;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (fits(mid)) lo = mid;
    else hi = mid;
  }
  return lo;
}

export function buildCalendarFeeds(listings: PublicListing[], today: string, opts: FeedOptions = {}): CalendarFeed[] {
  const windowDays = opts.site ? fitWindowDays(listings, today, opts.site, opts.maxBytes ?? FEED_MAX_BYTES) : FEED_WINDOW_DAYS;
  const until = addDays(today, windowDays);
  const live = listings.filter((l) => l.deadline && l.deadline >= today && l.deadline <= until).sort(byDeadline);
  const feeds: Omit<CalendarFeed, 'windowDays'>[] = [{ slug: 'all', name: ALL_FEED_NAME, items: live }];
  for (const c of CATEGORIES) feeds.push({ slug: c.slug, name: `공고콕 — ${c.name} 마감`, items: live.filter((l) => l.category === c.name) });
  for (const t of TAGS) feeds.push({ slug: t.slug, name: `공고콕 — ${t.name} 대상 공고 마감`, items: live.filter((l) => l.tags.includes(t.name)) });
  feeds.push({ slug: 'founder-week', name: '공고콕 — 이번 주 창업 공고 마감', items: founderWeek(live, today).items.slice().sort(byDeadline) });
  return feeds.filter((f) => f.items.length > 0).map((f) => ({ ...f, windowDays }));
}
