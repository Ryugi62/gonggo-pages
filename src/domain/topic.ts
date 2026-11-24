// SPEC §32 AC-117·118 — 세부 분야(주제어)와 오디션·캐스팅류 판별. 재료는 공개 필드(이름·분류·태그)뿐, 순수.
import type { PublicListing } from './listing.ts';

const TOPICS: [string, RegExp][] = [
  ['요리', /요리|레시피|디저트|식품|푸드|음식|쿠킹|베이킹|맛집|밀키트|조리/],
  ['문학', /문학|신춘문예|시\s*(?:공모|낭송|부문|·)|소설|수필|동화|에세이|시나리오|글짓기|백일장|독후감|웹소설|시조/],
  ['사진', /사진|포토|촬영|스냅/],
  ['영상', /영상|영화|숏폼|쇼츠|릴스|UCC|다큐|애니메이션|유튜브|동영상/],
  ['디자인', /디자인|포스터|패키지|캐릭터|이모티콘|로고|브랜딩|일러스트|굿즈|CI\b|BI\b/],
  ['웹툰', /웹툰|만화|카툰/],
  ['음악', /음악|작곡|가요|노래|밴드|보컬|뮤직|음원|싱어/],
  ['미술', /미술|회화|그림|조각|공예|서예|캘리/],
  ['건축', /건축|도시|조경|공간|인테리어/],
  ['공연', /공연|연극|뮤지컬|무용|댄스|오디션|배우|캐스팅|아역/],
  ['환경', /환경|기후|탄소|ESG|제로웨이스트|친환경|에너지|녹색|재활용/],
  ['정책', /정책|제안|국민|시민|주민|행정|혁신/],
  ['광고', /광고|슬로건|네이밍|홍보|마케팅|카피|공익/],
  ['개발', /해커톤|개발|코딩|AI|인공지능|데이터|소프트웨어|앱\b|알고리즘|ICT|SW|블록체인/],
  ['창업', /창업|스타트업|사업계획|IR\b|투자|소상공인|벤처/],
  ['관광', /관광|여행|문화유산|지역/],
  ['안전', /안전|재난|소방|방범|교통/],
  ['교육', /교육|학습|청소년|학생|수학|과학|발명/],
  ['금융', /금융|보험|저축|핀테크|세금|경제/],
];

export function topicsOf(l: Pick<PublicListing, 'name'>): string[] {
  return TOPICS.filter(([, re]) => re.test(l.name)).map(([t]) => t);
}

/** 오디션·캐스팅류 — 공모 4칸(니즈·평가 전략…)·Pro 채점이 맞지 않는 유형(11/22 검수: 아역 배우 등 56건) */
const AUDITION_RE = /오디션|캐스팅|아역|배우\s*(?:모집|공개)|엑스트라|모델\s*(?:모집|공개|선발)|출연자\s*모집|시니어\s*모델|(?:가수|성우)\s*(?:공개\s*)?모집/;
export const isAudition = (l: Pick<PublicListing, 'name'>): boolean => AUDITION_RE.test(l.name);

const tokensOf = (name: string) =>
  new Set((name.replace(/제?\s*\d+\s*(?:회|차|기|년도?)/g, ' ').match(/[가-힣A-Za-z]{2,}/g) ?? []).map((t) => t.toLowerCase()));

/** SPEC §34 AC-135 — 같은 대회 판별: 마감일이 같고 작은 쪽 제목 낱말(3개 이상)의 75% 이상이 겹침(제N회·숫자 제외) */
export function isSameContest(a: Pick<PublicListing, 'name' | 'deadline'>, b: Pick<PublicListing, 'name' | 'deadline'>): boolean {
  if ((a.deadline ?? '') !== (b.deadline ?? '')) return false;
  const x = tokensOf(a.name), y = tokensOf(b.name);
  if (!x.size || !y.size) return false;
  let both = 0;
  for (const t of x) if (y.has(t)) both++;
  return Math.min(x.size, y.size) >= 3 && both / Math.min(x.size, y.size) >= 0.75;
}
