import type { PublicListing } from '../domain/listing.ts';

// 주간 페이지 — 「이번 주 낼 수 있는 창업경진대회·지원사업」: 오늘부터 7일 안에 마감하는 창업 공고.

const FOUNDER_NAME = /창업|스타트업|startup|founder|벤처|사업화|예비\s*창업/i;
export const WINDOW_DAYS = 7;

export function isFounderListing(l: PublicListing): boolean {
  return l.category === '지원사업' || l.tags.includes('창업자') || FOUNDER_NAME.test(l.name);
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export interface FounderWeek {
  from: string;
  to: string;
  items: PublicListing[];
  aiForbidden: number;
}

export function founderWeek(listings: PublicListing[], today: string): FounderWeek {
  const to = addDays(today, WINDOW_DAYS - 1);
  const items = listings
    .filter((l) => l.deadline && l.deadline >= today && l.deadline <= to && isFounderListing(l))
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!) || a.name.localeCompare(b.name, 'ko'));
  return { from: today, to, items, aiForbidden: items.filter((l) => l.aiUse === 'FORBIDDEN').length };
}
