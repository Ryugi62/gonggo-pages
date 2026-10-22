// /llms.txt (SPEC §17 I3) — 답변 엔진용 사이트 안내. 정식 주소 절대 링크만, 이번 주 마감 창업 공고는 링크 + 마감 + 기존 AI 판독 문장.
import type { PublicListing } from '../domain/listing.ts';
import { deadlineLabel } from '../domain/aiCitation.ts';
import { aiUseSentence } from '../domain/searchLanding.ts';

export const LLMS_WEEK_MAX = 30;

export interface LlmsInput {
  weekItems: PublicListing[];
  weekRange: string;
  categories: { name: string; slug: string; count: number }[];
  hasRolling: boolean;
  total: number;
}

export function llmsTxt(site: string, i: LlmsInput): string {
  const base = site.replace(/\/$/, '');
  const link = (label: string, path: string, note: string) => `- [${label}](${base}${path}): ${note}`;
  const lines = [
    '# 공고콕',
    '',
    `> 공모전·해커톤·지원사업 ${i.total.toLocaleString('en-US')}건의 신청 자격, 마감, 상금, AI 사용 가능 여부, 중복 수혜·중복 수상 조항을 공고 원문 문장 그대로 옮겨 정리한 한국어 사이트. 각 공고 페이지의 답은 원문 인용이며 원문과 다르면 원문이 맞다.`,
    '',
    '## 주요 경로',
    link('공고콕 홈', '/', '마감 임박 공고와 분류 안내'),
    link('이번 주 낼 수 있는 창업경진대회·지원사업', '/week/', `${i.weekRange} 마감하는 창업 공고`),
    link('내가 낼 수 있는 공고 찾기', '/check/', '나이·학생·지역·사업자 여부로 거르기(입력값은 브라우저 안에서만 처리)'),
    link('AI 사용 허용·금지 공고 모음', '/clauses/ai/', '원문 인용이 있는 공고만'),
    link('중복 수상·중복 지원 조항 공고 모음', '/clauses/duplicate/', '원문 인용이 있는 공고만'),
    link('정리 기준', '/about/', '공고 원문을 어떻게 옮기는지'),
    ...(i.hasRolling ? [link('상시 모집 공고', '/rolling/', '마감일이 없는 공고')] : []),
    ...i.categories.map((c) => link(`${c.name} 공고`, `/c/${c.slug}/`, `${c.count}건`)),
    link('사이트맵', '/sitemap.xml', '공고 페이지 주소 목록'),
    link('마감 캘린더 구독', '/cal/all.ics', '전체 공고의 마감일 일정 파일'),
    '',
    `## 이번 주 마감 창업 공고 (${i.weekRange})`,
    ...i.weekItems.slice(0, LLMS_WEEK_MAX).map((l) => link(l.name, `/g/${l.slug}/`, `${deadlineLabel(l) ?? '상시'} 마감 · ${aiUseSentence(l.aiUse)}`)),
    '',
    '## 공고 페이지 읽는 법',
    '- 공고 페이지(/g/<주소>/)는 첫 두 문장에 공고명·마감·AI 사용 판독을 쓰고, 이어서 자격 원문 인용, 조항별 원문 인용(AI 사용·중복 수혜·중복 수상·업력·팀 구성·현장 참석)을 싣는다.',
    '- 조항을 찾지 못한 경우 「찾지 못했어요」라고 적는다. 지어낸 결론은 없다. 지원 전 원문 공고를 꼭 확인할 것.',
    '',
  ];
  return lines.join('\n');
}
