// 어댑터: 커밋된 카드 데이터(data/readcards.json) → 도메인 카드. 빌드 때 한 번 검사한다(SPEC §29).
import file from '../../../data/readcards.json';
import { readCardFor, assertReadCardClean, READ_KINDS, type ReadCard, type ReadCardData } from '../../domain/readCard.ts';
import type { Category } from '../../domain/category.ts';

const data = file as unknown as ReadCardData;
for (const k of READ_KINDS) assertReadCardClean(readCardFor(data, k)!);

export const readCardOf = (category: Category): ReadCard | null => readCardFor(data, category);
