import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { findForbidden } from '../../src/domain/privacy.ts';
import { buildCalendarFeeds } from '../../src/application/calendarFeeds.ts';

// SPEC §11 마감 캘린더 루프 — 빌드 산출물 검사(AC-22·23, C1~C4·C6)
const data = JSON.parse(readFileSync('data/listings.json', 'utf8'));
const listings = data.listings as any[];
const dated = listings.filter((l) => l.deadline);
const walk = (d: string): string[] => readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? walk(join(d, f)) : [join(d, f)]));
const icsFiles = walk('dist/cal').filter((f) => f.endsWith('.ics'));
const unfold = (s: string) => s.replace(/\r\n /g, '');
const bytes = (s: string) => Buffer.byteLength(s, 'utf8');

describe('C1 상세 페이지 캘린더 추가', () => {
  it('마감일 있는 공고 100%에 구글 템플릿 링크·.ics 파일', () => {
    let ok = 0;
    for (const l of dated) {
      const page = readFileSync(`dist/g/${l.slug}/index.html`, 'utf8');
      const d = l.deadline.replace(/-/g, '');
      if (page.includes('calendar.google.com/calendar/render?action=TEMPLATE') && page.includes(`dates=${d}%2F`) && page.includes(`/cal/g/${l.slug}.ics`) && existsSync(`dist/cal/g/${l.slug}.ics`)) ok++;
    }
    expect(ok).toBe(dated.length);
  });
  it('상시 공고 페이지엔 없다', () => {
    for (const l of listings.filter((x) => !x.deadline)) {
      expect(readFileSync(`dist/g/${l.slug}/index.html`, 'utf8')).not.toContain('내 캘린더에 마감 넣기');
    }
  });
});

describe('C2 구독 피드', () => {
  const feeds = buildCalendarFeeds(listings, data.generatedAt);
  it('피드마다 VEVENT 수 = 목록 공고 수, ≤1MB', () => {
    expect(feeds.length).toBeGreaterThanOrEqual(5);
    for (const f of feeds) {
      const s = readFileSync(`dist/cal/${f.slug}.ics`, 'utf8');
      expect((s.match(/BEGIN:VEVENT/g) ?? []).length, f.slug).toBe(f.items.length);
      expect(bytes(s), f.slug).toBeLessThanOrEqual(1024 * 1024);
    }
  });
  it('홈·분류·태그·이번 주에 구독 상자', () => {
    expect(readFileSync('dist/index.html', 'utf8')).toContain('/intent/cal/sub/all');
    for (const f of feeds.filter((x) => x.slug !== 'all')) {
      const p = f.slug === 'founder-week' ? 'dist/week/index.html' : existsSync(`dist/c/${f.slug}/index.html`) ? `dist/c/${f.slug}/index.html` : `dist/t/${f.slug}/index.html`;
      const page = readFileSync(p, 'utf8');
      expect(page, p).toContain(`/intent/cal/sub/${f.slug}`);
      expect(page, p).toContain('calendar.google.com/calendar/r?cid=webcal');
    }
  });
});

describe('C3·C4·C6 모든 .ics', () => {
  it('CRLF·≤75옥텟·UID 고유·상세 링크 ?from=cal·금지 토큰 0', () => {
    expect(icsFiles.length).toBe(dated.length + buildCalendarFeeds(listings, data.generatedAt).length);
    for (const f of icsFiles) {
      const s = readFileSync(f, 'utf8');
      expect(s.replace(/\r\n/g, ''), f).not.toMatch(/[\r\n]/);
      for (const line of s.split('\r\n')) expect(bytes(line), f).toBeLessThanOrEqual(75);
      const u = unfold(s);
      const uids = u.match(/^UID:.*$/gm) ?? [];
      expect(new Set(uids).size, f).toBe(uids.length);
      const ev = (u.match(/BEGIN:VEVENT/g) ?? []).length;
      expect((u.match(/^URL:https:\/\/[^\r]+\/g\/[a-z0-9-]+\/\?from=cal\r?$/gm) ?? []).length, f).toBe(ev);
      expect(findForbidden(u), f).toEqual([]);
    }
  }, 60_000); // .ics 1,600여 개 전수 — 다른 산출물 테스트와 병렬이면 5초를 넘는다(2026-10-06 6.2s 관측)
  it('sitemap엔 .ics 없음', () => {
    expect(readFileSync('dist/sitemap.xml', 'utf8')).not.toContain('.ics');
  });
});
