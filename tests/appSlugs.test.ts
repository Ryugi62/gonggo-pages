import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { appSlugOf, appDeepLink, TOSS_MINIAPP_URL, TOSS_APP_COPY } from '../src/domain/tossLink.ts';

// SPEC §30 AC-106~107 — 공고별 토스 앱 딥링크(앱 번들에 같은 /p/<slug>.html이 있는 공고만)
const slugs = JSON.parse(readFileSync('data/app-slugs.json', 'utf8')) as string[];
const all = (JSON.parse(readFileSync('data/listings.json', 'utf8')).listings as { slug: string }[]).map((l) => l.slug);

describe('AC-106 앱 번들 slug 대조 데이터', () => {
  it('정렬·중복 0·웹 공고 slug의 부분집합, 실측 건수 ≥ 500', () => {
    expect(slugs.length).toBeGreaterThanOrEqual(500);
    expect([...slugs].sort()).toEqual(slugs);
    expect(new Set(slugs).size).toBe(slugs.length);
    const web = new Set(all);
    for (const s of slugs) expect(web.has(s), s).toBe(true);
    expect(slugs.length).toBeLessThan(all.length); // 전부는 아니다 — 나머지는 앱 홈 링크
  });
});

describe('AC-107 딥링크 값', () => {
  it('앱에 있는 slug만 intoss://gonggokok/p/<slug>.html, 위험한 slug는 null', () => {
    expect(appDeepLink('2026-c9633e27')).toBe('intoss://gonggokok/p/2026-c9633e27.html');
    for (const bad of ['', '../x', 'a/b', 'a b', 'x.html', 'a'.repeat(81)]) expect(appDeepLink(bad)).toBeNull();
    expect(appSlugOf('zzz-not-in-app', new Set(['a']))).toBeNull();
    expect(appSlugOf('a', new Set(['a']))).toBe('intoss://gonggokok/p/a.html');
  });
  it('문구는 해요체·≤40자, 폴백 주소는 기존 단축 링크', () => {
    expect(TOSS_MINIAPP_URL).toBe('https://minion.toss.im/L5iKJAEk');
    for (const t of [TOSS_APP_COPY.generic, TOSS_APP_COPY.specific]) { expect(t.length).toBeLessThanOrEqual(40); expect(t).toMatch(/열기$/); } // 버튼은 누르면 무엇이 되는지
    for (const t of [TOSS_APP_COPY.genericSub, TOSS_APP_COPY.specificSub]) expect(t).toMatch(/요$/);
    expect(TOSS_APP_COPY.generic).not.toMatch(/맞춘|:\)|→/);
  });
});
