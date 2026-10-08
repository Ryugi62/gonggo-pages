// 사람 방문 집계(SPEC §15 Q5) — 순수 함수. 로그 원문(텍스트) → 숫자. 읽기(SSH)는 scripts/visits.ts.
import { isHumanUserAgent, SCANNER_PATH } from '../domain/visitor.ts';

export interface CountOptions { since: string; selfIps: string[]; host?: string; origin?: string }

const kstDay = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(d);
const firstIp = (xff: string) => xff.split(',')[0].trim();

// nginx intent 형식: $time_iso8601 $http_x_forwarded_for "$request" $status "$http_referer" "$http_user_agent"
const INTENT = /^(\S+) (.+?) "GET (\/intent\/pro\/(view|price|request)\/(H1|H2)) HTTP\/[\d.]+" (\d{3}) "([^"]*)" "([^"]*)"$/;

export interface ProVisits { view: number; price: number; request: number; byArm: { H1: number; H2: number }; byDay: Record<string, number> }

/** /pro 사람 방문 — 페이지가 쏜 비콘(Referer = 정식 주소 /pro/)만, 같은 (IP, UA, KST 날짜)는 1명 */
export function countProVisits(text: string, o: CountOptions): ProVisits {
  const origin = (o.origin ?? 'https://gonggo.oaksoo.com').replace(/\/$/, '');
  const self = new Set(o.selfIps);
  const seen = { view: new Set<string>(), price: new Set<string>(), request: new Set<string>() };
  const r: ProVisits = { view: 0, price: 0, request: 0, byArm: { H1: 0, H2: 0 }, byDay: {} };
  for (const line of text.split('\n')) {
    const m = INTENT.exec(line.trim());
    if (!m) continue;
    const [, t, xff, , step, arm, status, ref, ua] = m;
    const at = new Date(t);
    if (Number.isNaN(at.getTime())) continue;
    const day = kstDay(at);
    const ip = firstIp(xff);
    if (status !== '204' || day < o.since || self.has(ip) || !isHumanUserAgent(ua)) continue;
    if (!ref.startsWith(`${origin}/pro/`)) continue;
    const key = `${ip}|${ua}|${day}`;
    const s = seen[step as keyof typeof seen];
    if (s.has(key)) continue;
    s.add(key);
    r[step as 'view' | 'price' | 'request']++;
    if (step === 'view') {
      r.byArm[arm as 'H1' | 'H2']++;
      r.byDay[day] = (r.byDay[day] ?? 0) + 1;
    }
  }
  return r;
}

export interface Landings { visitors: number; pageviews: number; bySource: Record<string, number>; byDay: Record<string, number>; pages: Record<string, number> }

const SOURCES: [string, RegExp][] = [
  ['google', /(^|\.)google\./],
  ['naver', /(^|\.)naver\.(com|net)$/],
  ['daum', /(^|\.)(daum\.net|kakao\.com)$/],
  ['bing', /(^|\.)bing\.com$/],
  ['chatgpt', /(^|\.)(chatgpt\.com|openai\.com)$/],
];
function sourceOf(uri: string, ref: string, host: string): string | null {
  const utm = /[?&]utm_source=([^&]+)/.exec(uri)?.[1];
  const candidates = [utm ? decodeURIComponent(utm) : null, ref ? (() => { try { return new URL(ref).hostname; } catch { return null; } })() : null];
  for (const c of candidates) {
    if (!c) continue;
    if (c === host) return null; // 사이트 안 이동 — 착지 아님
    for (const [name, re] of SOURCES) if (re.test(c)) return name;
    return 'other';
  }
  return 'direct';
}

const HTML_PATH = /^\/[^.?]*(?:\.html)?(?:\?.*)?$/;
const MAX_PAGES_PER_DAY = 30;

/** 무료 페이지 사람 착지(엣지 caddy JSON 로그) — 유입원은 그 사람의 첫 외부 착지 기준 */
export function countLandings(text: string, o: CountOptions): Landings {
  const host = o.host ?? 'gonggo.oaksoo.com';
  const self = new Set(o.selfIps);
  type Row = { ip: string; ua: string; day: string; uri: string; ref: string; ts: number };
  const rows: Row[] = [];
  const scanners = new Set<string>();
  const perDay = new Map<string, number>();
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let d: any;
    try { d = JSON.parse(line); } catch { continue; }
    const q = d.request ?? {};
    const h = q.headers ?? {};
    const ip = q.client_ip ?? q.remote_ip ?? '';
    const uri: string = q.uri ?? '';
    if (SCANNER_PATH.test(uri.split('?')[0])) { scanners.add(ip); continue; }
    if (q.host !== host || q.method !== 'GET' || d.status !== 200 || !HTML_PATH.test(uri) || uri.startsWith('/intent/') || uri.startsWith('/api/')) continue;
    const day = kstDay(new Date(d.ts * 1000));
    const ua = h['User-Agent']?.[0] ?? '';
    if (day < o.since || self.has(ip) || !isHumanUserAgent(ua)) continue;
    // 적격 방문 = 한국어 브라우저(타깃 = 국내 창업자). 10/6~8 실측: en-US 「navigate」 단발 방문은 데이터센터 IP 순회였다
    if (!/(^|,)\s*ko\b/i.test(h['Accept-Language']?.[0] ?? '') || h['Sec-Fetch-Mode']?.[0] !== 'navigate') continue;
    const k = `${ip}|${day}`;
    perDay.set(k, (perDay.get(k) ?? 0) + 1);
    rows.push({ ip, ua, day, uri, ref: h['Referer']?.[0] ?? '', ts: d.ts });
  }
  const r: Landings = { visitors: 0, pageviews: 0, bySource: {}, byDay: {}, pages: {} };
  const visitors = new Set<string>();
  for (const x of rows.sort((a, b) => a.ts - b.ts)) {
    if (scanners.has(x.ip) || (perDay.get(`${x.ip}|${x.day}`) ?? 0) > MAX_PAGES_PER_DAY) continue;
    r.pageviews++;
    const path = x.uri.split('?')[0];
    r.pages[path] = (r.pages[path] ?? 0) + 1;
    const v = `${x.ip}|${x.ua}|${x.day}`;
    if (visitors.has(v)) continue;
    const src = sourceOf(x.uri, x.ref, host);
    if (src === null) continue; // 첫 줄이 사이트 안 이동이면 착지로 세지 않는다(앞 페이지가 다른 날)
    visitors.add(v);
    r.bySource[src] = (r.bySource[src] ?? 0) + 1;
    r.byDay[x.day] = (r.byDay[x.day] ?? 0) + 1;
  }
  r.visitors = visitors.size;
  return r;
}
