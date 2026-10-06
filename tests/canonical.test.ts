import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { CANONICAL_ORIGIN, SITE_URL, PRO_ORIGIN, FEED_ORIGIN } from '../src/infrastructure/config.ts';

// SPEC §13 정식 주소 전환 (AC-33~35)
const C = 'https://gonggo.oaksoo.com';
const vercel = JSON.parse(readFileSync('vercel.json', 'utf8'));
const astroConfig = readFileSync('astro.config.mjs', 'utf8');
const caddy = readFileSync('deploy/aws/gonggo.caddy', 'utf8');

describe('AC-33 설정 기본값 = 정식 주소', () => {
  it('CANONICAL_ORIGIN·SITE_URL·PRO_ORIGIN·FEED_ORIGIN', () => {
    expect(CANONICAL_ORIGIN).toBe(C);
    if (!process.env.SITE_URL) expect(SITE_URL).toBe(C);
    expect(PRO_ORIGIN).toBe(C);
    if (!process.env.FEED_ORIGIN) expect(FEED_ORIGIN).toBe(C);
  });
  it('astro site 기본값', () => {
    expect(astroConfig).toContain(`process.env.SITE_URL ?? '${C}'`);
    expect(astroConfig).not.toMatch(/vercel\.app|sslip\.io/);
  });
});

/** Vercel source(path-to-regexp, 이름 없는 정규식 그룹)를 JS 정규식으로 맞춰 본다 — `$1` 치환 */
function vercelRedirect(path: string): { to: string; code: number } | null {
  for (const r of vercel.redirects ?? []) {
    const m = new RegExp(`^${r.source}$`).exec(path);
    if (m) return { to: r.destination.replace(/\$(\d)/g, (_: string, i: string) => m[Number(i)] ?? ''), code: r.statusCode ?? (r.permanent ? 308 : 307) };
  }
  return null;
}

describe('AC-34 vercel.app → 정식 주소 301', () => {
  it('리다이렉트 규칙은 1개(4경로 규칙 대체)', () => {
    expect(vercel.redirects).toHaveLength(1);
  });
  for (const p of ['/', '/g/some-slug-1/', '/pro/', '/terms/', '/sitemap.xml', '/cal/all.ics', '/c/hackathon/']) {
    it(`${p} → ${C}${p} 301`, () => {
      expect(vercelRedirect(p)).toEqual({ to: `${C}${p}`, code: 301 });
    });
  }
  it('검색 소유확인 파일은 리다이렉트하지 않는다', () => {
    expect(vercelRedirect('/google09201ae909576b2d.html')).toBeNull();
    expect(vercelRedirect('/naver834f78053dd5db36c61e81760ecaf7ce.html')).toBeNull();
  });
});

describe('AC-35 엣지 스니펫: 정식 호스트 서빙 + sslip 301(피드·저장·비콘 예외)', () => {
  const blocks = caddy.split(/\n(?=\S[^\n]*\{\s*\n)/).filter((b) => /^\S[^\n]*\{\s*$/m.test(b.split('\n')[0]));
  const head = (b: string) => b.split('\n')[0];
  const canon = blocks.find((b) => head(b) === 'gonggo.oaksoo.com {') ?? '';
  const sslip = blocks.find((b) => head(b) === 'gonggo.43-202-151-104.sslip.io {') ?? '';
  it('호스트 블록은 공고콕 2개뿐, 전역 설정 없음', () => {
    expect(blocks.map(head)).toEqual(['gonggo.oaksoo.com {', 'gonggo.43-202-151-104.sslip.io {']);
    expect(caddy).not.toMatch(/^\{/m);
  });
  it('정식 호스트는 nginx로 프록시', () => {
    expect(canon).toContain('reverse_proxy gonggo-web:80');
    expect(canon).not.toContain('redir');
  });
  it('sslip: /cal/*·/api/*·/intent/*만 프록시, 나머지는 같은 경로로 301', () => {
    expect(sslip).toMatch(/@keep path \/cal\/\* \/api\/\* \/intent\/\*/);
    expect(sslip).toMatch(/handle @keep \{[\s\S]*reverse_proxy gonggo-web:80/);
    expect(sslip).toMatch(/handle \{\s*redir https:\/\/gonggo\.oaksoo\.com\{uri\} 301\s*\}/);
  });
});
