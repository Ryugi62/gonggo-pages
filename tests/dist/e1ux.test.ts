import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

// SPEC §30 — 11/22 토스 UX 1회차 검수 지적(겹친 감점) 고정: 상세 첫 화면 구성·위계·간격·반응·문구
const slugs = readdirSync('dist/g').filter((s) => existsSync(`dist/g/${s}/index.html`)).sort();
const read = (s: string) => readFileSync(`dist/g/${s}/index.html`, 'utf8');
const css = (h: string) => (h.match(/<style[^>]*>[\s\S]*?<\/style>/g) ?? []).join('\n');
const sample = slugs.filter((_, i) => i % 97 === 0).slice(0, 20);
const aws = process.env.DEPLOY_TARGET === 'aws';

describe('막힘 B — 상세엔 홍보·폼이 없고, 부가 도구는 읽는 법 화면 맨 아래 한 묶음(SPEC §32)', () => {
  const rs = slugs.filter((x) => existsSync(`dist/g/${x}/read/index.html`));
  const rsample = rs.filter((_, i) => i % 97 === 0).slice(0, 20);
  it('상세: 자격 원문 뒤에 판독 요청·구독·Pro·조건 찾기 없음', () => {
    for (const s of sample) {
      const h = read(s);
      expect(h.indexOf('누가 낼 수 있나요?'), s).toBeGreaterThan(0);
      for (const marker of ['data-read-entry', 'data-sub-entry', 'href="/pro/?from=g"', 'class="row" href="/check/"', 'id="more-h"']) expect(h, `${s} ${marker}`).not.toContain(marker);
    }
  });
  it('읽는 법 화면: 4칸 → 「더 해 볼 수 있어요」 묶음, ListRow 행(.row) ≥ 2(AWS ≥ 4), 같은 안내문은 한 곳', () => {
    for (const s of rsample) {
      const h = readFileSync(`dist/g/${s}/read/index.html`, 'utf8');
      const more = h.slice(h.indexOf('id="more-h"'));
      expect(h.indexOf('id="more-h"'), s).toBeGreaterThan(h.indexOf('class="rc-row"'));
      expect((more.match(/class="row[ "]/g) ?? []).length, s).toBeGreaterThanOrEqual(aws ? 3 : 1) // SPEC §33: Pro 행 폐지로 4→3;
      expect((h.match(/가격이나 광고 안내는 넣지 않아요/g) ?? []).length, s).toBeLessThanOrEqual(1);
      for (const marker of ['data-read-entry', 'data-sub-entry', 'href="/pro/?from=g"']) { const i = h.indexOf(marker); if (i >= 0) expect(i, `${s} ${marker}`).toBeGreaterThan(h.indexOf('id="more-h"')); }
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
    expect(c).toMatch(/@media\s*\(hover:hover\)/);
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
  it('.ics 받은 뒤 안내 한 줄(#cal-note, role=status) — 읽는 법 화면 묶음', () => {
    const withCal = slugs.filter((x) => existsSync(`dist/g/${x}/read/index.html`)).slice(0, 400).map((x) => readFileSync(`dist/g/${x}/read/index.html`, 'utf8')).find((h) => h.includes('/cal/g/'))!;
    expect(withCal).toContain('id="cal-note"');
    expect(withCal).toMatch(/id="cal-note"[^>]*role="status"/);
    expect(withCal).toContain('캘린더 파일을 받았어요');
  });
  it('3D 이모지 1개 — 읽는 법 화면 머리(static.toss.im/3d-emojis)', () => {
    const h = readFileSync(`dist/g/${slugs.find((x) => existsSync(`dist/g/${x}/read/index.html`))}/read/index.html`, 'utf8');
    expect((h.match(/static\.toss\.im\/3d-emojis/g) ?? []).length).toBe(1);
    expect(h).toMatch(/<img[^>]*src="https:\/\/static\.toss\.im\/3d-emojis\/u[0-9A-F]+\.png"[^>]*width="40"/);
  });
  if (aws) it('AWS: 판독 요청·구독 입구 문구가 행 안으로(회색 상자 .card 아님)', () => {
    const h = readFileSync(`dist/g/${slugs.find((x) => existsSync(`dist/g/${x}/read/index.html`))}/read/index.html`, 'utf8');
    expect(h).toMatch(/<section class="read-entry row-entry"/);
  });
});

describe('읽는 법 화면 위계(제목 17 > 본문 15 > 보조 13)와 한 화면 한 과업', () => {
  it('.rc-row h3 17px, .rc-line·.rc-fact 15px, .rc-small 13px(3단)', () => {
    const s = sample.find((x) => existsSync(`dist/g/${x}/read/index.html`)) ?? slugs.find((x) => existsSync(`dist/g/${x}/read/index.html`))!;
    const c = css(readFileSync(`dist/g/${s}/read/index.html`, 'utf8'));
    expect(c).toMatch(/\.rc-row h3\{[^}]*font-size:17px/);
    expect(c).toMatch(/\.rc-line\{[^}]*font-size:15px/);
    expect(c).toMatch(/\.rc-small\{[^}]*font-size:13px/);
    expect(c).toMatch(/\.rc\{[^}]*margin-top:24px/);
  });
});
