import { describe, it, expect } from 'vitest';
import { TOSS_MINIAPP_URL, TOSS_MINIAPP_COPY } from '../src/domain/tossLink.ts';

// SPEC §28 AC-98
describe('AC-98 토스 미니앱 링크 값', () => {
  it('URL이 콘솔 공식 단축 링크와 정확히 같다', () => {
    expect(TOSS_MINIAPP_URL).toBe('https://minion.toss.im/L5iKJAEk');
  });
  it('문구는 해요체 한 줄 ≤ 40자', () => {
    expect(TOSS_MINIAPP_COPY.title.length).toBeLessThanOrEqual(40);
    expect(TOSS_MINIAPP_COPY.title).toMatch(/요/);
  });
});
