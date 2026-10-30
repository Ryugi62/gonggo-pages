import type { PublicListing } from '../domain/listing.ts';

// 1인 참가 가능 · 11월 마감 공고 목록(SPEC §23) — 새 판정 없이 기존 TEAM·ELIGIBILITY 인용에서 「개인 참가」 문장만 고른다.
export const SOLO_MIN = 3;
export const SOLO_MAX = 30;
export const SOLO_QUOTE_MAX = 160;

export interface SoloItem { listing: PublicListing; quote: string }

// 개인 참가를 허용하는 표현. 「개인정보」「개인사업자」는 뜻이 달라 뺀다.
const SOLO = /(?:개인(?!\s*(?:정보|사업|회원|통장|계좌|SNS|인스타))\s*(?:또는|및|·|\/|,|으로|이나|도|단위|참가|참여|신청|출품)|1\s*인\s*(?:참가|참여|신청|출품|팀|이상)|(?:혼자|단독)\s*(?:참가|참여|신청|출품))/;
const NOT_PERSON = /법인|기업|기관|입주|단체/; // 사업자·기관 대상 문장은 「혼자 낼 수 있는」 근거가 아니다
const PLACEHOLDER = /입력\s*\]|입력\)|\[[^\]]*(?:입력|기재)[^\]]*\]/;

const clip = (s: string, at: number): string => {
  if (s.length <= SOLO_QUOTE_MAX) return s;
  const start = Math.max(0, Math.min(at - 50, s.length - SOLO_QUOTE_MAX));
  const part = s.slice(start, start + SOLO_QUOTE_MAX).trim();
  return `${start > 0 ? '…' : ''}${part}${start + SOLO_QUOTE_MAX < s.length ? '…' : ''}`;
};

// 11월 고정(주간 게시용). 월이 바뀌면 SPEC §23과 함께 갱신한다.
export const SOLO_MONTH = '2026-11';
export const soloList = (listings: PublicListing[], today: string): SoloItem[] => soloListFor(listings, today, SOLO_MONTH);

export function soloListFor(listings: PublicListing[], today: string, month: string): SoloItem[] {
  const seen = new Set<string>();
  const out: SoloItem[] = [];
  for (const l of listings) {
    if (l.category !== '공모전' && l.category !== '해커톤') continue;
    if (l.rolling || !l.deadline || l.deadline < today || !l.deadline.startsWith(month)) continue;
    let hit: SoloItem | null = null;
    for (const c of l.clauses) {
      if (c.kind !== 'TEAM' && c.kind !== 'ELIGIBILITY') continue;
      const q = c.quote.replace(/\s+/g, ' ').trim();
      if (PLACEHOLDER.test(q) || NOT_PERSON.test(q.slice(0, 200))) continue;
      const mt = SOLO.exec(q);
      if (mt) { hit = { listing: l, quote: clip(q, mt.index) }; break; }
    }
    if (!hit) continue;
    const key = `${l.name}|${l.deadline}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
  }
  return out.sort((a, b) => a.listing.deadline!.localeCompare(b.listing.deadline!) || a.listing.name.localeCompare(b.listing.name, 'ko')).slice(0, SOLO_MAX);
}
