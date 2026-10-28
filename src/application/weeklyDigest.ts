import type { PublicListing } from '../domain/listing.ts';

// 주간 마감 임박 요약 글(SPEC §20) — 대학생·청년이 낼 수 있고 상금이 있는 한글 공고 상위 8건.
export const DIGEST_MAX = 8;
export const DIGEST_DAYS = 10;

export function prizeWon(prize: string | null): number | null {
  const m = prize?.match(/([\d,]+)\s*만\s*원/);
  return m ? Number(m[1].replace(/,/g, '')) * 10000 : null;
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function weeklyDigest(listings: PublicListing[], today: string): PublicListing[] {
  const to = addDays(today, DIGEST_DAYS);
  const rows = listings
    .filter((l) => l.deadline && l.deadline > today && l.deadline <= to)
    .filter((l) => l.tags.includes('대학생') || l.tags.includes('청년'))
    .filter((l) => ['공모전', '해커톤', '지원사업'].includes(l.category))
    .filter((l) => /[가-힣]/.test(l.name) && !l.name.includes('청소년') && prizeWon(l.prize) !== null)
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!) || prizeWon(b.prize)! - prizeWon(a.prize)! || a.name.localeCompare(b.name, 'ko'));
  const seen = new Set<string>();
  const out: PublicListing[] = [];
  for (const l of rows) {
    const k = `${l.deadline}|${prizeWon(l.prize)}`;
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(l);
    if (out.length === DIGEST_MAX) break;
  }
  return out;
}
