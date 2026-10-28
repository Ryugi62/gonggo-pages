// 무료 공고 판독 요청 — 돈·계정 없이 「이 공고 원문 조항을 읽어 주세요」를 남기는 접촉 입구(SPEC §21).
// 수집 = 공고 링크 1 + 이메일 1 + 개인정보 동의 1뿐. 저장은 기존 /api/pro-request 한 줄 기록(kind 키로 구분).
export const READ_KIND = 'read';

export interface ReadRequest {
  kind: typeof READ_KIND;
  link: string;
  email: string;
  consent: boolean;
}

export type ReadRequestField = 'kind' | 'link' | 'email' | 'consent' | 'extra';

const ALLOWED = new Set(['kind', 'link', 'email', 'consent']);
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,180}\.[A-Za-z]{2,}$/; // 합계 ≤ 1KB 보장(링크 400 + 이메일 ≤ 250)
export const LINK_MAX = 400;

export function validateReadRequest(r: ReadRequest): { ok: boolean; errors: ReadRequestField[] } {
  const errors: ReadRequestField[] = [];
  if (Object.keys(r).some((k) => !ALLOWED.has(k))) errors.push('extra');
  if (r.kind !== READ_KIND) errors.push('kind');
  if (!isLink(r.link)) errors.push('link');
  if (typeof r.email !== 'string' || !EMAIL.test(r.email)) errors.push('email');
  if (r.consent !== true) errors.push('consent');
  return { ok: errors.length === 0, errors };
}

function isLink(v: unknown): boolean {
  if (typeof v !== 'string' || v.length > LINK_MAX || !/^[\x21-\x7e]+$/.test(v)) return false;
  try {
    const u = new URL(v);
    return (u.protocol === 'http:' || u.protocol === 'https:') && u.hostname.includes('.');
  } catch {
    return false;
  }
}
