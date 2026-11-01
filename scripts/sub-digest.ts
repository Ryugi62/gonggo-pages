// 주간 구독 메일 본문 초안(SPEC §25 U6) — 오늘~7일 안 마감 공고 5건을 뽑아 본문을 출력한다. 발송은 하지 않는다(메인 세션 손).
// 사용: node scripts/sub-digest.ts   (TODAY=YYYY-MM-DD 로 날짜 고정 가능)
import { readFileSync } from 'node:fs';
import { pickDeadlineSoon } from '../src/application/deadlineSoon.ts';
import { renderSubDigest } from '../src/application/subDigest.ts';
import type { PublicListing } from '../src/domain/listing.ts';
import { LISTINGS_PATH, CANONICAL_ORIGIN, OPERATOR, todayKst } from '../src/infrastructure/config.ts';

const today = process.env.TODAY ?? todayKst();
const data = JSON.parse(readFileSync(LISTINGS_PATH, 'utf8')) as { listings: PublicListing[] };
console.log(renderSubDigest(pickDeadlineSoon(data.listings, today), today, CANONICAL_ORIGIN, OPERATOR));
