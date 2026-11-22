import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { scrubTitle } from '../src/domain/titleScrub.ts';
import { mergeListings } from '../src/application/mergeListings.ts';

const mk = (slug: string, name: string) => ({
  slug, name, category: '공모전', kind: '대회', deadline: '2026-12-20', deadlineTime: null, rolling: false,
  url: `https://x.test/${slug}`, organizer: null, prize: null, eligibilityQuote: null, tags: [],
  constraints: { minAge: null, maxAge: null, studentOnly: false, region: null, business: null, open: true }, clauses: [], aiUse: 'UNSTATED',
}) as any;

describe('scrubTitle — 원 사이트 관리자 메모 제거', () => {
  it.each([
    ['지혜 // [이번기수 마지막기회/Harmony반] 오케스트라', '[이번기수 마지막기회/Harmony반] 오케스트라'],
    ['지혜 //2026 서울시립대학교 AI+X 2기', '2026 서울시립대학교 AI+X 2기'],
    ['게시판 이동 안내 전화 완료 //Ocean Tech Korea 2026', 'Ocean Tech Korea 2026'],
    ['게시판 이동 안내 연락 완료//2026 포럼', '2026 포럼'],
    ['고재원 준비중 // 국회 미래세대 공모전', '국회 미래세대 공모전'],
    ['주최사에 전화 후 게시판 이동 안내 요청 완료 //태화강 어린연어 키우기', '태화강 어린연어 키우기'],
  ])('%s', (raw, want) => expect(scrubTitle(raw)).toEqual({ name: want, drop: false, reason: null }));
  it('「중복 //」·「요청에의한 비공개」 앞머리는 공개 제외', () => {
    expect(scrubTitle('중복 //2026 의왕시 공모전').drop).toBe(true);
    expect(scrubTitle('요청에의한 비공개 / 디지털 공감 숏폼 공모전').drop).toBe(true);
  });
  it('제목 중간·URL의 //는 건드리지 않는다', () => {
    for (const t of ['공모전 안내 https://example.com/a 참고', '2026 A//B 해커톤', 'http://x.kr 공모']) expect(scrubTitle(t)).toEqual({ name: t, drop: false, reason: null });
  });
});

describe('mergeListings — 옛 목록에도 적용', () => {
  it('메모 제거 · 중복 표시 공고는 URL 보존(이름만 정리) · 비공개 요청만 제외', () => {
    const out = mergeListings([mk('a', '지혜 // 가나다 공모'), mk('b', '중복 //라마바'), mk('c', '요청에의한 비공개 / 사아자')], []);
    expect(out.map((l) => [l.slug, l.name])).toEqual([['a', '가나다 공모'], ['b', '라마바']]);
  });
});

describe('운영 데이터 전수', () => {
  it('listings.json 제목 머리 메모 // 0', () => {
    const all = JSON.parse(readFileSync('data/listings.json', 'utf8')).listings as { name: string }[];
    expect(all.filter((l) => /^.{1,30}?\s?\/\/\s?/.test(l.name) || /^요청에\s*의한\s*비공개/.test(l.name))).toEqual([]);
  });
});
