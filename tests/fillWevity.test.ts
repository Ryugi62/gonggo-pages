// SPEC §41 AC-176~178
import { describe, expect, it } from 'vitest';
import { extractFillQuote, fillFetchUrl, fillSiteOf, isFillAnswer } from '../src/domain/fillExtract.ts';

const URL = 'https://www.wevity.com/?c=find&s=1&gub=1&gbn=view&ix=111756';
// 실물(11/27 ix=111756)에서 옮긴 조각: 왼쪽 이벤트 분류 메뉴 + 상세 칸
const menu = '<h4 class="cat-tit">응모대상</h4> <ul class="cat"> <li ><a href="?c=event&amp;s=1&gub=3">전체</a></li> <li ><a href="?c=event&amp;s=1&gub=3&cidx=16">누구나 참여</a></li> </ul>';
const page = (v: string) => `${menu}<ul class="cd-info-list"><li> <span class="tit">분야</span> 기획/아이디어 </li>\n<li> <span class="tit">응모대상</span> ${v} </li>\n<li> <span class="tit">주최/주관</span> 한국정책분석평가학회 </li></ul>`;

describe('AC-176 wevity 받기 주소', () => {
  it('사이트를 가리고 url 그대로 받는다', () => {
    expect(fillSiteOf(URL)).toBe('wevity');
    expect(fillSiteOf('https://wevity.com/?c=find&ix=1')).toBe('wevity');
    expect(fillFetchUrl('wevity', URL)).toBe(URL);
  });
});
describe('AC-177 wevity 응모대상 칸', () => {
  it('상세 칸 값만 읽는다(왼쪽 메뉴 「누구나 참여」는 안 읽음)', () => {
    expect(extractFillQuote('wevity', page('대학생'))).toBe('대학생');
    expect(extractFillQuote('wevity', page('일반인, 대학생, 청소년'))).toBe('일반인, 대학생, 청소년');
  });
  it('칸이 없으면 null', () => {
    expect(extractFillQuote('wevity', menu)).toBeNull();
    expect(extractFillQuote('wevity', '<html><title>없음</title></html>')).toBeNull();
  });
});
describe('AC-178 wevity 정해진 낱말 관문', () => {
  it('정해진 낱말만이면 통과', () => {
    for (const q of ['대학생', '제한없음', '일반인, 대학생, 기타', '제한없음, 기타', '일반인, 대학생, 청소년, 어린이'])
      expect(isFillAnswer('wevity', q)).toBe(true);
  });
  it('「기타」 하나만이거나 낱말 밖 글자가 섞이면 버린다', () => {
    expect(isFillAnswer('wevity', '기타')).toBe(false);
    expect(isFillAnswer('wevity', '대학생, 서울시 거주자')).toBe(false);
    expect(isFillAnswer('wevity', '제한없음 (부산시민)')).toBe(false);
  });
  it('다른 사이트 판정은 그대로', () => {
    expect(isFillAnswer('thinkcontest', '대학생 대학원생 일반인')).toBe(true);
    expect(isFillAnswer('linkareer', '대학생, 서울시 거주자')).toBe(true);
  });
});
