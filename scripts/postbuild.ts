// 빌드 산출물 측정: HTML 수·sitemap URL 수·가장 큰 상세 페이지 크기
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

function walk(d: string): string[] {
  return readdirSync(d).flatMap((f) => {
    const p = join(d, f);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}
const html = walk('dist').filter((f) => f.endsWith('.html'));
const detail = html.filter((f) => f.startsWith('dist/g/'));
const sizes = detail.map((f) => statSync(f).size).sort((a, b) => a - b);
const sitemapUrls = (readFileSync('dist/sitemap.xml', 'utf8').match(/<loc>/g) ?? []).length;
console.log(`pages: html ${html.length} (상세 ${detail.length}) · sitemap URL ${sitemapUrls}`);
console.log(`상세 HTML 크기: 중앙 ${(sizes[sizes.length >> 1] / 1024).toFixed(1)}KB · 최대 ${(sizes.at(-1)! / 1024).toFixed(1)}KB`);
