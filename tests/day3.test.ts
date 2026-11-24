import { describe, it, expect } from 'vitest';
import { isOpen, badgeState, deadlineDisplay } from '../src/domain/freshness.ts';
import { josa, tagHeading } from '../src/domain/josa.ts';
import { buildTime } from '../src/infrastructure/config.ts';
import { DAY_SCRIPT } from '../src/infrastructure/dayScript.ts';
import { CHIP_SCRIPT } from '../src/infrastructure/chipScript.ts';

// SPEC §35
describe('AC-142 마감 시각', () => {
  const L = (deadline: string, deadlineTime: string | null) => ({ deadline, deadlineTime, rolling: false } as any);
  it('buildTime은 GK_NOW를 주입받는다', () => {
    expect(buildTime({ GK_NOW: '17:30' })).toBe('17:30');
    expect(buildTime({})).toMatch(/^\d{2}:\d{2}$/);
  });
  it('isOpen: 오늘 마감인데 시각이 지났으면 닫힘, 안 지났거나 시각 없으면 열림, 00:00(오늘)은 이미 지남', () => {
    expect(isOpen(L('2026-11-24', '15:00'), '2026-11-24', '17:30')).toBe(false);
    expect(isOpen(L('2026-11-24', '18:00'), '2026-11-24', '17:30')).toBe(true);
    expect(isOpen(L('2026-11-24', null), '2026-11-24', '17:30')).toBe(true);
    expect(isOpen(L('2026-11-24', '00:00'), '2026-11-24', '17:30')).toBe(false);
    expect(isOpen(L('2026-11-25', '00:00'), '2026-11-24', '17:30')).toBe(true);
    expect(isOpen(L('2026-11-24', '15:00'), '2026-11-24')).toBe(true); // 시각을 안 주면 날짜만(기존 호출)
  });
  it('badgeState: 시각이 지난 오늘 마감은 마감', () => {
    expect(badgeState('2026-11-24', '2026-11-24', true, '15:00', '17:30').label).toBe('마감됐어요');
    expect(badgeState('2026-11-24', '2026-11-24', false, '15:00', '17:30').label).toBe('마감');
    expect(badgeState('2026-11-24', '2026-11-24', true, '18:00', '17:30').label).toBe('D-day');
  });
  it('deadlineDisplay: 00:00은 싣지 않고 원문 확인 안내만', () => {
    expect(deadlineDisplay({ deadline: '2026-11-30', deadlineTime: '00:00' } as any)).toEqual({ time: null, note: '마감 시각은 원문에서 확인' });
    expect(deadlineDisplay({ deadline: '2026-11-30', deadlineTime: '18:00' } as any)).toEqual({ time: '18:00', note: null });
    expect(deadlineDisplay({ deadline: '2026-11-30', deadlineTime: null } as any)).toEqual({ time: null, note: null });
  });
});

describe('AC-148 조사', () => {
  it('받침에 따라 이/가·은/는', () => {
    expect(josa('창업자', '이/가')).toBe('창업자가');
    expect(josa('대학생', '이/가')).toBe('대학생이');
    expect(josa('청년', '은/는')).toBe('청년은');
    expect(josa('누구나', '이/가')).toBe('누구나가');
  });
  it('tagHeading: 태그별 제목 문장', () => {
    expect(tagHeading('창업자')).toBe('창업자가 낼 수 있는 공고');
    expect(tagHeading('대학생')).toBe('대학생이 낼 수 있는 공고');
    expect(tagHeading('누구나')).toBe('누구나 낼 수 있는 공고');
  });
});

function fakeEl(attrs: Record<string, string>, text = '', cls: string[] = []) {
  const a = { ...attrs }; const c = new Set(cls);
  return { hidden: false, textContent: text, getAttribute: (k: string) => a[k] ?? null, setAttribute: (k: string, v: string) => { a[k] = v; }, removeAttribute: (k: string) => { delete a[k]; }, hasAttribute: (k: string) => k in a,
    classList: { contains: (k: string) => c.has(k), toggle: (k: string, on: boolean) => { on ? c.add(k) : c.delete(k); }, add: (k: string) => c.add(k), remove: (k: string) => c.delete(k) }, _a: a };
}
const EMPTY = { '[data-deadline]': [], '[data-closed-href]': [], '[data-closed-show]': [], '[data-row-deadline]': [], '[data-count]': [], '[data-empty]': [], '[data-hist]': [] };
function runAt(iso: string, els: Record<string, any[]>) {
  const doc = { querySelectorAll: (sel: string) => (els as any)[sel] ?? [] };
  new Function('document', 'Intl', 'Date', DAY_SCRIPT.replace(/new Date\(\)/g, `new Date('${iso}')`))(doc, Intl, Date);
}
describe('AC-142·143 DAY_SCRIPT 시각·원문 길', () => {
  it('오늘 마감 15:00은 지금 17:30(KST)이면 마감됐어요, 18:00은 D-day', () => {
    const a = fakeEl({ 'data-deadline': '2026-11-24', 'data-deadline-time': '15:00' }, 'D-day', ['lg']);
    const b = fakeEl({ 'data-deadline': '2026-11-24', 'data-deadline-time': '18:00' }, 'D-day', ['lg']);
    runAt('2026-11-24T08:30:00Z', { ...EMPTY, '[data-deadline]': [a] }); runAt('2026-11-24T08:30:00Z', { ...EMPTY, '[data-deadline]': [b] });
    expect(a.textContent).toBe('마감됐어요'); expect(b.textContent).toBe('D-day');
  });
  it('시각이 지난 오늘 행은 목록에서 걷힌다', () => {
    const r1 = fakeEl({ 'data-row-deadline': '2026-11-24', 'data-row-time': '15:00', 'data-group': 'list' }); const r2 = fakeEl({ 'data-row-deadline': '2026-11-24', 'data-group': 'list' });
    runAt('2026-11-24T08:30:00Z', { ...EMPTY, '[data-row-deadline]': [r1, r2] });
    expect([r1.hidden, r2.hidden]).toEqual([true, false]);
  });
  it('마감으로 바뀌면 끝난 원문 행이 보이고, 열린 채면 숨은 채', () => {
    const show = fakeEl({ 'data-closed-show': '' }); show.hidden = true;
    runAt('2026-11-26T03:00:00Z', { ...EMPTY, '[data-deadline]': [fakeEl({ 'data-deadline': '2026-11-24' }, 'D-3', ['lg'])], '[data-closed-show]': [show] });
    expect(show.hidden).toBe(false);
    const show2 = fakeEl({ 'data-closed-show': '' }); show2.hidden = true;
    runAt('2026-11-24T03:00:00Z', { ...EMPTY, '[data-deadline]': [fakeEl({ 'data-deadline': '2026-11-24' }, 'D-3', ['lg'])], '[data-closed-show]': [show2] });
    expect(show2.hidden).toBe(true);
  });
});

describe('AC-144 칩 — 분류를 유지한 채 좁힌다', () => {
  function setup(search = '') {
    const row = (tags: string, d = '2026-11-25') => fakeEl({ 'data-row-deadline': d, 'data-group': 'list', 'data-tags': tags });
    const rows = [row('대학생,청년'), row('창업자'), row('대학생'), row('누구나')];
    rows[3].hidden = true; // 이미 지난 행은 칩이 풀어도 안 보임
    const chips = [fakeEl({ 'data-slug': 'student', 'data-tag': '대학생' }), fakeEl({ 'data-slug': 'founder', 'data-tag': '창업자' })];
    const count = fakeEl({ 'data-count': 'list' }, '4'); const empty = fakeEl({ 'data-empty': 'list' }); empty.hidden = true;
    const handlers: Record<string, Function[]> = {}; const chipHandlers: Function[] = [];
    chips.forEach((c) => { (c as any).addEventListener = (_: string, f: Function) => chipHandlers.push(f); (c as any).closest = () => c; });
    const pushed: string[] = []; const loc = { search, pathname: '/c/contest/' };
    const win = { addEventListener: (n: string, f: Function) => { (handlers[n] ??= []).push(f); } };
    const hist = { pushState: (_s: any, _t: string, u: string) => { pushed.push(u); loc.search = u.includes('?') ? u.slice(u.indexOf('?')) : ''; } };
    const doc = { querySelectorAll: (s: string) => ({ '[data-row-deadline]': rows, '[data-chip]': chips, '[data-count="list"]': [count], '[data-empty="list"]': [empty] } as any)[s] ?? [] };
    new Function('document', 'window', 'location', 'history', CHIP_SCRIPT)(doc, win, loc, hist);
    return { rows, chips, count, empty, chipHandlers, pushed, handlers, loc };
  }
  const off = (r: any) => r.hasAttribute('data-off');
  it('칩을 누르면 그 태그 행만 남고 건수·주소(?t=)가 바뀐다, 다시 누르면 풀린다', () => {
    const s = setup();
    s.chipHandlers[0]({ preventDefault() {}, currentTarget: s.chips[0], target: s.chips[0] });
    expect(s.rows.map(off)).toEqual([false, true, false, true]);
    expect(s.count.textContent).toBe('2');
    expect(s.pushed).toEqual(['/c/contest/?t=student']);
    s.chipHandlers[0]({ preventDefault() {}, currentTarget: s.chips[0], target: s.chips[0] });
    expect(s.rows.map(off)).toEqual([false, false, false, false]);
    expect(s.count.textContent).toBe('3'); // 지난 행(hidden)은 세지 않는다
    expect(s.pushed[1]).toBe('/c/contest/');
  });
  it('?t= 주소로 들어오면 처음부터 좁혀져 있고, 뒤로(popstate)에서 복원', () => {
    const s = setup('?t=founder');
    expect(s.rows.map(off)).toEqual([true, false, true, true]);
    expect(s.count.textContent).toBe('1');
    s.loc.search = ''; s.handlers['popstate'][0]();
    expect(s.rows.map(off)).toEqual([false, false, false, false]);
  });
});
