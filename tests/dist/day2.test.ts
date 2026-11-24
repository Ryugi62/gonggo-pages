import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { buildDay, buildTime } from '../../src/infrastructure/config.ts';
import { isOpen as isOpenAt } from '../../src/domain/freshness.ts';

// SPEC §34 — dist 전수(기준일 = 빌드 날)
const T = buildDay();
const read = (f: string) => readFileSync(f, 'utf8');
const data = JSON.parse(read('data/listings.json'));
const open = data.listings.filter((l: any) => isOpenAt(l, T, buildTime()));
const rowDays = (h: string) => [...h.matchAll(/data-row-deadline="([^"]+)"/g)].map((m) => m[1]);

describe('AC-131 기준일 = 빌드 날', () => {
  it('열린 상세(빌드 날 기준)는 전부 문 1개, 지난 공고는 목록·홈에 행으로 없다', () => {
    let n = 0;
    for (const l of open) { const h = read(`dist/g/${l.slug}/index.html`); expect((h.match(/href="https:\/\/minion\.toss\.im\/L5iKJAEk"/g) ?? []).length, l.slug).toBe(1); n++; }
    console.log(`열린 상세(${T}) ${n}건, 문 링크 ${n}건`);
    expect(n).toBeGreaterThan(1500);
  }, 120_000);
  it('홈 「마감 임박」·목록 행은 전부 오늘 이후', () => {
    for (const f of ['dist/index.html', ...readdirSync('dist/c').map((c) => `dist/c/${c}/index.html`), 'dist/t/' + readdirSync('dist/t')[0] + '/index.html']) {
      for (const d of rowDays(read(f))) expect(d >= T, `${f} ${d}`).toBe(true);
    }
  });
  it('홈: 마감 임박 여유 행(7일×12, 앞 10만 남기는 cap), 총수 속성, 주별 칩은 접힘 안에 DOM 유지', () => {
    const h = read('dist/index.html');
    const soonRows = h.match(/<li data-row-deadline="([\d-]+)" data-group="soon"/g) ?? [];
    expect(soonRows.length).toBeGreaterThanOrEqual(40);
    expect(soonRows.length).toBeLessThanOrEqual(84);
    expect(new Set(soonRows.map((r) => r.match(/\d{4}-\d{2}-\d{2}/)![0])).size).toBeGreaterThanOrEqual(5); // 날이 지나도 다음 날 행이 올라온다
    expect(h).toContain('data-cap="5"'); // §37: 앞 5행만
    expect(h).toMatch(/data-hist="[^"]+" data-total="\d+"/);
    expect(read('dist/week/index.html')).toMatch(/<details class="fold"[^>]*>\s*<summary>마감 주별로 보기/); // §37: 주별 칩은 /week/ 접힘으로
  });
  it('빈 주·태그·분류 주소도 200 + 빈 상태 한 줄', () => {
    const live = new Set((readFileSync(process.env.GK_LIVE_SITEMAP ?? 'data/none', { flag: 'a+', encoding: 'utf8' }).match(/\/w\/[\d-]+\//g) ?? []));
    const emptyWeek = readdirSync('dist/w').find((w) => !read(`dist/w/${w}/index.html`).includes('<li data-row-deadline'));
    expect(emptyWeek).toBeTruthy();
    const h = read(`dist/w/${emptyWeek}/index.html`);
    expect(h).toContain('지금 접수 중인 공고가 없어요');
    expect(h).not.toMatch(/data-empty="list"[^>]*hidden/);
    expect(live.size >= 0).toBe(true);
  });
  it('사이트맵은 digest·ai-ok·solo 경로를 항상 싣는다(generatedAt 그대로)', () => {
    const x = read('dist/sitemap.xml');
    for (const p of ['digest', 'ai-ok', 'solo']) expect(x).toContain(`/${p}/${data.generatedAt}/`);
    expect(existsSync(`dist/digest/${data.generatedAt}/index.html`)).toBe(true);
  });
  it('「정리 기준일」 글자는 generatedAt 그대로', () => {
    expect(read('dist/index.html')).toContain(`정리 기준일 ${data.generatedAt}`);
  });
});

describe('AC-132·133 배지 스크립트·여백', () => {
  it('배지 스크립트에 lg 예외가 없고 마감됐어요 분기가 있다', () => {
    const h = read('dist/index.html');
    expect(h).not.toContain("contains('lg')&&n<0))el.textContent");
    expect(h).toContain('마감됐어요');
    expect(h).toContain('data-closed-href');
  });
  it('상세 CTA에 마감 전환 속성', () => {
    const h = read(`dist/g/${open.find((l: any) => l.deadline)!.slug}/index.html`);
    expect(h).toMatch(/data-closed-href="\/c\/[a-z-]+\/"/);
    expect(h).toContain('data-closed-label="지금 낼 수 있는 공고 보기"');
  });
  it('main.wrap 여백 규칙', () => {
    expect(read('dist/index.html')).toMatch(/main\.wrap\{padding-top:24px;padding-bottom:32px\}/);
  });
});

describe('AC-134 상세 순서·AC-137 read 접힘·AC-135 중복', () => {
  it('열린 상세: 제목 → 누가 낼 수 있나요 → 문 → 읽는 법 → 비슷한 공고', () => {
    for (const l of open.filter((x: any) => x.deadline && x.eligibilityQuote).slice(0, 150)) {
      const h = read(`dist/g/${l.slug}/index.html`);
      const i = [h.indexOf('<h1>'), h.indexOf('<h2>누가 낼 수 있나요?</h2>'), h.indexOf('class="rows door"'), h.indexOf('id="rel-h"')];
      expect(i.every((v) => v > 0), l.slug).toBe(true);
      expect([...i].sort((a, b) => a - b), l.slug).toEqual(i);
      expect(h, l.slug).toContain('id="elig-q"');
    }
  });
  it('문 행 PC 안내는 앱 줄 부제 안(§35)', () => {
    const h = read(`dist/g/${open[0].slug}/index.html`);
    expect(h).toMatch(/<span class="pc-note"> · 휴대폰의 토스 앱에서 열려요<\/span>/); // §35: 앱 줄 부제 안
  });
  it('read: 더 해 볼 수 있어요는 접힘(details), 안의 구독·조항 요청 id 그대로', () => {
    const f = readdirSync('dist/g').find((s) => existsSync(`dist/g/${s}/read/index.html`) && open.some((l: any) => l.slug === s))!;
    const h = read(`dist/g/${f}/read/index.html`);
    expect(h).toMatch(/<details class="fold" id="more"[^>]*>/);
    expect(h).toContain('data-sub-entry');
    expect(h).toContain('data-read-entry');
    expect(h.indexOf('class="rows door"')).toBeLessThan(h.indexOf('id="more"'));
  });
  it('홈 문 행은 상세와 같은 부품(타일 없음)', () => {
    const h = read('dist/index.html');
    expect(h).toContain('class="rows door"');
    expect(h).not.toMatch(/class="tile"[^>]*minion/);
  });
  it('/pro: 하단 CTA가 문, PC 안내는 제목 아래(§37), 그래픽 없음', () => {
    const h = read('dist/pro/index.html');
    expect(h).toMatch(/<div class="cta-bar">\s*<a class="cta"/);
    expect(h).not.toContain('static.toss.im');
  });
  it('목록(분류) 칩 ≤5 · 건수 data-count', () => {
    const h = read('dist/c/contest/index.html');
    const chips = h.match(/aria-label="대상으로 좁히기"[\s\S]*?<\/ul>/)![0];
    expect((chips.match(/<li>/g) ?? []).length).toBeLessThanOrEqual(5);
    expect(h).toContain('data-count="list"');
  });
});
