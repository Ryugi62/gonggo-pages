import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { findInternalJudgement } from '../src/domain/privacy.ts';
import { scrubQuote } from '../src/domain/quoteScrub.ts';
import { assertPublicSafe } from '../src/application/exportPublicListings.ts';
import { mergeListings } from '../src/application/mergeListings.ts';
import { sanitizeQuote } from '../src/domain/extract.ts';

// SPEC §32 AC-116 — 자격 인용에 내부 분석 메모(「AI 과거 수상작 분석 결과 & 제안 … 수상 가능성 높음」)가 들어가면 안 된다(11/22 3회차 3/3 검수 지적)
const mk = (slug: string, extra: Record<string, unknown> = {}) => ({
  slug, name: slug, category: '공모전', kind: '대회', deadline: '2026-12-20', deadlineTime: null, rolling: false,
  url: `https://x.test/${slug}`, organizer: null, prize: null, eligibilityQuote: null, tags: [],
  constraints: { minAge: null, maxAge: null, studentOnly: false, region: null, business: null, open: true }, clauses: [], aiUse: 'UNSTATED', ...extra,
}) as any;
const SAM = '3. 총 상금 500만원, 참가 자격은 17세 이상 전국 시낭송 애호가 AI 과거 수상작 분석 결과 & 제안 1. 한용운 시 낭송, 감성 표현 집중하면 수상 가능성 높음.';
const UM = '2. 상반기 접수, 제한 없는 응모 자격, 수상 시 100만원 고료 지급 3. 전자우편 접수, 블라인드 심사, 여름호 발표 AI 과거 수상작 분석 결과 & 제안';

describe('내부 판단 낱말 탐지', () => {
  it.each(['분석 결과', '과거 수상작', '수상 가능성 높음', '& 제안', '우승 전략', '블라인드 심사', '모의 심사'])('「%s」를 잡는다', (t) => {
    expect(findInternalJudgement(`참가 자격 ${t} 어쩌고`).length).toBeGreaterThan(0);
  });
  it('원문에 흔한 낱말(정책 제안 공모전·모의면접·다수 제안)은 잡지 않는다', () => {
    for (const t of ['정책 제안 공모전', '모의면접은 사전 신청자 대상', '다수 제안은 가능하나 개인당 1건', '대학생 누구나']) expect(findInternalJudgement(t), t).toEqual([]);
  });
});

describe('scrubQuote — 분석 메모 문단을 버리고 원문 자격 문장만 남긴다', () => {
  it('메모 앞의 원문 자격 문장은 남긴다', () => {
    const q = scrubQuote(SAM)!;
    expect(q).toContain('17세 이상 전국 시낭송 애호가');
    expect(findInternalJudgement(q)).toEqual([]);
    expect(q).not.toContain('AI 과거');
  });
  it('남은 문장에도 내부 낱말이 있으면 통째로 버린다(null)', () => { expect(scrubQuote(UM)).toBeNull(); });
  it('깨끗한 인용은 그대로', () => { expect(scrubQuote('만 19세 이상 대학생')).toBe('만 19세 이상 대학생'); });
  it('sanitizeQuote(내보내기 입구)도 같은 규칙', () => { expect(sanitizeQuote(UM)).toBeNull(); expect(sanitizeQuote(SAM)).not.toContain('수상 가능성'); });
});

describe('빌드 관문', () => {
  it('assertPublicSafe: 자격 인용·조항 인용에 내부 판단 낱말이 있으면 던진다', () => {
    expect(() => assertPublicSafe([mk('a', { eligibilityQuote: SAM })])).toThrow(/내부 판단/);
    expect(() => assertPublicSafe([mk('b', { clauses: [{ kind: 'ELIGIBILITY', quote: UM, source: 'https://x.test' }] })])).toThrow(/내부 판단/);
  });
  it('공고 이름의 「제안」은 통과', () => { expect(() => assertPublicSafe([mk('c', { name: '2026 구리시 정책 제안 공모전' })])).not.toThrow(); });
  it('mergeListings가 옛 목록의 오염 인용도 정리한다', () => {
    const out = mergeListings([mk('sam', { eligibilityQuote: SAM }), mk('um', { eligibilityQuote: UM })], []);
    for (const l of out) expect(findInternalJudgement(l.eligibilityQuote ?? ''), l.slug).toEqual([]);
    expect(out.find((l) => l.slug === 'um')!.eligibilityQuote).toBeNull();
  });
  it('실제 data/listings.json 3,0xx건 전수: 자격·조항 인용의 내부 판단 낱말 0건', () => {
    const all = JSON.parse(readFileSync('data/listings.json', 'utf8')).listings as any[];
    const bad = all.filter((l) => findInternalJudgement([l.eligibilityQuote ?? '', ...l.clauses.map((c: any) => c.quote)].join(' ')).length).map((l) => l.slug);
    expect(bad).toEqual([]);
  });
});
