import { describe, it, expect } from 'vitest';
import { matchListing } from '../src/domain/match.ts';
import { parseConstraints } from '../src/domain/eligibility.ts';

const c = (q: string, name = '') => parseConstraints(q, name);

describe('UC-3 자격 체커 (AC-7)', () => {
  const adult = { age: 25, student: false, region: '서울', business: '없음' } as const;
  it('대학생만 → 학생 아님이면 안 맞음', () => {
    expect(matchListing(c('국내 대학 재학생 및 휴학생'), adult)).toBe('안 맞음');
    expect(matchListing(c('국내 대학 재학생 및 휴학생'), { ...adult, student: true })).toBe('맞음');
  });
  it('조건 정보 없음 → 확인 필요', () => {
    expect(matchListing(c(''), adult)).toBe('확인 필요');
  });
  it('누구나 → 맞음', () => {
    expect(matchListing(c('대한민국 국민 누구나'), adult)).toBe('맞음');
  });
  it('나이 범위', () => {
    expect(matchListing(c('만 19세 ~ 34세 청년'), { ...adult, age: 35 })).toBe('안 맞음');
    expect(matchListing(c('만 19세 ~ 34세 청년'), { ...adult, age: 34 })).toBe('맞음');
    expect(matchListing(c('만 34세 이하 미취업 청년'), { ...adult, age: 40 })).toBe('안 맞음');
    expect(matchListing(c('Ages 18+ only'), { ...adult, age: 17 })).toBe('안 맞음');
  });
  it('나이를 모르면(비움) 나이 조건은 확인 필요로 둔다', () => {
    expect(matchListing(c('만 19세 ~ 34세 청년'), { ...adult, age: null })).toBe('확인 필요');
  });
  it('지역', () => {
    expect(matchListing(c('경남 소재 소상공인'), { ...adult, business: '사업자' })).toBe('안 맞음');
    expect(matchListing(c('경상남도 거주 청년'), { ...adult, region: '경남' })).toBe('맞음');
    expect(matchListing(c('', '[부산] 청년 지원사업'), { ...adult, region: '부산' })).toBe('맞음');
  });
  it('사업자', () => {
    expect(matchListing(c('예비창업자 또는 창업 3년 이내 기업'), adult)).toBe('안 맞음');
    expect(matchListing(c('예비창업자 또는 창업 3년 이내 기업'), { ...adult, business: '예비창업' })).toBe('맞음');
  });
  it('고등학생 전용은 대학생 체크로 판정하지 않는다(나이로만)', () => {
    expect(parseConstraints('전국 고등학생', '').studentOnly).toBe(false);
  });
});
