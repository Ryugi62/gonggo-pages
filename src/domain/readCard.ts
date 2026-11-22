// SPEC §29 — 공고 상세 「공모 읽는 법」 맛보기 카드. 순수: 입력 데이터 → 카드 값·검사. 파일·프레임워크를 모른다.
import { isClean } from './privacy.ts';
import type { Category } from './category.ts';

export type Axis = 'needs' | 'strategy' | 'idea' | 'polish';
export type ReadKind = Exclude<Category, '장학'>;
export interface AxisCard { line: string; check: string[] }
export interface ReadCard { kind: ReadKind; axes: Record<Axis, AxisCard> }
export type ReadCardData = Record<ReadKind, Record<Axis, AxisCard>>;

export const READ_KINDS: ReadKind[] = ['해커톤', '공모전', '지원사업', '대외활동'];
export const AXES: { key: Axis; label: string }[] = [
  { key: 'needs', label: '니즈' },
  { key: 'strategy', label: '평가 전략' },
  { key: 'idea', label: '맞춤 아이디어' },
  { key: 'polish', label: '완성도' },
];

/** 4칸은 유형(공모전·해커톤…) 공통 문장이라 제목도 유형 이름으로 솔직하게 쓴다(11/22 검수: 「이 공고는」 약속 불이행) */
export const readCardTitle = (kind: ReadKind): string => `${kind} 공고는 이렇게 읽어요`;

/** 앱 열기 클릭 계측 경로 — 기존 nginx `/intent/` location이 204로 받는다(새 location 0). */
export const APP_CARD_PING = '/intent/app-card';

const isKind = (c: Category): c is ReadKind => (READ_KINDS as string[]).includes(c);

export function readCardFor(data: ReadCardData, category: Category): ReadCard | null {
  return isKind(category) && data[category] ? { kind: category, axes: data[category] } : null;
}

// 공개 금지 낱말(SPEC §29 AC-101·102) — 과장·단정, 내부 표기
const OVERCLAIM = /우승|1위|합격\s*보장|보장|확실|무조건/;
const INTERNAL = /L0\d{3}|events|모의|블라인드|우승게이트/;
const NUMERIC = /\d+\s*점|\d+\s*%/;

export function assertReadCardClean(card: ReadCard): void {
  const texts = Object.values(card.axes).flatMap((a) => [a.line, ...a.check]);
  for (const t of texts) {
    if (!isClean(t) || OVERCLAIM.test(t) || INTERNAL.test(t) || NUMERIC.test(t)) throw new Error(`읽는 법 카드 금지 표기: ${t}`);
  }
}
