// 어댑터: 커밋된 data/app-slugs.json(scripts/app-slugs.ts가 앱 번들과 대조해 만든 목록) → 도메인 appSlugOf 입력.
import file from '../../../data/app-slugs.json';
import { appSlugOf } from '../../domain/tossLink.ts';

const inApp = new Set(file as string[]);
export const appLinkOf = (slug: string): string | null => appSlugOf(slug, inApp);
