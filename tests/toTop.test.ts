import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

// SPEC §29 AC-105 — 레이아웃 원천에 「맨 위로」 버튼 1개(처음 숨김·48px·CTA 바 위로 비킴)
const src = readFileSync('src/layouts/Layout.astro', 'utf8');

describe('AC-105 맨 위로(원천)', () => {
  it('버튼 1개·aria-label·hidden, 48px, CTA 바가 있으면 위로 비킨다', () => {
    expect((src.match(/aria-label="맨 위로"/g) ?? []).length).toBe(1);
    expect(src).toMatch(/<button[^>]*class="to-top"[^>]*hidden/);
    expect(src).toMatch(/\.to-top \{[^}]*width: 48px; height: 48px/);
    expect(src).toContain('body:has(.cta-bar) .to-top');
  });
});
