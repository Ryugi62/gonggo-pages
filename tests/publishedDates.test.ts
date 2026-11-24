import { describe, it, expect } from 'vitest';
import { publishedDates } from '../src/application/publishedDates.ts';
describe('AC-168 지난 날짜 주소 유지', () => {
  it('전 정리 기준일을 더하고 새 날짜·중복을 뺀다', () => {
    expect(publishedDates([], '2026-11-22', '2026-11-25')).toEqual(['2026-11-22']);
    expect(publishedDates(['2026-11-22'], '2026-11-25', '2026-11-28')).toEqual(['2026-11-22', '2026-11-25']);
  });
  it('같은 날 다시 내보내도 그대로다', () => {
    expect(publishedDates(['2026-11-22'], '2026-11-25', '2026-11-25')).toEqual(['2026-11-22']);
  });
});
