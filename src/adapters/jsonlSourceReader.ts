import { readFileSync } from 'node:fs';
import type { SourceRow } from '../domain/listing.ts';

/** 포트 SourceRowReader 구현: jsonl 1줄 1건 */
export function readSourceRows(path: string): SourceRow[] {
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l) as SourceRow);
}
