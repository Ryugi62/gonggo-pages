import type { Category, EligibilityTag } from './category.ts';
import type { Constraints } from './eligibility.ts';

/** 공개 공고 — 공개 허용 필드만. 내부 판단·식별자 없음 */
export interface PublicListing {
  slug: string;
  name: string;
  category: Category;
  kind: string;
  deadline: string | null;
  deadlineTime: string | null;
  rolling: boolean;
  url: string;
  organizer: string | null;
  prize: string | null;
  eligibilityQuote: string | null;
  tags: EligibilityTag[];
  constraints: Constraints;
}

/** 원천 행(내부 목록 1줄). 여기 있는 대부분 필드는 공개 금지 */
export interface SourceRow {
  id?: string;
  name: string;
  kind: string;
  due: string;
  due_date: string | null;
  url: string;
  why?: string;
  note?: string;
  state: string;
  [k: string]: unknown;
}
