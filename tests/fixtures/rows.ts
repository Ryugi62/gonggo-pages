// 원천 행 픽스처 — 내부 메모·개인 정보가 섞인 행을 일부러 넣는다(AC-3).
// 개인 식별 토큰은 공개 저장소에 평문으로 두지 않는다: PRIV0~PRIV4 자리에 운영자 로컬 privacy.local.json의 토큰을 끼운다.
import { privateTokens } from '../privateTokens.ts';

const P = privateTokens() ?? ['가상이름', '이름', '가상상호', 'nobody', '가상대학'];
const sub = (s: string) => s.replace(/PRIV(\d)/g, (_, i) => P[Number(i)]);
export const TODAY = '2026-10-02';

const base = {
  start: '', why: '', source: '', note: '', last_checked: '2026-10-01', listed_at: '2026-10-01',
  gate: null, gate_reason: '', gate_quote: null, gate_evidence: null, legacy_gate: null,
  benefit: ['현금'], cash_krw: null, tier: 1, measure_by: null, hold_reason: null,
  revived_from: null, project: null, evidence: null,
};

const rawRows = [
  { ...base, id: 'opp-0001', name: '2026 대학생 AI 아이디어 공모전', kind: '공모', due: '2026-10-20 23:59', due_date: '2026-10-20',
    url: 'https://example.org/contest/1', state: '후보',
    why: '시상규모 500만원 · PRIV4 학부 PRIV0 GO 판정',
    note: '[실측 2026-09-25 aside 20260925-001] 자격:「만 19세 이상 국내 대학 재학생 및 휴학생」 · 주최:한국AI협회 · 시상규모(총) 500만원\n[판정 GO] PRIV2 명의로 낸다 · tier 1 · hold_reason 사용자결정 · PRIV3@example.com · opp-0002와 중복 · PRIV1' },
  { ...base, id: 'opp-0002', name: '청년 창업 지원사업 모집', kind: '지원사업', due: '상시 — ★잔금 2026-09-05 → PRIV0 전입', due_date: null,
    url: 'https://example.org/support/2', state: '신청예정', hold_reason: '사용자결정',
    note: '자격:「만 39세 이하 예비창업자 또는 창업 3년 이내 기업」 · GU 아님' },
  { ...base, id: 'opp-0003', name: '지난 해커톤', kind: '해커톤', due: '2026-10-01', due_date: '2026-10-01',
    url: 'https://example.org/h/3', state: '후보', note: '자격:「누구나」' },
  { ...base, id: 'opp-0004', name: '오늘 마감 해커톤', kind: '해커톤', due: '2026-10-02', due_date: '2026-10-02',
    url: 'https://example.org/h/4', state: '후보', note: '자격:「본문에 자격 줄 없음」', why: '$12,500 in prizes' },
  { ...base, id: 'opp-0005', name: '조건불가 공모', kind: '공모', due: '2026-12-01', due_date: '2026-12-01',
    url: 'https://example.org/c/5', state: '조건불가', gate: 'G0', gate_quote: '「서울 거주자」',
    gate_reason: 'PRIV4 재학 · 만 나이 초과 · PRIV0 거주지 경남이라 불가' },
  { ...base, id: 'opp-0010', name: '중복 행 공모', kind: '공모', due: '2026-12-01', due_date: '2026-12-01',
    url: 'https://example.org/c/10', state: '중복' },
  { ...base, id: 'opp-0011', name: '치과 홍보 카피 공모전', kind: '공모', due: '2026-11-15', due_date: '2026-11-15',
    url: 'https://example.org/c/11', state: '조건불가', gate: 'GU',
    gate_quote: '「생성형 AI 등을 활용하지 않은 본인(팀)의 순수창작물」 · 사용자 10/3 「치과 홍보 카피 공모 그럼 접자」',
    note: '[실측] 응모 조건 「생성형 AI 등을 활용하지 않은 본인(팀)의 순수창작물」 · 「개인 또는 3인 이내 팀」' },
  { ...base, id: 'opp-0006', name: '날짜 미상 공모', kind: '공모', due: '원문날짜없음', due_date: null,
    url: 'https://example.org/c/6', state: '후보' },
  { ...base, id: 'opp-0007', name: '청년전용 대출', kind: '대출', due: '상시', due_date: null,
    url: 'https://example.org/l/7', state: '후보' },
  { ...base, id: 'opp-0008', name: '[경남] 소상공인 상세페이지 지원사업', kind: '지원사업', due: '2026-11-01', due_date: '2026-11-01',
    url: 'https://example.org/s/8', state: '후보', note: '사업개요:「경남 소재 소상공인」 · 주최:경남도' },
  { ...base, id: 'opp-0009', name: '전국민 사진 공모전', kind: '공모', due: '2026-10-30', due_date: '2026-10-30',
    url: 'https://example.org/c/9', state: '후보', note: '자격:「대한민국 국민 누구나」', why: '시상 상금(총상금 : 110만원 / 1위 : 50만원) · 참가비 무료 접수' },
];

export const rows = rawRows.map((r) => JSON.parse(sub(JSON.stringify(r))));
