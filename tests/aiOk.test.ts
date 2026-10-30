import { describe, it, expect } from 'vitest';
import { aiOkList } from '../src/application/aiOkList.ts';
import { findForbidden } from '../src/domain/privacy.ts';
import type { PublicListing } from '../src/domain/listing.ts';

const T = '2026-10-30';
const L = (p: Partial<PublicListing>): PublicListing => ({
  slug: p.name ?? 'x', name: '공고', category: '공모전', kind: '공모', deadline: '2026-11-03', deadlineTime: null, rolling: false,
  url: 'https://e.org', organizer: null, prize: null, eligibilityQuote: null, tags: [], constraints: {} as any,
  clauses: [{ kind: 'AI_USE', quote: 'AI 도구 활용 가능', source: 'https://e.org' }], aiUse: 'ALLOWED', ...p,
});

describe('AC-80 aiOkList', () => {
  it('AI 허용 문장 없는 공고(UNSTATED·FORBIDDEN·인용 없음) 제외', () => {
    const r = aiOkList([L({ name: '가' }), L({ name: '나', aiUse: 'UNSTATED' }), L({ name: '다', aiUse: 'FORBIDDEN' }), L({ name: '라', clauses: [] })], T);
    expect(r.map((x) => x.listing.name)).toEqual(['가']);
  });
  it('마감 지난·범위 밖·상시 제외, 오늘 마감은 포함, 마감순', () => {
    const r = aiOkList([
      L({ name: '지남', deadline: '2026-10-29' }), L({ name: '오늘', deadline: T }), L({ name: '멀다', deadline: '2026-11-20' }),
      L({ name: '상시', rolling: true, deadline: null }), L({ name: '뒤', deadline: '2026-11-10' }), L({ name: '앞', deadline: '2026-11-01' }),
    ], T);
    expect(r.map((x) => x.listing.name)).toEqual(['오늘', '앞', '뒤']);
  });
  it('인용은 160자 이내로 줄이고 항목마다 있다', () => {
    const r = aiOkList([L({ clauses: [{ kind: 'AI_USE', quote: 'a'.repeat(500), source: 'x' }] })], T);
    expect(r[0].quote.length).toBeLessThanOrEqual(161);
    expect(r[0].quote.endsWith('…')).toBe(true);
  });
  it('금지 토큰 0 — 실제 공개 파일', async () => {
    const d = (await import('../data/listings.json')).default as any;
    const r = aiOkList(d.listings, d.generatedAt);
    for (const x of r) expect(findForbidden(`${x.listing.name} ${x.quote}`)).toEqual([]);
  });
});
