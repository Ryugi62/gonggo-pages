// SPEC §27 — 원문 받기(일회성 수집 도구, 빌드·런타임 아님). 자격 인용이 없는 공개 후보 중 4곳 url의 마크업을 받아 보강 인용을 data/fill.jsonl에 쓴다.
// 원문 전문은 .cache/fill/(gitignore)에만 둔다. 사이트당 1초 1건, 실패는 건너뛰고 센다.
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { exportPublicListings } from '../src/application/exportPublicListings.ts';
import { readSourceRows } from '../src/adapters/jsonlSourceReader.ts';
import { extractFillQuote, fillFetchUrl, fillSiteOf } from '../src/domain/fillExtract.ts';
import { sanitizeQuote } from '../src/domain/extract.ts';
import { todayKst } from '../src/infrastructure/config.ts';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';
const FILL = 'data/fill.jsonl';
const CACHE = '.cache/fill';
const source = process.env.OPPS_PATH ?? join(homedir(), 'jarvis/_system/data/opportunities.jsonl');
const today = process.env.TODAY ?? todayKst();
const limit = Number(process.env.LIMIT ?? '100000');
const onlySites = process.env.SITES ? new Set(process.env.SITES.split(',')) : null;

mkdirSync(CACHE, { recursive: true });
const done = new Set<string>();
if (existsSync(FILL)) for (const l of readFileSync(FILL, 'utf8').split('\n')) if (l.trim()) done.add(JSON.parse(l).url);

// 대상 = 보강 없이 내보냈을 때 자격 인용이 없는 공개 행 중 6곳(SPEC §27·§40·§41). SITES=unstop처럼 좁힐 수 있다
const targets = exportPublicListings(readSourceRows(source), today).listings
  .filter((l) => !l.eligibilityQuote && fillSiteOf(l.url) && !done.has(l.url) && (!onlySites || onlySites.has(fillSiteOf(l.url)!)))
  .slice(0, limit);
console.log(`대상 ${targets.length}건`);

const stat: Record<string, { target: number; filled: number; noQuote: number; fail: number }> = {};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const lastAt: Record<string, number> = {};

for (const t of targets) {
  const site = fillSiteOf(t.url)!;
  const s = (stat[site] ??= { target: 0, filled: 0, noQuote: 0, fail: 0 });
  s.target++;
  const cacheFile = join(CACHE, `${createHash('sha1').update(t.url).digest('hex')}.html`);
  let html: string | null = existsSync(cacheFile) ? readFileSync(cacheFile, 'utf8') : null;
  const fetchUrl = fillFetchUrl(site, t.url);
  if (html == null && !fetchUrl) { s.fail++; continue; }
  if (html == null) {
    const wait = 1100 - (Date.now() - (lastAt[site] ?? 0));
    if (wait > 0) await sleep(wait);
    lastAt[site] = Date.now();
    try {
      const res = await fetch(fetchUrl!, { headers: { 'user-agent': UA, 'accept-language': 'ko,en;q=0.8', ...(site === 'unstop' ? { accept: 'application/json' } : {}) }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
      if (!res.ok) { s.fail++; continue; }
      html = await res.text();
      writeFileSync(cacheFile, html);
    } catch { s.fail++; continue; }
  }
  const raw = extractFillQuote(site, html);
  const quote = raw ? sanitizeQuote(raw) : null;
  if (!quote) { s.noQuote++; continue; }
  appendFileSync(FILL, `${JSON.stringify({ url: t.url, quote, site, fetchedAt: new Date().toISOString() })}\n`);
  s.filled++;
}
console.log('사이트별', stat);
console.log('합계 채움', Object.values(stat).reduce((a, x) => a + x.filled, 0), '/ 대상', Object.values(stat).reduce((a, x) => a + x.target, 0));
