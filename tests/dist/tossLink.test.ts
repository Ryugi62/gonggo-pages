import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

// SPEC §28 AC-97 — 홈·공고 상세 전부에 토스 미니앱 링크 줄 정확히 1개
const URL_ = 'https://minion.toss.im/L5iKJAEk';
const slugs = readdirSync('dist/g').filter((f) => existsSync(`dist/g/${f}/index.html`));
const pages = ['dist/index.html', ...slugs.map((s) => `dist/g/${s}/index.html`)];
const anchors = (h: string) => h.match(/<a\b[^>]*>/g)?.filter((a) => a.includes(`href="${URL_}"`)) ?? [];

describe('AC-97 토스 미니앱 링크', () => {
  it('홈·상세 페이지마다 링크 1개, target=_blank·rel=noopener', () => {
    expect(slugs.length).toBeGreaterThan(0);
    for (const p of pages) {
      const a = anchors(readFileSync(p, 'utf8'));
      expect(a.length, p).toBe(1);
      expect(a[0], p).toContain('target="_blank"');
      expect(a[0], p).toContain('rel="noopener"');
    }
  });
});
