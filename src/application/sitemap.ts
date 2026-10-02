/** UC-4 */
export function sitemapXml(site: string, paths: string[], lastmod: string): string {
  const base = site.replace(/\/$/, '');
  const uniq = [...new Set(paths)];
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const urls = uniq.map((p) => `  <url><loc>${esc(base + p)}</loc><lastmod>${lastmod}</lastmod></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export function robotsTxt(site: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${site.replace(/\/$/, '')}/sitemap.xml\n`;
}
