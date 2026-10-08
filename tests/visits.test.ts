import { describe, it, expect } from 'vitest';
import { isHumanUserAgent } from '../src/domain/visitor.ts';
import { countProVisits, countLandings } from '../src/application/visitCount.ts';

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1';
const GBOT = 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.8010.52 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const GOTHER = 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.8010.52 Mobile Safari/537.36 (compatible; GoogleOther)';
const OAI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36; compatible; OAI-SearchBot/1.3';

describe('사람 UA 규칙', () => {
  it('브라우저는 사람, 봇·도구·빈 UA는 아님', () => {
    expect(isHumanUserAgent(CHROME)).toBe(true);
    expect(isHumanUserAgent(IPHONE)).toBe(true);
    for (const ua of [GBOT, GOTHER, OAI, 'curl/8.7.1', 'Mozilla/5.0', '', 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.4; +https://openai.com/gptbot)',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36', 'Scrapy/2.17.0 (+https://scrapy.org)'])
      expect(isHumanUserAgent(ua), ua).toBe(false);
  });
});

const line = (t: string, ip: string, path: string, ref: string, ua: string, st = 204) => `${t} ${ip} "GET ${path} HTTP/1.1" ${st} "${ref}" "${ua}"`;
const PRO = 'https://gonggo.oaksoo.com/pro/?from=g';
describe('AC-49 /pro 사람 방문(intent.log)', () => {
  const log = [
    line('2026-10-06T11:51:08+00:00', '1.1.1.1', '/intent/pro/view/H2', PRO, IPHONE), // D0 이전
    line('2026-10-07T06:03:10+00:00', '66.249.73.65', '/intent/pro/view/H1', PRO, GBOT),
    line('2026-10-07T07:03:10+00:00', '66.249.73.65', '/intent/pro/view/H1', PRO, GOTHER),
    line('2026-10-07T08:03:10+00:00', '74.7.242.174', '/intent/pro/view/H1', PRO, OAI),
    line('2026-10-07T09:00:00+00:00', '9.9.9.9', '/intent/pro/view/H1', '-', CHROME), // 직접 호출
    line('2026-10-07T09:10:00+00:00', '211.57.11.128', '/intent/pro/view/H1', PRO, CHROME), // 운영자
    line('2026-10-08T01:00:00+00:00', '8.8.4.4', '/intent/pro/view/H2', PRO, CHROME),
    line('2026-10-08T01:00:05+00:00', '8.8.4.4', '/intent/pro/view/H2', PRO, CHROME), // 같은 사람 같은 날
    line('2026-10-08T01:00:09+00:00', '8.8.4.4', '/intent/pro/price/H2', PRO, CHROME),
    'garbage line',
  ].join('\n');
  it('사람 1명·H2·가격 클릭 1', () => {
    const r = countProVisits(log, { since: '2026-10-07', selfIps: ['211.57.11.128'] });
    expect(r.view).toBe(1);
    expect(r.price).toBe(1);
    expect(r.request).toBe(0);
    expect(r.byArm).toEqual({ H1: 0, H2: 1 });
    expect(r.byDay).toEqual({ '2026-10-08': 1 });
  });
});

const edge = (o: { ts: number; ip: string; uri: string; ua: string; host?: string; al?: string; sf?: string; ref?: string; status?: number }) => JSON.stringify({
  ts: o.ts, status: o.status ?? 200,
  request: { client_ip: o.ip, method: 'GET', host: o.host ?? 'gonggo.oaksoo.com', uri: o.uri, headers: {
    'User-Agent': [o.ua], ...(o.al ? { 'Accept-Language': [o.al] } : {}), ...(o.sf ? { 'Sec-Fetch-Mode': [o.sf] } : {}), ...(o.ref ? { Referer: [o.ref] } : {}) } },
});
describe('AC-50 무료 페이지 사람 착지(엣지 로그)', () => {
  const T = 1791378000; // 2026-10-08 KST
  const lines = [
    edge({ ts: T, ip: '39.126.193.97', uri: '/c/contest/?utm_source=chatgpt.com', ua: CHROME, al: 'ko', sf: 'navigate' }),
    edge({ ts: T + 5, ip: '39.126.193.97', uri: '/favicon.svg', ua: CHROME, al: 'ko', sf: 'no-cors' }),
    edge({ ts: T + 9, ip: '39.126.193.97', uri: '/g/a/', ua: CHROME, al: 'ko', sf: 'navigate', ref: 'https://gonggo.oaksoo.com/c/contest/' }),
    edge({ ts: T + 60, ip: '1.2.3.4', uri: '/g/b/', ua: IPHONE, al: 'ko-KR', sf: 'navigate', ref: 'https://www.google.com/' }),
    edge({ ts: T + 70, ip: '5.5.5.5', uri: '/', ua: CHROME, al: 'en-US', sf: 'navigate' }),
    edge({ ts: T + 71, ip: '5.5.5.5', uri: '/.env', ua: CHROME, al: 'en-US', sf: 'navigate', status: 404 }), // 스캐너
    edge({ ts: T + 80, ip: '6.6.6.6', uri: '/', ua: CHROME }), // Accept-Language 없음
    edge({ ts: T + 90, ip: '4.4.4.4', uri: '/', ua: CHROME, al: 'en-US,en;q=0.9', sf: 'navigate' }), // 한국어 아님(데이터센터 헤드리스가 흔히 이렇게 온다)
    ...Array.from({ length: 31 }, (_, i) => edge({ ts: T + 100 + i, ip: '7.7.7.7', uri: `/g/${i}/`, ua: CHROME, al: 'en', sf: 'navigate' })), // 크롤
    edge({ ts: T + 200, ip: '8.8.8.8', uri: '/', ua: CHROME, al: 'ko', sf: 'navigate', host: 'gonggo.43-202-151-104.sslip.io' }), // 옛 호스트
    edge({ ts: T + 300, ip: '211.57.11.128', uri: '/', ua: CHROME, al: 'ko', sf: 'navigate' }), // 운영자
    edge({ ts: T + 400, ip: '9.9.9.9', uri: '/', ua: GBOT, al: 'ko', sf: 'navigate' }),
  ].join('\n');
  it('사람 2명, 유입원 chatgpt 1·google 1', () => {
    const r = countLandings(lines, { since: '2026-10-07', selfIps: ['211.57.11.128'], host: 'gonggo.oaksoo.com' });
    expect(r.visitors).toBe(2);
    expect(r.pageviews).toBe(3);
    expect(r.bySource).toEqual({ chatgpt: 1, google: 1 });
  });
});
