import { describe, it, expect } from 'vitest';
import { founderWeek, isFounderListing } from '../src/application/founderWeek.ts';
import type { PublicListing } from '../src/domain/listing.ts';

const L = (p: Partial<PublicListing>): PublicListing => ({
  slug: p.name ?? 'x', name: 'x', category: '공모전', kind: '공모', deadline: null, deadlineTime: null, rolling: false,
  url: 'https://e.org', organizer: null, prize: null, eligibilityQuote: null, tags: [], constraints: {} as any,
  clauses: [], aiUse: 'UNSTATED', ...p,
});
const TODAY = '2026-10-06';

describe('주간 페이지 — 이번 주 낼 수 있는 창업경진대회·지원사업', () => {
  it('창업 공고 판별: 지원사업·창업자 태그·이름의 창업/스타트업', () => {
    expect(isFounderListing(L({ category: '지원사업' }))).toBe(true);
    expect(isFounderListing(L({ tags: ['창업자'] }))).toBe(true);
    expect(isFounderListing(L({ name: '2026 대학생 창업경진대회' }))).toBe(true);
    expect(isFounderListing(L({ name: 'Startup Pitch Day' }))).toBe(true);
    expect(isFounderListing(L({ name: '전국민 사진 공모전' }))).toBe(false);
  });
  it('오늘~13일 뒤 마감만, 마감 임박순, 상시·지난 공고 제외', () => {
    const ls = [
      L({ name: 'A 창업경진', deadline: '2026-10-19' }),
      L({ name: 'B 창업경진', deadline: '2026-10-06' }),
      L({ name: 'C 창업경진', deadline: '2026-10-20' }),
      L({ name: 'D 창업경진', deadline: '2026-10-05' }),
      L({ name: 'E 창업경진', rolling: true }),
      L({ name: 'F 사진 공모', deadline: '2026-10-07' }),
    ];
    const w = founderWeek(ls, TODAY);
    expect(w.items.map((l) => l.name)).toEqual(['B 창업경진', 'A 창업경진']);
    expect(w.from).toBe('2026-10-06');
    expect(w.to).toBe('2026-10-19');
  });
  it('AI 금지 공고 수를 센다', () => {
    const w = founderWeek([L({ name: 'A 창업', deadline: '2026-10-07', aiUse: 'FORBIDDEN' }), L({ name: 'B 창업', deadline: '2026-10-08' })], TODAY);
    expect(w.aiForbidden).toBe(1);
  });
});
