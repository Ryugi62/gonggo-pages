import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';

// SPEC §29 AC-99·100·103 — 빌드 산출물의 「공모 읽는 법」 카드
const URL_ = 'https://minion.toss.im/L5iKJAEk';
const data = JSON.parse(readFileSync('data/listings.json', 'utf8')).listings as { slug: string; category: string }[];
const hasCard = (c: string) => ['해커톤', '공모전', '지원사업', '대외활동'].includes(c);
const page = (s: string) => readFileSync(`dist/g/${s}/index.html`, 'utf8');
const live = data.filter((l) => existsSync(`dist/g/${l.slug}/index.html`));

describe('AC-99 카드 존재', () => {
  it('4유형 상세엔 #read-card 1개·4축·체크 12개, 장학엔 0개', () => {
    expect(live.length).toBeGreaterThan(0);
    for (const l of live) {
      const h = page(l.slug);
      const n = (h.match(/id="read-card"/g) ?? []).length;
      expect(n, l.slug).toBe(hasCard(l.category) ? 1 : 0);
      if (n) {
        for (const t of ['니즈', '평가 전략', '맞춤 아이디어', '완성도']) expect(h, `${l.slug} ${t}`).toContain(`>${t}<`);
        expect((h.match(/class="rc-line"/g) ?? []).length, l.slug).toBe(4);
        expect((h.match(/class="rc-check"/g) ?? []).length, l.slug).toBe(12);
        expect(h).toContain('원문 공고가 기준이에요');
      }
    }
  });
});

describe('AC-100 앱 연결·계측 + AC-97 갱신', () => {
  it('카드 상세는 minion 링크 1개(카드 안, ping 있음), 카드 없는 상세는 기존 타일 1개', () => {
    for (const l of live) {
      const h = page(l.slug);
      const a = h.match(/<a\b[^>]*>/g)?.filter((x) => x.includes(`href="${URL_}"`)) ?? [];
      expect(a.length, l.slug).toBe(1);
      expect(a[0]).toContain('target="_blank"');
      expect(a[0]).toContain('rel="noopener"');
      if (hasCard(l.category)) {
        expect(a[0], l.slug).toContain('ping="/intent/app-card"');
        const card = h.slice(h.indexOf('id="read-card"'));
        expect(card.indexOf(URL_), l.slug).toBeGreaterThan(-1);
        expect(card.indexOf(URL_), l.slug).toBeLessThan(card.indexOf('</section>'));
      } else expect(a[0]).not.toContain('ping=');
    }
  });
});

describe('AC-103 크기', () => {
  it('상세 1페이지 증가분 ≤ 3KB(카드 섹션 바이트)', () => {
    const l = live.find((x) => hasCard(x.category))!;
    const h = page(l.slug);
    const s = h.indexOf('<section id="read-card"');
    const e = h.indexOf('</section>', s) + '</section>'.length;
    expect(s).toBeGreaterThan(-1);
    expect(Buffer.byteLength(h.slice(s, e))).toBeLessThanOrEqual(3 * 1024);
    for (const x of live.slice(0, 200)) expect(statSync(`dist/g/${x.slug}/index.html`).size).toBeLessThanOrEqual(40 * 1024);
  });
});
