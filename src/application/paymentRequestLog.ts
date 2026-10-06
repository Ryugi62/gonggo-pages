import type { PriceArm } from '../domain/pricing.ts';
import { validatePaymentRequest, type PaymentRequest } from '../domain/paymentRequest.ts';

// UC: 결제 요청 저장 파일(nginx escape=json 로그, 줄마다 {"t","body"}) → 검증 통과 요청 목록(SPEC §12 AC-29).
export interface StoredPaymentRequest {
  t: string;
  email: string;
  arm: PriceArm;
}

export function parsePaymentRequestLog(text: string): { valid: StoredPaymentRequest[]; rejected: number; byArm: Record<PriceArm, number> } {
  const byEmail = new Map<string, StoredPaymentRequest>();
  let rejected = 0;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    try {
      const outer = JSON.parse(line) as { t?: unknown; body?: unknown };
      const body = JSON.parse(String(outer.body)) as PaymentRequest;
      if (typeof outer.t !== 'string' || !body || typeof body !== 'object' || !validatePaymentRequest(body).ok) {
        rejected++;
        continue;
      }
      const email = body.email.toLowerCase();
      byEmail.delete(email); // 같은 이메일은 마지막 1건(순서도 마지막 위치로)
      byEmail.set(email, { t: outer.t, email, arm: body.arm });
    } catch {
      rejected++;
    }
  }
  const valid = [...byEmail.values()];
  const byArm: Record<PriceArm, number> = { H1: 0, H2: 0 };
  for (const v of valid) byArm[v.arm]++;
  return { valid, rejected, byArm };
}
