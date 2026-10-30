import type { PublicListing } from '../domain/listing.ts';

// AI 활용 허용 · 마감 임박 목록(SPEC §22) — 새 판정 없이 기존 aiUse=ALLOWED 와 AI_USE 인용만 쓴다.
export const AI_OK_DAYS = 14;
export const AI_OK_QUOTE_MAX = 160;

export interface AiOkItem { listing: PublicListing; quote: string }

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const clip = (s: string) => (s.length <= AI_OK_QUOTE_MAX ? s : `${s.slice(0, AI_OK_QUOTE_MAX).trim()}…`);

export function aiOkList(listings: PublicListing[], today: string): AiOkItem[] {
  const to = addDays(today, AI_OK_DAYS);
  const out: AiOkItem[] = [];
  for (const l of listings) {
    if (l.aiUse !== 'ALLOWED' || l.rolling || !l.deadline || l.deadline < today || l.deadline > to) continue;
    const c = l.clauses.find((x) => x.kind === 'AI_USE');
    if (!c || !c.quote.trim()) continue;
    out.push({ listing: l, quote: clip(c.quote.replace(/\s+/g, ' ').trim()) });
  }
  return out.sort((a, b) => a.listing.deadline!.localeCompare(b.listing.deadline!) || a.listing.name.localeCompare(b.listing.name, 'ko'));
}
