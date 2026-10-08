import { describe, it, expect } from 'vitest';
import { proEntry } from '../src/domain/proEntry.ts';
import { CATEGORIES } from '../src/domain/category.ts';

// SPEC §16 — 목록 페이지 /pro 맥락 입구
const V3 = /모든 공고|100\s*%|완벽|정확히|합격 보장|대신 판단|무조건|무료로 판정/;

describe('AC-51 proEntry 문구·출처 파라미터', () => {
  it('분류: href ?from=c, 분류명·고객 말·원문 조항, 오픈 준비 중', () => {
    const e = proEntry('c', '지원사업');
    expect(e.href).toBe('/pro/?from=c');
    expect(e.title).toContain('지원사업');
    expect(e.title).toContain('받을 수 있나?');
    expect(e.title).toContain('공고 원문 조항');
    expect(e.sub).toContain('오픈 준비 중');
  });
  it('홈·주간: href ?from=home / ?from=week', () => {
    expect(proEntry('home').href).toBe('/pro/?from=home');
    expect(proEntry('week').href).toBe('/pro/?from=week');
  });
  it('모든 문구에 과장 낱말 0, 공고 원문 조항·오픈 준비 중', () => {
    const all = [proEntry('home'), proEntry('week'), ...CATEGORIES.map((c) => proEntry('c', c.name))];
    for (const e of all) {
      expect(`${e.title} ${e.sub}`, e.title).not.toMatch(V3);
      expect(e.title).toContain('공고 원문 조항');
      expect(e.sub).toContain('오픈 준비 중');
    }
  });
});
