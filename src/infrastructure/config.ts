// 설정 — 환경 변수 → 기본값. 배포 주소가 바뀌면 SITE_URL만 바꾼다.
export const SITE_URL = (globalThis as any).process?.env?.SITE_URL ?? 'https://gonggo-pages.vercel.app';
export const SITE_NAME = '공고콕';
/** 캘린더 구독 피드 주소의 호스트 — 엣지 접근 로그로 구독 요청을 셀 수 있는 AWS(SPEC §11 C5). */
export const FEED_ORIGIN = (globalThis as any).process?.env?.FEED_ORIGIN ?? 'https://gonggo.43-202-151-104.sslip.io';
export const LISTINGS_PATH = 'data/listings.json';
export const REPO_URL = 'https://github.com/Ryugi62/gonggo-pages';

export function todayKst(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);
}
