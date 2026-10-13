// 14일 검증 판정 — 검증설계 §4 숫자 컷을 코드로(10/14 감사 #10). 순수 함수: 사람이 읽고 내리던 판정을 같은 잣대로 고정한다.
// GO = 적격 방문 ≥100 ∧ 결제 요청 ≥3 ∧ 가격 클릭률 ≥8% ∧ 요청률 ≥2%. 보류 = 방문 <100 또는 요청 1~2. NO-GO = 그 외. kill = D45(11/21)까지 방문 <100.
export interface ProCounts { view: number; price: number; request: number }
export type VerdictLabel = 'GO' | '보류' | 'NO-GO' | '채널 실패';

export const KILL_DAY = '2026-11-21';

export function verdict(c: ProCounts, today: string): { label: VerdictLabel; line: string } {
  const pct = (n: number) => (c.view > 0 ? (n / c.view) * 100 : 0);
  const stat = `방문 ${c.view} · 가격 클릭 ${pct(c.price).toFixed(1)}% · 결제 요청 ${c.request}건(${pct(c.request).toFixed(1)}%)`;
  if (c.view < 100) {
    return today >= KILL_DAY
      ? { label: '채널 실패', line: `채널 실패 — ${stat}: D45까지 방문 100 미만(제품 판정 아님, 채널 교체 결정 1건)` }
      : { label: '보류', line: `보류 — ${stat}: 적격 방문 100 미만(트래픽 부족 ≠ 수요 부재)` };
  }
  if (c.request >= 3 && pct(c.price) >= 8 && pct(c.request) >= 2) return { label: 'GO', line: `GO — ${stat}` };
  if (c.request >= 1 && c.request <= 2) return { label: '보류', line: `보류 — ${stat}: 세그먼트를 좁혀 7일 재시행 1회` };
  return { label: 'NO-GO', line: `NO-GO — ${stat}` };
}
