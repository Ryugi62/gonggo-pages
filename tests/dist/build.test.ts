import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { findForbidden } from '../../src/domain/privacy.ts';

// 빌드 산출물 검사 (npm run build 뒤 실행)
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk('dist');
// 검색 소유확인 파일(google*.html·naver*.html)은 페이지가 아니다
const html = files.filter((f) => f.endsWith('.html') && !/^dist\/(google|naver)[0-9a-f]+\.html$/.test(f));
const detail = html.filter((f) => f.startsWith('dist/g/'));
const data = JSON.parse(readFileSync('data/listings.json', 'utf8'));

describe('AC-10 상세 페이지', () => {
  const l = data.listings[0];
  const page = readFileSync(`dist/g/${l.slug}/index.html`, 'utf8');
  it('title·description·canonical·OG·JSON-LD', () => {
    const esc = (s: string) => s.replace(/&/g, '&amp;');
    expect(page).toContain(`<title>${esc(l.name)} 자격·마감·상금 정리</title>`);
    expect(page).toMatch(/<meta name="description" content="[^"]{40,}"/);
    expect(page).toMatch(new RegExp(`<link rel="canonical" href="https://[^"]+/g/${l.slug}/"`));
    expect(page).toContain('property="og:title"');
    expect(page).toContain('"@type":"BreadcrumbList"');
  });
  it('원문 링크·면책·알림 의향 버튼(준비 중 표기)', () => {
    expect(page).toContain(`href="${l.url.replace(/&/g, '&amp;')}"`);
    expect(page).toContain('공고를 주최하거나 접수하지 않아요');
    expect(page).toContain('마감 알림 받기 (준비 중)');
  });
  it('모든 상세 페이지 ≤ 40KB, lang=ko, viewport', () => {
    for (const f of detail) {
      expect(statSync(f).size, f).toBeLessThanOrEqual(40 * 1024);
    }
    expect(page).toContain('<html lang="ko"');
    expect(page).toContain('name="viewport"');
  });
  it('외부 폰트·CDN 0', () => {
    for (const f of html.slice(0, 50)) expect(readFileSync(f, 'utf8'), f).not.toMatch(/fonts\.googleapis|cdn\.jsdelivr|unpkg\.com|cdnjs/);
  });
});

describe('AC-11 sitemap', () => {
  const xml = readFileSync('dist/sitemap.xml', 'utf8');
  const urls = xml.match(/<loc>[^<]+<\/loc>/g) ?? [];
  it('URL 수 = HTML 수 - 404, ≥ 400', () => {
    expect(urls.length).toBe(html.length - 1);
    expect(urls.length).toBeGreaterThanOrEqual(400);
  });
  it('sitemap의 모든 경로에 HTML이 있다', () => {
    for (const u of urls) {
      const p = new URL(u.replace(/<\/?loc>/g, '')).pathname;
      expect(files, p).toContain(join('dist', p, 'index.html'));
    }
  });
  it('robots.txt가 sitemap을 가리킨다', () => {
    expect(readFileSync('dist/robots.txt', 'utf8')).toMatch(/Sitemap: https:\/\/.+\/sitemap\.xml/);
  });
});

describe('공개 산출물 전체 금지 토큰 0', () => {
  it('dist의 모든 html·json에 금지 토큰 없음', () => {
    for (const f of files.filter((f) => /\.(html|json|xml|txt)$/.test(f))) {
      const s = readFileSync(f, 'utf8').replace(/github\.com\/Ryugi62\/gonggo-pages/g, '');
      expect(findForbidden(s), f).toEqual([]);
    }
  }, 120_000);
});

describe('AC-12 검색 등록 소유확인', () => {
  it('구글·네이버 확인 파일과 홈 메타', () => {
    expect(readFileSync('dist/google09201ae909576b2d.html', 'utf8')).toContain('google-site-verification: google09201ae909576b2d.html');
    expect(readFileSync('dist/naver834f78053dd5db36c61e81760ecaf7ce.html', 'utf8')).toContain('naver-site-verification: naver834f78053dd5db36c61e81760ecaf7ce.html');
    expect(readFileSync('dist/index.html', 'utf8')).toContain('<meta name="naver-site-verification" content="b075ec90d3f456a4ecbac88671fff441169d5b8b"');
  });
});
