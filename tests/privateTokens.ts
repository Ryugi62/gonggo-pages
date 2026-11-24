import { existsSync, readFileSync } from 'node:fs';

/** 운영자 로컬에만 있는 개인 식별 토큰 평문(공개 저장소엔 없다). 없으면 null */
export function privateTokens(): string[] | null {
  const p = 'privacy.local.json';
  if (!existsSync(p)) return null;
  const t = JSON.parse(readFileSync(p, 'utf8')).tokens; // 같은 파일에 selfIps만 있을 수도 있다(visits.ts 용) — tokens가 배열이 아니면 없는 것으로
  return Array.isArray(t) ? (t as string[]) : null;
}
