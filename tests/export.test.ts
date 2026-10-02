import { describe, it, expect } from 'vitest';
import { exportPublicListings, PUBLIC_KEYS } from '../src/application/exportPublicListings.ts';
import { findForbidden, FORBIDDEN_TOKENS, PRIVATE_TOKEN_HASHES } from '../src/domain/privacy.ts';
import { rows, TODAY } from './fixtures/rows.ts';
import { privateTokens } from './privateTokens.ts';

const out = exportPublicListings(rows as any, TODAY).listings;
const byName = (n: string) => out.find((l) => l.name === n);

describe('UC-1 공개 내보내기', () => {
  it('AC-1 후보·신청예정만', () => {
    expect(byName('조건불가 공모')).toBeUndefined();
    expect(byName('2026 대학생 AI 아이디어 공모전')).toBeDefined();
    expect(byName('청년 창업 지원사업 모집')).toBeDefined();
  });
  it('AC-2 마감 필터: 어제 제외·오늘 포함·상시 포함·미상 제외·대출 제외', () => {
    expect(byName('지난 해커톤')).toBeUndefined();
    expect(byName('오늘 마감 해커톤')?.deadline).toBe('2026-10-02');
    const rolling = byName('청년 창업 지원사업 모집')!;
    expect(rolling.rolling).toBe(true);
    expect(rolling.deadline).toBeNull();
    expect(byName('날짜 미상 공모')).toBeUndefined();
    expect(byName('청년전용 대출')).toBeUndefined();
  });
  it('AC-3 금지 토큰 0 (JSON 전체)', () => {
    const json = JSON.stringify(out);
    expect(findForbidden(json)).toEqual([]);
    for (const t of ['사용자결정', 'opp-', '잔금', '★', ...(privateTokens() ?? [])]) expect(json.toLowerCase()).not.toContain(t.toLowerCase());
  });
  it('AC-3b 금지 토큰: 일반 6종은 정규식, 개인 식별은 지문으로 전부 잡는다', () => {
    for (const t of ['사용자결정', 'tier', 'opp-', 'GO', 'GU', 'hold']) expect(FORBIDDEN_TOKENS.map((f) => f.label)).toContain(t);
  });
  it.runIf(privateTokens() !== null)('AC-3c 로컬 평문 목록의 모든 개인 토큰이 지문에 걸린다', () => {
    for (const t of privateTokens()!) {
      expect(findForbidden(`앞 ${t} 뒤`).length, '토큰 길이 ' + t.length).toBeGreaterThan(0);
      expect(findForbidden(`앞${t.toUpperCase()}뒤`).length).toBeGreaterThan(0);
    }
    expect(PRIVATE_TOKEN_HASHES.length).toBe(privateTokens()!.length);
  });
  it('AC-4 허용 키만', () => {
    for (const l of out) expect(Object.keys(l).sort()).toEqual([...PUBLIC_KEYS].sort());
  });
  it('AC-5 자격 인용·태그·조건', () => {
    const l = byName('2026 대학생 AI 아이디어 공모전')!;
    expect(l.eligibilityQuote).toBe('만 19세 이상 국내 대학 재학생 및 휴학생');
    expect(l.tags).toContain('대학생');
    expect(l.constraints.minAge).toBe(19);
    expect(l.constraints.studentOnly).toBe(true);
    expect(l.organizer).toBe('한국AI협회');
    expect(l.prize).toBe('시상규모 500만원');
    expect(l.deadlineTime).toBe('23:59');
    expect(l.category).toBe('공모전');
  });
  it('AC-6 내부 메모 인용은 버린다', () => {
    expect(byName('오늘 마감 해커톤')!.eligibilityQuote).toBeNull();
    expect(byName('오늘 마감 해커톤')!.prize).toBe('$12,500 상금');
  });
  it('지역·사업자 조건과 상금 문구', () => {
    const s = byName('[경남] 소상공인 상세페이지 지원사업')!;
    expect(s.constraints.region).toBe('경남');
    expect(s.constraints.business).toEqual(['사업자']);
    expect(s.tags).toContain('창업자');
    const p = byName('전국민 사진 공모전')!;
    expect(p.prize).toBe('총상금 110만원');
    expect(p.tags).toContain('누구나');
    const r = byName('청년 창업 지원사업 모집')!;
    expect(r.constraints.maxAge).toBe(39);
    expect(r.constraints.business).toEqual(['예비창업', '사업자']);
    expect(r.tags).toEqual(expect.arrayContaining(['청년', '창업자']));
  });
  it('AC-8 slug 안정·ASCII', () => {
    const again = exportPublicListings(rows as any, TODAY).listings;
    expect(again.map((l) => l.slug)).toEqual(out.map((l) => l.slug));
    for (const l of out) expect(l.slug).toMatch(/^[a-z0-9-]+$/);
    expect(new Set(out.map((l) => l.slug)).size).toBe(out.length);
  });
  it('제외 사유 집계를 돌려준다', () => {
    const r = exportPublicListings(rows as any, TODAY);
    expect(r.stats.kept).toBe(out.length);
    expect(r.stats.total).toBe(rows.length);
  });
});

import { extractOrganizer, extractPrize, cleanName } from '../src/domain/extract.ts';
describe('추출 잡음 제거', () => {
  it('주최 자리표시(n/a·미노출)는 버린다', () => {
    expect(extractOrganizer('주최:n/a · 분야:', '')).toBeNull();
    expect(extractOrganizer('주최:미노출 · 분야:', '')).toBeNull();
    expect(extractOrganizer('', 'K-Startup 창업교육 · 주관 한국특허정보원')).toBe('한국특허정보원');
  });
  it('0원 상금은 버린다', () => {
    expect(extractPrize('시상규모 0만원', '')).toBeNull();
    expect(extractPrize('$2 in prizes', '')).toBeNull();
  });
  it('스크래핑 잔여물 제거', () => {
    expect(cleanName('아이쿠스 2026 겨울 이집트 드리머즈 3기 모집N새글')).toBe('아이쿠스 2026 겨울 이집트 드리머즈 3기 모집');
  });
});
