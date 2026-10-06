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

/** 가격안별 포함 기능(검증설계 §0 가격 가설) — 아직 만들지 않은 기능이라 화면엔 「오픈 때」로만 쓴다. */
export const PRO_PLAN: Record<PriceArm, string[]> = {
  H1: ['이번 달 낼 수 있는 공고만 골라 주기(자격·AI 사용·중복 조항 판독)', '내 계획서를 그 공고 배점표로 채점 월 5회'],
  H2: ['이번 달 낼 수 있는 공고만 골라 주기(자격·AI 사용·중복 조항 판독)', '내 계획서를 그 공고 배점표로 채점 무제한', '공고 양식별 보완안(고칠 곳과 이유)'],
};

export function formatWon(n: number): string {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
