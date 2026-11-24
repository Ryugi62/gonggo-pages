import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';

// SPEC §25 AC-90 — 구독 폼은 AWS 빌드에만, 페이지마다 1개, 입력 3개, 동의 문구 4요소
const aws = process.env.DEPLOY_TARGET === 'aws';
const slugs = readdirSync('dist/g').filter((f) => existsSync(`dist/g/${f}/index.html`));
const digest = existsSync('dist/digest') ? readdirSync('dist/digest').map((d) => `dist/digest/${d}/index.html`).filter(existsSync) : [];
// SPEC §32: 구독 입구는 읽는 법 화면(/read/) 맨 아래 묶음 — 상세엔 0개
const readPages = slugs.filter((s) => existsSync(`dist/g/${s}/read/index.html`)).map((s) => `dist/g/${s}/read/index.html`);
const pages = [...readPages, 'dist/week/index.html', ...digest];
const entry = (h: string) => h.match(/<section class="sub-entry[\s\S]*?<\/section>/)?.[0] ?? '';

describe('AC-90 구독 입구', () => {
  it('상세에는 폼 0개', () => { for (const s of slugs.slice(0, 300)) expect(readFileSync(`dist/g/${s}/index.html`, 'utf8'), s).not.toContain('data-sub-entry'); });
  it(aws ? 'AWS 빌드: 상세·주간·digest에 폼 1개' : '기본 빌드: 폼 0개', () => {
    expect(slugs.length).toBeGreaterThan(0);
    for (const p of pages) {
      const h = readFileSync(p, 'utf8');
      expect((h.match(/data-sub-entry/g) ?? []).length, p).toBe(aws ? 1 : 0);
      if (!aws) continue;
      const e = entry(h);
      expect((e.match(/<(input|select) /g) ?? []).length, p).toBe(3);
      for (const w of ['이메일', '운영자가 공고를 정리할 때', '2027-11-02', '거부']) expect(e, `${p} ${w}`).toContain(w);
      expect(e, p).not.toMatch(/19,900|49,000|카드|결제하기/);
    }
  });
});
