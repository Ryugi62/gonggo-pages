import type { PublicListing } from '../domain/listing.ts';
import { dDayLabel, formatDate } from '../domain/format.ts';

// 주간 구독 메일 본문(SPEC §25 U6, 초안 — 발송은 메인 세션 손). 가격·광고 문구 0, 수신 거부 안내와 운영자 고지 포함.
export function renderSubDigest(items: PublicListing[], today: string, origin: string, operator: { name: string; email: string }): string {
  if (items.length === 0) return `발송 보류: ${formatDate(today)} 기준 7일 안에 마감하는 공고가 없어요. 이번 주는 보내지 않아요.`;
  const lines: string[] = [];
  lines.push(`제목: [공고콕] 이번 주 마감 임박 공고 ${items.length}건 (${formatDate(today)} 기준)`);
  lines.push('');
  lines.push('안녕하세요, 공고콕이에요.');
  lines.push('7일 안에 마감하는 공고를 마감 순으로 골랐어요.');
  lines.push('');
  items.forEach((l, i) => {
    lines.push(`${i + 1}. ${l.name}`);
    lines.push(`   ${formatDate(l.deadline!)}${l.deadlineTime ? ` ${l.deadlineTime}` : ''} 마감 (${dDayLabel(l.deadline, today)})${l.prize ? ` · ${l.prize}` : ''}`);
    lines.push(`   자격·조항 정리: ${origin}/g/${l.slug}/`);
    lines.push(`   원문 공고: ${l.url}`);
    lines.push('');
  });
  lines.push('공고는 수정될 수 있어요. 지원 전에 원문 공고에서 자격과 마감을 꼭 다시 확인해 주세요.');
  lines.push('');
  lines.push('— 수신 거부: 이 메일에 「수신 거부」라고 답장해 주시면 그날 이메일을 지우고 더는 보내지 않아요.');
  lines.push('— 이 메일은 공고콕 마감 임박 메일 구독에 동의하신 분께만 주 1회 보내요. 보관 기간 등은 ' + `${origin}/privacy/ 에 있어요.`);
  lines.push(`— 운영자 ${operator.name} · 문의 ${operator.email}`);
  return lines.join('\n');
}
