// 실험 X1·X3(SPEC §19) — 상세 조항 미리보기와 조항 모음. 새 판정은 만들지 않는다:
// 이미 판독된 AI 사용·중복 조항 중 「원문 인용의 방향이 판독과 일치하는 것」만 근거로 쓴다.
import type { PublicListing } from './listing.ts';
import type { Clause, ClauseKind } from './clause.ts';
import { CLAUSE_LABEL } from './clause.ts';

export interface AiEvidence { verdict: 'ALLOWED' | 'FORBIDDEN'; quote: string }
export type DupStance = 'ALLOW' | 'LIMIT';
export interface DupEvidence { stance: DupStance; kind: ClauseKind; quote: string }

const AI_TERM = /생성형|인공지능|ChatGPT|챗\s*GPT|\bAI\b|AI(?=[\s가-힣-])/i;
const NEGATION = /\b(?:no|not|never|without|prohibit\w*|ban\w*|disqualif\w*)\b|불가|금지|않|없|제외/i;
const POSITIVE = /허용|활용\s*가능|사용\s*가능|이용\s*가능|사용할\s*수\s*있|활용할\s*수\s*있|allowed|permitted|encouraged/i;
const FORBID = /불가|금지|않|제외|not\s+allowed|prohibited|banned|disqualif|no\s+[^.]{0,30}AI/i;
const INTERNAL_NOTE = /저작\s*모드|컷\(|판독|메모/;

export function aiEvidence(l: PublicListing): AiEvidence | null {
  if (l.aiUse === 'UNSTATED') return null;
  for (const c of l.clauses) {
    if (c.kind !== 'AI_USE' || INTERNAL_NOTE.test(c.quote) || !AI_TERM.test(c.quote)) continue;
    if (l.aiUse === 'ALLOWED' && POSITIVE.test(c.quote) && !NEGATION.test(c.quote)) return { verdict: 'ALLOWED', quote: c.quote };
    if (l.aiUse === 'FORBIDDEN' && FORBID.test(c.quote)) return { verdict: 'FORBIDDEN', quote: c.quote };
  }
  return null;
}

const DUP_ALLOW = /중복\s*(?:지원|신청|수혜|참여|응모)[^.,;]{0,6}가능/;
const DUP_LIMIT = /불가|제한|제외|취소|환수|박탈|경력\s*없음|금지/;

function dupStance(c: Clause): DupStance | null {
  if (c.kind !== 'DUPLICATE_AWARD' && c.kind !== 'DUPLICATE_BENEFIT') return null;
  if (DUP_LIMIT.test(c.quote)) return 'LIMIT';
  if (DUP_ALLOW.test(c.quote)) return 'ALLOW';
  return null;
}

export function duplicateEvidence(l: PublicListing): DupEvidence | null {
  for (const c of l.clauses) {
    const stance = dupStance(c);
    if (stance) return { stance, kind: c.kind, quote: c.quote };
  }
  return null;
}

export const PREVIEW_QUOTE_MAX = 70;
const clip = (q: string) => (q.length > PREVIEW_QUOTE_MAX ? `${q.slice(0, PREVIEW_QUOTE_MAX).trimEnd()}…` : q);
export const PREVIEW_HEAD = '이 공고의 AI 사용·중복수상 조항';

/** 근거 0이면 null — 허위로 채우지 않는다 */
export function clausePreview(l: PublicListing): string | null {
  const ai = aiEvidence(l);
  const dup = duplicateEvidence(l);
  if (!ai && !dup) return null;
  const parts: string[] = [];
  if (ai) parts.push(`AI 사용 ${ai.verdict === 'ALLOWED' ? '허용' : '금지'} 「${clip(ai.quote)}」`);
  if (dup) parts.push(`${CLAUSE_LABEL[dup.kind]} ${dup.stance === 'ALLOW' ? '가능' : '제한'} 「${clip(dup.quote)}」`);
  return `${PREVIEW_HEAD} — ${parts.join(' · ')}`;
}

export interface CollectionItem { listing: PublicListing; quote: string; label: string }
const byDeadline = (a: CollectionItem, b: CollectionItem) => (a.listing.deadline ?? '9999').localeCompare(b.listing.deadline ?? '9999');

export function clauseCollections(ls: PublicListing[]) {
  const ai = { allowed: [] as CollectionItem[], forbidden: [] as CollectionItem[] };
  const duplicate = { allow: [] as CollectionItem[], limit: [] as CollectionItem[] };
  for (const l of ls) {
    const a = aiEvidence(l);
    if (a) (a.verdict === 'ALLOWED' ? ai.allowed : ai.forbidden).push({ listing: l, quote: a.quote, label: CLAUSE_LABEL.AI_USE });
    const d = duplicateEvidence(l);
    if (d) (d.stance === 'ALLOW' ? duplicate.allow : duplicate.limit).push({ listing: l, quote: d.quote, label: CLAUSE_LABEL[d.kind] });
  }
  for (const g of [ai.allowed, ai.forbidden, duplicate.allow, duplicate.limit]) g.sort(byDeadline);
  return { ai, duplicate };
}

export const COLLECTION_PATHS = ['/clauses/ai/', '/clauses/duplicate/'] as const;
