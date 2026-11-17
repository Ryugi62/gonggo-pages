import { existsSync, readFileSync } from 'node:fs';

export interface FillRow { url: string; quote: string; site: string; fetchedAt: string }

/** data/fill.jsonl → url → 보강 인용 (없으면 빈 맵) */
export function readFill(path: string): Map<string, string> {
  const m = new Map<string, string>();
  if (!existsSync(path)) return m;
  for (const l of readFileSync(path, 'utf8').split('\n')) {
    if (!l.trim()) continue;
    const r = JSON.parse(l) as FillRow;
    if (r.url && r.quote) m.set(r.url, r.quote);
  }
  return m;
}
