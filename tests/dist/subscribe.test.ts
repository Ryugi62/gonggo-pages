import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

// SPEC §25 AC-90 — 구독 폼은 AWS 빌드에만, 페이지마다 1개, 입력 3개, 동의 문구 4요소
const aws = process.env.DEPLOY_TARGET === 'aws';
const slugs = readdirSync('dist/g').filter((f) => existsSync(`dist/g/${f}/index.html`));
const digest = existsSync('dist/digest') ? readdirSync('dist/digest').map((d) => `dist/digest/${d}/index.html`).filter(existsSync) : [];
const pages = [...slugs.map((s) => `dist/g/${s}/index.html`), 'dist/week/index.html', ...digest];
const entry = (h: string) => h.match(/<section class="sub-entry[\s\S]*?<\/section>/)?.[0] ?? '';

describe('AC-90 구독 입구', () => {
  it(aws ? 'AWS 빌드: 상세·주간·digest에 폼 1개' : '기본 빌드: 폼 0개', () => {
    expect(slugs.length).toBeGreaterThan(0);
    for (const p of pages) {
      const h = readFileSync(p, 'utf8');
      expect((h.match(/data-sub-entry/g) ?? []).length, p).toBe(aws ? 1 : 0);
      if (!aws) continue;
      const e = entry(h);
      expect((e.match(/<(input|select) /g) ?? []).length, p).toBe(3);
      for (const w of ['이메일', '주 1회', '2027-11-02', '거부']) expect(e, `${p} ${w}`).toContain(w);
      expect(e, p).not.toMatch(/19,900|49,000|카드|결제하기/);
    }
  });
});
