// /pro 첫 화면 고객 원문(SPEC §14 V2) — 공개 글에서 그대로 옮긴 문장만. 닉네임·실명은 싣지 않는다.
// 출처 수집: 볼트 projects/공고콕-Pro-2026/회차-01-2026-10-08/반대편-도시에 (2026-10-08 원문 대조).
export interface CustomerVoice {
  /** 원문 그대로(맞춤법 포함, 「」 없이) */
  quote: string;
  /** 누가 — 익명 묘사 */
  who: string;
  /** 어디 — 매체 */
  where: string;
  /** 작성일 YYYY-MM-DD */
  date: string;
  url: string;
}

export const CUSTOMER_VOICES: CustomerVoice[] = [
  {
    quote: '쳇지피티는 받을수 있다는데 영 못믿겠어서요!',
    who: '창업을 준비하는 분의 질문',
    where: '네이버 지식iN',
    date: '2025-12-03',
    url: 'https://kin.naver.com/qna/detail.naver?d1id=4&dirId=40703&docId=490564313',
  },
  {
    quote: '중복 수혜 가능한가요?',
    who: '지자체 지원금을 받고 있는 사업자',
    where: '네이버 카페 정책자금119',
    date: '2026-02-04',
    url: 'https://cafe.naver.com/thetimeslab/2028',
  },
  {
    quote: '내가 예비 단계인지 이미 창업기업인지 구분하는 부분',
    who: '초기창업패키지를 알아본 분',
    where: '네이버 카페 만렙사장',
    date: '2026-04-07',
    url: 'https://cafe.naver.com/whduddn0317/1402992',
  },
];
