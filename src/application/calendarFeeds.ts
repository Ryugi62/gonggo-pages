import type { PublicListing } from '../domain/listing.ts';
import { CATEGORIES, TAGS } from '../domain/category.ts';
import { founderWeek } from './founderWeek.ts';

// 구독 피드 구성(SPEC §11 C2): 전체 + 분류 + 대상 태그 + 이번 주 창업. 마감일 ≥ 오늘인 공고만, 빈 피드는 만들지 않는다.

export interface CalendarFeed {
  slug: string;
  name: string;
  items: PublicListing[];
}

const byDeadline = (a: PublicListing, b: PublicListing) =>
  a.deadline!.localeCompare(b.deadline!) || a.name.localeCompare(b.name, 'ko') || a.slug.localeCompare(b.slug);

/** 구독 피드는 오늘~90일 안 마감만(캘린더 앱 용량·가까운 마감 우선, 1MB 상한). */
export const FEED_WINDOW_DAYS = 90;

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function buildCalendarFeeds(listings: PublicListing[], today: string): CalendarFeed[] {
  const until = addDays(today, FEED_WINDOW_DAYS);
  const live = listings.filter((l) => l.deadline && l.deadline >= today && l.deadline <= until).sort(byDeadline);
  const feeds: CalendarFeed[] = [{ slug: 'all', name: '공고콕 — 접수 중인 공고 마감', items: live }];
  for (const c of CATEGORIES) feeds.push({ slug: c.slug, name: `공고콕 — ${c.name} 마감`, items: live.filter((l) => l.category === c.name) });
  for (const t of TAGS) feeds.push({ slug: t.slug, name: `공고콕 — ${t.name} 대상 공고 마감`, items: live.filter((l) => l.tags.includes(t.name)) });
  feeds.push({ slug: 'founder-week', name: '공고콕 — 이번 주 창업 공고 마감', items: founderWeek(live, today).items.slice().sort(byDeadline) });
  return feeds.filter((f) => f.items.length > 0);
}
