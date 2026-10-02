import { existsSync, readFileSync } from 'node:fs';

/** 운영자 로컬에만 있는 개인 식별 토큰 평문(공개 저장소엔 없다). 없으면 null */
export function privateTokens(): string[] | null {
  const p = 'privacy.local.json';
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')).tokens as string[]) : null;
}
