// 메일 구독 집계(SPEC §25 AC-88) — 서버 저장 파일을 SSH로 읽어 검증·중복 제거 후 관심 분야별 수.
// 사용: node scripts/sub-requests.ts [--emails]   (DEPLOY_HOST 기본 daboyeong) · 이메일 평문은 --emails 일 때만 출력.
import { execFileSync } from 'node:child_process';
import { parseSubscribeLog } from '../src/application/subscribeLog.ts';

const host = process.env.DEPLOY_HOST ?? 'daboyeong';
const text = execFileSync('ssh', [host, 'cat /home/ubuntu/gonggo/logs/pro-requests.jsonl 2>/dev/null || true'], { encoding: 'utf8' });
const r = parseSubscribeLog(text);
console.log(`구독 ${r.valid.length}건 ${JSON.stringify(r.byTopic)} · 시험 제출 ${r.test} · 버린 줄 ${r.rejected}`);
if (process.argv.includes('--emails')) for (const v of r.valid) console.log(`${v.t} ${v.topic} ${v.email}`);
