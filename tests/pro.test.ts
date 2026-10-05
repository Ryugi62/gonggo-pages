import { describe, it, expect } from 'vitest';
import { assignArm, PRICE_ARMS } from '../src/domain/pricing.ts';
import { validatePaymentRequest } from '../src/domain/paymentRequest.ts';
import { funnelPath } from '../src/application/funnel.ts';

describe('Pro §5-4 가격 배정 고정', () => {
  it('가격안 = H1 19,900 · H2 49,000', () => {
    expect(PRICE_ARMS).toEqual({ H1: 19900, H2: 49000 });
  });
  it('같은 방문자 키 → 같은 가격안', () => {
    expect(assignArm('visitor-abc')).toBe(assignArm('visitor-abc'));
  });
  it('1만 개 무작위 키에서 H1 비율 48~52%', () => {
    let seed = 42;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31).toString(36).slice(2);
    let h1 = 0;
    for (let i = 0; i < 10000; i++) if (assignArm(`${rnd()}-${i}`) === 'H1') h1++;
    expect(h1 / 10000).toBeGreaterThanOrEqual(0.48);
    expect(h1 / 10000).toBeLessThanOrEqual(0.52);
  });
});

describe('Pro §5-5 퍼널 사건 경로', () => {
  it('보기·가격 클릭·결제 요청 → /intent/pro/<event>/<arm>', () => {
    expect(funnelPath('VIEW', 'H1')).toBe('/intent/pro/view/H1');
    expect(funnelPath('PRICE', 'H2')).toBe('/intent/pro/price/H2');
    expect(funnelPath('REQUEST', 'H1')).toBe('/intent/pro/request/H1');
  });
  it('입력값(이메일)은 경로에 들어갈 자리가 없다 — 쿼리·추가 세그먼트 없음', () => {
    for (const e of ['VIEW', 'PRICE', 'REQUEST'] as const) expect(funnelPath(e, 'H1')).toMatch(/^\/intent\/pro\/[a-z]+\/H[12]$/);
  });
});

describe('Pro 결제 요청(돈 0) 검증', () => {
  const ok = { email: 'a.b@example.co.kr', arm: 'H1' as const, pledge: true };
  it('이메일 형식·가격안·창립가 체크가 맞으면 통과', () => {
    expect(validatePaymentRequest(ok)).toEqual({ ok: true, errors: [] });
  });
  it('형식 오류는 항목별로 돌려준다', () => {
    expect(validatePaymentRequest({ ...ok, email: 'nope' }).errors).toEqual(['email']);
    expect(validatePaymentRequest({ ...ok, pledge: false }).errors).toEqual(['pledge']);
    expect(validatePaymentRequest({ ...ok, arm: 'H3' as any }).errors).toEqual(['arm']);
  });
  it('허용 밖 필드(이름·전화 등)는 받지 않는다', () => {
    expect(validatePaymentRequest({ ...ok, phone: '010-0000-0000' } as any).errors).toEqual(['extra']);
  });
});
