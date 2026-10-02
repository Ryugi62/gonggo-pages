import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const files = (dir: string) => readdirSync(dir).filter((f) => f.endsWith('.ts')).map((f) => join(dir, f));

describe('Clean Architecture 의존 방향', () => {
  it('domain은 application·adapters·infrastructure·node:·astro를 import하지 않는다', () => {
    for (const f of files('src/domain')) {
      const s = readFileSync(f, 'utf8');
      expect(s, f).not.toMatch(/from ['"](\.\.\/(application|adapters|infrastructure)|node:|astro)/);
    }
  });
  it('application은 adapters·infrastructure·node:를 import하지 않는다', () => {
    for (const f of files('src/application')) {
      const s = readFileSync(f, 'utf8');
      expect(s, f).not.toMatch(/from ['"](\.\.\/(adapters|infrastructure)|node:|astro)/);
    }
  });
});
