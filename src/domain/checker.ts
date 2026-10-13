// 자격 체커 화면 상태 — 계산·문안·단계 전이는 여기서 정한다(.astro 스크립트는 DOM 연결만, SPEC §18 AC-61·63).
import type { Constraints } from './eligibility.ts';
import { dDayLabel } from './format.ts';
import { matchListing, type MatchVerdict, type Profile } from './match.ts';

export type CheckerRow = { s: string; n: string; c: string; d: string | null; p: string | null; k: Constraints };
export type Groups = Record<MatchVerdict, CheckerRow[]>;
export type CheckerStep = 1 | 2 | 3;

export const ERROR_COPY = {
  message: '공고를 불러오지 못했어요. 인터넷을 확인하고 다시 눌러 주세요.',
  button: '다시 불러오기',
} as const;

export function groupRows(rows: CheckerRow[], p: Profile): Groups {
  const g: Groups = { 맞음: [], '확인 필요': [], '안 맞음': [] };
  for (const r of rows) g[matchListing(r.k, p)].push(r);
  return g;
}

export function visibleRows(g: Groups, view: MatchVerdict, today: string): CheckerRow[] {
  return (g[view] ?? []).filter((r) => dDayLabel(r.d, today) !== '마감');
}

export function checkerCounts(g: Groups) {
  return {
    ok: `${g['맞음'].length}개`,
    rest: `확인이 필요한 공고 ${g['확인 필요'].length}개 · 조건이 안 맞는 공고 ${g['안 맞음'].length}개는 숨겼어요`,
    tabOk: `맞음 ${g['맞음'].length}`,
    tabUnknown: `확인 필요 ${g['확인 필요'].length}`,
  };
}

export function emptyCopy(view: MatchVerdict): string {
  return view === '확인 필요' ? '확인할 공고가 없어요.' : '아직 맞는 공고가 없어요. 조건을 바꿔 다시 골라 보세요.';
}

export const nextStep = (s: CheckerStep): CheckerStep => (s === 1 ? 2 : s === 2 ? 3 : 1);
export const prevStep = (s: CheckerStep): CheckerStep => (s === 3 ? 2 : 1);
export const nextLabel = (s: CheckerStep): string => (s === 1 ? '다음' : s === 2 ? '결과 보기' : '다시 고르기');
export const progressLabel = (s: CheckerStep): string => (s === 3 ? '결과' : `${s} / 2`);

// Pro 신청 4스텝(0 소개 · 1 이메일 · 2 동의 · 3 완료)
export type ProAction = { to: number; track?: 'PRICE'; warn?: 'email' } | { submit: true } | { home: true };
export function proNextStep(step: number, ok: { emailOk: boolean; agreeOk: boolean }): ProAction {
  if (step === 0) return { to: 1, track: 'PRICE' };
  if (step === 1) return ok.emailOk ? { to: 2 } : { to: 1, warn: 'email' };
  if (step === 2) return { submit: true };
  return { home: true };
}
