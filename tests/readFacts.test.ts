import { describe, it, expect } from 'vitest';
import { axisFacts } from '../src/domain/readFacts.ts';
import { assertReadFactsClean } from '../src/domain/readFacts.ts';

const mk = (extra: Record<string, unknown> = {}) => ({ slug: 'a', name: 'A 공모전', category: '공모전', kind: '대회', deadline: '2026-12-01', deadlineTime: '18:00', rolling: false, url: 'https://x.test/a', organizer: '창원시', prize: '상금 300만원', eligibilityQuote: null, tags: ['대학생'], constraints: {}, clauses: [], aiUse: 'UNSTATED', ...extra }) as any;

describe('AC-114 읽는 법 4칸에 공고별 한 줄', () => {
  it('공개 필드(주최·상금·대상·마감)에서 4칸 모두 한 줄 이상', () => {
    const f = axisFacts(mk(), '2026-11-22');
    expect(f.needs).toContain('창원시');
    expect(f.strategy).toContain('상금 300만원');
    expect(f.idea).toContain('대학생');
    expect(f.polish).toContain('12월 1일');
    for (const v of Object.values(f)) expect(v.length).toBeGreaterThan(5);
  });
  it('필드가 비면 그 칸은 빈 문자열(화면이 줄을 감춘다) — 빈칸 문구 0, 마감 칸만 항상 있다', () => {
    const f = axisFacts(mk({ organizer: null, prize: null, tags: [] }), '2026-11-22');
    expect(f.needs).toBe(''); expect(f.strategy).toBe(''); expect(f.idea, '').toBe('');
    expect(f.polish.length).toBeGreaterThan(5);
    for (const v of Object.values(f)) expect(v).not.toContain('원문에서 확인');
  });
  it('마감된 공고는 「마감됐어요」 없이 다음 모집 참고 문장(맨 위 표시와 중복 금지)', () => {
    const p = axisFacts(mk({ deadline: '2026-11-02' }), '2026-11-22').polish;
    expect(p).toContain('끝난'); expect(p).not.toContain('마감됐어요'); expect(p).not.toMatch(/마감은/);
  });
  it('금지 표기 없음', () => { expect(() => assertReadFactsClean(axisFacts(mk(), '2026-11-22'))).not.toThrow(); });
});
