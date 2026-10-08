import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { OPERATOR, PRO_ORIGIN, PRO_PAGES } from '../../src/infrastructure/config.ts';

// §12 Pro 가격 페이지 산출물 — DEPLOY_TARGET=aws 빌드에서만 4장이 있다(AC-25)
const aws = process.env.DEPLOY_TARGET === 'aws';
const walk = (d: string): string[] =>
  readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const html = walk('dist').filter((f) => f.endsWith('.html'));
const proFiles = PRO_PAGES.map((p) => `dist${p}index.html`);
const read = (f: string) => readFileSync(f, 'utf8');

describe('AC-25 배포 대상별 /pro 생성', () => {
  it(aws ? 'AWS 빌드: 4장이 있다' : '기본(Vercel) 빌드: 4장이 없다', () => {
    for (const f of proFiles) expect(existsSync(f), f).toBe(aws);
  });
  it('가격 숫자는 /pro/ 밖 0', () => {
    for (const f of html.filter((f) => f !== 'dist/pro/index.html')) expect(read(f), f).not.toMatch(/19,900|49,000/);
  }, 120_000);
  it('운영자 고지 문자열은 4장 밖 0', () => {
    for (const f of html.filter((f) => !proFiles.includes(f))) {
      const s = read(f);
      expect(s.includes(OPERATOR.bizNo) || s.includes(OPERATOR.mailOrderNo), f).toBe(false);
    }
  }, 120_000);
});

describe.skipIf(!aws)('§12 /pro/ 산출물 (AWS)', () => {
  const pro = aws ? read('dist/pro/index.html') : '';
  it('P2 ≤ 40KB · 외부 요청 0 · Vercel 분석 스크립트 없음 · canonical = AWS', () => {
    expect(statSync('dist/pro/index.html').size).toBeLessThanOrEqual(40 * 1024);
    expect(pro).not.toMatch(/<script[^>]+src="https?:/);
    expect(pro).not.toMatch(/<link[^>]+rel="stylesheet"[^>]+href="https?:/);
    expect(pro).not.toContain('/_vercel/insights');
    expect(pro).toContain(`<link rel="canonical" href="${PRO_ORIGIN}/pro/"`);
    expect(pro).toContain('name="viewport"');
  });
  it('AC-26 가격안 카드 2장(하나만 보이게 숨김) · 첫 요소 = 큰 숫자', () => {
    expect(pro).toMatch(/<section[^>]*data-arm="H1"[^>]*hidden[^>]*>\s*<div class="big[^"]*"[^>]*>월 19,900원<\/div>/);
    expect(pro).toMatch(/<section[^>]*data-arm="H2"[^>]*hidden[^>]*>\s*<div class="big[^"]*"[^>]*>월 49,000원<\/div>/);
  });
  it('스켈레톤·스텝의 hidden 이 display 규칙에 지지 않는다(390 캡처에서 스켈레톤이 남던 회귀)', () => {
    expect(pro).toMatch(/#pro[^{}]*\[hidden\]\{display:none!important\}/);
  });
  it('AC-27 결제 0 고지·대필 아님 고지 · 카드 입력/결제 버튼 0', () => {
    expect(pro).toContain('결제는 오픈 때 · 창립가 고정 · 30일 무조건 환불 · 지금은 돈이 나가지 않아요');
    expect(pro).toContain('계획서는 본인이 씁니다 — 공고콕은 조항 판독·배점 채점·보완 제안만');
    expect(pro).not.toMatch(/결제하기|카드\s*번호|autocomplete="cc-/);
  });
  it('AC-28 입력은 한 화면 한 질문: 이메일 스텝 1 · 체크 2개 스텝 1, 수집 입력은 이메일뿐', () => {
    expect(pro).toMatch(/id="step-email"[\s\S]*type="email"/);
    expect((pro.match(/<input[^>]+type="checkbox"/g) ?? []).length).toBe(2);
    expect((pro.match(/<input[^>]+type="(?:text|email|tel|number)"/g) ?? []).length).toBe(1);
  });
  it('P5 4장 모두 사업자 정보 + 약관·환불·처리방침 링크', () => {
    for (const f of proFiles) {
      const s = read(f);
      for (const v of [OPERATOR.name, OPERATOR.bizNo, OPERATOR.mailOrderNo, OPERATOR.email]) expect(s, `${f} ${v}`).toContain(v);
      for (const h of ['/terms/', '/refund/', '/privacy/']) expect(s, `${f} ${h}`).toContain(`href="${h}"`);
    }
  });
  it('AC-31 처리방침·환불·약관 필수 항목', () => {
    const pv = read('dist/privacy/index.html');
    for (const w of ['이메일', '접속 기록', '2026-11-21', 'Amazon Web Services', '서울', '열람', '삭제']) expect(pv, w).toContain(w);
    const rf = read('dist/refund/index.html');
    for (const w of ['30일', '무조건', '지금은 돈이 나가지 않아요']) expect(rf, w).toContain(w);
    expect(read('dist/terms/index.html')).toContain('계획서는 본인이 씁니다');
  });
  it('AC-25 sitemap엔 4장을 넣지 않는다', () => {
    const xml = read('dist/sitemap.xml');
    for (const p of PRO_PAGES) expect(xml).not.toContain(`${p}</loc>`);
  });
  it('상세 페이지 하단에서 /pro/로 들어가는 입구(AWS 빌드만)', () => {
    const data = JSON.parse(read('data/listings.json'));
    expect(read(`dist/g/${data.listings[0].slug}/index.html`)).toContain('href="/pro/?from=g"');
  });
});

describe.skipIf(!aws)('§14 /pro 첫 화면 v2 (AWS)', async () => {
  const pro = aws ? read('dist/pro/index.html') : '';
  const { CUSTOMER_VOICES } = await import('../../src/infrastructure/proCopy.ts');
  const intro = pro.slice(pro.indexOf('id="step-intro"'), pro.indexOf('id="step-email"'));
  const text = intro.replace(/<style[\s\S]*?<\/style>|<script[\s\S]*?<\/script>/g, '').replace(/<[^>]+>/g, ' ');
  it('AC-39 첫 요소 = 첫 고객 인용 blockquote + 출처·날짜·원문 링크, 나머지 인용도 출처와 함께', () => {
    const firstBlock = intro.match(/<(h1|blockquote|section|p class="sub")[^>]*>/);
    expect(firstBlock?.[1]).toBe('blockquote');
    for (const v of CUSTOMER_VOICES) {
      expect(intro, v.quote).toContain(v.quote);
      expect(intro.includes(`href="${v.url}"`) || intro.includes(`href="${v.url.replaceAll('&', '&amp;')}"`), v.url).toBe(true);
      expect(intro, v.date).toContain(v.date);
      expect(intro, v.where).toContain(v.where);
    }
    expect(intro).toMatch(/<a [^>]*href="https:\/\/kin\.naver\.com[^"]*"[^>]*rel="noopener[^"]*"/);
  });
  it('AC-40 새 헤드라인, 옛 헤드라인 0', () => {
    expect(pro).toMatch(/<h1[^>]*>「받을 수 있다」는 답마다, 근거가 된 공고 원문 문장을 붙여 드려요<\/h1>/);
    expect(pro).not.toContain('계획서 하나로, 낼 수 있는 공고만 골라 그 배점표로 채점해 드려요');
  });
  it('AC-41 과장 낱말 0 · 「찾지 못했어요」 · 협약서·운영지침 경계', () => {
    expect(text).not.toMatch(/모든 공고|100\s*%|완벽|정확히|합격 보장|대신 판단/);
    expect(text).toContain('찾지 못했어요');
    expect(pro).toContain('협약서·운영지침');
  });
  it('AC-42 첫 화면 버튼 = 「창립가로 먼저 신청 · 지금 0원」, 이후 스텝 문구 유지', () => {
    expect(pro).toMatch(/<button[^>]*id="next"[^>]*>창립가로 먼저 신청 · 지금 0원<\/button>/);
    // 스텝 문구 배열(번들은 템플릿 리터럴로 인라인) — 첫 칸도 새 문구, 나머지 유지
    expect(pro).toMatch(/[`"']창립가로 먼저 신청 · 지금 0원[`"'],[`"']다음[`"'],[`"']신청하기[`"'],[`"']공고 둘러보기[`"']/);
  });
});
