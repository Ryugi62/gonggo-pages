import { describe, it, expect } from 'vitest';
import { buildSiteIndex, deadlineWeek } from '../src/application/buildSiteIndex.ts';
import { sitemapXml, robotsTxt } from '../src/application/sitemap.ts';
import { exportPublicListings } from '../src/application/exportPublicListings.ts';
import { rows, TODAY } from './fixtures/rows.ts';

const listings = exportPublicListings(rows as any, TODAY).listings;

describe('UC-2 사이트 색인', () => {
  it('마감 주 = 그 주 월요일', () => {
    expect(deadlineWeek('2026-10-02')).toBe('2026-09-28');
    expect(deadlineWeek('2026-10-05')).toBe('2026-10-05');
    expect(deadlineWeek('2026-10-11')).toBe('2026-10-05');
  });
  it('분류·주·태그별로 묶고 마감 임박순(상시는 맨 뒤)', () => {
    const idx = buildSiteIndex(listings);
    expect(idx.byCategory.get('공모전')!.map((l) => l.name)).toEqual(['2026 대학생 AI 아이디어 공모전', '전국민 사진 공모전', '치과 홍보 카피 공모전', '조건불가 공모']);
    expect(idx.byWeek.get('2026-09-28')!.length).toBe(1);
    expect(idx.byTag.get('대학생')!.length).toBe(1);
    expect(idx.sorted.at(-1)!.rolling).toBe(true);
  });
  it('관련 공고: 자기 자신 제외, 최대 6', () => {
    const idx = buildSiteIndex(listings);
    const l = listings[0];
    const rel = idx.related(l);
    expect(rel.find((x) => x.slug === l.slug)).toBeUndefined();
    expect(rel.length).toBeLessThanOrEqual(6);
    expect(rel.length).toBeGreaterThan(0);
  });
});

describe('UC-4 sitemap·robots', () => {
  it('절대 URL·중복 없음', () => {
    const xml = sitemapXml('https://x.test', ['/', '/g/a/', '/g/a/'], '2026-10-02');
    expect(xml).toContain('<loc>https://x.test/g/a/</loc>');
    expect(xml.match(/<url>/g)!.length).toBe(2);
    expect(xml.startsWith('<?xml')).toBe(true);
  });
  it('robots는 sitemap을 가리킨다', () => {
    expect(robotsTxt('https://x.test')).toContain('Sitemap: https://x.test/sitemap.xml');
  });
});

describe('관련 공고 순서', () => {
  it('같은 분류에서 마감일이 가까운 순', () => {
    const mk = (n: string, d: string) => ({ slug: n, name: n, category: '해커톤', kind: '해커톤', deadline: d, deadlineTime: null, rolling: false, url: 'https://x/' + n, organizer: null, prize: null, eligibilityQuote: null, tags: [], constraints: { minAge: null, maxAge: null, studentOnly: false, region: null, business: null, open: false } }) as any;
    const ls = [mk('a', '2026-10-03'), mk('b', '2027-04-20'), mk('c', '2027-04-25'), mk('d', '2028-03-27')];
    const idx = buildSiteIndex(ls);
    expect(idx.related(ls[2]).map((x) => x.slug)).toEqual(['b', 'a', 'd']);
  });
});
