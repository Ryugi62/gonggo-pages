import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

// SPEC §33 AC-126~130 — dist 전수
const URL_ = 'https://minion.toss.im/L5iKJAEk';
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const all = walk('dist');
const text = all.filter((f) => /\.(html|js|json|txt|xml|ics|css)$/.test(f));
const read = (f: string) => readFileSync(f, 'utf8');
const LEGAL = ['dist/terms/index.html', 'dist/refund/index.html', 'dist/privacy/index.html'];
const data = JSON.parse(readFileSync('data/listings.json', 'utf8'));
const open = data.listings.filter((l: any) => !l.deadline || l.deadline >= data.generatedAt);
const anchors = (h: string) => h.match(/<a\b[^>]*>/g)?.filter((a) => a.includes(`href="${URL_}"`)) ?? [];

describe('AC-126 열린 상세 전부 문 1개', () => {
  it('열린 상세 100%에 문 링크 1개·속성·문구', () => {
    let n = 0;
    for (const l of open) {
      const f = `dist/g/${l.slug}/index.html`;
      if (!existsSync(f)) continue;
      const h = read(f);
      const a = anchors(h);
      expect(a.length, f).toBe(1);
      expect(a[0], f).toContain('target="_blank"');
      expect(a[0], f).toContain('rel="noopener"');
      expect(a[0], f).toContain('ping="/intent/app-card"');
      expect(a[0], f).toContain('data-intent="/intent/app-card"');
      expect(h, f).toContain('토스에서 공고콕 써보기');
      n++;
    }
    console.log(`열린 상세 문 링크 ${n}/${open.length}`);
    expect(n).toBe(open.length);
    expect(n).toBeGreaterThan(1000);
  }, 120_000);
  it('마감 상세도 링크 1개 이하(있으면 1개), 읽는 법·홈·/pro 1개', () => {
    const s = readdirSync('dist/g').filter((f) => existsSync(`dist/g/${f}/read/index.html`)).slice(0, 400);
    for (const f of [...s.map((x) => `dist/g/${x}/read/index.html`), 'dist/index.html', 'dist/pro/index.html']) expect(anchors(read(f)).length, f).toBe(1);
  }, 120_000);
  it('공고별 딥링크 0 — data-intoss·intoss:// 전수', () => {
    for (const f of text) { const s = read(f); expect(s.includes('data-intoss') || s.includes('intoss://'), f).toBe(false); }
  }, 240_000);
  it('금지 표현 0(문 주변): 제휴·공식·인증·토스 로고', () => {
    const h = read(`dist/g/${open[0].slug}/index.html`);
    const a = h.match(/<a\b[^>]*href="https:\/\/minion\.toss\.im[^>]*>[\s\S]*?<\/a>/)![0];
    expect(a).not.toMatch(/제휴|공식|인증|로고|<img/);
  });
});

describe('AC-127 PC 안내', () => {
  it('상세에 PC 한 줄 안내와 폭 규칙', () => {
    const h = read(`dist/g/${open[0].slug}/index.html`);
    expect(h).toContain('휴대폰의 토스 앱에서 열려요');
    const css = [h, ...all.filter((f) => f.endsWith('.css')).map(read)].join('\n');
    expect(css).toMatch(/@media ?\((?:min-width: ?960px|width>=960px)\)\{[^}]*pc-note/);
  });
});

describe('AC-127 휴대폰 폭에서는 PC 안내가 안 보인다(390 캡처 회귀: 행 안 span 규칙이 숨김을 덮었음)', () => {
  it('행 안 pc-note는 기본 display:none, 960px에서만 block', () => {
    const h = read(`dist/g/${open[0].slug}/index.html`);
    expect(h).toMatch(/\.row \.rt span\.pc-note\{display:none\}|\.pc-note,\.row \.rt span\.pc-note\{display:none\}/);
  });
});

describe('맨 위로 안정(11/24 walk: 홈에서 행 여백 변화→스크롤 보정→버튼 깜빡임)', () => {
  it('스크롤 보정을 끈다(overflow-anchor:none)', () => {
    expect(read('dist/index.html')).toMatch(/overflow-anchor:\s*none/);
  });
});

describe('AC-130 가격 숨김', () => {
  it('3장(약관·환불·처리방침) 밖 dist 전체에 가격·창립가·사전 신청 0', () => {
    for (const f of text) {
      if (LEGAL.includes(f)) continue;
      const s = read(f);
      expect(s, f).not.toMatch(/19,?900|49,?000|창립가|Pro 사전|Pro가 열리면/);
    }
  }, 240_000);
  it('/pro 링크 0(상세·목록·홈·조항 모음·read·주간·digest·사이트맵·llms)', () => {
    for (const f of text) {
      if (f === 'dist/pro/index.html' || LEGAL.includes(f)) continue;
      expect(read(f), f).not.toMatch(/href="\/pro\b|pro\/\?from=|gonggo\.oaksoo\.com\/pro\//);
    }
  }, 240_000);
  it('/pro/는 200(파일 있음) · 앱 문 1개 · 폼·표·스크립트 0', () => {
    const h = read('dist/pro/index.html');
    expect(h).toContain('토스에서 공고콕 써보기');
    expect(h).not.toMatch(/<form|<table|<input|id="pro"|api\/pro-request/);
    expect(h).not.toMatch(/<script(?![^>]*(application\/ld\+json|is:inline))[^>]*src=/);
  });
  it('약관·환불·처리방침은 그대로 존재', () => {
    for (const f of LEGAL) expect(existsSync(f), f).toBe(true);
  });
  it('구독 폼과 /api/pro-request 경로는 그대로', () => {
    expect(text.filter((f) => f.endsWith('.js')).some((f) => read(f).includes('/api/pro-request'))).toBe(true);
  });
});

describe('주소·메모 불변', () => {
  it('관리자 메모 제목·비공개 g-7857fd5e 없음', () => {
    expect(existsSync('dist/g/g-7857fd5e/index.html')).toBe(false);
  });
  it.skipIf(!process.env.GK_LIVE_SITEMAP)('사이트맵 주소가 라이브에서 소멸 0', () => {
    const loc = (s: string) => new Set(s.match(/<loc>(.*?)<\/loc>/g));
    const live = loc(readFileSync(process.env.GK_LIVE_SITEMAP!, 'utf8'));
    const now = loc(read('dist/sitemap.xml'));
    const gone = [...live].filter((u) => !now.has(u));
    expect(gone.length).toBe(0);
  });
  it.skipIf(!existsSync('dist/pro/index.html'))('/pro/ — 웹 입구도 공고콕이라 「앱에서만 열린다」고 하지 않고, 토스 그래픽을 쓰지 않는다', () => {
    const h = readFileSync('dist/pro/index.html', 'utf8');
    expect(h).toContain('공고콕, 토스 앱에서도 써 보세요');
    expect(h).not.toContain('static.toss.im');
  });
});
