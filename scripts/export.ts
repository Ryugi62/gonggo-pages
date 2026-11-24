// composition root — UC-1 공개 내보내기. 원천 jsonl은 저장소 밖(운영자 로컬)에만 있다.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { exportPublicListings } from '../src/application/exportPublicListings.ts';
import { readSourceRows } from '../src/adapters/jsonlSourceReader.ts';
import { writeListings, readListings } from '../src/adapters/listingWriter.ts';
import { publishedDates } from '../src/application/publishedDates.ts';
import { mergeListings } from '../src/application/mergeListings.ts';
import { isOpen } from '../src/domain/freshness.ts';
import { readFill } from '../src/adapters/fillStore.ts';
import { LISTINGS_PATH, todayKst } from '../src/infrastructure/config.ts';

const source = process.env.OPPS_PATH ?? join(homedir(), 'jarvis/_system/data/opportunities.jsonl');
const today = process.env.TODAY ?? todayKst();
const rows = readSourceRows(source);
const { listings: fresh, stats } = exportPublicListings(rows, today, readFill('data/fill.jsonl'));
// SPEC §31 병합 — 이미 공개한 /g/ URL(옛 목록)은 하나도 없애지 않고(9617fee), 지금 열린 공고를 더한다. MERGE=0이면 옛 방식(덮어쓰기).
const prev = process.env.MERGE === '0' ? [] : readListings(LISTINGS_PATH).listings;
const listings = mergeListings(prev, fresh);
// SPEC §38 — 전 정리 기준일의 날짜 주소(/digest/ 등)를 잃지 않게 기억한다(MERGE=0이어도)
const DATES = 'data/digest-dates.json';
const kept: string[] = existsSync(DATES) ? JSON.parse(readFileSync(DATES, 'utf8')) : [];
writeFileSync(DATES, JSON.stringify(publishedDates(kept, existsSync(LISTINGS_PATH) ? readListings(LISTINGS_PATH).generatedAt : null, today)) + '\n');
writeListings(LISTINGS_PATH, today, listings);
console.log(`병합: 옛 ${prev.length} + 새 열린 ${fresh.length} → 상세 ${listings.length} · 열림 ${listings.filter((l) => isOpen(l, today)).length} · 마감 ${listings.filter((l) => !isOpen(l, today)).length}`);

const by = (k: (l: (typeof listings)[number]) => string) =>
  Object.entries(listings.reduce<Record<string, number>>((a, l) => ((a[k(l)] = (a[k(l)] ?? 0) + 1), a), {}));
console.log(`export ${today}: 원천 ${stats.total} → 공개 ${stats.kept}`);
console.log('제외 사유', stats.dropped);
console.log('분류', Object.fromEntries(by((l) => l.category)));
console.log('자격 인용 있음', listings.filter((l) => l.eligibilityQuote).length,
  '· 주최 있음', listings.filter((l) => l.organizer).length,
  '· 상금 문구 있음', listings.filter((l) => l.prize).length,
  '· 상시', listings.filter((l) => l.rolling).length);
