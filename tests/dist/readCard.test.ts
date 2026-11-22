import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, statSync } from 'node:fs';

// SPEC §29·§30 — 빌드 산출물: 상세엔 읽는 법 한 줄 진입, 4칸은 /g/<slug>/read/ 별도 화면
const URL_ = 'https://minion.toss.im/L5iKJAEk';
const data = JSON.parse(readFileSync('data/listings.json', 'utf8')).listings as { slug: string; category: string; organizer: string | null }[];
const appSlugs = new Set(JSON.parse(readFileSync('data/app-slugs.json', 'utf8')) as string[]);
const hasCard = (c: string) => ['해커톤', '공모전', '지원사업', '대외활동'].includes(c);
const page = (s: string) => readFileSync(`dist/g/${s}/index.html`, 'utf8');
const readPage = (s: string) => readFileSync(`dist/g/${s}/read/index.html`, 'utf8');
const live = data.filter((l) => existsSync(`dist/g/${l.slug}/index.html`));
const minionAnchors = (h: string) => h.match(/<a\b[^>]*>/g)?.filter((x) => x.includes(`href="${URL_}"`)) ?? [];

describe('AC-99 상세 = 읽는 법 한 줄 진입, 4칸은 /read/', () => {
  it('4유형 상세엔 /read/ 링크 1개·#read-card 0개, 장학엔 둘 다 0', () => {
    expect(live.length).toBeGreaterThan(0);
    for (const l of live) {
      const h = page(l.slug);
      expect((h.match(/id="read-card"/g) ?? []).length, l.slug).toBe(0);
      const n = (h.match(new RegExp(`href="/g/${l.slug}/read/"`, 'g')) ?? []).length;
      expect(n, l.slug).toBe(hasCard(l.category) ? 1 : 0);
      expect(existsSync(`dist/g/${l.slug}/read/index.html`), l.slug).toBe(hasCard(l.category));
    }
  });
  it('읽는 법 화면: #read-card 1개·4축·체크 12(체크 아이콘)·noindex·유형 이름 제목', () => {
    for (const l of live.filter((x) => hasCard(x.category))) {
      const h = readPage(l.slug);
      expect((h.match(/id="read-card"/g) ?? []).length, l.slug).toBe(1);
      for (const t of ['니즈', '평가 전략', '맞춤 아이디어', '완성도']) expect(h, `${l.slug} ${t}`).toContain(`>${t}<`);
      expect((h.match(/class="rc-line"/g) ?? []).length, l.slug).toBe(4);
      expect((h.match(/class="rc-check"/g) ?? []).length, l.slug).toBe(12);
      expect((h.match(/<svg[^>]*class="ck-ic"/g) ?? []).length, l.slug).toBe(12);
      expect(h, l.slug).toContain('name="robots" content="noindex"');
      expect(h, l.slug).toContain(`${l.category} 공고는 이렇게 읽어요`);
      expect(h, l.slug).not.toContain('이 공고에 맞춘');
      expect(h, l.slug).not.toContain('마감 전날');
    }
  });
  it('이 공고 사실이 읽는 법 맨 위에 있다(주최·마감) — 「이 공고」라는 약속을 지킨다', () => {
    const l = live.find((x) => hasCard(x.category) && x.organizer)!;
    const h = readPage(l.slug);
    expect(h).toContain('이 공고 한눈에');
    expect(h.indexOf('이 공고 한눈에')).toBeLessThan(h.indexOf('id="read-card"'));
    expect(h).toContain(l.organizer!.replace(/&/g, '&amp;'));
  });
});

describe('AC-100·106 토스 앱 링크 — 앱에 있는 공고는 딥링크, 없으면 앱 홈', () => {
  it('상세·읽는 법 화면 모두 minion 링크(폴백) 정확히 1개, 앱 번들에 있는 slug는 data-intoss 딥링크', () => {
    for (const l of live) {
      const pages = hasCard(l.category) ? [page(l.slug), readPage(l.slug)] : [page(l.slug)];
      for (const h of pages) {
        const a = minionAnchors(h);
        expect(a.length, l.slug).toBe(1);
        expect(a[0]).toContain('target="_blank"');
        expect(a[0]).toContain('rel="noopener"');
        expect(a[0]).toContain('ping="/intent/app-card"');
        if (appSlugs.has(l.slug)) expect(a[0], l.slug).toContain(`data-intoss="intoss://gonggokok/p/${l.slug}.html"`);
        else expect(a[0], l.slug).not.toContain('data-intoss');
      }
    }
  });
  it('읽는 법 화면의 하단 고정 CTA가 토스 앱 링크 1개', () => {
    const l = live.find((x) => hasCard(x.category))!;
    const h = readPage(l.slug);
    expect((h.match(/class="cta"/g) ?? []).length).toBe(1);
    const cta = h.match(/<a\b[^>]*class="cta"[^>]*>[^<]*/)![0];
    expect(cta).toContain(URL_);
    expect(cta).toMatch(/토스 앱에서/);
  });
});

describe('AC-103 크기', () => {
  it('읽는 법 화면 ≤ 20KB, 상세 ≤ 40KB', () => {
    const l = live.find((x) => hasCard(x.category))!;
    expect(statSync(`dist/g/${l.slug}/read/index.html`).size).toBeLessThanOrEqual(20 * 1024);
    for (const x of live.slice(0, 200)) expect(statSync(`dist/g/${x.slug}/index.html`).size).toBeLessThanOrEqual(40 * 1024);
  });
});
