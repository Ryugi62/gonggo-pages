import type { EligibilityTag } from './category.ts';

export type BusinessStatus = '없음' | '예비창업' | '사업자';
export type Region =
  | '서울' | '부산' | '대구' | '인천' | '광주' | '대전' | '울산' | '세종'
  | '경기' | '강원' | '충북' | '충남' | '전북' | '전남' | '경북' | '경남' | '제주';

export const REGIONS: Region[] = ['서울', '부산', '대구', '인천', '광주', '대전', '울산', '세종', '경기', '강원', '충북', '충남', '전북', '전남', '경북', '경남', '제주'];

const REGION_ALIASES: [string, Region][] = [
  ['서울특별시', '서울'], ['부산광역시', '부산'], ['대구광역시', '대구'], ['인천광역시', '인천'], ['광주광역시', '광주'],
  ['대전광역시', '대전'], ['울산광역시', '울산'], ['세종특별자치시', '세종'], ['경기도', '경기'], ['강원특별자치도', '강원'],
  ['강원도', '강원'], ['충청북도', '충북'], ['충청남도', '충남'], ['전북특별자치도', '전북'], ['전라북도', '전북'],
  ['전라남도', '전남'], ['경상북도', '경북'], ['경상남도', '경남'], ['제주특별자치도', '제주'], ['제주도', '제주'],
  ...REGIONS.map((r) => [r, r] as [string, Region]),
];

/** 공고 인용에서 읽은 자격 조건. null/false = 조건 없음(또는 못 읽음). */
export interface Constraints {
  minAge: number | null;
  maxAge: number | null;
  studentOnly: boolean;
  region: Region | null;
  /** 허용되는 사업자 상태. null = 사업자 조건 없음 */
  business: BusinessStatus[] | null;
  /** 「누구나」「제한 없음」 명시 */
  open: boolean;
}

const OPEN_RE = /누구나|제한\s*없|전\s*국민|국민\s*누구|일반인|모든\s*(?:사람|국민)|All countries|anyone/i;
const STUDENT_RE = /대학생|대학원생|대학\s*\(원\)\s*생|(?:대학|대학원)\S*\s*(?:재학생|휴학생|재·휴학생|재\/휴학생)|재·휴학생|Students only|(?:university|college) students/i;
const STUDENT_OPEN_RE = /누구나|일반인|일반|제한\s*없|전\s*국민|성인|직장인|청소년/;
const PRE_FOUNDER_RE = /예비\s*창업/;
const BUSINESS_RE = /사업자|소상공인|중소기업|창업\s*기업|창업\s*\d+\s*년|스타트업|기업|startups?\b/i;
const BUSINESS_NEG_RE = /기업\s*(?:불가|제외|참여\s*불가)|Companies[^·]*excluded/i;

function parseAge(q: string): { minAge: number | null; maxAge: number | null } {
  let m = q.match(/(?:만\s*)?(\d{1,2})\s*세?\s*(?:이상\s*)?[~∼\-–]\s*(?:만\s*)?(\d{1,2})\s*세/) ?? q.match(/만\s*(\d{1,2})\s*[~∼\-–]\s*(\d{1,2})(?!\d)/);
  if (m) return { minAge: Number(m[1]), maxAge: Number(m[2]) };
  let minAge: number | null = null;
  let maxAge: number | null = null;
  if ((m = q.match(/(?:만\s*)?(\d{1,2})\s*세\s*이하/))) maxAge = Number(m[1]);
  else if ((m = q.match(/(?:만\s*)?(\d{1,2})\s*세\s*미만/))) maxAge = Number(m[1]) - 1;
  if ((m = q.match(/(?:만\s*)?(\d{1,2})\s*세\s*이상/))) minAge = Number(m[1]);
  else if ((m = q.match(/Ages?\s*(\d{1,2})\s*\+/i))) minAge = Number(m[1]);
  return { minAge, maxAge };
}

function parseRegion(quote: string, name: string): Region | null {
  const prefix = name.match(/^\s*\[([^\]]{2,10})\]/);
  if (prefix) {
    const hit = REGION_ALIASES.find(([a]) => prefix[1].trim() === a);
    if (hit) return hit[1];
  }
  for (const [alias, region] of REGION_ALIASES) {
    const re = new RegExp(`${alias}\\s*(?:내\\s*)?(?:거주|소재|주소|도민|시민|주민|지역\\s*(?:청년|기업|소상공인|주민))`);
    if (re.test(quote)) return region;
  }
  return null;
}

/** 자격 인용(quote)과 공고명(name)에서 조건을 읽는다. 나이는 인용에서만 읽는다. */
export function parseConstraints(quote: string, name: string): Constraints {
  const text = `${quote} ${name}`;
  const open = OPEN_RE.test(quote);
  const { minAge, maxAge } = parseAge(quote);
  const studentOnly = STUDENT_RE.test(text) && !STUDENT_OPEN_RE.test(quote);
  let business: BusinessStatus[] | null = null;
  if (!open && !BUSINESS_NEG_RE.test(text)) {
    if (PRE_FOUNDER_RE.test(text)) business = ['예비창업', '사업자'];
    else if (BUSINESS_RE.test(text)) business = ['사업자'];
  }
  return { minAge, maxAge, studentOnly, region: parseRegion(quote, name), business, open };
}

export function tagsFor(quote: string, name: string, c: Constraints): EligibilityTag[] {
  const text = `${quote} ${name}`;
  const tags: EligibilityTag[] = [];
  if (c.studentOnly || /대학생|대학원생|재학생|휴학생|Students/i.test(text)) tags.push('대학생');
  if (/청년/.test(text) || (c.maxAge !== null && c.maxAge <= 39 && c.maxAge >= 24)) tags.push('청년');
  if (c.open) tags.push('누구나');
  if (c.business) tags.push('창업자');
  return tags;
}
