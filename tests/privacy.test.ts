import { describe, it, expect } from 'vitest';
import { findForbidden } from '../src/domain/privacy.ts';
import { privateTokens } from './privateTokens.ts';

describe('금지 토큰 탐지', () => {
  it('사용자 지정 토큰을 잡는다', () => {
    for (const t of ['사용자결정', 'tier 1', 'opp-0001', 'GO 판정', 'GU-예술', 'hold_reason', 'Tier', '[판정 GO]'])
      expect(findForbidden(t).length, t).toBeGreaterThan(0);
  });
  it('영단어 안쪽은 오탐하지 않는다(Google·Frontier·stakeholder)', () => {
    for (const t of ['Google Cloud', 'Frontier AI', 'stakeholders', 'GOOD', 'Guide', 'LEGO']) expect(findForbidden(t), t).toEqual([]);
  });
  it('내부 메모 표지도 잡는다', () => {
    for (const t of ['[실측 2026-09-25 aside 1]', 'Jarvis', '재발견', 'gongo_init']) expect(findForbidden(t).length, t).toBeGreaterThan(0);
  });
});

describe.runIf(privateTokens() !== null)('개인 식별 토큰(로컬 평문 목록)', () => {
  it('문장 안에 섞여도 잡는다', () => {
    for (const t of privateTokens()!) expect(findForbidden(`국립${t}학교 메모`).length, `len ${t.length}`).toBeGreaterThan(0);
  });
});
