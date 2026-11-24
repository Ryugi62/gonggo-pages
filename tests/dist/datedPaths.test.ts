import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
const dates: string[] = JSON.parse(readFileSync('data/digest-dates.json', 'utf8'));
const now = JSON.parse(readFileSync('data/listings.json', 'utf8')).generatedAt;
describe('AC-168 지난 날짜 주소는 살아 있고 canonical은 새 날짜', () => {
  for (const kind of ['digest', 'ai-ok', 'solo']) it(kind, () => {
    for (const d of [...dates, now]) expect(readFileSync(`dist/${kind}/${d}/index.html`, 'utf8')).toMatch(new RegExp(`rel="canonical" href="[^"]*/${kind}/${now}/"`));
  });
});
