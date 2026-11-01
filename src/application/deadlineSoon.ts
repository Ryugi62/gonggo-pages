import type { PublicListing } from '../domain/listing.ts';
import { teamOnly } from './weeklyDigest.ts';

// 구독 메일 본문용 — 오늘~7일 안 마감 공고 5건(SPEC §25 AC-92). 상시·마감 미상·팀 전용은 뺀다.
export const SOON_DAYS = 7;
export const SOON_MAX = 5;

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function pickDeadlineSoon(listings: PublicListing[], today: string): PublicListing[] {
  const to = addDays(today, SOON_DAYS);
  return listings
    .filter((l) => !l.rolling && l.deadline && l.deadline >= today && l.deadline <= to)
    .filter((l) => !teamOnly(l.eligibilityQuote))
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!) || a.name.localeCompare(b.name, 'ko'))
    .slice(0, SOON_MAX);
}
