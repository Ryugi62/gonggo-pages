import { describe, it, expect } from 'vitest';
import { dDay, dDayLabel, formatDate, weekLabel } from '../src/domain/format.ts';

describe('날짜 표기', () => {
  it('D-day', () => {
    expect(dDay('2026-10-20', '2026-10-02')).toBe(18);
    expect(dDayLabel('2026-10-02', '2026-10-02')).toBe('D-day');
    expect(dDayLabel('2026-10-03', '2026-10-02')).toBe('D-1');
    expect(dDayLabel('2026-10-01', '2026-10-02')).toBe('마감');
    expect(dDayLabel(null, '2026-10-02')).toBe('상시');
  });
  it('한국어 날짜·주 라벨', () => {
    expect(formatDate('2026-10-20')).toBe('10월 20일(화)');
    expect(weekLabel('2026-10-05')).toBe('10월 5일 ~ 10월 11일');
  });
});
