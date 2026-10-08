// 사람 방문 집계(SPEC §15 Q5) — /pro 사람 방문(intent.log) + 무료 페이지 사람 착지(엣지 로그, 유입원별). 봇 제외 규칙 = src/domain/visitor.ts 한 곳.
// 사용: node scripts/visits.ts [--since 2026-10-07] [--intent 파일] [--edge 파일]   (파일을 안 주면 SSH로 읽는다, DEPLOY_HOST 기본 daboyeong)
// 운영자 IP는 저장소에 두지 않는다 — privacy.local.json 의 "selfIps"(gitignore) 또는 환경 변수 GONGGO_SELF_IPS(쉼표).
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { countProVisits, countLandings } from '../src/application/visitCount.ts';
import { CANONICAL_ORIGIN } from '../src/infrastructure/config.ts';

const arg = (k: string) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : undefined; };
const host = process.env.DEPLOY_HOST ?? 'daboyeong';
const since = arg('--since') ?? '2026-10-07'; // 14일 검증 D0
const local = existsSync('privacy.local.json') ? JSON.parse(readFileSync('privacy.local.json', 'utf8')) : {};
const selfIps: string[] = [...(local.selfIps ?? []), ...(process.env.GONGGO_SELF_IPS ?? '').split(',').filter(Boolean)];
const read = (file: string | undefined, remote: string) =>
  file ? readFileSync(file, 'utf8') : execFileSync('ssh', [host, remote], { encoding: 'utf8', maxBuffer: 512 * 1024 * 1024 });

const intent = read(arg('--intent'), 'cat /home/ubuntu/gonggo/logs/intent.log 2>/dev/null || true');
const edge = read(arg('--edge'), 'docker exec edge-caddy sh -c "cat /data/logs/gonggo-access.log" 2>/dev/null || true');
const opts = { since, selfIps, host: new URL(CANONICAL_ORIGIN).host, origin: CANONICAL_ORIGIN };
const pro = countProVisits(intent, opts);
const land = countLandings(edge, opts);
const fmt = (o: Record<string, number>) => Object.entries(o).map(([k, v]) => `${k} ${v}`).join(' · ') || '없음';
console.log(`기준 ${since}~ (KST) · 운영자 IP 제외 ${selfIps.length}개`);
console.log(`/pro 사람 방문 ${pro.view} (H1 ${pro.byArm.H1} · H2 ${pro.byArm.H2}) · 가격 클릭 ${pro.price} · 결제 요청 ${pro.request} · 날짜별: ${fmt(pro.byDay)}`);
console.log(`무료 페이지 사람 착지 ${land.visitors}명 · 페이지뷰 ${land.pageviews} · 유입원: ${fmt(land.bySource)} · 날짜별: ${fmt(land.byDay)}`);
const search = ['google', 'naver', 'daum', 'bing', 'chatgpt'].reduce((n, k) => n + (land.bySource[k] ?? 0), 0);
console.log(`검색 착지(google+naver+daum+bing+chatgpt) ${search} — 목표 10/21 ≥ 30 · /pro 목표 ≥ 5`);
