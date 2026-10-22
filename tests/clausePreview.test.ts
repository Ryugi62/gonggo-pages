import { describe, it, expect } from 'vitest';
import { aiEvidence, duplicateEvidence, clausePreview, clauseCollections } from '../src/domain/clausePreview.ts';
import { findForbidden } from '../src/domain/privacy.ts';
import { sitemapXml } from '../src/application/sitemap.ts';
import type { PublicListing } from '../src/domain/listing.ts';
import type { Clause } from '../src/domain/clause.ts';

const cl = (kind: Clause['kind'], quote: string): Clause => ({ kind, quote, source: 'https://e.org' });
const mk = (o: Partial<PublicListing>): PublicListing => ({
  slug: 'x-1', name: '테스트', category: '공모전', kind: '공모', deadline: '2026-10-30', deadlineTime: null, rolling: false,
  url: 'https://e.org', organizer: null, prize: null, eligibilityQuote: null, tags: [], constraints: {} as any,
  clauses: [], aiUse: 'UNSTATED', ...o,
});

describe('AC-67 aiEvidence', () => {
  it('허용 판독 + 허용 인용', () => {
    const e = aiEvidence(mk({ aiUse: 'ALLOWED', clauses: [cl('AI_USE', 'AI 도구 활용 가능')] }));
    expect(e).toEqual({ verdict: 'ALLOWED', quote: 'AI 도구 활용 가능' });
  });
  it('금지 판독 + 금지 인용', () => {
    expect(aiEvidence(mk({ aiUse: 'FORBIDDEN', clauses: [cl('AI_USE', 'AI 활용 불가, 저작권 창작자 귀')] }))?.verdict).toBe('FORBIDDEN');
  });
  it('판독과 인용이 어긋나면 null (허용인데 부정문)', () => {
    expect(aiEvidence(mk({ aiUse: 'ALLOWED', clauses: [cl('AI_USE', 'No traced, copied, or AI-generated content is allowed. Plagiarism or use of AI will lead to disqualification.')] }))).toBeNull();
  });
  it('금지 판독인데 내부 메모 인용이면 null', () => {
    expect(aiEvidence(mk({ aiUse: 'FORBIDDEN', clauses: [cl('AI_USE', '저작 모드: 컷(AI금지)')] }))).toBeNull();
  });
  it('인용 없음·미언급이면 null', () => {
    expect(aiEvidence(mk({ aiUse: 'ALLOWED' }))).toBeNull();
    expect(aiEvidence(mk({ aiUse: 'UNSTATED' }))).toBeNull();
  });
});

describe('AC-68 duplicateEvidence', () => {
  it('가능 → ALLOW', () => {
    expect(duplicateEvidence(mk({ clauses: [cl('DUPLICATE_BENEFIT', '중복 지원은 가능')] }))?.stance).toBe('ALLOW');
  });
  it('불가·제외·경력 없음 → LIMIT', () => {
    expect(duplicateEvidence(mk({ clauses: [cl('DUPLICATE_BENEFIT', '*중복지원은 불가하며, 한 차수 선택必')] }))?.stance).toBe('LIMIT');
    expect(duplicateEvidence(mk({ clauses: [cl('DUPLICATE_AWARD', '타 공모전 수상 경력없음')] }))?.stance).toBe('LIMIT');
  });
  it('방향 불분명이면 null, 조항 없으면 null', () => {
    expect(duplicateEvidence(mk({ clauses: [cl('DUPLICATE_BENEFIT', '신청대상 워터라운드 플랫폼을 통해 기업 旣 선정된 협약파트너 기업')] }))).toBeNull();
    expect(duplicateEvidence(mk({}))).toBeNull();
  });
});

describe('AC-69 clausePreview', () => {
  it('근거 0이면 null', () => {
    expect(clausePreview(mk({}))).toBeNull();
    expect(clausePreview(mk({ aiUse: 'ALLOWED' }))).toBeNull();
  });
  it('근거 있으면 머리말로 시작, 인용 ≤70자 + 금지 토큰·과장 0', () => {
    const long = '중복 지원은 가능'.padEnd(200, '가');
    const p = clausePreview(mk({ aiUse: 'ALLOWED', clauses: [cl('AI_USE', 'AI 도구 활용 가능'), cl('DUPLICATE_BENEFIT', long)] }))!;
    expect(p.startsWith('이 공고의 AI 사용·중복수상 조항')).toBe(true);
    expect(p).toContain('…');
    expect(p.match(/「([^」]*)」/g)!.every((q) => q.length <= 70 + 3)).toBe(true);
    expect(findForbidden(p)).toEqual([]);
    expect(p).not.toMatch(/모든 공고|100%|완벽|정확히|합격 보장|대신 판단/);
  });
});

describe('AC-71 clauseCollections', () => {
  const a = mk({ slug: 'a', deadline: '2026-11-02', aiUse: 'ALLOWED', clauses: [cl('AI_USE', 'AI 도구 활용 가능')] });
  const b = mk({ slug: 'b', deadline: '2026-10-28', aiUse: 'FORBIDDEN', clauses: [cl('AI_USE', 'ChatGPT 등 인공지능(AI) 생성 작품 제출 불가합니다.')] });
  const c = mk({ slug: 'c', deadline: '2026-10-29', aiUse: 'ALLOWED', clauses: [cl('AI_USE', 'No AI-generated content is allowed.')] });
  const d = mk({ slug: 'd', deadline: '2026-11-06', clauses: [cl('DUPLICATE_BENEFIT', '중복 지원은 가능')] });
  const e = mk({ slug: 'e', deadline: '2026-11-08', clauses: [cl('DUPLICATE_AWARD', '타 공모전 수상 경력없음')] });
  it('근거 있는 것만, 마감 순', () => {
    const k = clauseCollections([a, b, c, d, e, mk({ slug: 'z' })]);
    expect(k.ai.allowed.map((x) => x.listing.slug)).toEqual(['a']);
    expect(k.ai.forbidden.map((x) => x.listing.slug)).toEqual(['b']);
    expect(k.duplicate.allow.map((x) => x.listing.slug)).toEqual(['d']);
    expect(k.duplicate.limit.map((x) => x.listing.slug)).toEqual(['e']);
  });
  it('사이트맵에 두 주소', () => {
    const xml = sitemapXml('https://x.test', ['/clauses/ai/', '/clauses/duplicate/'], '2026-10-22');
    expect(xml).toContain('/clauses/ai/');
  });
});
