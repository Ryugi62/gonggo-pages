import type { PriceArm } from '../domain/pricing.ts';

// 퍼널 사건 → 계측 경로(가상 페이지뷰). 입력값은 경로에 넣지 않는다.
export type FunnelEvent = 'VIEW' | 'PRICE' | 'REQUEST';

export function funnelPath(event: FunnelEvent, arm: PriceArm): string {
  return `/intent/pro/${event.toLowerCase()}/${arm}`;
}

// 판독 요청 입구(SPEC §21) — 입구 펼침 · 저장 완료. 입력값은 경로에 넣지 않는다.
export type ReadFunnelEvent = 'CLICK' | 'REQUEST';

export function readFunnelPath(event: ReadFunnelEvent): string {
  return `/intent/read/${event.toLowerCase()}`;
}
