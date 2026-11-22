import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, existsSync } from 'node:fs';

// 핫픽스 11/22: 공개 제목 앞머리에 원 사이트 관리자 메모(「지혜 //」 등)가 남지 않는다 — 빌드 산출물 전수
const MEMO = /<title>[^<]{0,30}?\s\/\/\s?/;
const HIDDEN = /요청에\s*의한\s*비공개/;

describe('제목 머리 관리자 메모 0 (dist 전수)', () => {
  const slugs = readdirSync('dist/g').filter((s) => existsSync(`dist/g/${s}/index.html`));
  it('상세 <title>에 「… //」 머리 0', () => {
    const bad = slugs.filter((s) => MEMO.test(readFileSync(`dist/g/${s}/index.html`, 'utf8')));
    expect(bad).toEqual([]);
  });
  it('sitemap·llms.txt에 메모·비공개 낱말 0', () => {
    for (const f of ['dist/sitemap.xml', 'dist/llms.txt']) {
      if (!existsSync(f)) continue;
      const t = readFileSync(f, 'utf8');
      expect(/지혜 \/\/|게시판 이동 안내|중복 \/\//.test(t)).toBe(false);
      expect(HIDDEN.test(t)).toBe(false);
    }
  });
  it('요청에 의한 비공개 공고 페이지 없음', () => {
    expect(existsSync('dist/g/g-7857fd5e/index.html')).toBe(false);
  });
});
