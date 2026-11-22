import { describe, it, expect } from 'vitest';
import { axisFacts } from '../src/domain/readFacts.ts';
import { assertReadFactsClean } from '../src/domain/readFacts.ts';

const mk = (extra: Record<string, unknown> = {}) => ({ slug: 'a', name: 'A 공모전', category: '공모전', kind: '대회', deadline: '2026-12-01', deadlineTime: '18:00', rolling: false, url: 'https://x.test/a', organizer: '창원시', prize: '상금 300만원', eligibilityQuote: null, tags: ['대학생'], constraints: {}, clauses: [], aiUse: 'UNSTATED', ...extra }) as any;

describe('AC-109 읽는 법 4칸에 공고별 한 줄', () => {
  it('공개 필드(주최·상금·대상·마감)에서 4칸 모두 한 줄 이상', () => {
    const f = axisFacts(mk(), '2026-11-22');
    expect(f.needs).toContain('창원시');
    expect(f.strategy).toContain('상금 300만원');
    expect(f.idea).toContain('대학생');
    expect(f.polish).toContain('12월 1일');
    for (const v of Object.values(f)) expect(v.length).toBeGreaterThan(5);
  });
  it('필드가 비어도 4칸 모두 한 줄(대체 문장)', () => {
    const f = axisFacts(mk({ organizer: null, prize: null, tags: [] }), '2026-11-22');
    for (const v of Object.values(f)) expect(v.length).toBeGreaterThan(5);
  });
  it('마감된 공고는 마감 문장', () => {
    expect(axisFacts(mk({ deadline: '2026-11-02' }), '2026-11-22').polish).toContain('마감');
  });
  it('금지 표기 없음', () => { expect(() => assertReadFactsClean(axisFacts(mk(), '2026-11-22'))).not.toThrow(); });
});
