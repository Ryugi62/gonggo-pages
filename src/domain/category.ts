export type Category = '공모전' | '해커톤' | '지원사업' | '장학' | '대외활동';
export type EligibilityTag = '대학생' | '청년' | '누구나' | '창업자';

export const CATEGORIES: { name: Category; slug: string; blurb: string }[] = [
  { name: '공모전', slug: 'contest', blurb: '아이디어·디자인·영상·글 공모전과 경진대회' },
  { name: '해커톤', slug: 'hackathon', blurb: '국내외 해커톤·개발 챌린지' },
  { name: '지원사업', slug: 'support', blurb: '창업·소상공인·청년 지원사업과 지원금' },
  { name: '장학', slug: 'scholarship', blurb: '장학금·장학 프로그램' },
  { name: '대외활동', slug: 'activity', blurb: '서포터즈·챌린지·참여 프로그램' },
];

export const TAGS: { name: EligibilityTag; slug: string; blurb: string }[] = [
  { name: '대학생', slug: 'student', blurb: '대학(원)생·휴학생이 낼 수 있는 공고' },
  { name: '청년', slug: 'youth', blurb: '청년(대개 만 19~39세) 대상 공고' },
  { name: '누구나', slug: 'anyone', blurb: '나이·신분 제한 없이 누구나 낼 수 있는 공고' },
  { name: '창업자', slug: 'founder', blurb: '예비창업자·사업자 대상 공고' },
];

/** 원천 kind → 공개 분류. 대출·크레딧 등 공개하지 않는 종류는 null. */
export function classify(kind: string): Category | null {
  switch (kind) {
    case '공모':
    case '대회':
      return '공모전';
    case '해커톤':
      return '해커톤';
    case '지원사업':
    case '지원금':
      return '지원사업';
    case '장학':
      return '장학';
    case '기타':
      return '대외활동';
    default:
      return null;
  }
}

export const categorySlug = (c: Category) => CATEGORIES.find((x) => x.name === c)!.slug;
export const tagSlug = (t: EligibilityTag) => TAGS.find((x) => x.name === t)!.slug;
