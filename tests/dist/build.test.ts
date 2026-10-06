import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { findForbidden } from '../../src/domain/privacy.ts';
import { OPERATOR, PRO_PAGES } from '../../src/infrastructure/config.ts';

// 빌드 산출물 검사 (npm run build 뒤 실행)
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk('dist');
// 검색 소유확인 파일(google*.html·naver*.html)은 페이지가 아니다
const html = files.filter((f) => f.endsWith('.html') && !/^dist\/(google|naver)[0-9a-f]+\.html$/.test(f));
const detail = html.filter((f) => f.startsWith('dist/g/'));
// §12 Pro 4장(AWS 빌드에만)은 sitemap 밖 · 운영자 고지 허용
const proFiles = PRO_PAGES.map((p) => `dist${p}index.html`);
const sitePages = html.filter((f) => !proFiles.includes(f));
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
    expect(urls.length).toBe(sitePages.length - 1);
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
      let s = readFileSync(f, 'utf8').replace(/github\.com\/Ryugi62\/gonggo-pages/g, '');
      if (proFiles.includes(f)) for (const v of Object.values(OPERATOR)) s = s.split(v).join('');
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

describe('AC-13 알림 의향 계측', () => {
  it('알림 버튼을 켤 때 /intent/alert/<slug> 가상 페이지뷰를 보낸다', () => {
    const l = data.listings[0];
    const page = readFileSync(`dist/g/${l.slug}/index.html`, 'utf8');
    expect(page).toContain("window.va('pageview',{route:'/intent/alert',path:'/intent/alert/'+s})");
  });
});

describe('Pro §5 조항 판독 블록', () => {
  const pageOf = (slug: string) => readFileSync(`dist/g/${slug}/index.html`, 'utf8');
  it('§5-1 AI 금지 공고: 첫 화면 「AI 초안 사용 불가」 배지 + 원문 인용 그대로', () => {
    const l = data.listings.find((x: any) => x.aiUse === 'FORBIDDEN');
    const page = pageOf(l.slug);
    expect(page).toContain('AI 초안 사용 불가');
    const q = l.clauses.find((c: any) => c.kind === 'ORIGINALITY_PLEDGE' || c.kind === 'AI_USE').quote;
    expect(page).toContain(q.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;').slice(0, 20));
    // 배지가 D-day 카드보다 앞(첫 화면)
    expect(page.indexOf('AI 초안 사용 불가')).toBeLessThan(page.indexOf('aria-label="마감까지 남은 날"'));
  });
  it('§5-2 AI 문장 없는 공고: 단정하지 않는 문구, 「허용」 표시 없음', () => {
    const l = data.listings.find((x: any) => x.aiUse === 'UNSTATED' && x.clauses.length > 0);
    const page = pageOf(l.slug);
    expect(page).toContain('원문에서 AI 사용 규정을 찾지 못했어요 — 원문 확인');
    expect(page).not.toContain('AI 사용 허용');
  });
  it('§5-8 판독 블록 아래 원문 링크와 「원문이 맞아요」 면책', () => {
    const l = data.listings.find((x: any) => x.clauses.length > 0);
    const page = pageOf(l.slug);
    expect(page).toContain('조항 판독');
    expect(page).toContain('원문과 다르면 원문이 맞아요');
  });
  it('§5-6 결제 0: 어떤 페이지에도 카드 입력·결제 버튼·가격 없음(가격은 AWS /pro/만 — §12)', () => {
    for (const f of html.filter((f) => f !== 'dist/pro/index.html')) {
      const s = readFileSync(f, 'utf8');
      expect(s, f).not.toMatch(/type="(?:tel|number)"[^>]*card|카드\s*번호|결제하기|19,900|49,000/);
    }
  }, 120_000);
});

describe('주간 페이지 — 이번 주 낼 수 있는 창업경진대회·지원사업', () => {
  it('/week/ 가 있고 sitemap에 들어 있다', () => {
    const page = readFileSync('dist/week/index.html', 'utf8');
    expect(page).toContain('이번 주 낼 수 있는 창업경진대회·지원사업');
    expect(readFileSync('dist/sitemap.xml', 'utf8')).toMatch(/<loc>https:\/\/[^<]+\/week\/<\/loc>/);
  });
  it('홈에서 주간 페이지로 가는 링크', () => {
    expect(readFileSync('dist/index.html', 'utf8')).toContain('href="/week/"');
  });
});
