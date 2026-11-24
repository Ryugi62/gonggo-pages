import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { buildDay, buildTime } from '../../src/infrastructure/config.ts';
import { isOpen } from '../../src/domain/freshness.ts';

// SPEC §35 — dist 전수
const T = buildDay(), NOW = buildTime();
const read = (f: string) => readFileSync(f, 'utf8');
const data = JSON.parse(read('data/listings.json'));
const open = data.listings.filter((l: any) => isOpen(l, T, NOW));
const css = (h: string) => (h.match(/<style[^>]*>[\s\S]*?<\/style>/g) ?? []).join('\n');
const sample = open.filter((l: any) => l.deadline).slice(0, 200);

describe('AC-141 밀림 0', () => {
  it('body.tt-on .row 규칙·overflow-anchor:none이 CSS에 없다', () => {
    const h = read('dist/index.html');
    expect(css(h)).not.toMatch(/tt-on/);
    expect(css(h)).not.toMatch(/overflow-anchor/);
    expect(h).not.toContain("classList.toggle('tt-on'");
  });
});

describe('AC-142·143 마감 시각·원문 길', () => {
  it('00:00 시각은 화면에 안 싣고 작은 글씨 안내만, 그 밖 시각은 그대로', () => {
    const z = open.find((l: any) => l.deadlineTime === '00:00' && existsSync(`dist/g/${l.slug}/index.html`));
    expect(z).toBeTruthy();
    const h = read(`dist/g/${z.slug}/index.html`);
    const heroRaw = h.match(/<section class="hero-d"[\s\S]*?<\/section>/)![0];
    expect(heroRaw).not.toContain('data-deadline-time'); // §36 AC-150: 00:00은 시각 없음 — 속성도 없다
    const hero = heroRaw.replace(/<[^>]+>/g, ' ');
    expect(hero).not.toContain('00:00');
    expect(hero).not.toContain('마감 시각은 원문에서 확인'); // §37 AC-166: 안내 문구 뺌(87건만 붙어 어긋남)
  });
  it('모든 상세에 「끝난 원문 공고 보기」 행, 열린 상세는 숨김·마감 상세는 보임', () => {
    for (const l of sample.slice(0, 80)) {
      const h = read(`dist/g/${l.slug}/index.html`);
      const m = h.match(/<section class="rows" data-closed-show([^>]*)>[\s\S]*?끝난 원문 공고 보기/);
      expect(m, l.slug).toBeTruthy();
      expect(/\shidden/.test(m![1]), l.slug).toBe(true);
    }
    const closed = data.listings.find((l: any) => l.deadline && !isOpen(l, T, NOW) && existsSync(`dist/g/${l.slug}/index.html`));
    const h = read(`dist/g/${closed.slug}/index.html`);
    expect(h.match(/<section class="rows" data-closed-show([^>]*)>/)![1]).not.toMatch(/\shidden/);
  });
  it('시각이 지난 오늘 마감은 빌드에서 마감 상세(마감됐어요)', () => {
    const t = data.listings.find((l: any) => l.deadline === T && l.deadlineTime && l.deadlineTime <= NOW && existsSync(`dist/g/${l.slug}/index.html`));
    if (!t) return;
    expect(read(`dist/g/${t.slug}/index.html`)).toMatch(/class="bd lg closed"[^>]*>마감됐어요</);
  });
});

describe('AC-144 칩 · AC-145 순서 · AC-146 약속 · AC-148 조사', () => {
  it('목록 칩: data-chip·data-slug, 행 data-tags, 스크립트', () => {
    const h = read('dist/c/contest/index.html');
    expect((h.match(/data-chip/g) ?? []).length).toBeLessThanOrEqual(5);
    expect(h).toMatch(/data-chip data-slug="[a-z-]+" data-tag="[^"]+" aria-pressed="false"/);
    expect(h).toMatch(/data-tags="[^"]+"/);
    expect(h).toContain('DOMContentLoaded');
    expect(h).toContain('aria-label="대상으로 좁히기"');
  });
  it('상세: 자격 → (조항 있을 때만) 조항 → 문+읽는 법 한 묶음 → 비슷한 공고, 못 찾은 조항 줄은 숨김', () => {
    let withClause = 0, without = 0;
    for (const l of sample) {
      const h = read(`dist/g/${l.slug}/index.html`);
      const door = h.indexOf('class="rows door"');
      expect(door, l.slug).toBeGreaterThan(h.indexOf('<h2>누가 낼 수 있나요?</h2>'));
      const rel = h.indexOf('id="rel-h"');
      if (rel > 0) expect(rel, l.slug).toBeGreaterThan(door);
      const cl = h.indexOf('id="clauses"');
      if (cl > 0) { withClause++; expect(cl, l.slug).toBeLessThan(door); expect(cl, l.slug).toBeGreaterThan(h.indexOf('<h2>누가 낼 수 있나요?</h2>')); }
      else { without++; expect(h, l.slug).not.toContain('조항 판독 —'); }
      expect(h.slice(door, door + 1500), l.slug).toContain('minion.toss.im');
    }
    console.log(`조항 있음 ${withClause} · 없음(줄 숨김) ${without}`);
    expect(without).toBeGreaterThan(0);
  });
  it('앱 부제에 AI 사용 규정 약속이 없고, PC 안내는 앱 줄 안(부제 안)에 있다', () => {
    const h = read(`dist/g/${sample[0].slug}/index.html`);
    const door = h.slice(h.indexOf('class="rows door"'), h.indexOf('class="rows door"') + 900);
    expect(door).toContain('마감 임박 공고를 앱에서도 봐요');
    expect(door).not.toContain('AI 사용 규정');
    expect(door).toMatch(/<span class="pc-note"> · 휴대폰의 토스 앱에서 열려요<\/span>/);
    expect(h).not.toMatch(/<p class="pc-note small">휴대폰/);
  });
  it('/pro: 「그대로」·「AI 사용 규정」 약속 없음, 앱 설명 3행은 뺌(§37 AC-162)', () => {
    const h = read('dist/pro/index.html');
    expect(h).not.toContain('app-fact');
    expect(h).not.toMatch(/원문 그대로|AI 사용 규정/);
  });
  it('읽는 법 화면에 토스 3D 이모지 없음(토스 밖 자산)', () => {
    const s = readdirSync('dist/g').find((x) => existsSync(`dist/g/${x}/read/index.html`))!;
    expect(read(`dist/g/${s}/read/index.html`)).not.toContain('static.toss.im');
  });
  it('캘린더·메일 약속: 「알아서」·「주 1회」 단정 없음', () => {
    const idx = read('dist/week/index.html'); // §37: 캘린더 구독은 홈에서 /week/로
    expect(idx).not.toContain('알아서 들어와요');
    expect(idx).toContain('새로 정리한 공고는 사이트를 갱신할 때');
    for (const f of readdirSync('dist/g').filter((x) => existsSync(`dist/g/${x}/read/index.html`)).slice(0, 5)) {
      const h = read(`dist/g/${f}/read/index.html`);
      expect(h).not.toContain('주 1회');
      expect(h).toContain('운영자가 공고를 정리할 때');
    }
  });
  it('조사: 「창업자이」·「제 사업이」 없음, 창업자가 낼 수 있는 공고', () => {
    const h = read('dist/t/founder/index.html');
    expect(h).toContain('창업자가 낼 수 있는 공고');
    for (const f of ['dist/index.html', 'dist/t/founder/index.html', 'dist/t/student/index.html']) expect(read(f)).not.toMatch(/창업자이 |제 사업이/);
    expect(read('data/readcards.json')).not.toContain('제 사업이');
  });
  it('read 폼: 주 색 버튼·scroll-margin', () => {
    const s = readdirSync('dist/g').find((x) => existsSync(`dist/g/${x}/read/index.html`))!;
    const h = read(`dist/g/${s}/read/index.html`);
    expect(h).toContain('class="btn primary block" id="read-send"');
    expect(h).toContain('class="btn primary block" id="sub-send"');
    expect(css(h)).toMatch(/scroll-margin-bottom:\s*104px/);
  });
  it('check: 결과 행은 목록 행 부품, 푸터가 CTA에 안 가림', () => {
    const h = read('dist/check/index.html');
    expect(h).toContain('<ul class="rel rows" id="out"');
    expect(css(h)).toMatch(/body:has\(\.cta-bar\)\{padding-bottom:92px/);
  });
});
