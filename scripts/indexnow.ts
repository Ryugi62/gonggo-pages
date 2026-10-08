// IndexNow 알림(SPEC §15 Q4) — dist/sitemap.xml의 정식 주소 전부를 IndexNow(Bing 등 공유)·네이버에 보낸다. 계정·로그인 없음.
// 사용: node scripts/indexnow.ts [--dry]   (배포 뒤, 키 파일이 라이브에서 200일 때만 보낸다)
import { readFileSync } from 'node:fs';
import { indexNowPayloads, sitemapUrls } from '../src/application/indexNow.ts';
import { CANONICAL_ORIGIN, INDEXNOW_KEY } from '../src/infrastructure/config.ts';

const ENDPOINTS = ['https://api.indexnow.org/indexnow', 'https://searchadvisor.naver.com/indexnow'];
const payloads = indexNowPayloads(CANONICAL_ORIGIN, INDEXNOW_KEY, sitemapUrls(readFileSync('dist/sitemap.xml', 'utf8')));
console.log(`URL ${payloads.reduce((n, p) => n + p.urlList.length, 0)}개 · 묶음 ${payloads.length}`);
if (process.argv.includes('--dry')) process.exit(0);

const keyRes = await fetch(payloads[0].keyLocation);
const keyBody = (await keyRes.text()).trim();
if (keyRes.status !== 200 || keyBody !== INDEXNOW_KEY) {
  console.error(`키 파일 라이브 확인 실패(${keyRes.status}) — 배포 먼저`);
  process.exit(1);
}
for (const ep of ENDPOINTS) {
  for (const p of payloads) {
    const r = await fetch(ep, { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(p) });
    console.log(`${new Date().toISOString()} ${ep} ${r.status} ${p.urlList.length}개 ${(await r.text()).slice(0, 120).replace(/\s+/g, ' ')}`);
  }
}
