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

// SPEC §18 AC-64 — .astro 스크립트에 계산·상태 판정이 남지 않게 한다(10/14 감사 #4)
const astroFiles = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? astroFiles(join(dir, e.name)) : e.name.endsWith('.astro') ? [join(dir, e.name)] : []));

describe('.astro 로직 분리 (AC-64)', () => {
  const bundled = (s: string) => [...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  it('번들 <script>는 domain·application만 import한다', () => {
    for (const f of astroFiles('src')) {
      for (const sc of bundled(readFileSync(f, 'utf8'))) {
        for (const m of sc.matchAll(/from ['"]([^'"]+)['"]/g)) expect(m[1], f).toMatch(/^\.\.\/(domain|application)\//);
      }
    }
  });
  it('번들 <script>는 날짜 계산(Date.parse·Math.round)을 직접 하지 않는다', () => {
    for (const f of astroFiles('src')) for (const sc of bundled(readFileSync(f, 'utf8'))) expect(sc, f).not.toMatch(/Date\.parse|Math\.round/);
  });
  it('프런트매터는 node: 모듈을 import하지 않는다', () => {
    for (const f of astroFiles('src')) expect(readFileSync(f, 'utf8'), f).not.toMatch(/from ['"]node:/);
  });
  it('.astro가 하나 이상 검사된다', () => expect(astroFiles('src').length).toBeGreaterThan(8));
});
