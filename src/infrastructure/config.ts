// 설정 — 환경 변수 → 기본값. 배포 주소가 바뀌면 SITE_URL만 바꾼다.
export const SITE_URL = (globalThis as any).process?.env?.SITE_URL ?? 'https://gonggo-pages.vercel.app';
export const SITE_NAME = '공고콕';
export const LISTINGS_PATH = 'data/listings.json';
export const REPO_URL = 'https://github.com/Ryugi62/gonggo-pages';

export function todayKst(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);
}
