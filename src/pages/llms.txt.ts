import { llmsTxt } from '../application/llmsTxt.ts';
import { index, listings, categories, week } from '../adapters/site/data.ts';
import { formatDate } from '../domain/format.ts';

export function GET({ site }: { site: URL }) {
  const body = llmsTxt(site.href, {
    weekItems: week.items,
    weekRange: `${formatDate(week.from)} ~ ${formatDate(week.to)}`,
    categories: categories.map((c) => ({ name: c.name, slug: c.slug, count: index.byCategory.get(c.name)?.length ?? 0 })),
    hasRolling: index.rolling.length > 0,
    total: listings.length,
  });
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
