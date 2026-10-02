import { sitePaths, generatedAt } from '../adapters/site/data.ts';
import { sitemapXml } from '../application/sitemap.ts';

export function GET({ site }: { site: URL }) {
  return new Response(sitemapXml(site.href, sitePaths(), generatedAt), { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
