import { describe, it, expect } from 'vitest';
import { displayTitle } from '../src/domain/displayText.ts';
import { buildSiteIndex } from '../src/application/buildSiteIndex.ts';
import { checkerCounts, isPastRow } from '../src/domain/checker.ts';
import { DAY_SCRIPT } from '../src/infrastructure/dayScript.ts';

// SPEC §37
describe('AC-166 displayTitle', () => {
  it('꼬리 「 분야 : …」·머리 「(은혜준비)」만 뗀다, (주)류·본문은 그대로', () => {
    expect(displayTitle('7th Da-Ho Award SPECIAL IDEA 분야 : 광고/마케팅, 영상/UCC')).toBe('7th Da-Ho Award SPECIAL IDEA');
    expect(displayTitle('(은혜준비) 청소년 공모전')).toBe('청소년 공모전');
    expect(displayTitle('(주)루미아 공모전')).toBe('(주)루미아 공모전');
    expect(displayTitle('환경 사진 공모전')).toBe('환경 사진 공모전');
    expect(displayTitle('분야 : 전체')).toBe('분야 : 전체'); // 통째로 지우지 않는다
  });
});

describe('AC-167 비슷한 공고: 같은 분야만, 마감 가까운 순', () => {
  const mk = (slug: string, name: string, deadline: string, category = '공모전') => ({ slug, name, deadline, category, tags: [], rolling: false } as any);
  it('같은 분류만(다른 분류 채우기 없음), 마감순', () => {
    const idx = buildSiteIndex([mk('self', '환경 사진 공모전', '2026-12-10'), mk('a', '기후 사진 공모전', '2026-12-20'), mk('b', '에너지 사진 공모전', '2026-12-01'), mk('x', '창업 지원 사업', '2026-11-30', '지원사업')]);
    const r = idx.related(mk('self', '환경 사진 공모전', '2026-12-10'), 5).map((l) => l.slug);
    expect(r).toEqual(['b', 'a']);
  });
});

describe('AC-164 check 건수', () => {
  it('쉼표, 숨김 문장 없음', () => {
    const many = Array.from({ length: 1260 }, (_, i) => i);
    const c = checkerCounts({ 맞음: many, '확인 필요': [1, 2], '안 맞음': [1] } as any);
    expect(c.ok).toBe('1,260건');
    expect(c.rest).toBe('확인이 필요한 공고 2건');
    expect(checkerCounts({ 맞음: [1], '확인 필요': [], '안 맞음': [] } as any).rest).toBe('');
  });
});

describe('AC-159 공개 목록은 중복 한 줄', () => {
  it('listings에 제목·마감이 같은 쌍이 없다', async () => {
    process.env.GK_TODAY = '2026-11-24';
    const m = await import('../src/adapters/site/data.ts');
    const keys = m.listings.map((l) => `${l.name.replace(/[\s\p{P}\p{S}]/gu, '').toLowerCase()}|${l.deadline ?? ''}`);
    expect(new Set(keys).size).toBe(keys.length);
    expect(m.allListings.length).toBeGreaterThan(m.listings.length); // 상세 주소는 전부 남는다
  });
});

describe('AC-159 자격 찾기도 같은 오늘 판정', () => {
  it('isPastRow: 날짜 지남·오늘인데 시각 지남만 과거', () => {
    expect(isPastRow({ d: '2026-11-23', t: undefined }, '2026-11-24', '10:00')).toBe(true);
    expect(isPastRow({ d: '2026-11-24', t: '09:00' }, '2026-11-24', '10:00')).toBe(true);
    expect(isPastRow({ d: '2026-11-24', t: '18:00' }, '2026-11-24', '10:00')).toBe(false);
    expect(isPastRow({ d: '2026-11-24', t: undefined }, '2026-11-24', '23:59')).toBe(false);
    expect(isPastRow({ d: null, t: undefined }, '2026-11-24', '10:00')).toBe(false);
  });
});

describe('AC-159 홈 총수 표는 날짜+시각', () => {
  it('오늘 시각이 지난 항목도 뺀다(2026-11-24 17:30 KST 주입)', () => {
    const a: Record<string, string> = { 'data-hist': JSON.stringify({ '2026-11-23': 4, '2026-11-24 15:00': 2, '2026-11-24 18:00': 1, '2026-11-24': 3, '2026-11-25': 5 }), 'data-total': '1000' };
    const el = { hidden: false, textContent: '1,000', getAttribute: (k: string) => a[k] ?? null, classList: { contains: () => false, toggle() {} } } as any;
    const els: any = { '[data-deadline]': [], '[data-closed-href]': [], '[data-closed-show]': [], '[data-row-deadline]': [], '[data-count]': [], '[data-empty]': [], '[data-hist]': [el] };
    new Function('document', 'Intl', 'Date', DAY_SCRIPT.replace(/new Date\(\)/g, "new Date('2026-11-24T08:30:00Z')"))({ querySelectorAll: (s: string) => els[s] ?? [] }, Intl, Date);
    expect(el.textContent).toBe('994'); // 1000 - 4(어제) - 2(15:00 지남)
  });
});
