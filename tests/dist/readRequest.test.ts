import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

// SPEC §21 AC-77 — 입구는 AWS 빌드에만, 페이지마다 1개, 폼 입력 3칸
const aws = process.env.DEPLOY_TARGET === 'aws';
const V3 = /모든 공고|100\s*%|완벽|정확히|합격 보장|대신 판단|무조건|무료로 판정/;
const slugs = readdirSync('dist/g').filter((f) => existsSync(`dist/g/${f}/index.html`));
const pages = [...slugs.map((s) => `dist/g/${s}/index.html`), 'dist/clauses/ai/index.html', 'dist/clauses/duplicate/index.html'];
const entry = (h: string) => h.match(/<section class="read-entry[\s\S]*?<\/section>/)?.[0] ?? '';

describe('AC-77 판독 요청 입구', () => {
  it(aws ? 'AWS 빌드: 모든 상세·모음에 입구 1개, 입력 3칸' : '기본 빌드: 입구 0개', () => {
    expect(slugs.length).toBeGreaterThan(0);
    for (const p of pages) {
      const h = readFileSync(p, 'utf8');
      expect((h.match(/data-read-entry/g) ?? []).length, p).toBe(aws ? 1 : 0);
      if (!aws) continue;
      const e = entry(h);
      expect((e.match(/<input /g) ?? []).length, p).toBe(3);
      expect(e, p).not.toMatch(V3);
      expect(e, p).not.toMatch(/19,900|49,000|카드|결제하기/);
      expect(e).toContain('24시간');
    }
  });
});
