import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { findForbidden } from '../../src/domain/privacy.ts';
import { OPERATOR, PRO_PAGES, INDEXNOW_KEY } from '../../src/infrastructure/config.ts';
import { searchTitle, listingFaq, CLAUSE_QUESTION } from '../../src/domain/searchLanding.ts';
import { leadSummary } from '../../src/domain/aiCitation.ts';
import { clausesFound } from '../../src/domain/clause.ts';

// 빌드 산출물 검사 (npm run build 뒤 실행)
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk('dist');
// 검색 소유확인 파일(google*.html·naver*.html)은 페이지가 아니다
const html = files.filter((f) => f.endsWith('.html') && !/^dist\/(google|naver)[0-9a-f]+\.html$/.test(f));
const detail = html.filter((f) => f.startsWith('dist/g/'));
// §12 Pro 4장(AWS 빌드에만)은 sitemap 밖 · 운영자 고지 허용
const proFiles = PRO_PAGES.map((p) => `dist${p}index.html`);
// 읽는 법 화면(/g/<slug>/read/, SPEC §30)은 noindex라 sitemap에 넣지 않는다
const sitePages = html.filter((f) => !proFiles.includes(f) && !/^dist\/g\/[^/]+\/read\//.test(f));
const data = JSON.parse(readFileSync('data/listings.json', 'utf8'));

describe('AC-10 상세 페이지', () => {
  const l = data.listings[0];
  const page = readFileSync(`dist/g/${l.slug}/index.html`, 'utf8');
  it('title·description·canonical·OG·JSON-LD', () => {
    const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/"/g, '&quot;');   // 제목에 따옴표가 든 공고(10/13 「'2026 일터의 빈틈을 묻다'」) — Astro가 HTML 이스케이프
    expect(page).toContain(`<title>${esc(searchTitle(l))}</title>`);
    expect(page).toMatch(/<meta name="description" content="[^"]{40,}"/);
    expect(page).toMatch(new RegExp(`<link rel="canonical" href="https://[^"]+/g/${l.slug}/"`));
    expect(page).toContain('property="og:title"');
    expect(page).toContain('"@type":"BreadcrumbList"');
  });
  it('원문 링크·면책, 죽은 버튼(마감 알림 준비 중)은 없다(11/22 검수)', () => {
    expect(page).toContain(`href="${l.url.replace(/&/g, '&amp;')}"`);
    expect(page).toContain('공고를 주최하거나 접수하지 않아요');
    expect(page).not.toContain('마감 알림 받기');
    expect(page).not.toContain('준비 중');
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
  }, 400_000);
});

describe('AC-12 검색 등록 소유확인', () => {
  it('구글·네이버 확인 파일과 홈 메타', () => {
    expect(readFileSync('dist/google09201ae909576b2d.html', 'utf8')).toContain('google-site-verification: google09201ae909576b2d.html');
    expect(readFileSync('dist/naver834f78053dd5db36c61e81760ecaf7ce.html', 'utf8')).toContain('naver-site-verification: naver834f78053dd5db36c61e81760ecaf7ce.html');
    expect(readFileSync('dist/naver228ead5495fbad5fe49c95cc18e5bc7c.html', 'utf8')).toContain('naver-site-verification: naver228ead5495fbad5fe49c95cc18e5bc7c.html');
    expect(readFileSync('dist/index.html', 'utf8')).toContain('<meta name="naver-site-verification" content="b075ec90d3f456a4ecbac88671fff441169d5b8b"');
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
    expect(page.indexOf('AI 초안 사용 불가')).toBeGreaterThan(page.indexOf('class="hero-d"'));
    expect(page.indexOf('AI 초안 사용 불가')).toBeLessThan(page.indexOf('누가 낼 수 있나요?', page.indexOf('<body')));
  });
  it('§5-2 AI 문장 없는 공고: 단정하지 않는 문구, 「허용」 표시 없음', () => {
    const l = data.listings.find((x: any) => x.aiUse === 'UNSTATED' && clausesFound(x)); // §35: 못 찾은 조항 줄은 숨김
    const page = pageOf(l.slug);
    expect(page).toContain('원문에서 AI 사용 규정을 찾지 못했으니 지원 전 원문을 확인해 주세요.');
    expect(page).not.toContain('AI 사용 허용');
  });
  it('§5-8 판독 블록 아래 원문 링크와 「원문이 맞아요」 면책', () => {
    const l = data.listings.find((x: any) => clausesFound(x)); // §35: 못 찾은 조항 줄은 숨김
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

describe('AC-47 검색 착지 — 고객 말 제목·FAQ(SPEC §15)', () => {
  const ls = data.listings as any[];
  // &amp; 는 마지막에 — 공고명에 원래 들어 있는 「&lt;」 글자를 두 번 풀지 않게
  const unesc = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  it('상세 100%: title = searchTitle, FAQPage 1개, FAQ 질문이 화면 본문에 보인다', () => {
    for (const l of ls) {
      const page = readFileSync(`dist/g/${l.slug}/index.html`, 'utf8');
      const t = /<title>([^<]*)<\/title>/.exec(page)![1];
      expect(unesc(t), l.slug).toBe(searchTitle(l));
      const lds = [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
      const faqs = lds.filter((j) => j['@type'] === 'FAQPage');
      const want0 = listingFaq(l).filter((f) => clausesFound(l) || f.q !== CLAUSE_QUESTION.AI_USE); // §35: 화면에 없는 질문은 구조화 데이터에도 없다
      expect(faqs.length, l.slug).toBe(want0.length ? 1 : 0);
      if (!want0.length) continue;
      const body = unesc(page.slice(page.indexOf('<body')).replace(/<[^>]+>/g, ''));
      const want = want0;
      expect(faqs[0].mainEntity.map((q: any) => q.name)).toEqual(want.map((f) => f.q));
      for (const f of want) expect(body, `${l.slug} ${f.q}`).toContain(f.q);
    }
  }, 120_000);
});

describe('AC-48 IndexNow 키 파일', () => {
  it('dist/<키>.txt 본문 = 키', () => {
    expect(readFileSync(`dist/${INDEXNOW_KEY}.txt`, 'utf8').trim()).toBe(INDEXNOW_KEY);
  });
});

describe('AC-55·56·57 AI 검색 인용 장치(SPEC §17)', () => {
  const ls = data.listings as any[];
  const unesc = (s: string) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  it('상세 100%: 제목 되풀이 리드 없음(11/22 검수), AI 질문 FAQ 100%', () => {
    for (const l of ls) {
      const page = readFileSync(`dist/g/${l.slug}/index.html`, 'utf8');
      expect(page, l.slug).not.toContain('class="lead"');
      const raw = [...page.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((x) => x[1]).find((x) => x.includes('FAQPage'));
      // §35: 찾은 조항이 있을 때만 AI 질문을 싣는다(화면에 없는 질문은 구조화 데이터에도 없다)
      if (!clausesFound(l) && !l.eligibilityQuote) { expect(raw, l.slug).toBeUndefined(); continue; }
      const names = JSON.parse(raw!).mainEntity.map((q: any) => q.name);
      if (clausesFound(l)) expect(names, l.slug).toContain('AI(챗GPT)로 쓴 내용을 내도 되나요?'); else expect(names, l.slug).not.toContain('AI(챗GPT)로 쓴 내용을 내도 되나요?');
      if (l.eligibilityQuote) expect(names).toContain('누가 낼 수 있나요?');
      if (l.clauses.some((c: any) => c.kind === 'DUPLICATE_AWARD')) expect(names).toContain('다른 대회에서 상 받은 작품도 낼 수 있나요?');
    }
  }, 120_000);
  it('dist/llms.txt — 첫 줄·정식 주소 링크만·주간 항목', () => {
    const t = readFileSync('dist/llms.txt', 'utf8');
    expect(t.split('\n')[0]).toBe('# 공고콕');
    const links = [...t.matchAll(/\]\((https?:[^)]+)\)/g)].map((m) => m[1]);
    for (const x of links) expect(x.startsWith('https://gonggo.oaksoo.com/'), x).toBe(true);
    expect(links).toContain('https://gonggo.oaksoo.com/week/');
    expect(findForbidden(t)).toEqual([]);
    expect(statSync('dist/llms.txt').size).toBeLessThan(20 * 1024);
    expect(readFileSync('dist/sitemap.xml', 'utf8')).not.toContain('llms.txt');
  });
});
