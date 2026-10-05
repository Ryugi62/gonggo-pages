import { isClean } from './privacy.ts';

// 조항 판독 — 원천 메모에 「」로 옮겨 둔 공고 원문 문장 중, 지원 가능성을 가르는 문장만 좁은 패턴으로 고른다.
// 허용 목록 방식: 종류 낱말에 걸리지 않거나 원문이 아닐 수 있는 인용(사용자 발화·메일 회신·내부 메모)은 버린다.

export type ClauseKind =
  | 'ELIGIBILITY'
  | 'AI_USE'
  | 'ORIGINALITY_PLEDGE'
  | 'DUPLICATE_BENEFIT'
  | 'DUPLICATE_AWARD'
  | 'ONSITE'
  | 'TEAM'
  | 'BUSINESS_AGE';

export type AiUseVerdict = 'ALLOWED' | 'FORBIDDEN' | 'UNSTATED';

/** 조항 1개 = 종류 + 원문 인용 + 출처(원문 공고 URL) */
export interface Clause {
  kind: ClauseKind;
  quote: string;
  source: string;
}

export interface ClauseReading {
  clauses: Clause[];
  aiUse: AiUseVerdict;
}

export interface ClauseSource {
  /** 공고명 — 제목을 그대로 옮긴 인용은 조항이 아니다 */
  name?: string;
  note: string;
  gateQuote: string | null;
  /** 원천 행의 컷 종류 — 'GU'(운영자 개인 제외)면 gate 인용은 쓰지 않는다 */
  gate: string | null;
  /** 컷 근거 표지 — 사용자 발화·결정이면 괄호 없는 gate 인용은 원문이 아니다 */
  gateEvidence?: string | null;
  url: string;
}

export const CLAUSE_LABEL: Record<ClauseKind, string> = {
  ELIGIBILITY: '자격',
  AI_USE: 'AI 사용',
  ORIGINALITY_PLEDGE: '본인 창작 서약',
  DUPLICATE_BENEFIT: '중복 수혜',
  DUPLICATE_AWARD: '중복 수상',
  ONSITE: '현장 참석',
  TEAM: '팀 구성',
  BUSINESS_AGE: '업력',
};

const AI = '(?:생성형\\s*AI|생성형\\s*인공지능|인공지능|ChatGPT|챗\\s*GPT|AI|generative\\s+AI)';
const AI_FORBID = new RegExp(
  // 같은 문장 안 25자 이내만 — 「AI에 관심 있는 누구나… 전공 제한이 없으며」 같은 오판 방지
  `${AI}[^」.。!?]{0,25}?(?:활용하지\\s*않|사용하지\\s*않|이용하지\\s*않|사용\\s*불가|활용\\s*불가|사용\\s*금지|활용\\s*금지|금지|불가|심사\\s*(?:에서\\s*)?제외|not\\s+allowed|prohibited|banned|not\\s+permitted)`,
  'i',
);
const AI_ALLOW = new RegExp(`${AI}[^」.。!?]{0,25}?(?:활용\\s*가능|사용\\s*가능|이용\\s*가능|허용|활용할\\s*수\\s*있|사용할\\s*수\\s*있|allowed|permitted|encouraged)`, 'i');

/** 앞쪽 규칙이 이긴다(구체 → 일반) */
const RULES: [ClauseKind, RegExp][] = [
  ['ORIGINALITY_PLEDGE', /순수\s*창작|본인\s*(?:\(팀\))?\s*의?\s*창작|직접\s*창작|자작\s*(?:품|물)/],
  ['AI_USE', new RegExp(`${AI_FORBID.source}|${AI_ALLOW.source}`, 'i')],
  ['DUPLICATE_AWARD', /중복\s*수상|수상\s*(?:취소|박탈)|타\s*(?:공모전|대회|경진대회)[^」]{0,20}수상|기\s*수상작/],
  ['DUPLICATE_BENEFIT', /중복\s*(?:수혜|지원|참여|신청|선정)|동일\s*(?:과제|아이템|사업)[^」]{0,20}(?:지원|수혜)/],
  ['BUSINESS_AGE', /업력|창업\s*\d+\s*년\s*(?:이내|미만|이하)|\d+\s*년\s*(?:이내|미만|이하)\s*(?:의\s*)?(?:창업\s*)?기업/],
  ['TEAM', /\d+\s*인\s*(?:이내|이하|이상|1\s*팀)|개인\s*또는\s*팀|팀\s*(?:구성|단위|참가|당)|1\s*인\s*(?:단독|참가)|teams?\s+of|up\s+to\s+\d+\s+(?:members|people)|solo/i],
  ['ONSITE', /현장\s*(?:참석|발표|평가|심사|개최)|오프라인\s*(?:참석|개최|행사|발표|진행)|대면\s*(?:평가|심사|발표)|합숙|in-person|on-?site/i],
  [
    'ELIGIBILITY',
    // 「대상」 단독은 대상(1등상)과 헷갈려서 쓰지 않는다 — 「모집 대상」「대상:」「대상으로」만
    /자격|(?:모집|참가|참여|지원|신청|응모|교육|선발)\s*대상|대상\s*[:：|\]>】]|대상으로|만\s*\d+\s*세|\d+\s*세\s*(?:이하|이상|미만|~)|재학|휴학|졸업|거주|소재|관내|생활권|누구나|전\s*국민|예비\s*창업자|창업\s*기업|중소\s*기업|소상공인|eligib|open\s+to|years?\s+(?:old|of\s+age)|must\s+be/i,
  ],
];

const QUOTE_RE = /「([^「」]{4,800})」/g;
/** 내부 메모로 쓴 「」(공고 원문이 아님) */
const INTERNAL = /줄\s*없음|미판독|판독\s*전|Live page|[{}]|미기재|확인\s*필요|미확인|원문\s*없음|본문\s*없음|\.\.\.|…|분석\s*결과|&\s*제안|시즌\s*목록|https?:\/\/|[✓✗→]/;
/** 사용자 발화·구어체 */
const COLLOQUIAL = /거르자|접자|하자|할게|해줘|나한테|필요\s*없음|그딴|엥|ㅋ|ㅎㅎ|[?？]\s*$|싫/;
/** 인용 바로 앞이 「누가 말했다/보냈다」면 원문이 아니다 */
const SPEAKER_BEFORE = /(?:사용자|님|메일|회신|답변|문의|통화|카톡|DM|\d{1,2}\/\d{1,2}|\d{1,2}:\d[\dx])[^「」]{0,12}$/;
const MAX_QUOTE = 300;
const USER_EVIDENCE = /사용자|발화|채팅|결정|Gmail|메일|회신/i;

const squash = (s: string) => s.replace(/\*\*|^#+\s*|\s#+\s/g, ' ').replace(/\s+/g, ' ').trim();

function classify(q: string): ClauseKind | null {
  for (const [kind, re] of RULES) if (re.test(q)) return kind;
  return null;
}

function acceptable(q: string): boolean {
  return q.length >= 4 && q.length <= MAX_QUOTE && !INTERNAL.test(q) && !COLLOQUIAL.test(q) && isClean(q);
}

function quotesIn(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(QUOTE_RE)) {
    const before = text.slice(Math.max(0, m.index! - 40), m.index!);
    if (SPEAKER_BEFORE.test(before)) continue;
    out.push(squash(m[1]));
  }
  return out;
}

const norm = (s: string) => s.replace(/[\s\[\]【】「」『』()（）·ㆍ,'"‘’“”-]/g, '');
/** 제목 인용: 공고명과 겹치거나 「… 모집 공고」로 끝나는 한 줄 */
function isTitle(q: string, name?: string): boolean {
  if (/(?:모집|신청|참여자?|참가자?)\s*(?:공고|안내)?\s*!*$/.test(q) && !/[:：]/.test(q) && q.length <= 60) return true;
  if (!name) return false;
  const a = norm(q);
  const b = norm(name);
  return b.length >= 6 && (a.includes(b) || b.includes(a));
}

/** 메모에 옮길 때 110자 안팎에서 잘린 인용 — 문장 끝이 아니면 「…」로 잘림을 드러낸다 */
function markCut(q: string): string {
  return q.length >= 100 && !/[.。!?)\]」다요음함임능됨]$/.test(q) ? `${q}…` : q;
}

export function deriveAiUse(clauses: Clause[]): AiUseVerdict {
  if (clauses.some((c) => c.kind === 'ORIGINALITY_PLEDGE' && new RegExp(AI, 'i').test(c.quote))) return 'FORBIDDEN';
  const ai = clauses.filter((c) => c.kind === 'AI_USE');
  if (ai.some((c) => AI_FORBID.test(c.quote))) return 'FORBIDDEN';
  if (ai.some((c) => AI_ALLOW.test(c.quote))) return 'ALLOWED';
  return 'UNSTATED';
}

/** 원천 메모 → 판독. 순서 = 메모 등장 순, 같은 인용은 1번만 */
export function readClauses(src: ClauseSource): ClauseReading {
  const cands: string[] = quotesIn(src.note ?? '');
  const gq = (src.gateQuote ?? '').trim();
  if (gq) {
    // GU(운영자 개인 제외) 행은 사유 문장이 섞여 있어 괄호 인용만, 그 밖은 괄호 없는 원문 1문장도 받는다
    const bracketed = quotesIn(gq);
    if (bracketed.length) cands.push(...bracketed);
    else if (src.gate !== 'GU' && !/[「」]/.test(gq) && !USER_EVIDENCE.test(src.gateEvidence ?? '')) cands.push(squash(gq));
  }
  const seen = new Set<string>();
  const clauses: Clause[] = [];
  for (const q of cands) {
    if (seen.has(q) || !acceptable(q) || isTitle(q, src.name)) continue;
    const kind = classify(q);
    if (!kind) continue;
    seen.add(q);
    clauses.push({ kind, quote: markCut(q), source: src.url });
  }
  return { clauses, aiUse: deriveAiUse(clauses) };
}
