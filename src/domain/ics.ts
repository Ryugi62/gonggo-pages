import type { PublicListing } from './listing.ts';

// 마감 캘린더 루프(SPEC §11) — RFC 5545 직렬화와 캘린더 링크. 순수 함수(I/O 없음).

export interface DeadlineEvent {
  uid: string;
  date: string; // YYYY-MM-DD (종일)
  summary: string;
  description: string;
  url: string; // 상세 페이지 + ?from=cal
}

const enc = new TextEncoder();
const compact = (d: string) => d.replace(/-/g, '');

export function nextDay(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** 한 줄을 75옥텟 이하로 접는다(이어지는 줄은 공백 1칸으로 시작, UTF-8 문자를 자르지 않음). */
export function foldLine(line: string): string {
  const out: string[] = [];
  let cur = '';
  let curBytes = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // 이어지는 줄은 앞 공백 1옥텟
    if (curBytes + b > limit) {
      out.push(cur);
      cur = '';
      curBytes = 0;
    }
    cur += ch;
    curBytes += b;
  }
  out.push(cur);
  return out.map((l, i) => (i === 0 ? l : ' ' + l)).join('\r\n');
}

export function detailUrl(site: string, slug: string): string {
  return `${site.replace(/\/$/, '')}/g/${slug}/?from=cal`;
}

export function deadlineEvent(l: PublicListing, site: string, opts: { brief?: boolean } = {}): DeadlineEvent | null {
  if (!l.deadline) return null;
  const url = detailUrl(site, l.slug);
  const when = `${l.deadline}${l.deadlineTime ? ' ' + l.deadlineTime : ''}`;
  const description = [
    `마감 ${when}${l.prize ? ` · ${l.prize}` : ''}${l.organizer ? ` · 주최 ${l.organizer}` : ''}`,
    `자격·조항 정리(공고콕): ${url}`,
    `원문 공고: ${l.url}`,
    ...(opts.brief ? [] : ['지원 전 원문 공고를 꼭 확인하세요. 원문이 기준이에요.']),
  ].join('\n');
  return {
    uid: `${l.slug}@gonggo`,
    date: l.deadline,
    summary: `[마감] ${l.name}${l.deadlineTime ? ' ' + l.deadlineTime : ''}`,
    description,
    url,
  };
}

export interface CalendarInput {
  name: string;
  events: (DeadlineEvent | null)[];
  stamp: string; // YYYY-MM-DD (DTSTAMP — 빌드 기준일, 결정적 출력)
  alarmDaysBefore?: number;
}

export function serializeCalendar({ name, events, stamp, alarmDaysBefore }: CalendarInput): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//gonggo//deadline calendar//KO',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(name)}`,
    'X-WR-TIMEZONE:Asia/Seoul',
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
  ];
  for (const ev of events) {
    if (!ev) continue;
    lines.push(
      'BEGIN:VEVENT',
      `UID:${ev.uid}`,
      `DTSTAMP:${compact(stamp)}T000000Z`,
      `DTSTART;VALUE=DATE:${compact(ev.date)}`,
      `DTEND;VALUE=DATE:${compact(nextDay(ev.date))}`,
      `SUMMARY:${escapeText(ev.summary)}`,
      `DESCRIPTION:${escapeText(ev.description)}`,
      `URL:${ev.url}`,
      'TRANSP:TRANSPARENT',
    );
    if (alarmDaysBefore) {
      lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(ev.summary)}`, `TRIGGER:-P${alarmDaysBefore}D`, 'END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

export function googleAddUrl(ev: DeadlineEvent): string {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.summary,
    dates: `${compact(ev.date)}/${compact(nextDay(ev.date))}`,
    details: ev.description,
    ctz: 'Asia/Seoul',
  });
  return `https://calendar.google.com/calendar/render?${p.toString()}`;
}

export function webcalUrl(httpsUrl: string): string {
  return httpsUrl.replace(/^https?:\/\//, 'webcal://');
}

export function googleSubscribeUrl(feedUrl: string): string {
  return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl(feedUrl))}`;
}
