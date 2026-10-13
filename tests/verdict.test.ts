import { describe, it, expect } from 'vitest';
import { verdict } from '../src/application/verdict.ts';

// SPEC §18 AC-65 — 14일 검증 판정(검증설계 §4 숫자 컷). 인자 = /pro 사람 방문·가격 클릭·결제 요청.
const c = (view: number, price: number, request: number) => ({ view, price, request });
describe('AC-65 verdict', () => {
  it('방문 <100이면 보류(트래픽 부족 ≠ 수요 부재)', () => {
    expect(verdict(c(60, 10, 3), '2026-10-21').label).toBe('보류');
  });
  it('방문 <100이고 D45(11/21) 이후면 채널 실패(채널 교체 결정)', () => {
    expect(verdict(c(60, 10, 3), '2026-11-21').label).toBe('채널 실패');
  });
  it('방문 ≥100 ∧ 요청 ≥3 ∧ 가격 클릭 ≥8% ∧ 요청률 ≥2%면 GO', () => {
    expect(verdict(c(100, 8, 3), '2026-10-21').label).toBe('GO');
  });
  it('경계: 가격 클릭 7%면 GO가 아니다', () => {
    expect(verdict(c(100, 7, 3), '2026-10-21').label).not.toBe('GO');
  });
  it('요청 1~2건은 보류', () => {
    expect(verdict(c(150, 20, 2), '2026-10-21').label).toBe('보류');
  });
  it('방문 ≥300인데 요청 0은 NO-GO', () => {
    expect(verdict(c(300, 5, 0), '2026-10-21').label).toBe('NO-GO');
  });
  it('이유 한 줄이 숫자를 담는다', () => {
    expect(verdict(c(100, 8, 3), '2026-10-21').line).toContain('가격 클릭 8.0%');
  });
});
