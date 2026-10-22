import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { clausePreview, clauseCollections } from '../../src/domain/clausePreview.ts';
import { findForbidden } from '../../src/domain/privacy.ts';

// AC-70·71 (SPEC §19) — AWS 빌드 여부는 pro 링크로 판별
const data = JSON.parse(readFileSync('data/listings.json', 'utf8'));
const ls = data.listings as any[];
const aws = existsSync('dist/pro/index.html');
const page = (slug: string) => readFileSync(`dist/g/${slug}/index.html`, 'utf8');

describe('AC-70 상세 미리보기', () => {
  const withP = ls.filter((l) => clausePreview(l));
  it('근거 있는 공고에만 줄 1개, 없는 공고 표본엔 0', () => {
    expect(withP.length).toBeGreaterThan(0);
    for (const l of withP) {
      const h = page(l.slug);
      expect((h.match(/class="clause-preview"/g) ?? []).length, l.slug).toBe(1);
      expect(h.length).toBeLessThan(40 * 1024);
      expect(h).toContain('이 공고의 AI 사용·중복수상 조항');
      expect((h.match(/href="\/pro\/\?from=gp"/g) ?? []).length, l.slug).toBe(aws ? 1 : 0);
    }
    for (const l of ls.filter((x) => !clausePreview(x)).slice(0, 200)) expect(page(l.slug), l.slug).not.toContain('class="clause-preview"');
  });
});

describe('AC-71 모음 페이지', () => {
  const k = clauseCollections(ls);
  const sm = readFileSync('dist/sitemap.xml', 'utf8');
  for (const [path, n] of [['ai', k.ai.allowed.length + k.ai.forbidden.length], ['duplicate', k.duplicate.allow.length + k.duplicate.limit.length]] as const) {
    it(`/clauses/${path}/ 항목 ${n}건·판독 날짜·sitemap`, () => {
      const h = readFileSync(`dist/clauses/${path}/index.html`, 'utf8');
      expect((h.match(/<q>/g) ?? []).length).toBe(n);
      expect(h).toContain(`${data.generatedAt} 판독`);
      expect(sm).toContain(`/clauses/${path}/`);
      expect(findForbidden(h.replace(/<[^>]+>/g, ' '))).toEqual([]);
      expect(h).not.toMatch(/모든 공고|합격 보장|대신 판단/);
    });
  }
});
