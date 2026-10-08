import { describe, it, expect } from 'vitest';
import { searchTitle, searchDescription, listingFaq, faqJsonLd, aiUseSentence, CLAUSE_QUESTION } from '../src/domain/searchLanding.ts';
import { findForbidden } from '../src/domain/privacy.ts';
import type { PublicListing } from '../src/domain/listing.ts';

const mk = (o: Partial<PublicListing>): PublicListing => ({
  slug: 'x-1', name: '테스트 공모전', category: '공모전', kind: '공모', deadline: '2026-10-30', deadlineTime: null, rolling: false,
  url: 'https://example.org/a', organizer: null, prize: null, eligibilityQuote: null, tags: [], constraints: {} as any,
  clauses: [], aiUse: 'UNSTATED', ...o,
});
const dup = { kind: 'DUPLICATE_BENEFIT' as const, quote: '타 정부지원사업과 중복 수혜 불가', source: 'https://example.org/a' };
const team = { kind: 'TEAM' as const, quote: '개인 또는 팀(3인 이내)', source: 'https://example.org/a' };
const V3 = /모든 공고|100%|완벽|정확히|합격 보장|대신 판단/;

describe('AC-44 검색 제목 — 고객이 묻는 말', () => {
  it('지원사업 + 중복 수혜 조항', () => {
    expect(searchTitle(mk({ name: '2026 예비창업패키지', category: '지원사업', clauses: [team, dup] })))
      .toBe('2026 예비창업패키지 신청 자격·중복 수혜·마감 — 나도 받을 수 있나요?');
  });
  it('공모전의 중복 조항은 「중복 지원」(수혜는 지원사업 말)', () => {
    expect(searchTitle(mk({ clauses: [dup] }))).toBe('테스트 공모전 참가 자격·중복 지원·마감 — 나도 낼 수 있나요?');
  });
  it('공모전 + 상금, 조항 없음', () => {
    expect(searchTitle(mk({ prize: '대상 300만원' }))).toBe('테스트 공모전 참가 자격·상금·마감 — 나도 낼 수 있나요?');
  });
  it('해커톤·대외활동은 참가할 수 있나요, AI 판독이 있으면 AI 사용', () => {
    expect(searchTitle(mk({ name: 'X 해커톤', category: '해커톤', aiUse: 'FORBIDDEN' }))).toBe('X 해커톤 참가 자격·AI 사용·마감 — 나도 참가할 수 있나요?');
    expect(searchTitle(mk({ name: 'Y 서포터즈', category: '대외활동', clauses: [team] }))).toBe('Y 서포터즈 참가 자격·팀 구성·마감 — 나도 참가할 수 있나요?');
  });
});

describe('AC-45 검색 설명', () => {
  it('질문으로 시작·원문 자격 인용·≤158자', () => {
    const d = searchDescription(mk({ name: '2026 예비창업패키지', category: '지원사업', eligibilityQuote: '공고일 기준 창업 경험이 없는 자'.repeat(8), organizer: '창업진흥원' }));
    expect(d.startsWith('2026 예비창업패키지, 나도 받을 수 있나요?')).toBe(true);
    expect(d).toContain('원문 자격: 「공고일 기준');
    expect(d.length).toBeLessThanOrEqual(158);
    expect(d).not.toMatch(V3);
    expect(findForbidden(d)).toEqual([]);
  });
  it('인용 없으면 원문에서 확인', () => {
    expect(searchDescription(mk({}))).toContain('자격은 원문 공고에서 확인');
  });
});

describe('AC-46 자주 묻는 질문(화면 문장 그대로, 원문 인용만)', () => {
  it('자격 → AI → 조항 종류별 1개', () => {
    const faq = listingFaq(mk({ eligibilityQuote: '만 19세 이상 대학생', clauses: [dup, { ...dup, quote: '중복 지원 시 선정 취소' }, team, { kind: 'ELIGIBILITY', quote: '대학생', source: '' }] }));
    expect(faq.map((f) => f.q)).toEqual(['누가 낼 수 있나요?', CLAUSE_QUESTION.AI_USE, CLAUSE_QUESTION.DUPLICATE_BENEFIT, CLAUSE_QUESTION.TEAM]);
    expect(faq[0].a).toBe('공고 원문: 「만 19세 이상 대학생」');
    expect(faq[1].a).toBe(aiUseSentence('UNSTATED'));
    expect(faq[2].a).toBe('공고 원문: 「타 정부지원사업과 중복 수혜 불가」');
  });
  it('AI 조항이 있으면 답에 원문 인용, 자격 인용 없으면 AI 질문부터', () => {
    const faq = listingFaq(mk({ aiUse: 'FORBIDDEN', clauses: [{ kind: 'AI_USE', quote: '생성형 AI 활용 금지', source: '' }] }));
    expect(faq.length).toBe(1);
    expect(faq[0].a).toBe(`${aiUseSentence('FORBIDDEN')} 공고 원문: 「생성형 AI 활용 금지」`);
  });
  it('질문은 모두 「?」로 끝나고 과장 낱말·금지 토큰 0', () => {
    for (const q of Object.values(CLAUSE_QUESTION)) { expect(q.endsWith('?')).toBe(true); expect(q).not.toMatch(V3); expect(findForbidden(q)).toEqual([]); }
    for (const v of ['ALLOWED', 'FORBIDDEN', 'UNSTATED'] as const) expect(findForbidden(aiUseSentence(v))).toEqual([]);
  });
  it('FAQPage JSON-LD', () => {
    const j = faqJsonLd([{ q: '누가 낼 수 있나요?', a: '공고 원문: 「누구나」' }]) as any;
    expect(j['@type']).toBe('FAQPage');
    expect(j.mainEntity[0]).toEqual({ '@type': 'Question', name: '누가 낼 수 있나요?', acceptedAnswer: { '@type': 'Answer', text: '공고 원문: 「누구나」' } });
  });
});
