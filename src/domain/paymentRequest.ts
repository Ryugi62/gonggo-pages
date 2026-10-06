import type { PriceArm } from './pricing.ts';

// 결제 요청 — 돈이 오가지 않는 「창립가로 결제하겠다」 의사 표시(SPEC §12 P6).
// 수집 = 이메일 1개 + 가격안 + 체크 2개(창립가 결제 의사 · 개인정보 수집·이용 동의)뿐.
export interface PaymentRequest {
  email: string;
  arm: PriceArm;
  pledge: boolean;
  consent: boolean;
}

export type PaymentRequestField = 'email' | 'arm' | 'pledge' | 'consent' | 'extra';
const ALLOWED = new Set(['email', 'arm', 'pledge', 'consent']);
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[A-Za-z]{2,}$/;

export function validatePaymentRequest(r: PaymentRequest): { ok: boolean; errors: PaymentRequestField[] } {
  const errors: PaymentRequestField[] = [];
  if (Object.keys(r).some((k) => !ALLOWED.has(k))) errors.push('extra');
  if (typeof r.email !== 'string' || !EMAIL.test(r.email)) errors.push('email');
  if (r.arm !== 'H1' && r.arm !== 'H2') errors.push('arm');
  if (r.pledge !== true) errors.push('pledge');
  if (r.consent !== true) errors.push('consent');
  return { ok: errors.length === 0, errors };
}
