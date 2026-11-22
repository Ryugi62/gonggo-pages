// 앱 번들(~/dev/gonggo-appsintoss)에 웹 공고와 같은 /p/<slug>.html이 있는 slug만 data/app-slugs.json에 적는다(SPEC §30 AC-106).
// 빌드와 따로 도는 일회성 대조 — 사용: node scripts/app-slugs.ts [앱 dist/p 폴더]
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';

const dir = process.argv[2] ?? `${homedir()}/dev/gonggo-appsintoss/dist/p`;
const web = new Set((JSON.parse(readFileSync('data/listings.json', 'utf8')).listings as { slug: string }[]).map((l) => l.slug));
const app = readdirSync(dir).filter((f) => f.endsWith('.html')).map((f) => f.slice(0, -5));
const both = app.filter((s) => web.has(s)).sort();
writeFileSync('data/app-slugs.json', JSON.stringify(both) + '\n');
console.log(`웹 ${web.size} · 앱 ${app.length} · 같은 slug ${both.length}`);
