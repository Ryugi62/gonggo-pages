// 설정 — 환경 변수 → 기본값. 배포 주소가 바뀌면 CANONICAL_ORIGIN만 바꾼다.
/** 정식 주소(SPEC §13) — 검색·canonical·sitemap·Pro·캘린더 피드가 모두 이 호스트. 옛 주소(vercel.app·sslip.io)는 여기로 301. */
export const CANONICAL_ORIGIN = 'https://gonggo.oaksoo.com';
export const SITE_URL = (globalThis as any).process?.env?.SITE_URL ?? CANONICAL_ORIGIN;
export const SITE_NAME = '공고콕';
/** 캘린더 구독 피드 주소의 호스트 — 엣지 접근 로그로 구독 요청을 셀 수 있는 AWS(SPEC §11 C5). */
export const FEED_ORIGIN = (globalThis as any).process?.env?.FEED_ORIGIN ?? CANONICAL_ORIGIN;
/** 배포 대상 — 'aws'일 때만 Pro 가격 페이지 4장을 만든다(Vercel Hobby 상업 이용 금지, SPEC §12 AC-25). */
export const DEPLOY_TARGET = (globalThis as any).process?.env?.DEPLOY_TARGET ?? 'vercel';
export const IS_AWS = DEPLOY_TARGET === 'aws';
/** Pro 페이지가 사는 호스트(상업 이용 허용 AWS) = 정식 주소. */
export const PRO_ORIGIN = CANONICAL_ORIGIN;
export const PRO_PAGES = ['/pro/', '/terms/', '/refund/', '/privacy/'] as const;
/** 운영자 고지(전자상거래 표시) — 이 4장에만 싣는다. 대표자 성명·사업장 주소는 요청 시 메일로 안내(공개 페르소나 정책, oaksoo 푸터와 같음). */
export const OPERATOR = {
  name: '루미아',
  bizNo: '855-15-02703',
  mailOrderNo: '2026-창원의창-0388',
  email: 'xorjf1027@gmail.com',
} as const;
/** IndexNow 키(SPEC §15 Q4) — 공개값. 키 파일 public/<키>.txt 본문과 같아야 한다. */
export const INDEXNOW_KEY = '7909e33069319f0eb1a00617178662c1';
export const LISTINGS_PATH = 'data/listings.json';
export const REPO_URL = 'https://github.com/Ryugi62/gonggo-pages';

export function todayKst(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(now);
}
