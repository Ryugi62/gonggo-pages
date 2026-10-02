import { index } from '../adapters/site/data.ts';

// 체커용 최소 데이터(공개 필드만)
export function GET() {
  const rows = index.sorted.map((l) => ({ s: l.slug, n: l.name, c: l.category, d: l.deadline, p: l.prize, k: l.constraints }));
  return new Response(JSON.stringify(rows), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
