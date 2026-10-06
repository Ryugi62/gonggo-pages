import { calendarFeeds, generatedAt } from '../../adapters/site/data.ts';
import { deadlineEvent, serializeCalendar } from '../../domain/ics.ts';

// 구독 피드(SPEC §11 C2) — /cal/<slug>.ics
export function getStaticPaths() {
  return calendarFeeds.map((f) => ({ params: { feed: f.slug }, props: { f } }));
}

export function GET({ props, site }: { props: { f: (typeof calendarFeeds)[number] }; site: URL }) {
  const base = site.href.replace(/\/$/, '');
  const body = serializeCalendar({ name: props.f.name, events: props.f.items.map((l) => deadlineEvent(l, base, { brief: true })), stamp: generatedAt });
  return new Response(body, { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } });
}
