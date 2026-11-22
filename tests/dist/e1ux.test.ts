import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

// SPEC §30 — 11/22 토스 UX 1회차 검수 지적(겹친 감점) 고정: 상세 첫 화면 구성·위계·간격·반응·문구
const slugs = readdirSync('dist/g').filter((s) => existsSync(`dist/g/${s}/index.html`)).sort();
const read = (s: string) => readFileSync(`dist/g/${s}/index.html`, 'utf8');
const css = (h: string) => (h.match(/<style[^>]*>[\s\S]*?<\/style>/g) ?? []).join('\n');
const sample = slugs.filter((_, i) => i % 97 === 0).slice(0, 20);
const aws = process.env.DEPLOY_TARGET === 'aws';

describe('막힘 B — 상세 순서: 자격 원문이 먼저, 홍보·폼은 아래 한 묶음', () => {
  it('자격 → 조항 판독 → 「더 해 볼 수 있어요」 묶음 순서, 판독 요청·구독·Pro·조건 찾기는 묶음 안', () => {
    for (const s of sample) {
      const h = read(s);
      const el = h.indexOf('누가 낼 수 있나요?');
      const clauses = h.indexOf('조항 판독');
      const more = h.indexOf('id="more-h"');
      expect(el, s).toBeGreaterThan(0);
      expect(clauses, s).toBeGreaterThan(el);
      expect(more, s).toBeGreaterThan(clauses);
      for (const marker of ['data-read-entry', 'data-sub-entry', 'href="/pro/?from=g"', 'href="/check/"']) {
        const i = h.indexOf(marker);
        if (i >= 0) expect(i, `${s} ${marker}`).toBeGreaterThan(more);
      }
      // 첫 화면(자격 제목) 앞의 큰 홍보 상자 0 — 마감 카드까지만
      expect(h.slice(0, el)).not.toContain('class="read-entry');
      expect(h.slice(0, el)).not.toContain('다른 공고도 원문 조항을 읽어 드려요');
    }
  });
  it('하단 묶음은 ListRow 행(.row) 3개 이상, 같은 안내문(가격이나 광고…)은 한 곳뿐', () => {
    for (const s of sample) {
      const h = read(s);
      const more = h.slice(h.indexOf('id="more-h"'));
      expect((more.match(/class="row[ "]/g) ?? []).length, s).toBeGreaterThanOrEqual(3);
      expect((h.match(/가격이나 광고 안내는 넣지 않아요/g) ?? []).length, s).toBeLessThanOrEqual(1);
    }
  });
  it('죽은 버튼 0: 「준비 중」 표기·알림 버튼 없음', () => {
    for (const s of sample) { const h = read(s); expect(h, s).not.toContain('마감 알림 받기'); expect(h, s).not.toContain('(준비 중)'); }
  });
  it('원문 확인 당부는 상세에서 한 곳(푸터)이고 「원문 공고 열기」 문구 통일', () => {
    for (const s of sample) {
      const h = read(s);
      expect((h.match(/원문과 다르면 원문이 맞아요/g) ?? []).length, s).toBe(1);
      expect(h, s).not.toContain('공고 원문 열기');
    }
  });
});

describe('겹친 감점 — 위계·간격·반응·고정·조사', () => {
  const h0 = read(sample[0]);
  const c = css(h0);
  it('상단바 고정(sticky)', () => { expect(c).toMatch(/\.top\{[^}]*position:sticky;top:0/); });
  it('호버·눌림 반응: .tile·.row·.item·.btn·.cta·.to-top에 :active, hover는 (hover:hover) 안', () => {
    expect(c).toMatch(/:active/);
    expect(c).toMatch(/@media\(hover:hover\)/);
    for (const k of ['.row', '.item', '.btn', '.cta', '.to-top']) expect(c, k).toContain(`${k}:active`);
  });
  it('간격 4배수: margin·padding·gap에 6·10·14·18px 없음(본문 인라인 style 포함)', () => {
    const bad = /(?:margin|padding|gap)(?:-[a-z]+)?\s*:[^;}]*\b(?:2|6|10|14|18)px/;
    for (const s of sample) {
      const h = read(s);
      expect(css(h), s).not.toMatch(bad);
      expect(h.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, ''), s).not.toMatch(/style="[^"]*\b(?:2|6|10|14|18)px/);
    }
  });
  it('조사: 「공고콕는」 0, 푸터는 「공고콕은」', () => {
    for (const s of sample) { const h = read(s); expect(h, s).not.toContain('공고콕는'); expect(h, s).toContain('공고콕은 공고 안내 페이지예요'); }
  });
  it('맨 위로 버튼은 글자 ↑가 아니라 24px 아이콘', () => {
    expect(h0).toMatch(/<button[^>]*class="to-top"[^>]*>\s*<svg[^>]*width="24"/);
    expect(h0).not.toContain('>↑<');
  });
  it('프로그램 스크롤(스크롤 복원·앵커)이 아니라 사용자 입력 뒤에만 맨 위로를 연다', () => {
    expect(h0).toMatch(/touchmove|wheel|keydown/);
  });
  it('.ics 받은 뒤 안내 한 줄(#cal-note, role=status)', () => {
    const withCal = sample.map(read).find((h) => h.includes('/cal/g/'))!;
    expect(withCal).toContain('id="cal-note"');
    expect(withCal).toMatch(/id="cal-note"[^>]*role="status"/);
    expect(withCal).toContain('캘린더 파일을 받았어요');
  });
  it('3D 이모지 1개(읽는 법 진입 행) — static.toss.im/3d-emojis', () => {
    const l = sample.map(read).find((h) => h.includes('/read/'))!;
    expect(l).toMatch(/<img[^>]*src="https:\/\/static\.toss\.im\/3d-emojis\/u[0-9A-F]+\.png"[^>]*width="40"/);
  });
  if (aws) it('AWS: 판독 요청·구독 입구 문구가 행 안으로(회색 상자 .card 아님)', () => {
    const h = read(sample[0]);
    expect(h).toMatch(/data-read-entry[^>]*class="[^"]*row/);
  });
});

describe('읽는 법 화면 위계(제목 17 > 본문 15 > 보조 13)와 한 화면 한 과업', () => {
  it('h3 17px, .rc-line 15px, 체크 13px, 칸 간격 24px', () => {
    const s = sample.find((x) => existsSync(`dist/g/${x}/read/index.html`))!;
    const c = css(readFileSync(`dist/g/${s}/read/index.html`, 'utf8'));
    expect(c).toMatch(/\.rc-axis h3\{[^}]*font-size:17px/);
    expect(c).toMatch(/\.rc-line\{[^}]*font-size:15px/);
    expect(c).toMatch(/\.rc-check\{[^}]*font-size:13px/);
    expect(c).toMatch(/\.rc-axis\{[^}]*margin:24px 0 0/);
  });
});
