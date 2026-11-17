import { describe, it, expect } from 'vitest';
import { extractFillQuote, fillSiteOf } from '../src/domain/fillExtract.ts';
import { exportPublicListings } from '../src/application/exportPublicListings.ts';
import { rows, TODAY } from './fixtures/rows.ts';

const CK = `<div class="txt"><h2>공모소재</h2><p> 1. 문구 <br>
2. 내용 </p><h2>참가자격</h2>
<p>
  전국민 누구나&nbsp;(임직원 포함)
</p><h2>접수기간</h2><p>2026. 11. 6.</p></div>`;
const TC = `<div class=""><div class="tit">접수기간</div><div class="txt">2026-11-01</div></div>
<div class=""><div class="tit">참가자격</div><div class="txt"><ul class="clearfix">
<li>대학생</li>
<li> 대학원생</li></ul></div></div>`;
const LA = `<dl><dt class="field-label">기업형태</dt><dd class="text">재단</dd></dl><dl><dt class="field-label">참여대상</dt><dd class="text">대학생, 직장인/일반인</dd></dl>`;
const BZ = `<li><span class="s_title">사업개요</span><div class="txt"><p>광주시는 사업을 추진합니다.</p><p><br></p><p>☞&nbsp;광주시 소재(본사 또는 공장) 가구 제조기업</p><p>☞ 전시회 참가 소요비용 지원(최대 3,000천원 이내)</p></div></li><li><span class="s_title">사업신청 방법</span><div class="txt"><p>☞ 신청서 제출</p></div></li>`;

describe('AC-94 사이트별 보강 인용 추출', () => {
  it('사이트 이름을 호스트에서 가린다', () => {
    expect(fillSiteOf('https://www.contestkorea.com/sub/view.php?x=1')).toBe('contestkorea');
    expect(fillSiteOf('https://thinkcontest.com/a')).toBe('thinkcontest');
    expect(fillSiteOf('https://www.thinkcontest.com/a')).toBe('thinkcontest');
    expect(fillSiteOf('https://linkareer.com/activity/1')).toBe('linkareer');
    expect(fillSiteOf('https://www.bizinfo.go.kr/x')).toBe('bizinfo');
    expect(fillSiteOf('https://unstop.com/x')).toBeNull();
  });
  it('contestkorea: 참가자격 h2 다음 p', () => expect(extractFillQuote('contestkorea', CK)).toBe('전국민 누구나 (임직원 포함)'));
  it('contestkorea: 참가대상·신청자격(공통) 제목도 자격 칸', () => {
    expect(extractFillQuote('contestkorea', '<h2>참가대상</h2><p>만 19세 이상 일반인</p>')).toBe('만 19세 이상 일반인');
    expect(extractFillQuote('contestkorea', '<h2>신청자격(공통)</h2><p>대학생</p><h2>부문별 신청자격</h2><p>x</p>')).toBe('대학생');
    expect(extractFillQuote('contestkorea', '<h2>시상내역</h2><p>대상 1명</p>')).toBeNull();
  });
  it('thinkcontest: 참가자격 칸의 li 이음', () => expect(extractFillQuote('thinkcontest', TC)).toBe('대학생 대학원생'));
  it('linkareer: 참여대상 dd', () => expect(extractFillQuote('linkareer', LA)).toBe('대학생, 직장인/일반인'));
  it('bizinfo: 사업개요 안 첫 ☞ 문장(지원 금액 문장·다른 절은 제외)', () => expect(extractFillQuote('bizinfo', BZ)).toBe('광주시 소재(본사 또는 공장) 가구 제조기업'));
  it('자격 칸이 없으면 null', () => {
    expect(extractFillQuote('contestkorea', '<h2>접수기간</h2><p>x</p>')).toBeNull();
    expect(extractFillQuote('bizinfo', '<li><span class="s_title">사업개요</span><div class="txt"><p>없음</p></div></li>')).toBeNull();
    expect(extractFillQuote('linkareer', '')).toBeNull();
  });
});

describe('AC-95 내보내기 병합', () => {
  const base = exportPublicListings(rows as any, TODAY).listings;
  const noQuote = base.find((l) => !l.eligibilityQuote)!;
  const hasQuote = base.find((l) => l.eligibilityQuote)!;
  const fill = new Map([[noQuote.url, '대학생 누구나'], [hasQuote.url, '쓰면 안 되는 값']]);
  const out = exportPublicListings(rows as any, TODAY, fill).listings;
  it('note에서 못 뽑은 행만 fill로 채운다', () => {
    expect(out.find((l) => l.slug === noQuote.slug)!.eligibilityQuote).toBe('대학생 누구나');
    expect(out.find((l) => l.slug === hasQuote.slug)!.eligibilityQuote).toBe(hasQuote.eligibilityQuote);
  });
  it('내부 메모 흔적·금지 토큰이 든 fill은 버린다', () => {
    const bad = exportPublicListings(rows as any, TODAY, new Map([[noQuote.url, '확인 필요 …']])).listings;
    expect(bad.find((l) => l.slug === noQuote.slug)!.eligibilityQuote).toBeNull();
  });
  it('300자를 넘으면 자른다', () => {
    const long = exportPublicListings(rows as any, TODAY, new Map([[noQuote.url, '가 나 '.repeat(200)]])).listings;
    expect(long.find((l) => l.slug === noQuote.slug)!.eligibilityQuote!.length).toBeLessThanOrEqual(301);
  });
});
