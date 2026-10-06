// 결제 요청(창립 회원 신청) 집계 — 서버 저장 파일을 SSH로 읽어 검증·중복 제거 후 가격안별 수(SPEC §12 AC-29).
// 사용: node scripts/pro-requests.ts [--emails]   (DEPLOY_HOST 기본 daboyeong) · 이메일 평문은 --emails 일 때만 출력.
import { execFileSync } from 'node:child_process';
import { parsePaymentRequestLog } from '../src/application/paymentRequestLog.ts';

const host = process.env.DEPLOY_HOST ?? 'daboyeong';
const text = execFileSync('ssh', [host, 'cat /home/ubuntu/gonggo/logs/pro-requests.jsonl 2>/dev/null || true'], { encoding: 'utf8' });
const r = parsePaymentRequestLog(text);
console.log(`결제 요청 ${r.valid.length}건 (H1 ${r.byArm.H1} · H2 ${r.byArm.H2}) · 버린 줄 ${r.rejected}`);
if (process.argv.includes('--emails')) for (const v of r.valid) console.log(`${v.t} ${v.arm} ${v.email}`);
