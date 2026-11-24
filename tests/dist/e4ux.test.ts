import { describe, it, expect } from 'vitest';
import { buildDay } from '../../src/infrastructure/config.ts';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { findInternalJudgement } from '../../src/domain/privacy.ts';
import { isAudition } from '../../src/domain/topic.ts';

// SPEC §32 — 토스 UX 3회차 kill(평균 69.7 < 75) 발동: 상세 전면 교체(r1 대안) · 읽는 법 화면 · 목록 첫 화면 · 내부 메모 0
const file = JSON.parse(readFileSync('data/listings.json', 'utf8')) as { generatedAt: string; listings: any[] };
const today = buildDay(); // SPEC §34
const all = file.listings;
const read = (p: string) => readFileSync(p, 'utf8');
const detail = (s: string) => read(`dist/g/${s}/index.html`);
const readPage = (s: string) => read(`dist/g/${s}/read/index.html`);
const strip = (h: string) => h.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '');
const text = (h: string) => strip(h).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const closed = all.filter((l) => l.deadline && l.deadline < today);
const open = all.filter((l) => l.rolling || (l.deadline && l.deadline >= today));
const withRead = open.filter((l) => l.category !== '장학' && !isAudition(l));
const pick = <T,>(a: T[], n: number) => a.filter((_, i) => i % Math.max(1, Math.floor(a.length / n)) === 0).slice(0, n);
const aws = process.env.DEPLOY_TARGET === 'aws';

describe('공개 안전 — dist 전수(3,062 상세 + 읽는 법)에 자격·조항 인용의 내부 판단 낱말 0', () => {
  it('상세 전수: 자격 인용 칸(blockquote)·조항 인용(q)에 내부 낱말 0, 「분석 결과 & 제안」 0', () => {
    let bad: string[] = [];
    for (const l of all) {
      const h = detail(l.slug);
      const quotes = [...(h.match(/<blockquote[\s\S]*?<\/blockquote>/g) ?? []), ...(h.match(/<q>[\s\S]*?<\/q>/g) ?? [])].join(' ');
      if (findInternalJudgement(quotes).length || /과거 수상작 분석/.test(h)) bad.push(l.slug);
    }
    expect(bad).toEqual([]);
  });
  it('자격 원문이 없는 공고는 「그대로 옮겼어요」 표기가 없다(거짓 표시 0)', () => {
    for (const l of all.filter((x) => !x.eligibilityQuote).slice(0, 200)) expect(detail(l.slug), l.slug).not.toContain('그대로 옮겼어요');
  });
});

describe('상세 = 제목 · 마감 배지 1개 · 자격 원문 · 하단 CTA 1개 · 읽는 법 행 1개 · 비슷한 공고', () => {
  const sample = [...pick(closed, 12), ...pick(open, 12)];
  it('판독 요청·구독·Pro·조건 찾기·캘린더·「더 해 볼 수 있어요」는 상세에 없다(토스 문 1개는 SPEC §33으로 oneDoor 시험)', () => {
    for (const l of sample) {
      const h = detail(l.slug);
      for (const m of ['id="more-h"', 'data-read-entry', 'data-sub-entry', '/pro/?from=g', 'href="/check/"', '구글 캘린더에 넣기', 'id="cal-note"', '더 해 볼 수 있어요']) {
        // 상단바의 「내가 낼 수 있나요?」 /check/ 링크 1개는 사이트 공통 메뉴
        if (m === 'href="/check/"') { expect((h.match(/href="\/check\/"/g) ?? []).length, `${l.slug} ${m}`).toBeLessThanOrEqual(1); continue; }
        expect(h, `${l.slug} ${m}`).not.toContain(m);
      }
    }
  });
  it('마감 배지는 상세에 1개(마감됐어요 문구는 본문에 1번)', () => {
    for (const l of pick(closed, 20)) {
      const t = text(detail(l.slug));
      expect((t.match(/마감됐어요/g) ?? []).length, l.slug).toBe(1);
      expect((detail(l.slug).match(/class="bd lg/g) ?? []).length, l.slug).toBe(1);
    }
  });
  it('하단 고정 버튼 1개: 열림 = 원문 공고 보기, 마감 = 지금 낼 수 있는 공고 보기', () => {
    for (const l of pick(open, 10)) { const h = detail(l.slug); expect((h.match(/class="cta"/g) ?? []).length).toBe(1); expect(h).toMatch(/class="cta"[^>]*>원문 공고 보기</); }
    for (const l of pick(closed, 10)) { const h = detail(l.slug); expect((h.match(/class="cta"/g) ?? []).length).toBe(1); expect(h).toMatch(/class="cta"[^>]*>지금 낼 수 있는 공고 보기</); }
  });
  it('읽는 법 행: 읽는 법 화면이 있는 공고에만 1개, 오디션·장학엔 0(행도 화면도)', () => {
    for (const l of pick(withRead, 20)) {
      expect((detail(l.slug).match(new RegExp(`href="/g/${l.slug}/read/"`, 'g')) ?? []).length, l.slug).toBe(1);
      expect(existsSync(`dist/g/${l.slug}/read/index.html`), l.slug).toBe(true);
    }
    const aud = all.filter((l) => isAudition(l));
    expect(aud.length).toBeGreaterThan(20);
    for (const l of aud) { expect(detail(l.slug), l.slug).not.toContain('/read/'); expect(existsSync(`dist/g/${l.slug}/read`), l.slug).toBe(false); }
  });
  it('URL·제목·자격 본문·구조화 데이터 유지(소멸 0)', () => {
    for (const l of pick(all, 40)) {
      const h = detail(l.slug);
      expect(h, l.slug).toContain(`<h1>${l.name.replace(/&/g, '&#38;')}`.slice(0, 8));
      expect(h, l.slug).toContain('application/ld+json');
      expect(h, l.slug).toContain('FAQPage');
      if (l.eligibilityQuote) expect(h, l.slug).toContain('<blockquote');
    }
    expect(readdirSync('dist/g').filter((s) => existsSync(`dist/g/${s}/index.html`)).length).toBe(all.length);
  });
  it('마감 상세의 비슷한 공고는 열린 공고 3건, 열린 상세는 5건 — 모두 열린 공고', () => {
    const openSlugs = new Set(open.map((l) => l.slug));
    for (const l of pick(closed, 15)) {
      const links = [...detail(l.slug).matchAll(/class="row" href="\/g\/([^/]+)\/"/g)].map((m) => m[1]);
      expect(links.length, l.slug).toBe(3);
      for (const s of links) expect(openSlugs.has(s), `${l.slug}→${s}`).toBe(true);
    }
  });
});

describe('읽는 법 화면 — 마감 표시·빈칸 0·칸별 행·글자 3단·부가 도구 한 묶음', () => {
  const cl = pick(withRead.length ? all.filter((l) => l.category !== '장학' && !isAudition(l) && l.deadline && l.deadline < today) : [], 8);
  const op = pick(withRead, 10);
  it('마감 공고: 맨 위 「마감됐어요」 1번 + 열린 비슷한 공고 링크 3개, 준비 권유 문장 없음', () => {
    expect(cl.length).toBeGreaterThan(0);
    for (const l of cl) {
      const h = readPage(l.slug);
      const t = text(h);
      expect((t.match(/마감됐어요/g) ?? []).length, l.slug).toBe(1);
      expect(t.indexOf('마감됐어요'), l.slug).toBeLessThan(t.indexOf('니즈'));
      expect((h.match(/class="row" href="\/g\/[^"]+\/"/g) ?? []).length, l.slug).toBe(3);
      expect(t, l.slug).not.toMatch(/마감은 .{1,12}이에요/);
    }
  });
  it('빈칸 문구(원문에서 확인해 주세요) 0, 글머리 점(.dot-ic) 0', () => {
    for (const l of [...cl, ...op]) { const h = readPage(l.slug); expect(text(h), l.slug).not.toContain('원문에서 확인해 주세요'); expect(h, l.slug).not.toContain('dot-ic'); expect(h, l.slug).not.toContain('4칸으로 훑어봐요'); }
  });
  it('칸별 목록 행(구분선 .rc-row) 4개, 같은 글머리 12줄 목록 아님(li.rc-check 0)', () => {
    for (const l of op) { const h = readPage(l.slug); expect((h.match(/class="rc-row"/g) ?? []).length, l.slug).toBe(4); expect(h, l.slug).not.toContain('rc-check'); }
  });
  it('글자 위계 3단: 칸 제목 17 · 본문 15 · 보조 13 외 크기 없음(.rc-*)', () => {
    const css = (read(`dist/g/${op[0].slug}/read/index.html`).match(/<style[^>]*>[\s\S]*?<\/style>/g) ?? []).join('\n');
    const sizes = new Set([...css.matchAll(/\.rc-[a-z-]+[^{]*\{[^}]*font-size:(\d+)px/g)].map((m) => m[1]));
    expect([...sizes].sort()).toEqual(['13', '15', '17']);
  });
  it('부가 도구(조건 찾기·토스)는 맨 아래 「더 해 볼 수 있어요」 한 묶음 — 4칸 뒤', () => {
    for (const l of op) {
      const h = readPage(l.slug);
      const more = h.indexOf('id="more-h"');
      expect(more, l.slug).toBeGreaterThan(h.indexOf('class="rc-row"'));
      for (const m of ['class="row" href="/check/"', ...(aws ? ['href="/pro/?from=g"'] : []), '/cal/g/']) { const i = h.indexOf(m); if (i >= 0) expect(i, `${l.slug} ${m}`).toBeGreaterThan(more); }
    }
  });
  it('토스 링크는 화면에 정확히 1개(열림=하단 버튼, 마감=묶음 행)', () => {
    for (const l of [...cl, ...op]) expect((readPage(l.slug).match(/href="https:\/\/minion\.toss\.im\/L5iKJAEk"/g) ?? []).length, l.slug).toBe(1);
  });
  it('「맨 위로」가 행을 가리지 않게 — 버튼이 보일 때 행 오른쪽 여백이 늘어난다(CSS 규칙 존재)', () => {
    expect((readPage(op[0].slug).match(/<style[^>]*>[\s\S]*?<\/style>/g) ?? []).join('\n')).toMatch(/tt-on[^{]*\.row[^{]*\{[^}]*padding-right/);
  });
});

describe('/c/<분류>/ 목록 첫 화면 — 결과가 먼저', () => {
  const h = read('dist/c/contest/index.html');
  const body = strip(h);
  const firstRow = body.indexOf('class="row"');
  it('첫 결과 행 앞에 회색 상자(.card·.tile)·캘린더 구독이 없다, 건수는 머리 한 줄', () => {
    expect(firstRow).toBeGreaterThan(0);
    const before = body.slice(0, firstRow);
    expect(before).not.toContain('class="card"');
    expect(before).not.toContain('class="tile"');
    expect(before).not.toContain('캘린더');
    expect(before).toMatch(/\d+건/);
  });
  it('결과 ≥3건이 Pro·캘린더 상자보다 앞', () => {
    const rows = [...body.matchAll(/class="row"/g)].map((m) => m.index!);
    expect(rows.length).toBeGreaterThan(100);
    const tile = body.indexOf('class="tile"');
    if (tile >= 0) expect(rows[2]).toBeLessThan(tile);
    const cal = body.indexOf('캘린더');
    if (cal >= 0) expect(rows[2]).toBeLessThan(cal);
  });
  it('목록 행은 구분선 행 + D-day 배지(상세의 비슷한 공고와 같은 모양)', () => {
    expect(body).toMatch(/class="row" href="\/g\/[^"]+\/">\s*<span class="bd[^"]*"/);
    expect(body).not.toContain('class="item"');
  });
});
