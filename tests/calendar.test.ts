import { describe, it, expect } from 'vitest';
import { deadlineEvent, serializeCalendar, foldLine, escapeText, googleAddUrl, googleSubscribeUrl, webcalUrl } from '../src/domain/ics.ts';
import { buildCalendarFeeds } from '../src/application/calendarFeeds.ts';
import type { PublicListing } from '../src/domain/listing.ts';

const SITE = 'https://gonggo-pages.vercel.app';
const mk = (o: Partial<PublicListing>): PublicListing => ({
  slug: 'x-1', name: '테스트 공모전', category: '공모전', kind: '공모', deadline: '2026-10-30', deadlineTime: null, rolling: false,
  url: 'https://example.org/a?b=1&c=2', organizer: null, prize: null, eligibilityQuote: null, tags: [], constraints: {} as any,
  clauses: [], aiUse: 'UNSTATED', ...o,
});
const bytes = (s: string) => new TextEncoder().encode(s).length;
const unfold = (s: string) => s.replace(/\r\n /g, '');

describe('AC-19 마감 일정', () => {
  it('종일 일정·다음 날 DTEND·시각은 제목에', () => {
    const ev = deadlineEvent(mk({ deadlineTime: '23:59' }), SITE);
    const ics = serializeCalendar({ name: 't', events: [ev], stamp: '2026-10-06' });
    expect(ics).toContain('DTSTART;VALUE=DATE:20261030\r\n');
    expect(ics).toContain('DTEND;VALUE=DATE:20261031\r\n');
    expect(unfold(ics)).toContain('SUMMARY:[마감] 테스트 공모전 23:59\r\n');
  });
  it('12-31 마감은 다음 해 0101, 2월 말 넘김', () => {
    expect(serializeCalendar({ name: 't', events: [deadlineEvent(mk({ deadline: '2026-12-31' }), SITE)], stamp: '2026-10-06' })).toContain('DTEND;VALUE=DATE:20270101');
    expect(serializeCalendar({ name: 't', events: [deadlineEvent(mk({ deadline: '2027-02-28' }), SITE)], stamp: '2026-10-06' })).toContain('DTEND;VALUE=DATE:20270301');
  });
  it('마감일 없으면 일정 없음', () => {
    expect(deadlineEvent(mk({ deadline: null, rolling: true }), SITE)).toBeNull();
  });
});

describe('AC-20 직렬화 규칙', () => {
  const ev = deadlineEvent(mk({ name: '제18회 한국고전종합DB 활용 공모전, 고전명구; 부문\\특별\n둘째 줄 아주 아주 긴 이름입니다 아주 아주 긴 이름입니다', prize: '총상금 1,000만 원' }), SITE)!;
  const ics = serializeCalendar({ name: '전체 마감', events: [ev], stamp: '2026-10-06', alarmDaysBefore: 3 });
  it('CRLF·모든 줄 ≤75옥텟', () => {
    expect(ics.endsWith('\r\n')).toBe(true);
    expect(ics.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
    for (const line of ics.split('\r\n')) expect(bytes(line), line).toBeLessThanOrEqual(75);
  });
  it('펴면 원문 그대로(이스케이프 포함)', () => {
    expect(unfold(ics)).toContain('SUMMARY:[마감] 제18회 한국고전종합DB 활용 공모전\\, 고전명구\; 부문\\\\특별\\n둘째 줄');
  });
  it('escapeText·foldLine 단위', () => {
    expect(escapeText('a,b;c\\d\ne')).toBe('a\\,b\;c\\\\d\\ne');
    const f = foldLine('DESCRIPTION:' + '가'.repeat(60));
    for (const l of f.split('\r\n')) expect(bytes(l)).toBeLessThanOrEqual(75);
    expect(f.replace(/\r\n /g, '')).toBe('DESCRIPTION:' + '가'.repeat(60));
  });
  it('필수 속성·VALARM 3일 전', () => {
    for (const k of ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:전체 마감', 'BEGIN:VEVENT', 'UID:x-1@gonggo', 'DTSTAMP:20261006T000000Z', 'TRIGGER:-P3D', 'END:VCALENDAR'])
      expect(unfold(ics)).toContain(k);
  });
});

describe('C4 루프 링크', () => {
  it('DESCRIPTION·URL에 상세 절대 주소 + ?from=cal, 원문 링크', () => {
    const ics = unfold(serializeCalendar({ name: 't', events: [deadlineEvent(mk({}), SITE)!], stamp: '2026-10-06' }));
    expect(ics).toContain(`URL:${SITE}/g/x-1/?from=cal`);
    expect(ics).toMatch(/DESCRIPTION:[^\r]*https:\/\/gonggo-pages\.vercel\.app\/g\/x-1\/\?from=cal/);
    expect(ics).toMatch(/DESCRIPTION:[^\r]*https:\/\/example\.org\/a\?b=1&c=2/);
  });
});

describe('구글·webcal 링크', () => {
  it('googleAddUrl: 템플릿·dates·details에 상세 링크', () => {
    const u = new URL(googleAddUrl(deadlineEvent(mk({}), SITE)!));
    expect(u.origin + u.pathname).toBe('https://calendar.google.com/calendar/render');
    expect(u.searchParams.get('action')).toBe('TEMPLATE');
    expect(u.searchParams.get('dates')).toBe('20261030/20261031');
    expect(u.searchParams.get('text')).toBe('[마감] 테스트 공모전');
    expect(u.searchParams.get('details')).toContain(`${SITE}/g/x-1/?from=cal`);
  });
  it('구독 링크', () => {
    expect(webcalUrl('https://h.io/cal/all.ics')).toBe('webcal://h.io/cal/all.ics');
    const g = new URL(googleSubscribeUrl('https://h.io/cal/all.ics'));
    expect(g.searchParams.get('cid')).toBe('webcal://h.io/cal/all.ics');
  });
});

describe('AC-21 피드 구성', () => {
  const ls = [
    mk({ slug: 'a', deadline: '2026-10-06' }),
    mk({ slug: 'b', deadline: '2026-10-05' }),
    mk({ slug: 'c', deadline: null, rolling: true }),
    mk({ slug: 'd', deadline: '2026-11-01', category: '해커톤', tags: ['대학생'] }),
    mk({ slug: 'e', deadline: '2026-10-08', category: '지원사업', tags: ['창업자'] }),
  ];
  const feeds = buildCalendarFeeds(ls, '2026-10-06');
  const get = (s: string) => feeds.find((f) => f.slug === s)!;
  it('전체: 오늘 마감 포함·어제·상시 제외', () => {
    expect(get('all').items.map((l) => l.slug)).toEqual(['a', 'e', 'd']);
  });
  it('90일 창: 91일 뒤 마감은 피드에서 빠진다', () => {
    const f = buildCalendarFeeds([mk({ slug: 'p', deadline: '2027-01-04' }), mk({ slug: 'q', deadline: '2027-01-05' })], '2026-10-06');
    expect(f.find((x) => x.slug === 'all')!.items.map((l) => l.slug)).toEqual(['p']);
  });
  it('피드 일정은 짧은 설명(안내 문장 생략), 단건은 안내 포함', () => {
    expect(deadlineEvent(mk({}), SITE, { brief: true })!.description).not.toContain('원문이 기준');
    expect(deadlineEvent(mk({}), SITE)!.description).toContain('원문이 기준');
  });
  it('분류·태그·이번 주 창업, 빈 피드는 만들지 않는다', () => {
    expect(get('hackathon').items.map((l) => l.slug)).toEqual(['d']);
    expect(get('student').items.map((l) => l.slug)).toEqual(['d']);
    expect(get('founder-week').items.map((l) => l.slug)).toEqual(['e']);
    expect(feeds.find((f) => f.slug === 'scholarship')).toBeUndefined();
  });
});
