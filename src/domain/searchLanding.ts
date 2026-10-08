// 검색 착지 문구(SPEC §15) — 고객이 검색창에 치는 말(「받을 수 있나요?」「중복 수혜 가능한가요?」)로 상세 페이지 제목·설명·자주 묻는 질문을 단다.
// 답은 공고 원문 인용이나 「찾지 못했어요」뿐 — 우리가 지어낸 결론은 싣지 않는다.
import type { PublicListing } from './listing.ts';
import type { AiUseVerdict, ClauseKind } from './clause.ts';
import type { Category } from './category.ts';

export interface FaqItem { q: string; a: string }

/** 조항 종류 → 창업자가 실제로 묻는 질문 */
export const CLAUSE_QUESTION: Record<ClauseKind, string> = {
  ELIGIBILITY: '자격 조건은 어떻게 적혀 있나요?',
  AI_USE: 'AI(챗GPT)로 쓴 내용을 내도 되나요?',
  ORIGINALITY_PLEDGE: '본인 창작 서약이 있나요?',
  DUPLICATE_BENEFIT: '중복 지원·중복 수혜가 되나요?',
  DUPLICATE_AWARD: '다른 대회에서 상 받은 작품도 낼 수 있나요?',
  ONSITE: '현장에 꼭 가야 하나요?',
  TEAM: '혼자 내도 되나요, 팀이어야 하나요?',
  BUSINESS_AGE: '이미 창업했어도(업력) 낼 수 있나요?',
};

/** 제목에 올릴 조항 — 고객이 많이 묻는 순 */
const TITLE_TOPIC: [ClauseKind, string][] = [
  ['DUPLICATE_BENEFIT', '중복 수혜'],
  ['AI_USE', 'AI 사용'],
  ['DUPLICATE_AWARD', '중복 수상'],
  ['BUSINESS_AGE', '업력'],
  ['TEAM', '팀 구성'],
  ['ONSITE', '현장 참석'],
];

const VERB: Record<Category, { noun: string; ask: string }> = {
  지원사업: { noun: '신청', ask: '나도 받을 수 있나요?' },
  장학: { noun: '신청', ask: '나도 받을 수 있나요?' },
  공모전: { noun: '참가', ask: '나도 낼 수 있나요?' },
  해커톤: { noun: '참가', ask: '나도 참가할 수 있나요?' },
  대외활동: { noun: '참가', ask: '나도 참가할 수 있나요?' },
};
const verb = (c: Category) => VERB[c] ?? VERB['공모전'];

export function aiUseSentence(v: AiUseVerdict): string {
  if (v === 'FORBIDDEN') return '이 공고는 AI로 만든 초안을 낼 수 없어요.';
  if (v === 'ALLOWED') return '원문에 AI 활용을 허용하는 문장이 있어요. 조건은 아래 원문으로 확인하세요.';
  return '원문에서 AI 사용 규정을 찾지 못했어요 — 원문 확인';
}

function titleTopic(l: PublicListing): string | null {
  const kinds = new Set(l.clauses.map((c) => c.kind));
  if (l.aiUse !== 'UNSTATED') kinds.add('AI_USE');
  const hit = TITLE_TOPIC.find(([k]) => kinds.has(k));
  if (!hit) return null;
  // 「수혜」는 지원사업·장학의 말 — 공모전·해커톤·대외활동은 「중복 지원」
  if (hit[0] === 'DUPLICATE_BENEFIT' && verb(l.category).noun !== '신청') return '중복 지원';
  return hit[1];
}

export function searchTitle(l: PublicListing): string {
  const v = verb(l.category);
  const topic = titleTopic(l);
  const parts = ['자격', topic ?? (l.prize ? '상금' : null), '마감'].filter(Boolean);
  return `${l.name} ${v.noun} ${parts.join('·')} — ${v.ask}`;
}

const MAX_DESC = 158;
export function searchDescription(l: PublicListing): string {
  const head = `${l.name}, ${verb(l.category).ask}`;
  const deadline = `마감 ${l.deadline ? `${l.deadline}${l.deadlineTime ? ' ' + l.deadlineTime : ''}` : '상시'}`;
  const topic = titleTopic(l);
  const tail = [deadline, topic ? `${topic} 조항 원문 인용` : null, l.organizer ? `주최 ${l.organizer}` : null].filter(Boolean).join(' · ');
  if (!l.eligibilityQuote) return `${head} 자격은 원문 공고에서 확인 · ${tail}`.slice(0, MAX_DESC);
  const room = MAX_DESC - head.length - tail.length - ' 원문 자격: 「」 · '.length;
  const q = l.eligibilityQuote.length > room ? `${l.eligibilityQuote.slice(0, Math.max(10, room - 1))}…` : l.eligibilityQuote;
  return `${head} 원문 자격: 「${q}」 · ${tail}`.slice(0, MAX_DESC);
}

const quoted = (s: string) => `공고 원문: 「${s}」`;

/** 화면에 보이는 질문·답 그대로(상세 페이지가 이 목록으로 그린다) */
export function listingFaq(l: PublicListing): FaqItem[] {
  const out: FaqItem[] = [];
  if (l.eligibilityQuote) out.push({ q: '누가 낼 수 있나요?', a: quoted(l.eligibilityQuote) });
  const ai = l.clauses.find((c) => c.kind === 'AI_USE');
  out.push({ q: CLAUSE_QUESTION.AI_USE, a: ai ? `${aiUseSentence(l.aiUse)} ${quoted(ai.quote)}` : aiUseSentence(l.aiUse) });
  const seen = new Set<ClauseKind>(['ELIGIBILITY', 'AI_USE']);
  for (const c of l.clauses) {
    if (seen.has(c.kind)) continue;
    seen.add(c.kind);
    out.push({ q: CLAUSE_QUESTION[c.kind], a: quoted(c.quote) });
  }
  return out;
}

export function faqJsonLd(faq: FaqItem[]): object {
  return {
    '@context': 'https://schema.org', '@type': 'FAQPage',
    mainEntity: faq.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
}
