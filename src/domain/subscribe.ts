// 마감 임박 메일 구독 — 돈·계정 없이 「주 1회 마감 임박 공고 메일」을 받겠다는 이메일 + 관심 분야 1개(SPEC §25).
// 저장은 기존 /api/pro-request 한 줄 기록(kind 키로 구분). 발송은 코드가 아니라 메인 세션 손.
export const SUB_KIND = 'sub';
export const SUB_TOPICS = ['contest', 'support', 'scholarship', 'all'] as const;
export type SubscribeTopic = (typeof SUB_TOPICS)[number];

export const SUB_TOPIC_LABEL: Record<SubscribeTopic, string> = {
  contest: '공모전·해커톤',
  support: '창업·지원사업',
  scholarship: '장학·대외활동',
  all: '전부 다',
};

export interface SubscribeRequest {
  kind: typeof SUB_KIND;
  email: string;
  topic: SubscribeTopic;
  consent: boolean;
}

export type SubscribeField = 'kind' | 'email' | 'topic' | 'consent' | 'extra';

const ALLOWED = new Set(['kind', 'email', 'topic', 'consent']);
const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,180}\.[A-Za-z]{2,}$/;
// 예약 도메인(RFC 2606) — 시험 제출 표시. 삭제 대신 이 규칙으로 따로 센다.
const TEST_EMAIL = /@(example\.(com|net|org)|[^@]*\.(test|invalid|example))$/i;

export function validateSubscribeRequest(r: SubscribeRequest): { ok: boolean; errors: SubscribeField[] } {
  const errors: SubscribeField[] = [];
  if (Object.keys(r).some((k) => !ALLOWED.has(k))) errors.push('extra');
  if (r.kind !== SUB_KIND) errors.push('kind');
  if (typeof r.email !== 'string' || !EMAIL.test(r.email)) errors.push('email');
  if (!SUB_TOPICS.includes(r.topic)) errors.push('topic');
  if (r.consent !== true) errors.push('consent');
  return { ok: errors.length === 0, errors };
}

export const isTestEmail = (email: string): boolean => TEST_EMAIL.test(email);
