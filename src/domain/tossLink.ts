// SPEC §28·§30 — 토스 앱 미니앱 「공고콕」으로 가는 링크. 순수: 문자열 → 문자열.
/** 앱인토스 콘솔 「홍보 소재」 공식 단축 링크 — 토스 미설치·PC·딥링크가 안 열릴 때의 폴백이자 앱 홈 */
export const TOSS_MINIAPP_URL = 'https://minion.toss.im/L5iKJAEk';
export const TOSS_MINIAPP_COPY = {
  title: '토스 앱에서 마감 임박 공고를 한눈에 봐요',
  sub: '공고 마감과 AI 사용 규정을 토스 앱 미니앱 공고콕에서 볼 수 있어요.',
} as const;

/** 공고별 도착 화면이 다르므로 문구도 도착 화면에 맞춘다(11/22 검수: 「이 공고에 맞춘」 약속 불이행) */
export const TOSS_APP_COPY = {
  generic: '토스 앱에서 공고콕 열기',
  specific: '토스 앱에서 이 공고 열기',
  genericSub: '마감 임박 공고와 AI 사용 규정을 앱에서 봐요',
  specificSub: '앱에서 이 공고의 자격·마감을 바로 열어요',
} as const;

const SLUG = /^[A-Za-z0-9_-]{1,80}$/;

/** 앱 공식 형식 `intoss://gonggokok/p/<slug>.html`(앱 번들 routeFromScheme과 같은 slug 규칙). 위험한 slug는 null */
export function appDeepLink(slug: string): string | null {
  return SLUG.test(slug) ? `intoss://gonggokok/p/${slug}.html` : null;
}

/** 앱 번들에 같은 공고 화면이 있을 때만 딥링크, 없으면 null(앱 홈 링크만) */
export function appSlugOf(slug: string, inApp: ReadonlySet<string>): string | null {
  return inApp.has(slug) ? appDeepLink(slug) : null;
}
