import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { findForbidden } from '../src/domain/privacy.ts';
import { PUBLIC_KEYS } from '../src/application/exportPublicListings.ts';

// AC-9: 저장소에 커밋되는 실제 공개 내보내기 파일 검사
const path = 'data/listings.json';
describe.runIf(existsSync(path))('AC-9 실제 내보내기 파일', () => {
  const raw = () => readFileSync(path, 'utf8');
  const data = () => JSON.parse(raw());
  it('금지 토큰 0', () => {
    expect(findForbidden(raw())).toEqual([]);
  });
  it('허용 키만, 400건 이상', () => {
    expect(data().listings.length).toBeGreaterThanOrEqual(400);
    for (const l of data().listings) expect(Object.keys(l).sort()).toEqual([...PUBLIC_KEYS].sort());
    expect(Object.keys(data()).sort()).toEqual(['generatedAt', 'listings']);
  });
  it('Pro §2-1·2 공개 ≥1,500건, 마감 미경과 중 조항 1칸 이상 ≥60%', () => {
    const ls = data().listings;
    expect(ls.length).toBeGreaterThanOrEqual(1500);
    const filled = ls.filter((l: any) => l.clauses.length > 0 || l.eligibilityQuote).length;
    expect(filled / ls.length).toBeGreaterThanOrEqual(0.6);
  });
  it('원문 URL은 http(s)만', () => {
    for (const l of data().listings) expect(l.url).toMatch(/^https?:\/\//);
  });
});
