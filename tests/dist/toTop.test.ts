import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

// SPEC §29 AC-105 — 긴 공고 상세(4~5화면)에 「맨 위로」 버튼(토스 UX 브리프 1: 오른쪽 아래·위로 스크롤할 때 등장·접근성 라벨)
const slugs = readdirSync('dist/g').filter((s) => existsSync(`dist/g/${s}/index.html`)).slice(0, 200);

describe('AC-105 맨 위로', () => {
  it('상세마다 aria-label="맨 위로" 버튼 1개, 처음엔 숨김, 인라인 스크립트로 위로 스크롤 때 등장', () => {
    expect(slugs.length).toBeGreaterThan(0);
    for (const s of slugs) {
      const h = readFileSync(`dist/g/${s}/index.html`, 'utf8');
      const b = h.match(/<button\b[^>]*aria-label="맨 위로"[^>]*>/g) ?? [];
      expect(b.length, s).toBe(1);
      expect(b[0], s).toContain('hidden');
      expect(h, s).toContain('to-top');
    }
  });
});
