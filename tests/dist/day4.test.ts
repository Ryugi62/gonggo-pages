import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { buildDay, buildTime } from '../../src/infrastructure/config.ts';
import { isOpen } from '../../src/domain/freshness.ts';
import { eligibilityText } from '../../src/domain/displayText.ts';

// SPEC §36 — dist 전수
const T = buildDay(), NOW = buildTime();
const read = (f: string) => readFileSync(f, 'utf8');
const data = JSON.parse(read('data/listings.json'));
const open = data.listings.filter((l: any) => isOpen(l, T, NOW) && existsSync(`dist/g/${l.slug}/index.html`));
const text = (h: string) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

describe('AC-150 00:00 = 시각 없음', () => {
  it('00:00 공고는 오늘이어도 열림: D-day·원문 CTA, 시각 속성 없음', () => {
    const z = open.find((l: any) => l.deadline === T && l.deadlineTime === '00:00');
    if (!z) return;
    const h = read(`dist/g/${z.slug}/index.html`);
    const hero = h.match(/<section class="hero-d"[\s\S]*?<\/section>/)![0];
    expect(hero).not.toContain('data-deadline-time');
    expect(hero).toContain('D-day');
    expect(h).toMatch(/class="cta"[^>]*>원문 공고 보기</);
  });
  it('모든 00:00 행·배지에 시각 속성이 없다', () => {
    const z = data.listings.filter((l: any) => l.deadlineTime === '00:00' && existsSync(`dist/g/${l.slug}/index.html`)).slice(0, 60);
    for (const l of z) expect(read(`dist/g/${l.slug}/index.html`), l.slug).not.toContain('data-deadline-time="00:00"');
  });
});

describe('AC-151 자격 줄·대체·안내', () => {
  it('번호 마커가 있는 인용은 줄 span 2개 이상, ** 없음', () => {
    const q = open.filter((l: any) => l.eligibilityQuote && /\s2\)\s/.test(l.eligibilityQuote)).slice(0, 20);
    expect(q.length).toBeGreaterThan(0);
    for (const l of q) { const h = read(`dist/g/${l.slug}/index.html`); expect((h.match(/class="ql"/g) ?? []).length, l.slug).toBeGreaterThanOrEqual(2); }
    for (const l of open.filter((x: any) => x.eligibilityQuote?.includes('**')).slice(0, 10)) expect(text(read(`dist/g/${l.slug}/index.html`).match(/<blockquote[\s\S]*?<\/blockquote>/)![0]), l.slug).not.toContain('**');
  });
  it('인용이 없고 ELIGIBILITY 조항이 있으면 그 문장이 자격 자리, 둘 다 없으면 한 줄 안내', () => {
    const viaClause = open.filter((l: any) => !l.eligibilityQuote && eligibilityText(l)).slice(0, 15);
    expect(viaClause.length).toBeGreaterThan(0);
    for (const l of viaClause) { const h = read(`dist/g/${l.slug}/index.html`); expect(h, l.slug).toContain('id="elig-q"'); expect(h, l.slug).not.toContain('자격 문장을 따로 정리하지 못했어요'); }
    const none = open.filter((l: any) => !eligibilityText(l)).slice(0, 15);
    expect(none.length).toBeGreaterThan(0);
    for (const l of none) { const h = read(`dist/g/${l.slug}/index.html`); expect(text(h), l.slug).toContain('원문에서 자격을 확인해 주세요'); expect(h, l.slug).not.toContain('따로 정리하지 못했어요'); }
  });
});

describe('AC-152·155 고정 바·read', () => {
  it('안내가 있는 바는 불투명, 본문 아래 여백', () => {
    const h = read('dist/pro/index.html');
    expect(h).toMatch(/<body class="has-cta has-note"/);
    expect(h).toContain('class="cta-bar has-note"');
    expect(h).toMatch(/\.cta-bar\.has-note\{background:var\(--bg\)\}/);
  });
  it('read: 마감이면 비슷한 공고가 읽는 법 본문 뒤, 폼 열림 시 고정 CTA 감춤·초점 파랑', () => {
    const c = data.listings.find((l: any) => !isOpen(l, T, NOW) && l.deadline && existsSync(`dist/g/${l.slug}/read/index.html`));
    const h = read(`dist/g/${c.slug}/read/index.html`);
    expect(h.indexOf('class="rd-closed"')).toBeGreaterThan(h.indexOf('class="rc"'));
    expect(h).toContain('form-open');
    expect(h).toMatch(/focus-visible\{outline:2px solid var\(--blue\)/);
  });
});

describe('AC-153·154·156·157 간격·홈·칩·중복', () => {
  it('첫 보이는 행·제목 간격 CSS', () => {
    const h = read('dist/index.html');
    expect(h).toMatch(/li\[data-top\] \.row\{border-top:0\}/);
    expect(h).toMatch(/h2\s?\+\s?\.rows/);
  });
  it('홈: 마감 임박 전체 보기, 주별 칩 연도·접힘 두 겹, 캘린더 주소 접힘', () => {
    const h = read('dist/index.html');
    expect(h).toContain('마감 임박 전체 보기');
    expect(h).toMatch(/\d{4}년 \d+월 \d+일 ~/);
    expect(h).toContain('주별 더 보기');
    expect(h).toContain('그 뒤 주 더 보기');
    expect(h).toMatch(/<summary>구독 주소 직접 복사/);
    expect((h.match(/href="\/w\/[\d-]+\/"/g) ?? []).length).toBeGreaterThan(8);
  });
  it('칩에 건수, 0건 안내 버튼 markup', () => {
    const h = read('dist/c/contest/index.html');
    expect(h).toMatch(/data-tag="[^"]+" aria-pressed="false">[^<]+ \d+<\/a>/);
    expect(h).toContain('data-empty-filter');
    expect(h).toContain('data-clear');
    expect(h).toContain('data-total-open');
  });
  it('목록(분류·대상·주)에 제목·마감이 같은 행이 없다, 상세 주소는 그대로', () => {
    for (const f of ['dist/c/contest/index.html', 'dist/c/support/index.html', 'dist/t/student/index.html']) {
      const keys = [...read(f).matchAll(/<li data-row-deadline="([^"]+)"[^>]*>[\s\S]*?<b>([^<]*)<\/b>/g)].map((m) => `${m[2].replace(/[\s\p{P}\p{S}]/gu, '').toLowerCase()}|${m[1]}`);
      expect(new Set(keys).size, f).toBe(keys.length);
    }
    const dup = open.filter((l: any) => data.listings.some((x: any) => x !== l && x.deadline === l.deadline && x.name === l.name));
    for (const l of dup.slice(0, 20)) expect(existsSync(`dist/g/${l.slug}/index.html`), l.slug).toBe(true);
  });
});

describe('AC-158 글', () => {
  it('/pro AI 줄은 이득 문장, check에 개 단위 없음', () => {
    const h = read('dist/pro/index.html');
    expect(h).toContain('공고마다 AI 사용 여부를 한눈에');
    expect(text(read('dist/check/index.html'))).not.toMatch(/\d개/);
  });
});
