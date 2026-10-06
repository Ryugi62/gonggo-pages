import { listings, generatedAt } from '../../../adapters/site/data.ts';
import { deadlineEvent, serializeCalendar } from '../../../domain/ics.ts';
import type { PublicListing } from '../../../domain/listing.ts';

// 공고 1건 마감 일정(SPEC §11 C1) — /cal/g/<slug>.ics, 마감 3일 전 알림
export function getStaticPaths() {
  return listings.filter((l) => l.deadline).map((l) => ({ params: { slug: l.slug }, props: { l } }));
}

export function GET({ props, site }: { props: { l: PublicListing }; site: URL }) {
  const base = site.href.replace(/\/$/, '');
  const body = serializeCalendar({ name: `[마감] ${props.l.name}`, events: [deadlineEvent(props.l, base)], stamp: generatedAt, alarmDaysBefore: 3 });
  return new Response(body, { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
}
