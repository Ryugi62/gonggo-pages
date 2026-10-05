import type { PriceArm } from '../domain/pricing.ts';

// 퍼널 사건 → 계측 경로(가상 페이지뷰). 입력값은 경로에 넣지 않는다.
export type FunnelEvent = 'VIEW' | 'PRICE' | 'REQUEST';

export function funnelPath(event: FunnelEvent, arm: PriceArm): string {
  return `/intent/pro/${event.toLowerCase()}/${arm}`;
}
