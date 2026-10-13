import { describe, it, expect } from 'vitest';
import { decodeEntities, cleanName } from '../src/domain/extract.ts';
import { checkerCounts, visibleRows, emptyCopy, ERROR_COPY, nextStep, prevStep, nextLabel, proNextStep, type CheckerRow } from '../src/domain/checker.ts';
import { dDayLabel } from '../src/domain/format.ts';

const noC = { minAge: null, maxAge: null, studentOnly: false, region: null, business: null, open: false } as const;
const row = (s: string, d: string | null, k: Partial<typeof noC> = {}): CheckerRow => ({ s, n: s, c: '공모전', d, p: null, k: { ...noC, ...k } as CheckerRow['k'] });

describe('AC-60 엔티티 해제', () => {
  it('숫자·이름 엔티티를 한 번 푼다', () => {
    expect(decodeEntities('&#034;대학생 멘토&#034;')).toBe('"대학생 멘토"');
    expect(decodeEntities('만 20 &lt; 나이 &gt; 5 &amp; 6 &#x41;')).toBe('만 20 < 나이 > 5 & 6 A');
  });
  it('이중 엔티티는 한 단계만(&amp;lt; → &lt;)', () => {
    expect(decodeEntities('&amp;lt;')).toBe('&lt;');
  });
  it('cleanName이 엔티티를 푼다', () => {
    expect(cleanName('&#034;대학생 멘토&#034;를 모집N새글')).toBe('"대학생 멘토"를 모집');
  });
});

describe('AC-61·63 체커 상태', () => {
  const rows = [row('a', '2026-10-20', { studentOnly: true }), row('b', '2026-10-01'), row('c', null, { open: true })];
  it('마감 지난 행은 보이지 않는다', () => {
    expect(visibleRows({ 맞음: rows, '확인 필요': [], '안 맞음': [] }, '맞음', '2026-10-14').map((r) => r.s)).toEqual(['a', 'c']);
  });
  it('개수 문구', () => {
    const c = checkerCounts({ 맞음: [rows[0]], '확인 필요': [rows[2], rows[1]], '안 맞음': [] });
    expect(c.ok).toBe('1개');
    expect(c.rest).toBe('확인이 필요한 공고 2개 · 조건이 안 맞는 공고 0개는 숨겼어요');
  });
  it('빈 상태는 다음 행동 1개를 말한다', () => {
    expect(emptyCopy('맞음')).toBe('아직 맞는 공고가 없어요. 조건을 바꿔 다시 골라 보세요.');
    expect(emptyCopy('확인 필요')).toBe('확인할 공고가 없어요.');
  });
  it('오류 문구 + 버튼', () => {
    expect(ERROR_COPY.message).toBe('공고를 불러오지 못했어요. 인터넷을 확인하고 다시 눌러 주세요.');
    expect(ERROR_COPY.button).toBe('다시 불러오기');
  });
  it('단계 전이·뒤로', () => {
    expect([nextStep(1), nextStep(2), nextStep(3)]).toEqual([2, 3, 1]);
    expect([prevStep(1), prevStep(2), prevStep(3)]).toEqual([1, 1, 2]);
    expect([nextLabel(1), nextLabel(2), nextLabel(3)]).toEqual(['다음', '결과 보기', '다시 고르기']);
  });
  it('Pro 단계 전이', () => {
    expect(proNextStep(0, { emailOk: false, agreeOk: false })).toEqual({ to: 1, track: 'PRICE' });
    expect(proNextStep(1, { emailOk: false, agreeOk: true })).toEqual({ to: 1, warn: 'email' });
    expect(proNextStep(1, { emailOk: true, agreeOk: false })).toEqual({ to: 2 });
    expect(proNextStep(2, { emailOk: true, agreeOk: true })).toEqual({ submit: true });
    expect(proNextStep(3, { emailOk: true, agreeOk: true })).toEqual({ home: true });
  });
  it('dDayLabel 단일 구현', () => {
    expect(dDayLabel('2026-10-14', '2026-10-14')).toBe('D-day');
  });
});

import { exportPublicListings } from '../src/application/exportPublicListings.ts';
describe('AC-60 내보내기 단계 엔티티', () => {
  it('공고명·자격 인용에 든 엔티티가 풀려 나간다', () => {
    const r = exportPublicListings([{ id: 'x', name: '&#034;대학생 멘토&#034;를 모집', kind: '공모', due: '2026-12-01', due_date: '2026-12-01', url: 'https://example.org/e/1', state: '후보',
      note: '자격:「만 19 &lt; 나이」 · 주최:한국AI협회', why: '' } as never], '2026-10-14');
    expect(r.listings[0].name).toBe('"대학생 멘토"를 모집');
    expect(JSON.stringify(r.listings[0])).not.toMatch(/&#|&lt;|&gt;/);
  });
});
