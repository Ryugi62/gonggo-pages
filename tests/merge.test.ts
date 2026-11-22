import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { mergeListings } from '../src/application/mergeListings.ts';
import { isOpen, quoteDeadlineTime, reconcileDeadlineTime } from '../src/domain/freshness.ts';
import { buildSiteIndex } from '../src/application/buildSiteIndex.ts';
import { PUBLIC_KEYS } from '../src/application/exportPublicListings.ts';

// SPEC §31 — 데이터 신선도: 라이브 URL은 하나도 없애지 않고(9617fee), 지금 열린 공고를 더한다
const mk = (slug: string, deadline: string | null, extra: Record<string, unknown> = {}) => ({
  slug, name: slug, category: '공모전', kind: '대회', deadline, deadlineTime: null, rolling: deadline === null,
  url: `https://x.test/${slug}`, organizer: null, prize: null, eligibilityQuote: null, tags: [],
  constraints: { minAge: null, maxAge: null, studentOnly: false, region: null, business: null, open: true }, clauses: [], aiUse: 'UNSTATED', ...extra,
}) as any;

describe('AC-111 병합 — 소멸 0·새 공고 추가·갱신 덮어쓰기', () => {
  const prev = [mk('old-closed', '2026-11-02'), mk('both', '2026-12-01', { prize: '옛 상금' }), mk('moved-old', '2026-12-05', { url: 'https://x.test/same' })];
  const fresh = [mk('both', '2026-12-01', { prize: '새 상금' }), mk('new-open', '2026-12-20'), mk('moved-new', '2026-12-05', { url: 'https://x.test/same#top', prize: '갱신' })];
  const out = mergeListings(prev, fresh);
  it('옛 slug 집합 ⊇ 보존(소멸 0)', () => {
    const s = new Set(out.map((l) => l.slug));
    for (const p of prev) expect(s.has(p.slug), p.slug).toBe(true);
  });
  it('새 공고는 더해지고 같은 slug는 새 값으로 덮어쓴다', () => {
    expect(out.find((l) => l.slug === 'new-open')).toBeTruthy();
    expect(out.find((l) => l.slug === 'both')!.prize).toBe('새 상금');
  });
  it('같은 원문 주소인데 slug만 다르면 옛 slug를 쓰고 새 slug는 만들지 않는다(중복 페이지 0)', () => {
    expect(out.find((l) => l.slug === 'moved-new')).toBeUndefined();
    expect(out.find((l) => l.slug === 'moved-old')!.prize).toBe('갱신');
  });
  it('slug 중복 0, 공개 허용 키만', () => {
    expect(new Set(out.map((l) => l.slug)).size).toBe(out.length);
    for (const l of out) for (const k of Object.keys(l)) expect(PUBLIC_KEYS as readonly string[]).toContain(k);
  });
  it('다시 병합해도 같다(멱등)', () => { expect(mergeListings(out, fresh)).toEqual(out); });
  it('마감 임박순으로 정렬', () => {
    const d = out.map((l) => l.deadline ?? '9999');
    expect(d).toEqual([...d].sort());
  });
});

describe('isOpen — 열림 = 상시 또는 마감일 ≥ 오늘', () => {
  it('경계', () => {
    expect(isOpen(mk('a', '2026-11-22'), '2026-11-22')).toBe(true);
    expect(isOpen(mk('a', '2026-11-21'), '2026-11-22')).toBe(false);
    expect(isOpen(mk('a', null), '2026-11-22')).toBe(true);
  });
});

describe('AC-112 마감 시각은 원문 인용과 어긋나지 않는다', () => {
  it('날짜 뒤 「18시까지」를 읽는다', () => {
    expect(quoteDeadlineTime('모집기간 : 2026.10.19.(월)~2026.11.2.(월) 18시까지', '2026-11-02')).toBe('18:00');
    expect(quoteDeadlineTime('접수 11월 2일 오후 6시까지', '2026-11-02')).toBe('18:00');
    expect(quoteDeadlineTime('2026.11.2 17:30 마감', '2026-11-02')).toBe('17:30');
  });
  it('다른 날짜 시각이나 시각 없음은 null', () => {
    expect(quoteDeadlineTime('2026.10.19 10시부터 접수', '2026-11-02')).toBeNull();
    expect(quoteDeadlineTime('누구나 지원 가능', '2026-11-02')).toBeNull();
    expect(quoteDeadlineTime(null, '2026-11-02')).toBeNull();
  });
  it('reconcile: 원문 시각이 있으면 그 시각, 없으면 그대로', () => {
    expect(reconcileDeadlineTime(mk('a', '2026-11-02', { deadlineTime: '23:59', eligibilityQuote: '~2026.11.2.(월) 18시까지' })).deadlineTime).toBe('18:00');
    expect(reconcileDeadlineTime(mk('a', '2026-11-02', { deadlineTime: '23:59' })).deadlineTime).toBe('23:59');
  });
});

describe('AC-113 비슷한 공고는 열린 색인에서 n개', () => {
  const open = [mk('o1', '2026-12-01'), mk('o2', '2026-12-02'), mk('o3', '2026-12-03'), mk('o4', '2026-12-04')];
  const idx = buildSiteIndex(open);
  it('마감된 공고에도 열린 것만 n개', () => {
    const closed = mk('c', '2026-11-02');
    const r = idx.related(closed, 3);
    expect(r.length).toBe(3);
    expect(r.every((x) => x.deadline! >= '2026-12-01')).toBe(true);
  });
});

describe('실데이터 — 라이브 스냅숏(9617fee) ⊆ 현재 data/listings.json', () => {
  const live = JSON.parse(execFileSync('git', ['show', '9617fee:data/listings.json'], { maxBuffer: 1 << 28 }).toString()).listings as { slug: string }[];
  const cur = JSON.parse(readFileSync('data/listings.json', 'utf8')) as { generatedAt: string; listings: any[] };
  it('소멸 0', () => {
    const s = new Set(cur.listings.map((l) => l.slug));
    expect(live.filter((l) => !s.has(l.slug)).map((l) => l.slug)).toEqual([]);
  });
  it('정리 기준일이 11/02가 아니고 열린 공고가 1,500건 이상', () => {
    expect(cur.generatedAt > '2026-11-19').toBe(true);
    expect(cur.listings.filter((l) => isOpen(l, cur.generatedAt)).length).toBeGreaterThanOrEqual(1500);
  });
  it('원문 인용에 날짜+시각이 있으면 마감 시각이 같다', () => {
    const bad = cur.listings.filter((l) => l.deadline && quoteDeadlineTime(l.eligibilityQuote, l.deadline) && quoteDeadlineTime(l.eligibilityQuote, l.deadline) !== l.deadlineTime);
    expect(bad.map((l) => l.slug)).toEqual([]);
  });
});
