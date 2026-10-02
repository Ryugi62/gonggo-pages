import type { BusinessStatus, Constraints, Region } from './eligibility.ts';

/** 방문자가 체커에 넣은 값. 브라우저 밖으로 나가지 않는다. null = 모름/비움 */
export interface Profile {
  age: number | null;
  student: boolean | null;
  region: Region | string | null;
  business: BusinessStatus | null;
}

export type MatchVerdict = '맞음' | '확인 필요' | '안 맞음';

export function matchListing(c: Constraints, p: Profile): MatchVerdict {
  if (p.age !== null) {
    if (c.minAge !== null && p.age < c.minAge) return '안 맞음';
    if (c.maxAge !== null && p.age > c.maxAge) return '안 맞음';
  }
  if (c.studentOnly && p.student === false) return '안 맞음';
  if (c.region && p.region && p.region !== c.region) return '안 맞음';
  if (c.business && p.business && !c.business.includes(p.business)) return '안 맞음';

  const unknown =
    ((c.minAge !== null || c.maxAge !== null) && p.age === null) ||
    (c.studentOnly && p.student === null) ||
    (c.region !== null && !p.region) ||
    (c.business !== null && !p.business);
  if (unknown) return '확인 필요';

  const hasAny = c.minAge !== null || c.maxAge !== null || c.studentOnly || c.region !== null || c.business !== null || c.open;
  return hasAny ? '맞음' : '확인 필요';
}
