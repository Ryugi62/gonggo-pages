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
  it('인용이 없고 ELIGIBILITY 조항이 있으면 그 문장이 자격 자리, 문장도 칩도 없으면 절 전체가 없다(§37 AC-160)', () => {
    const viaClause = open.filter((l: any) => !l.eligibilityQuote && eligibilityText(l)).slice(0, 15);
    expect(viaClause.length).toBeGreaterThan(0);
    for (const l of viaClause) { const h = read(`dist/g/${l.slug}/index.html`); expect(h, l.slug).toContain('id="elig-q"'); expect(h, l.slug).not.toContain('자격 문장을 따로 정리하지 못했어요'); }
    const none = open.filter((l: any) => !eligibilityText(l) && l.tags.length === 0).slice(0, 15);
    expect(none.length).toBeGreaterThan(0);
    for (const l of none) { const h = read(`dist/g/${l.slug}/index.html`); expect(h, l.slug).not.toContain('<h2>누가 낼 수 있나요?</h2>'); expect(text(h), l.slug).not.toContain('자격을 확인해 주세요'); }
    const chipsOnly = open.filter((l: any) => !eligibilityText(l) && l.tags.length > 0).slice(0, 10);
    for (const l of chipsOnly) { const h = read(`dist/g/${l.slug}/index.html`); expect(h, l.slug).toContain('<h2>누가 낼 수 있나요?</h2>'); expect(h, l.slug).not.toContain('id="elig-q"'); expect(text(h), l.slug).not.toContain('자격을 확인해 주세요'); }
  });
});

describe('AC-152·155 고정 바·read', () => {
  it('/pro: PC 안내는 제목 아래(바 안 안내 없음 — 푸터와 겹칠 일이 없다, §37 AC-162)', () => {
    const h = read('dist/pro/index.html');
    expect(h).not.toContain('has-note"');
    expect(h).toMatch(/<\/h1>[\s\S]{0,300}<p class="pc-note small">휴대폰의 토스 앱에서 열려요<\/p>/);
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
  it('홈(§37 AC-161): 마감 임박 5행+전체 보기, 숫자 없는 분류·대상, 캘린더·주별 칩은 /week/로', () => {
    const h = read('dist/index.html');
    expect(h).toContain('마감 임박 전체 보기');
    expect(h).toContain('data-cap="5"');
    expect(h).not.toContain('구독 주소');
    expect((h.match(/href="\/w\/[\d-]+\/"/g) ?? []).length).toBeLessThanOrEqual(1); // 「마감 임박 전체 보기」 행 하나뿐 — 주별 칩은 없다
    expect(text(h.slice(h.indexOf('분류별로 보기'), h.indexOf('주별로 보기 · 캘린더'))).trim()).not.toMatch(/\d/); // 타일·칩에 낡을 수 있는 숫자 없음
    const w = read('dist/week/index.html');
    expect(w).toMatch(/\d{4}년 \d+월 \d+일 ~/);
    expect((w.match(/href="\/w\/[\d-]+\/"/g) ?? []).length).toBeGreaterThan(3);
    expect(w).toMatch(/<summary>구독 주소 직접 복사/);
    expect(w).toContain('/intent/cal/sub/all');
  });
  it('칩: 숫자 없음, 0건 칩 숨김, 0건 안내 버튼 markup', () => {
    const h = read('dist/c/contest/index.html');
    expect(h).toMatch(/data-tag="[^"]+" aria-pressed="false">[^<\d]+<\/a>/);
    expect(h).not.toMatch(/data-chip[^>]*>[^<]*\b0<\/a>/);
    expect(h).toContain('data-empty-filter');
    expect(h).toContain('data-clear');
    expect(h).toContain('data-total-open');
  });
  it('목록(분류·대상·주)에 제목·마감이 같은 행이 없다, 상세 주소는 그대로', () => {
    for (const f of ['dist/c/contest/index.html', 'dist/c/support/index.html', 'dist/t/student/index.html']) {
      const bySlug = new Map(data.listings.map((l: any) => [l.slug, l]));
      const keys = [...read(f).matchAll(/<li data-row-deadline="([^"]+)"[^>]*>\s*<a class="row" href="\/g\/([^"/]+)\/"/g)].map((m) => `${(bySlug.get(m[2]) as any).name.replace(/[\s\p{P}\p{S}]/gu, '').toLowerCase()}|${m[1]}`); // 표시 제목이 아니라 원래 이름 기준
      expect(new Set(keys).size, f).toBe(keys.length);
    }
    const dup = open.filter((l: any) => data.listings.some((x: any) => x !== l && x.deadline === l.deadline && x.name === l.name));
    for (const l of dup.slice(0, 20)) expect(existsSync(`dist/g/${l.slug}/index.html`), l.slug).toBe(true);
  });
});

describe('AC-158 글', () => {
  it('/pro: 한 문장·행 하나·설명 3행 없음, check에 개 단위 없음', () => {
    const h = read('dist/pro/index.html');
    expect(text(h)).toContain('마감 임박 공고를 앱에서도 봐요. 이 사이트의 공고는 계속 무료예요.');
    expect(h).not.toContain('app-fact');
    expect(text(read('dist/check/index.html'))).not.toMatch(/\d개/);
  });
});
