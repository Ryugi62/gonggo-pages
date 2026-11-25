// SPEC §39 AC-170~172
import { describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { isFillAnswer } from '../src/domain/fillExtract.ts';
import { readFill } from '../src/adapters/fillStore.ts';

describe('AC-170 답이 아닌 인용', () => {
  it.each(['공모요강 확인', '아래의 각 요건에 모두 해당', '다음 각 요건에 모두 해당되어야 신청 가능', '아래 사항에 모두 해당하는 관내 중소기업',
    '농업경영체 중 다음에 해당하는 자', '인천광역시에 소재하는 아래의 중소기업자', '(신규지정) 아래 두 가지 자격요건을 모두 충족하는 기업',
    '300인 미만 기업으로서 아래 요건 중 하나 이상 해당하는 기업', '- 연령: 공식 페이지에 명시되어 있지 않음'])('버림: %s', (q) => expect(isFillAnswer('bizinfo', q)).toBe(false));
  it.each(['전국 소상공인', '춘천시 소재지에 사업자 등록한 외식업소', '대한민국 국민 누구나'])('남김: %s', (q) => expect(isFillAnswer('bizinfo', q)).toBe(true));
});
describe('AC-171 thinkcontest 덧붙은 조건', () => {
  it.each(['어린이 초등학생 중학생 고등학생 동 연령대 청소년 대학생 대학원생 일반인 제한 없음 부산시민대상', '대학생 일반인 시각예술분야 장애예술가', '제한 없음 K-오션MOOC 수강자 및 이용자', '대학생 대학원생 일반인 경기도'])('버림: %s', (q) => expect(isFillAnswer('thinkcontest', q)).toBe(false));
  it.each(['대학생 대학원생', '제한 없음', '어린이 초등학생 중학생 고등학생 동 연령대 청소년 대학생 대학원생 일반인 제한 없음'])('남김: %s', (q) => expect(isFillAnswer('thinkcontest', q)).toBe(true));
});
it('AC-172 readFill이 거른다', () => {
  const p = join(mkdtempSync(join(tmpdir(), 'fill-')), 'f.jsonl');
  writeFileSync(p, [['a', '공모요강 확인'], ['b', '대학생']].map(([url, quote]) => JSON.stringify({ url, quote, site: 'thinkcontest', fetchedAt: '' })).join('\n'));
  expect([...readFill(p).keys()]).toEqual(['b']);
});
