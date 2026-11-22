import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { isOpen, quoteDeadlineTime } from '../../src/domain/freshness.ts';

// SPEC §31 — 11/22 2회차 검수(r1 61·r2 58·r3 57, 3/3 겹침) 고정: 마감 흐름·상세 정리·돌아가기·시각·동의 문구
const file = JSON.parse(readFileSync('data/listings.json', 'utf8')) as { generatedAt: string; listings: any[] };
const T = file.generatedAt;
const by = new Map(file.listings.map((l) => [l.slug, l]));
const html = (s: string) => readFileSync(`dist/g/${s}/index.html`, 'utf8');
const body = (h: string) => h.slice(h.indexOf('<body')).replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
const slugs = readdirSync('dist/g').filter((s) => existsSync(`dist/g/${s}/index.html`)).sort();
const closed = slugs.filter((s) => by.get(s)?.deadline && by.get(s).deadline < T);
const open = slugs.filter((s) => by.get(s) && isOpen(by.get(s), T));
const pick = (a: string[], n: number) => a.filter((_, i) => i % Math.max(1, Math.floor(a.length / n)) === 0).slice(0, n);

describe('데이터 — dist 상세가 병합 목록 전부(소멸 0)이고 정리 기준일이 오늘', () => {
  it('상세 페이지 수 = 목록 수, 기준일 = generatedAt', () => {
    expect(slugs.length).toBe(file.listings.length);
    expect(T > '2026-11-19').toBe(true);
    expect(html(slugs[0])).toContain(`정리 기준일 ${T}`);
  });
  it('목록·sitemap·llms는 열린 공고만 센다(마감 공고는 sitemap에 URL만)', () => {
    const idx = readFileSync('dist/index.html', 'utf8');
    expect(idx).not.toContain('11월 2일(월) 마감');
    const sm = readFileSync('dist/sitemap.xml', 'utf8');
    expect((sm.match(/<loc>[^<]*\/g\/[^<]*<\/loc>/g) ?? []).length).toBe(file.listings.length);
  });
});

describe('막힘 ① 마감 공고 — 막다른 길 없음', () => {
  it('마감 상세는 전수 「마감됐어요」 + 열린 비슷한 공고 3건(전부 열림)', () => {
    expect(closed.length).toBeGreaterThan(500);
    for (const s of closed) {
      const h = html(s);
      expect(h, s).toContain('마감됐어요');
      const sec = h.slice(h.indexOf('id="rel-h"'));
      const rows = [...sec.slice(0, sec.indexOf('</ul>') > 0 ? sec.indexOf('</ul>') : 3000).matchAll(/href="\/g\/([^/"]+)\/"/g)].map((m) => m[1]);
      expect(rows.length, s).toBe(3);
      for (const r of rows) expect(isOpen(by.get(r), T), `${s} → ${r}`).toBe(true);
    }
  });
  it('마감 상세: 하단 고정 버튼 「지금 낼 수 있는 공고 보기」, 캘린더·3일 전 알림·원문 CTA 없음', () => {
    for (const s of pick(closed, 40)) {
      const h = html(s);
      const bar = h.slice(h.indexOf('class="cta-bar"'), h.indexOf('class="cta-bar"') + 400);
      expect(bar, s).toContain('지금 낼 수 있는 공고 보기');
      expect(bar, s).toMatch(/href="\/(c\/[^"]*\/)?"/);
      expect(bar, s).not.toContain('원문 공고 보기');
      expect(h, s).not.toContain('/cal/g/');
      expect(h, s).not.toContain('id="cal-note"');
      expect(h, s).not.toContain('마감 3일 전');
      expect(h, s).not.toContain('내 캘린더에 마감 넣기');
    }
  });
  it('마감 상세: 비슷한 공고가 읽는 법 행·조항 판독보다 위(첫 화면)', () => {
    for (const s of pick(closed, 40)) {
      const h = html(s);
      const rel = h.indexOf('id="rel-h"');
      expect(rel, s).toBeGreaterThan(0);
      if (h.includes('/read/')) expect(h.indexOf('aria-label="공고 읽는 법"'), s).toBeGreaterThan(rel);
      expect(h.indexOf('id="clauses-h"'), s).toBeGreaterThan(rel);
    }
  });
  it('열린 상세: 주 버튼은 원문 공고 보기, 비슷한 공고는 열린 것만', () => {
    for (const s of pick(open, 40)) {
      const h = html(s);
      expect(h.slice(h.indexOf('class="cta-bar"'), h.indexOf('class="cta-bar"') + 400), s).toContain('원문 공고 보기');
      const sec = h.slice(h.indexOf('id="rel-h"'));
      const rows = [...sec.slice(0, sec.indexOf('</ul>')).matchAll(/href="\/g\/([^/"]+)\/"/g)].map((m) => m[1]);
      for (const r of rows) expect(isOpen(by.get(r), T), `${s} → ${r}`).toBe(true);
    }
  });
});

describe('막힘 ② 상세 정리 — 중복 제거·회색 상자·행', () => {
  const sample = pick(slugs, 60);
  it('「한눈에 보기」 섹션 없음, 회색 카드(.card) 없음, 비슷한 공고는 .row 목록(.item 카드 아님)', () => {
    for (const s of sample) {
      const b = body(html(s));
      expect(b, s).not.toContain('한눈에 보기');
      expect(b, s).not.toContain('class="card"');
      const sec = b.slice(b.indexOf('id="rel-h"'), b.indexOf('id="rel-h"') + 3000);
      expect(sec, s).not.toContain('class="item"');
      expect(sec, s).toContain('class="bd');
    }
  });
  it('같은 문구 반복 없음: AI 규정·「그대로 옮겼어요」 ≤1, 자격 인용을 조항에서 되풀이하지 않음', () => {
    for (const s of sample) {
      const b = body(html(s));
      expect((b.match(/AI 사용 규정을 찾지 못했/g) ?? []).length, s).toBeLessThanOrEqual(1);
      expect((b.match(/그대로 옮겼어요/g) ?? []).length, s).toBeLessThanOrEqual(1);
      const l = by.get(s);
      if (l.eligibilityQuote) {
        const q = l.eligibilityQuote.replace(/…$/, '').slice(0, 40);
        expect(b.split(q).length - 1, s).toBeLessThanOrEqual(1); // 본문에 자격 원문은 한 번
      }
    }
  });
  it('제목을 되풀이하는 리드 문장 없음, 상세 첫 화면 순서: 제목 → 마감 → 자격 → 읽는 법', () => {
    for (const s of pick(open.filter((x) => html(x).includes('/read/')), 40)) {
      const h = body(html(s));
      expect(h, s).not.toContain('class="lead"');
      const i = [h.indexOf('<h1'), h.indexOf('class="hero-d"'), h.indexOf('누가 낼 수 있나요?'), h.indexOf('aria-label="공고 읽는 법"')];
      expect([...i].sort((a, b) => a - b), s).toEqual(i);
    }
  });
  it('캘린더 두 링크는 마감 요약 안(텍스트 링크 44px), 열린 공고에만', () => {
    const s = open.find((x) => html(x).includes('/cal/g/'))!;
    const h = body(html(s));
    expect(h.indexOf('/cal/g/')).toBeLessThan(h.indexOf('누가 낼 수 있나요?'));
    expect(h).toContain('class="tl"');
    expect(h).toContain('id="cal-note"');
  });
  it('「더 해 볼 수 있어요」 묶음 + 설명 열기는 셰브런 행', () => {
    const h = html(pick(open, 5)[0]);
    expect(h).toMatch(/<summary>[^<]*<svg class="go"/);
  });
});

describe('막힘 ③ 읽는 법 화면 — 돌아가기·공고별 한 줄', () => {
  const rs = slugs.filter((s) => existsSync(`dist/g/${s}/read/index.html`));
  it('돌아가기는 history.back(상세에서 온 경우), 직접 진입은 링크', () => {
    for (const s of pick(rs, 20)) {
      const h = readFileSync(`dist/g/${s}/read/index.html`, 'utf8');
      expect(h, s).toContain('data-back');
      expect(h, s).toContain('history.back()');
      expect(h, s).toContain(`href="/g/${s}/"`);
    }
  });
  it('4칸 모두 「이 공고」 한 줄, 체크 아이콘 없음, 「이 공고 한눈에」 섹션 없음', () => {
    for (const s of pick(rs, 40)) {
      const h = readFileSync(`dist/g/${s}/read/index.html`, 'utf8');
      expect((h.match(/class="rc-fact"/g) ?? []).length, s).toBe(4);
      expect(h, s).not.toContain('ck-ic');
      expect(h, s).not.toContain('이 공고 한눈에');
    }
  });
});

describe('마감 시각 — 원문 인용과 대조', () => {
  it('인용에 마감일 뒤 시각이 있으면 화면 시각이 그것(전수), 상단 23:59 불일치 0', () => {
    let n = 0;
    for (const s of slugs) {
      const l = by.get(s);
      const t = l.deadline ? quoteDeadlineTime(l.eligibilityQuote, l.deadline) : null;
      if (!t) continue;
      n++;
      const h = body(html(s));
      expect(h, s).toMatch(new RegExp(`class="hd-t"><b>[^<]*${t}`));
      expect(l.deadlineTime, s).toBe(t);
    }
    expect(n).toBeGreaterThan(0);
  });
});

describe('문구 — 해요체·상대 표현', () => {
  it('상단 「내가 낼 수 있나요?」(반말 없음)', () => {
    const h = html(slugs[0]);
    expect(h).toContain('내가 낼 수 있나요?');
    expect(h).not.toContain('내가 낼 수 있나?');
  });
  it('동의 문구에 지난 날짜(2026-11-21) 없음 — 상대 표현', () => {
    const files = ['pro/index.html', 'privacy/index.html', `g/${open[0]}/index.html`].filter((f) => existsSync(`dist/${f}`));
    for (const f of files) expect(readFileSync(`dist/${f}`, 'utf8'), f).not.toContain('2026-11-21');
    if (process.env.DEPLOY_TARGET === 'aws') expect(readFileSync(`dist/g/${open[0]}/index.html`, 'utf8')).toMatch(/받은 날부터 30일|30일 뒤에 지워요/);
  });
});
