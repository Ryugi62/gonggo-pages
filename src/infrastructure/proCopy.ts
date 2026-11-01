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

// SPEC §24 — /pro 판독 샘플·정확도·비교. 샘플 문장은 공고 원문에서 옮긴 것만(2026-11-01 원문 재조회로 대조).
export interface SampleRow {
  /** 질문 */
  q: string;
  /** 판독 답 */
  answer: string;
  /** 원문 인용(「」 없이). null = 원문에서 못 찾은 항목 */
  quote: string | null;
}
export const PRO_SAMPLE = {
  listing: '[광주 신세계안과] 제47회 빛창공모전 겨울편 공모',
  deadline: '2026-11-09',
  url: 'https://www.thinkcontest.com/thinkgood/user/contest/view.do?contest_pk=111449',
  checked: '2026-11-01',
  rows: [
    { q: 'AI로 만든 작품을 내도 되나요?', answer: '안 돼요 — AI 생성 작품은 제출할 수 없다고 적혀 있어요', quote: 'ChatGPT 등 인공지능(AI) 생성 작품 제출 불가합니다.' },
    { q: '누가 낼 수 있나요?', answer: '국적이 아니라 국민 요건이에요', quote: '대한민국 국민 누구나' },
    { q: '본인 창작 서약 조항이 있나요?', answer: '원문에서 찾지 못했어요 — 없다고 단정하지 않으니 주관 기관에 확인해 주세요', quote: null },
  ] as SampleRow[],
};

export const PRO_ACCURACY =
  '조항 판독 표본 10건을 공고 원문과 대조했어요 — 10건 중 10건 일치(2026-10-06, 2건은 첨부문서·공식 페이지에서 확인). 표본이 작아서 전체 공고의 정확도를 말해 주는 숫자는 아니에요.';

export const PRO_COMPARE = {
  free: { title: '무료 · 지금 쓸 수 있어요', items: ['공고 1건씩 열어 조항 판독 보기', '원문 인용과 원문 링크로 직접 대조'] },
  pro: { title: 'Pro · 오픈 준비 중', items: ['내 조건(나이·지역·업력)으로 공고 전체를 한 번에 선별', '내 계획서를 그 공고 배점표로 채점'] },
};
