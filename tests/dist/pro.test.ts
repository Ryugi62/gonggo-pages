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

// SPEC §33 AC-130 — /pro/는 앱 안내 + 문 1개. 옛 가격·사전 신청·비교표 시험(AC-26~28·39~42·86·93·52)은 사용자 승인(11/24 16:08)으로 폐지, 가격 없음 시험은 oneDoor.test.ts
describe.skipIf(!aws)('§33 /pro/ 산출물 (AWS)', () => {
  const pro = aws ? read('dist/pro/index.html') : '';
  it('≤ 40KB · 외부 스크립트 0 · canonical = AWS', () => {
    expect(statSync('dist/pro/index.html').size).toBeLessThanOrEqual(40 * 1024);
    expect(pro).not.toMatch(/<script[^>]+src="https?:/);
    expect(pro).toContain(`<link rel="canonical" href="${PRO_ORIGIN}/pro/"`);
    expect(pro).toContain('name="viewport"');
  });
  it('P5 4장 모두 사업자 정보 + 약관·환불·처리방침 링크', () => {
    for (const f of proFiles) {
      const s = read(f);
      for (const v of [OPERATOR.name, OPERATOR.bizNo, OPERATOR.mailOrderNo, OPERATOR.email]) expect(s, `${f} ${v}`).toContain(v);
      for (const h of ['/terms/', '/refund/', '/privacy/']) expect(s, `${f} ${h}`).toContain(`href="${h}"`);
    }
  });
  it('AC-31 처리방침·환불·약관 필수 항목(내용 그대로)', () => {
    const pv = read('dist/privacy/index.html');
    for (const w of ['이메일', '접속 기록', '받은 날부터 30일', 'Amazon Web Services', '서울', '열람', '삭제']) expect(pv, w).toContain(w);
    const rf = read('dist/refund/index.html');
    for (const w of ['30일', '무조건', '지금은 돈이 나가지 않아요']) expect(rf, w).toContain(w);
  });
  it('AC-25 sitemap엔 4장을 넣지 않는다', () => {
    const xml = read('dist/sitemap.xml');
    for (const p of PRO_PAGES) expect(xml).not.toContain(`${p}</loc>`);
  });
});
