import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { appDoor, TOSS_MINIAPP_URL } from '../src/domain/tossLink.ts';
import { countAppCardClicks, countAppCardBySurface, surfaceOf, countLandings } from '../src/application/visitCount.ts';

// SPEC §33 AC-126~129
describe('AC-126 문 appDoor', () => {
  const d = appDoor();
  it('href는 첫 화면 공식 링크, 문구는 「토스에서 공고콕 써보기」', () => {
    expect(d.href).toBe(TOSS_MINIAPP_URL);
    expect(d.label).toBe('토스에서 공고콕 써보기');
  });
  it('토스 로고·제휴·공식·인증 표현 0, 딥링크 없음', () => {
    const all = JSON.stringify(d);
    expect(all).not.toMatch(/제휴|공식|인증|로고|intoss:/);
    expect(d).not.toHaveProperty('deep');
  });
  it('AC-127 PC 안내 한 줄', () => {
    expect(d.pcNote).toBe('휴대폰의 토스 앱에서 열려요');
  });
  it('AC-128 ping과 data-intent는 같은 경로 /intent/app-card', () => {
    expect(d.ping).toBe('/intent/app-card');
    expect(d.intent).toBe('/intent/app-card');
  });
});

const CHROME = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1';
const HEADLESS = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36';
const O = 'https://gonggo.oaksoo.com';
const row = (t: string, ip: string, method: string, ref: string, ua: string, st = 204) => `${t} ${ip} "${method} /intent/app-card HTTP/1.1" ${st} "${ref}" "${ua}"`;
const opts = { since: '2026-11-24', selfIps: ['10.0.0.9'] };

describe('AC-128 문 클릭 집계', () => {
  const log = [
    row('2026-11-24T01:00:00+00:00', '1.1.1.1', 'POST', `${O}/g/abc/`, IPHONE), // ping
    row('2026-11-24T01:00:00+00:00', '1.1.1.1', 'GET', `${O}/g/abc/`, IPHONE),  // 같은 클릭의 비콘 — 한 번만
    row('2026-11-24T02:00:00+00:00', '2.2.2.2', 'GET', `${O}/`, CHROME),
    row('2026-11-24T02:05:00+00:00', '3.3.3.3', 'GET', `${O}/pro/`, CHROME),
    row('2026-11-24T02:10:00+00:00', '4.4.4.4', 'GET', `${O}/g/abc/read/`, IPHONE),
    row('2026-11-24T03:00:00+00:00', '10.0.0.9', 'GET', `${O}/g/abc/`, IPHONE), // 운영자
    row('2026-11-24T03:01:00+00:00', '5.5.5.5', 'GET', `${O}/g/abc/`, HEADLESS), // 헤드리스
    row('2026-11-24T03:02:00+00:00', '6.6.6.6', 'GET', `${O}/g/abc/?gk_test=1`, IPHONE), // 우리 시험
    row('2026-11-23T03:02:00+00:00', '7.7.7.7', 'GET', `${O}/g/abc/`, IPHONE), // 기준일 이전
    row('2026-11-24T04:00:00+00:00', '8.8.8.8', 'GET', `${O}/g/abc/`, IPHONE, 404),
  ].join('\n');
  it('한 클릭(ping+비콘)은 1, 운영자·헤드리스·gk_test·기준일 전·비204는 뺀다', () => {
    expect(countAppCardClicks(log, opts)).toBe(4);
  });
  it('면별: 상세·읽는 법·홈·/pro', () => {
    expect(countAppCardBySurface(log, opts)).toEqual({ detail: 1, read: 1, home: 1, pro: 1 });
  });
  it('surfaceOf', () => {
    expect(surfaceOf(`${O}/g/x-1/`)).toBe('detail');
    expect(surfaceOf(`${O}/g/x-1/read/`)).toBe('read');
    expect(surfaceOf(`${O}/`)).toBe('home');
    expect(surfaceOf(`${O}/pro/?from=g`)).toBe('pro');
    expect(surfaceOf(`${O}/c/contest/`)).toBe('other');
    expect(surfaceOf('-')).toBe('none');
  });
});

describe('AC-129 모바일 상세 보기', () => {
  const caddy = (ip: string, uri: string, ua: string) => JSON.stringify({ ts: 1795500000, status: 200, request: { client_ip: ip, host: 'gonggo.oaksoo.com', method: 'GET', uri, headers: { 'User-Agent': [ua], 'Accept-Language': ['ko-KR'], 'Sec-Fetch-Mode': ['navigate'], Referer: ['https://www.google.com/'] } } });
  it('휴대폰 UA의 /g/<slug>/ 착지만 센다(읽는 법·PC 제외)', () => {
    const t = [caddy('1.1.1.1', '/g/a/', IPHONE), caddy('2.2.2.2', '/g/b/', CHROME), caddy('3.3.3.3', '/g/a/read/', IPHONE), caddy('4.4.4.4', '/', IPHONE)].join('\n');
    const r = countLandings(t, { since: '2026-11-01', selfIps: [] });
    expect(r.mobileDetailViews).toBe(1);
  });
  it('/pro 원천 — 문 두 개 문구, 토스 그래픽·가격 낱말 0', () => {
    const src = readFileSync('src/pro/pro.astro', 'utf8');
    expect(src).toContain('공고콕, 토스 앱에서도 써 보세요');
    expect(src).not.toMatch(/static\.toss\.im|19,900|창립가/);
  });
});
