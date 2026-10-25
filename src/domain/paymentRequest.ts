import type { PriceArm } from './pricing.ts';

// 결제 요청 — 돈이 오가지 않는 「창립가로 결제하겠다」 의사 표시(SPEC §12 P6).
// 수집 = 이메일 1개 + 가격안 + 체크 2개(창립가 결제 의사 · 개인정보 수집·이용 동의)뿐.
export interface PaymentRequest {
  email: string;
  arm: PriceArm;
  pledge: boolean;
  consent: boolean;
  /** 가장 필요한 기능 1개(10/26 사전 신청 — 수요 신호 분류용). 옛 신청에는 없을 수 있다. */
  need?: ProNeed;
}

export const PRO_NEEDS = {
  filter: '낼 수 있는 공고만 골라 주기',
  clause: '공고 원문 조항 판독(AI 사용·중복 수혜·서약)',
  score: '내 계획서를 배점표로 채점',
  fix: '공고 양식별 보완안',
} as const;
export type ProNeed = keyof typeof PRO_NEEDS;


const ALLOWED = new Set(['email', 'arm', 'pledge', 'consent', 'need']);
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,255}\.[A-Za-z]{2,}$/;

export function validatePaymentRequest(r: PaymentRequest): { ok: boolean; errors: PaymentRequestField[] } {
  const errors: PaymentRequestField[] = [];
  if (Object.keys(r).some((k) => !ALLOWED.has(k))) errors.push('extra');
  if (typeof r.email !== 'string' || !EMAIL.test(r.email)) errors.push('email');
  if (r.arm !== 'H1' && r.arm !== 'H2') errors.push('arm');
  if (r.pledge !== true) errors.push('pledge');
  if (r.consent !== true) errors.push('consent');
  if (r.need !== undefined && !(typeof r.need === 'string' && Object.hasOwn(PRO_NEEDS, r.need))) errors.push('need');
  return { ok: errors.length === 0, errors };
}
