import { describe, it, expect } from 'vitest';
import { leadSummary } from '../src/domain/aiCitation.ts';
import { aiUseSentence } from '../src/domain/searchLanding.ts';
import { llmsTxt } from '../src/application/llmsTxt.ts';
import { findForbidden } from '../src/domain/privacy.ts';
import type { PublicListing } from '../src/domain/listing.ts';

const mk = (o: Partial<PublicListing>): PublicListing => ({
  slug: 'x-1', name: '테스트 공모전', category: '공모전', kind: '공모', deadline: '2026-10-30', deadlineTime: null, rolling: false,
  url: 'https://example.org/a', organizer: null, prize: null, eligibilityQuote: null, tags: [], constraints: {} as any,
  clauses: [], aiUse: 'UNSTATED', ...o,
});
const V3 = /모든 공고|100%|완벽|정확히|합격 보장|대신 판단/;
const SITE = 'https://gonggo.oaksoo.com';

describe('AC-54 첫 요약 ≤2문장 — 기존 판독 문장만', () => {
  it('AI 금지·허용·미언급 모두 2문장, 둘째 = aiUseSentence', () => {
    for (const aiUse of ['FORBIDDEN', 'ALLOWED', 'UNSTATED'] as const) {
      const s = leadSummary(mk({ aiUse }));
      expect(s).toHaveLength(2);
      expect(s[1]).toBe(aiUseSentence(aiUse));
    }
  });
  it('첫 문장 = 공고명·마감·분류', () => {
    expect(leadSummary(mk({}))[0]).toBe('테스트 공모전은(는) 10월 30일(금) 마감하는 공모전 공고예요.');
    expect(leadSummary(mk({ deadline: null }))[0]).toBe('테스트 공모전은(는) 상시 모집하는 공모전 공고예요.');
    expect(leadSummary(mk({ deadline: '2026-10-30', deadlineTime: '18:00' }))[0]).toContain('10월 30일(금) 18:00 마감');
  });
  it('금지 토큰·과장 낱말 0', () => {
    for (const aiUse of ['FORBIDDEN', 'ALLOWED', 'UNSTATED'] as const) {
      const t = leadSummary(mk({ aiUse })).join(' ');
      expect(findForbidden(t)).toEqual([]);
      expect(t).not.toMatch(V3);
    }
  });
});

describe('AC-56 llms.txt', () => {
  const week = [
    mk({ slug: 'a-1', name: '예비창업패키지', category: '지원사업', deadline: '2026-10-16', aiUse: 'FORBIDDEN' }),
    mk({ slug: 'b-2', name: '창업 경진대회', deadline: '2026-10-18', aiUse: 'ALLOWED' }),
  ];
  const cats = [{ name: '공모전', slug: 'contest', count: 3 }];
  const out = llmsTxt(SITE, { weekItems: week, weekRange: '10월 14일(수) ~ 10월 20일(화)', categories: cats, hasRolling: true, total: 2176 });
  it('첫 줄·인용문', () => {
    expect(out.split('\n')[0]).toBe('# 공고콕');
    expect(out).toMatch(/\n> .{20,}/);
    expect(out).toContain('2,176');
  });
  it('절대 링크는 정식 주소만, 주요 경로 포함', () => {
    const links = [...out.matchAll(/\]\((https?:[^)]+)\)/g)].map((m) => m[1]);
    expect(links.length).toBeGreaterThan(8);
    for (const l of links) expect(l.startsWith(SITE + '/'), l).toBe(true);
    for (const p of ['/', '/week/', '/check/', '/about/', '/rolling/', '/c/contest/', '/sitemap.xml', '/cal/all.ics', '/g/a-1/', '/g/b-2/']) expect(links).toContain(SITE + p);
    expect(out).not.toMatch(/vercel\.app|sslip\.io/);
  });
  it('주간 줄 = 링크 + 마감 + AI 문장, ≤30건', () => {
    expect(out).toContain(`- [예비창업패키지](${SITE}/g/a-1/): 10월 16일(금) 마감 · ${aiUseSentence('FORBIDDEN')}`);
    const many = Array.from({ length: 45 }, (_, i) => mk({ slug: `s-${i}`, name: `n${i}` }));
    const o2 = llmsTxt(SITE, { weekItems: many, weekRange: 'r', categories: [], hasRolling: false, total: 45 });
    expect((o2.match(/\/g\/s-/g) ?? []).length).toBe(30);
    expect(o2).not.toContain('/rolling/');
  });
  it('금지 토큰·과장 낱말 0, ≤20KB', () => {
    expect(findForbidden(out)).toEqual([]);
    expect(out).not.toMatch(V3);
    expect(Buffer.byteLength(out)).toBeLessThan(20 * 1024);
  });
});
