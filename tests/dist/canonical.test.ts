import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

// SPEC §13 산출물 (AC-36·AC-37) — npm run build 뒤 실행
const C = 'https://gonggo.oaksoo.com';
const aws = process.env.DEPLOY_TARGET === 'aws';
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const files = walk('dist');
const html = files.filter((f) => f.endsWith('.html') && !/^dist\/(google|naver)[0-9a-f]+\.html$/.test(f) && f !== 'dist/404.html');
const read = (f: string) => readFileSync(f, 'utf8');

describe('AC-36 R1 canonical·og:url·sitemap·robots·ics = 정식 주소', () => {
  it('모든 페이지 canonical·og:url', () => {
    expect(html.length).toBeGreaterThan(400);
    for (const f of html) {
      const s = read(f);
      const canon = s.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      const og = s.match(/<meta property="og:url" content="([^"]+)"/)?.[1];
      expect(canon?.startsWith(`${C}/`), `${f} canonical ${canon}`).toBe(true);
      expect(og, f).toBe(canon);
    }
  }, 120_000);
  it('sitemap <loc> 전부', () => {
    const locs = [...read('dist/sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(400);
    for (const u of locs) expect(u.startsWith(`${C}/`), u).toBe(true);
  });
  it('robots Sitemap:', () => {
    expect(read('dist/robots.txt')).toContain(`Sitemap: ${C}/sitemap.xml`);
  });
  it('.ics 상세 링크', () => {
    const all = read('dist/cal/all.ics').replace(/\r\n[ \t]/g, '');
    const urls = all.match(/^URL:.*$/gm) ?? [];
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) expect(u.startsWith(`URL:${C}/g/`), u).toBe(true);
  });
});

describe('AC-36 R2 옛 주소 문자열 0', () => {
  // 공고 원문 링크가 남의 *.vercel.app인 경우는 원문 주소라 허용 — 우리 옛 주소만 금지
  it('dist 전체(html·xml·txt·ics·json)에 gonggo-pages*.vercel.app·sslip.io 없음', () => {
    for (const f of files.filter((f) => /\.(html|xml|txt|ics|json)$/.test(f))) {
      const s = read(f);
      expect(/gonggo-pages[\w-]*\.vercel\.app|sslip\.io/.test(s), f).toBe(false);
    }
  }, 120_000);
});

describe('AC-37 계측', () => {
  const home = read('dist/index.html');
  it.runIf(aws)('AWS 빌드: Vercel 스크립트 없음 + 같은 출처 /intent/ 비콘 심', () => {
    expect(home).not.toContain('/_vercel/insights/script.js');
    expect(home).toContain("window.va=function(e,o){var p=o&&o.path;if(e==='pageview'&&typeof p==='string'&&p.indexOf('/intent/')===0)");
  });
  it.runIf(!aws)('기본(Vercel) 빌드: Vercel 스크립트 유지', () => {
    expect(home).toContain('/_vercel/insights/script.js');
  });
});
