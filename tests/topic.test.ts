import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { topicsOf, isAudition } from '../src/domain/topic.ts';
import { buildSiteIndex } from '../src/application/buildSiteIndex.ts';

// SPEC §32 AC-117 — 비슷한 공고는 같은 세부 분야(주제어) 우선, 같은 유형 열린 공고로 채움(마감일만 같은 공고 금지)
const mk = (slug: string, name: string, deadline = '2026-12-01', extra: Record<string, unknown> = {}) => ({
  slug, name, category: '공모전', kind: '대회', deadline, deadlineTime: null, rolling: false,
  url: `https://x.test/${slug}`, organizer: null, prize: null, eligibilityQuote: null, tags: [],
  constraints: { minAge: null, maxAge: null, studentOnly: false, region: null, business: null, open: true }, clauses: [], aiUse: 'UNSTATED', ...extra,
}) as any;

describe('topicsOf / isAudition', () => {
  it('공개 필드(이름)에서 세부 분야', () => {
    expect(topicsOf(mk('a', '감귤 디저트 요리대회'))).toContain('요리');
    expect(topicsOf(mk('b', '2027 신춘문예 시·소설 공모'))).toContain('문학');
    expect(topicsOf(mk('c', '환경 사진 공모전'))).toEqual(expect.arrayContaining(['사진', '환경']));
    expect(topicsOf(mk('d', '무명 공모'))).toEqual([]);
  });
  it('오디션·캐스팅류 판별', () => {
    expect(isAudition(mk('e', '뮤지컬 아역 배우 오디션'))).toBe(true);
    expect(isAudition(mk('f', '신인 모델 캐스팅 공고'))).toBe(true);
    expect(isAudition(mk('g', '환경 사진 공모전'))).toBe(false);
  });
});

describe('related — 표본 3건 대조', () => {
  const pool = [
    mk('cook2', '전국 요리 경연대회', '2026-12-20'), mk('cook3', '청년 레시피 공모', '2026-12-28'),
    mk('poem', '신춘문예 시 공모', '2026-11-25'), mk('photo', '환경 사진 공모전', '2026-11-25'), mk('novel', '청소년 소설 문학상', '2026-11-25'),
    mk('aud1', '뮤지컬 아역 배우 오디션', '2026-11-25'), mk('aud2', '드라마 배우 캐스팅 오디션', '2026-12-30'),
    mk('x1', '무명 공모 하나', '2026-11-25'), mk('x2', '무명 공모 둘', '2026-11-26'),
  ];
  const idx = buildSiteIndex(pool);
  it('요리대회 → 같은 요리 주제가 먼저(마감일이 같은 문학·사진보다 앞)', () => {
    const r = idx.related(mk('cook1', '감귤 디저트 요리대회', '2026-11-25'), 3).map((l) => l.slug);
    expect(r.slice(0, 2).sort()).toEqual(['cook2', 'cook3']);
  });
  it('오디션 → 오디션끼리 먼저', () => { expect(idx.related(mk('aud0', '청소년 연극 오디션', '2026-11-25'), 2).map((l) => l.slug)).toContain('aud1'); });
  it('§37 AC-167: 같은 주제만 — 모자라도 다른 주제로 채우지 않는다', () => {
    const r = idx.related(mk('poem0', '시 낭송 대회', '2026-11-25'), 5);
    expect(r.map((l) => l.slug)).toContain('poem');
    expect(r.length).toBeLessThanOrEqual(5);
  });
});

describe('실제 데이터 표본 3건 — 첫 비슷한 공고가 같은 주제', () => {
  const all = JSON.parse(readFileSync('data/listings.json', 'utf8')).listings as any[];
  const today = JSON.parse(readFileSync('data/listings.json', 'utf8')).generatedAt as string;
  const open = all.filter((l) => l.rolling || (l.deadline && l.deadline >= today));
  const idx = buildSiteIndex(open);
  it('주제가 있는 공고 표본 3건: 열린 공고에 같은 주제가 있으면 첫 칸은 반드시 그 주제', () => {
    const withTopic = all.filter((l) => topicsOf(l).length).filter((l) => open.some((o) => o.slug !== l.slug && o.category === l.category && topicsOf(o).some((t) => topicsOf(l).includes(t))));
    expect(withTopic.length).toBeGreaterThan(50);
    for (const l of [withTopic[0], withTopic[Math.floor(withTopic.length / 2)], withTopic[withTopic.length - 1]]) {
      const first = idx.related(l, 5)[0];
      expect(topicsOf(first).some((t) => topicsOf(l).includes(t)), `${l.name} → ${first.name}`).toBe(true);
    }
  });
});
