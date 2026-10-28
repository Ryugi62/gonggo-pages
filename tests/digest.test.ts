import { describe, it, expect } from 'vitest';
import { weeklyDigest, prizeWon } from '../src/application/weeklyDigest.ts';
import type { PublicListing } from '../src/domain/listing.ts';

const L = (p: Partial<PublicListing>): PublicListing => ({
  slug: p.name ?? 'x', name: '공고', category: '공모전', kind: '공모', deadline: '2026-10-30', deadlineTime: null, rolling: false,
  url: 'https://e.org', organizer: null, prize: '총상금 100만원', eligibilityQuote: null, tags: ['대학생'], constraints: {} as any,
  clauses: [], aiUse: 'UNSTATED', ...p,
});
const T = '2026-10-28';

describe('AC-72 weeklyDigest', () => {
  it('상금 문구 → 원화', () => {
    expect(prizeWon('총상금 1,600만원')).toBe(16000000);
    expect(prizeWon('$500 상금')).toBeNull();
    expect(prizeWon(null)).toBeNull();
  });
  it('범위·태그·상금·한글·청소년 필터', () => {
    const ls = [
      L({ name: '가 통과' }),
      L({ name: '나 오늘마감', deadline: T }),
      L({ name: '다 멀다', deadline: '2026-11-20' }),
      L({ name: '라 상금없음', prize: null }),
      L({ name: 'English Hack' }),
      L({ name: '마 청소년 대회' }),
      L({ name: '바 누구나', tags: ['누구나'] }),
      L({ name: '사 장학', category: '장학' }),
    ];
    expect(weeklyDigest(ls, T).map((l) => l.name)).toEqual(['가 통과']);
  });
  it('마감 → 상금 큰 순, 같은 (마감,상금) 1건, 최대 8건', () => {
    const ls = [
      L({ name: '가', prize: '총상금 100만원' }), L({ name: '나', prize: '총상금 200만원' }),
      L({ name: '다 중복', prize: '총상금 200만원' }), L({ name: '라', deadline: '2026-10-29', prize: '총상금 50만원' }),
      ...Array.from({ length: 10 }, (_, i) => L({ name: `마${'가나다라마바사아자차'[i]}`, deadline: '2026-11-05', prize: `총상금 ${300 + i}만원` })),
    ];
    const d = weeklyDigest(ls, T);
    expect(d.map((l) => l.name).slice(0, 3)).toEqual(['라', '나', '가']);
    expect(d.map((l) => l.name)).not.toContain('다 중복');
    expect(d.length).toBe(8);
  });
});
