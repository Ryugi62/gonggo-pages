// 가격안 — 14일 검증용 가설 2개. 방문자 키 해시로 50:50 고정 배정(순수 함수, 브라우저·저장소 모름).
export type PriceArm = 'H1' | 'H2';
export const PRICE_ARMS: Record<PriceArm, number> = { H1: 19900, H2: 49000 };

/** FNV-1a 32bit */
function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function assignArm(visitorKey: string): PriceArm {
  return fnv1a(visitorKey) % 2 === 0 ? 'H1' : 'H2';
}
