import { describe, it, expect } from 'vitest';
import { deadlineTimeOf, isOpen, badgeState, deadlineDisplay } from '../src/domain/freshness.ts';
import { quoteLines, eligibilityText } from '../src/domain/displayText.ts';
import { dedupeSameTitle } from '../src/domain/topic.ts';
import { checkerCounts } from '../src/domain/checker.ts';
import { DAY_SCRIPT } from '../src/infrastructure/dayScript.ts';
import { CHIP_SCRIPT } from '../src/infrastructure/chipScript.ts';

// SPEC §36
describe('AC-150 00:00 = 시각 없음', () => {
  const L = (t: string | null) => ({ deadline: '2026-11-24', deadlineTime: t, rolling: false } as any);
  it('deadlineTimeOf: 00:00은 null', () => {
    expect(deadlineTimeOf('00:00')).toBeNull(); expect(deadlineTimeOf('18:00')).toBe('18:00'); expect(deadlineTimeOf(null)).toBeNull();
  });
  it('당일 23:59까지 열림(cica 사례), 다른 시각은 지나면 닫힘', () => {
    expect(isOpen(L('00:00'), '2026-11-24', '23:59')).toBe(true);
    expect(isOpen(L('00:00'), '2026-11-24', '17:30')).toBe(true);
    expect(isOpen(L('15:00'), '2026-11-24', '17:30')).toBe(false);
    expect(badgeState('2026-11-24', '2026-11-24', true, deadlineTimeOf('00:00'), '23:59').label).toBe('D-day');
    expect(deadlineDisplay({ deadline: '2026-11-24', deadlineTime: '00:00' } as any).note).toBe('마감 시각은 원문에서 확인');
  });
});

describe('AC-151 자격 줄', () => {
  it('마커 앞에서 줄 나눔, ** 제거, 번호·글머리 보존', () => {
    expect(quoteLines('1) 은평구 소재 기업 2) 창업 준비자')).toEqual(['1) 은평구 소재 기업', '2) 창업 준비자']);
    expect(quoteLines('① 가 ② 나')).toEqual(['① 가', '② 나']);
    expect(quoteLines('● 참가 자격 - 만 19세 이상 ● 공모 분야')).toEqual(['● 참가 자격 - 만 19세 이상', '● 공모 분야']);
    expect(quoteLines('**대상** 누구나 - 학생\n- 청년')).toEqual(['대상 누구나', '- 학생', '- 청년']);
    expect(quoteLines('대한민국 국민 누구나')).toEqual(['대한민국 국민 누구나']);
  });
  it('eligibilityText: 인용이 없으면 찾은 ELIGIBILITY 조항 문장', () => {
    expect(eligibilityText({ eligibilityQuote: '원문 자격', clauses: [] } as any)).toBe('원문 자격');
    expect(eligibilityText({ eligibilityQuote: null, clauses: [{ kind: 'ELIGIBILITY', quote: '조항 속 자격' }] } as any)).toBe('조항 속 자격');
    expect(eligibilityText({ eligibilityQuote: null, clauses: [] } as any)).toBeNull();
  });
});

describe('AC-157 목록 중복', () => {
  const mk = (slug: string, name: string, deadline = '2026-11-30') => ({ slug, name, deadline } as any);
  it('제목·마감이 같으면 한 줄(첫 것), 마감이 다르면 둘 다', () => {
    const r = dedupeSameTitle([mk('a', '제6회 인천공항 여행 공모전'), mk('b', '제6회  인천공항 여행 공모전!'), mk('c', '제6회 인천공항 여행 공모전', '2026-12-01')]);
    expect(r.map((l: any) => l.slug)).toEqual(['a', 'c']);
  });
});

describe('AC-158 건수 글', () => {
  it('check 결과는 건으로', () => {
    const c = checkerCounts({ 맞음: [1], '확인 필요': [1, 2], '안 맞음': [] } as any);
    expect(c.ok).toBe('1건'); expect(c.rest).toBe('확인이 필요한 공고 2건'); // §37 AC-164로 숨김 문장 뺌
  });
});

function fakeEl(attrs: Record<string, string>, text = '') {
  const a = { ...attrs };
  return { hidden: false, textContent: text, getAttribute: (k: string) => a[k] ?? null, setAttribute: (k: string, v: string) => { a[k] = v; }, removeAttribute: (k: string) => { delete a[k]; }, hasAttribute: (k: string) => k in a, classList: { contains: () => false, toggle() {}, add() {}, remove() {} }, _a: a };
}
describe('AC-153 첫 보이는 행 표시', () => {
  it('DAY_SCRIPT: 지난 행을 걷고 첫 보이는 행에 data-top', () => {
    const rows = [fakeEl({ 'data-row-deadline': '2026-11-22', 'data-group': 'list' }), fakeEl({ 'data-row-deadline': '2026-11-25', 'data-group': 'list' }), fakeEl({ 'data-row-deadline': '2026-11-26', 'data-group': 'list' })];
    const els: any = { '[data-deadline]': [], '[data-closed-href]': [], '[data-closed-show]': [], '[data-row-deadline]': rows, '[data-count]': [], '[data-empty]': [], '[data-hist]': [] };
    new Function('document', 'Intl', 'Date', DAY_SCRIPT.replace(/new Date\(\)/g, "new Date('2026-11-24T03:00:00Z')"))({ querySelectorAll: (s: string) => els[s] ?? [] }, Intl, Date);
    expect(rows.map((r) => r.hasAttribute('data-top'))).toEqual([false, true, false]);
  });
});

describe('AC-156 칩 0건', () => {
  it('걸러서 0건이면 필터 풀고 N건 보기 버튼이 보이고, 누르면 풀린다', () => {
    const row = (tags: string) => fakeEl({ 'data-row-deadline': '2026-11-25', 'data-group': 'list', 'data-tags': tags });
    const rows = [row('대학생'), row('대학생'), row('청년')];
    const chip = fakeEl({ 'data-slug': 'founder', 'data-tag': '창업자' }); const handlers: Function[] = []; (chip as any).addEventListener = (_: string, f: Function) => handlers.push(f);
    const count = fakeEl({ 'data-count': 'list' }, '3'); const empty = fakeEl({ 'data-empty': 'list' }); empty.hidden = true;
    const ef = fakeEl({ 'data-empty-filter': '' }); ef.hidden = true; const total = fakeEl({ 'data-total-open': '' }, '0');
    const clear = fakeEl({ 'data-clear': '' }); const clearHandlers: Function[] = []; (clear as any).addEventListener = (_: string, f: Function) => clearHandlers.push(f);
    const map: any = { '[data-row-deadline]': rows, '[data-chip]': [chip], '[data-count="list"]': [count], '[data-empty="list"]': [empty], '[data-empty-filter]': [ef], '[data-total-open]': [total], '[data-clear]': [clear] };
    const loc = { search: '', pathname: '/c/contest/' };
    new Function('document', 'window', 'location', 'history', CHIP_SCRIPT)({ querySelectorAll: (s: string) => map[s] ?? [] }, { addEventListener() {} }, loc, { pushState: (_s: any, _t: string, u: string) => { loc.search = u.includes('?') ? u.slice(u.indexOf('?')) : ''; } });
    handlers[0]({ preventDefault() {} });
    expect(count.textContent).toBe('0'); expect(ef.hidden).toBe(false); expect(empty.hidden).toBe(true); expect(total.textContent).toBe('3');
    clearHandlers[0]({ preventDefault() {} });
    expect(count.textContent).toBe('3'); expect(ef.hidden).toBe(true);
  });
});
