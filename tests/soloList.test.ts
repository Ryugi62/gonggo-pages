import { describe, it, expect } from 'vitest';
import { soloList, SOLO_MIN } from '../src/application/soloList.ts';
import { findForbidden } from '../src/domain/privacy.ts';
import type { PublicListing } from '../src/domain/listing.ts';

const T = '2026-10-30';
const L = (p: Partial<PublicListing>, quote = '개인 또는 팀 참가 가능', kind: 'TEAM' | 'ELIGIBILITY' = 'TEAM'): PublicListing => ({
  slug: p.name ?? 'x', name: '공고', category: '공모전', kind: '공모', deadline: '2026-11-10', deadlineTime: null, rolling: false,
  url: 'https://e.org', organizer: null, prize: null, eligibilityQuote: null, tags: [], constraints: {} as any,
  clauses: [{ kind, quote, source: 'https://e.org' }], aiUse: 'UNSTATED', ...p,
});

describe('AC-82 soloList', () => {
  it('11월 마감 ∧ 개인 참가 허용 문장만 — 마감순', () => {
    const r = soloList([
      L({ name: '뒤', deadline: '2026-11-20' }), L({ name: '앞', deadline: '2026-11-02' }),
      L({ name: '10월', deadline: '2026-10-31' }), L({ name: '12월', deadline: '2026-12-01' }),
      L({ name: '상시', rolling: true, deadline: null }), L({ name: '지남', deadline: '2026-10-29' }),
    ], T);
    expect(r.map((x) => x.listing.name)).toEqual(['앞', '뒤']);
  });
  it('개인정보·개인사업자·입력 자리표시자·개인 언급 없음은 제외', () => {
    const r = soloList([
      L({ name: 'a' }, '개인정보 수집에 동의'), L({ name: 'b' }, '개인사업자 신청 가능'),
      L({ name: 'c' }, '- 참가 대상: [참가 자격 및 개인·팀 참가 가능 여부 입력]'), L({ name: 'd' }, '팀 단위 참가'), L({ name: 'g' }, '개인 또는 법인 입주기업'), L({ name: 'h', category: '지원사업' }),
      L({ name: 'e' }, '참가 형태: 개인 또는 3인 이내 팀'), L({ name: 'f' }, '1인 참가 가능', 'ELIGIBILITY'),
    ], T);
    expect(r.map((x) => x.listing.name)).toEqual(['e', 'f']);
  });
  it('인용은 160자 이내이며 개인 문구를 포함한다', () => {
    const r = soloList([L({}, `${'가'.repeat(300)} 개인 또는 팀으로 참가 가능 ${'나'.repeat(300)}`)], T);
    expect(r[0].quote.length).toBeLessThanOrEqual(162);
    expect(r[0].quote).toContain('개인 또는 팀');
  });
  it('같은 공고명·마감 중복은 1건', () => {
    expect(soloList([L({ name: 'z' }), L({ name: 'z', slug: 'z2' })], T)).toHaveLength(1);
  });
  it('금지 토큰 0 — 실제 공개 파일, 게시 하한', async () => {
    const d = (await import('../data/listings.json')).default as any;
    const r = soloList(d.listings, d.generatedAt);
    expect(r.length).toBeGreaterThanOrEqual(SOLO_MIN);
    for (const x of r) expect(findForbidden(`${x.listing.name} ${x.quote}`)).toEqual([]);
  });
});
