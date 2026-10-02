// composition root — UC-1 공개 내보내기. 원천 jsonl은 저장소 밖(운영자 로컬)에만 있다.
import { homedir } from 'node:os';
import { join } from 'node:path';
import { exportPublicListings } from '../src/application/exportPublicListings.ts';
import { readSourceRows } from '../src/adapters/jsonlSourceReader.ts';
import { writeListings } from '../src/adapters/listingWriter.ts';
import { LISTINGS_PATH, todayKst } from '../src/infrastructure/config.ts';

const source = process.env.OPPS_PATH ?? join(homedir(), 'jarvis/_system/data/opportunities.jsonl');
const today = process.env.TODAY ?? todayKst();
const rows = readSourceRows(source);
const { listings, stats } = exportPublicListings(rows, today);
writeListings(LISTINGS_PATH, today, listings);

const by = (k: (l: (typeof listings)[number]) => string) =>
  Object.entries(listings.reduce<Record<string, number>>((a, l) => ((a[k(l)] = (a[k(l)] ?? 0) + 1), a), {}));
console.log(`export ${today}: 원천 ${stats.total} → 공개 ${stats.kept}`);
console.log('제외 사유', stats.dropped);
console.log('분류', Object.fromEntries(by((l) => l.category)));
console.log('자격 인용 있음', listings.filter((l) => l.eligibilityQuote).length,
  '· 주최 있음', listings.filter((l) => l.organizer).length,
  '· 상금 문구 있음', listings.filter((l) => l.prize).length,
  '· 상시', listings.filter((l) => l.rolling).length);
