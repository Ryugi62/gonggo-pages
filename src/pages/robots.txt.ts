import { robotsTxt } from '../application/sitemap.ts';

export function GET({ site }: { site: URL }) {
  return new Response(robotsTxt(site.href), { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
