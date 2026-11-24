import { describe, it, expect } from 'vitest';
import { buildDay } from '../src/infrastructure/config.ts';
import { badgeState } from '../src/domain/freshness.ts';
import { isSameContest } from '../src/domain/topic.ts';
import { cleanDisplay, tidyQuote } from '../src/domain/displayText.ts';
import { DAY_SCRIPT } from '../src/infrastructure/dayScript.ts';
import { buildSiteIndex } from '../src/application/buildSiteIndex.ts';
import { isEdgeLog, edgeReadCommand } from '../src/application/edgeLogs.ts';
import { countAppCardClicks } from '../src/application/visitCount.ts';

// SPEC §34
describe('AC-131 기준일 = 빌드 날', () => {
  it('buildDay는 GK_TODAY를 주입받는다, 없으면 KST 오늘 형식', () => {
    expect(buildDay({ GK_TODAY: '2026-11-24' })).toBe('2026-11-24');
    expect(buildDay({})).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it('badgeState: 지난 날짜 큰 배지는 마감됐어요, 작은 배지는 마감, 오늘 D-day', () => {
    expect(badgeState('2026-11-22', '2026-11-24', true).label).toBe('마감됐어요');
    expect(badgeState('2026-11-22', '2026-11-24', false).label).toBe('마감');
    expect(badgeState('2026-11-24', '2026-11-24', true).label).toBe('D-day');
    expect(badgeState('2026-11-27', '2026-11-24', false)).toMatchObject({ label: 'D-3', soon: true, closed: false });
  });
  it('sitePaths: 열림이 줄어도 모든 주·태그·분류·날짜 경로가 남는다', async () => {
    process.env.GK_TODAY = '2026-11-24';
    const m = await import('../src/adapters/site/data.ts');
    const paths = m.sitePaths();
    expect(paths).toContain(`/digest/${m.generatedAt}/`);
    expect(paths).toContain(`/ai-ok/${m.generatedAt}/`);
    expect(paths).toContain(`/solo/${m.generatedAt}/`);
    expect(paths).toContain('/w/2026-11-16/'); // 11/22 기준에선 열려 있던 주, 11/24엔 비는 주
    expect(m.listings.every((l) => l.rolling || l.deadline! >= '2026-11-24')).toBe(true);
  });
});

describe('AC-135 같은 대회 중복', () => {
  const mk = (slug: string, name: string, deadline = '2026-11-29') => ({ slug, name, deadline, category: '공모전', tags: [], rolling: false } as any);
  it('같은 마감일·낱말 60% 이상 겹침 = 같은 대회', () => {
    expect(isSameContest(mk('a', '내가 만드는 한국여행 제6회 인천공항 여행 공모전'), mk('b', '제6회 인천공항 여행 공모전 (내가 만드는 한국여행)'))).toBe(true);
    expect(isSameContest(mk('a', '인천공항 여행 공모전'), mk('b', '인천공항 여행 공모전', '2026-12-01'))).toBe(false);
    expect(isSameContest(mk('a', '환경 사진 공모전'), mk('b', '청소년 소설 문학상'))).toBe(false);
  });
  it('related는 같은 대회를 하나만, 자기와 같은 대회는 뺀다', () => {
    const idx = buildSiteIndex([
      mk('self', '제6회 인천공항 여행 공모전'), mk('d1', '내가 만드는 한국여행 제6회 인천공항 여행 공모전'), mk('d2', '제6회 인천공항 여행 공모전 (내가 만드는 한국여행)'),
      mk('o1', '무명 공모 하나', '2026-11-30'), mk('o2', '다른 공모 둘', '2026-12-02'),
    ]);
    const r = idx.related(mk('self', '제6회 인천공항 여행 공모전'), 5).map((l) => l.slug);
    expect(r.filter((s) => s.startsWith('d')).length).toBe(0);
    expect(r).toEqual([]); // §37 AC-167: 같은 분야(주제)만 — 주제가 다른 공고로 채우지 않는다
  });
});

describe('AC-139 표시 글자', () => {
  it('cleanDisplay: \\& · &amp; · 이중 이스케이프', () => {
    expect(cleanDisplay('KT\\&G 공모전')).toBe('KT&G 공모전');
    expect(cleanDisplay('A &amp; B')).toBe('A & B');
    expect(cleanDisplay('A &amp;amp; B')).toBe('A & B');
  });
  it('tidyQuote: 끝의 접속어·쉼표는 문장 경계에서 자른다', () => {
    expect(tidyQuote('참가 자격은 만 19세 이상 누구나입니다. 선정절차 및')).toBe('참가 자격은 만 19세 이상 누구나입니다.');
    expect(tidyQuote('만 19세 이상 선정절차 및')).toBe('만 19세 이상 선정절차');
    expect(tidyQuote('대한민국 국민 누구나')).toBe('대한민국 국민 누구나');
  });
});

// 가짜 DOM — DAY_SCRIPT가 쓰는 좁은 API만(querySelectorAll·getAttribute·setAttribute·removeAttribute·classList·textContent·hidden)
function fakeEl(attrs: Record<string, string>, text = '', cls: string[] = []) {
  const a = { ...attrs }; const c = new Set(cls);
  return { hidden: false, textContent: text, getAttribute: (k: string) => a[k] ?? null, setAttribute: (k: string, v: string) => { a[k] = v; }, removeAttribute: (k: string) => { delete a[k]; }, hasAttribute: (k: string) => k in a,
    classList: { contains: (k: string) => c.has(k), toggle: (k: string, on: boolean) => { on ? c.add(k) : c.delete(k); } }, _a: a };
}
function run(today: string, els: Record<string, any[]>) {
  const doc = { querySelectorAll: (sel: string) => els[sel] ?? [] };
  const fn = new Function('document', 'Intl', 'Date', DAY_SCRIPT.replace(/new Date\(\)/g, `new Date('${today}T03:00:00Z')`));
  fn(doc, Intl, Date);
}
describe('AC-132 날이 지난 뒤(오늘 주입)', () => {
  it('큰 배지: 지난 날짜면 마감됐어요, 오늘 이전 D-day 남지 않음, CTA 교체', () => {
    const lg = fakeEl({ 'data-deadline': '2026-11-22' }, 'D-day', ['lg']);
    const cta = fakeEl({ href: 'https://x/', 'data-closed-href': '/c/contest/', 'data-closed-label': '지금 낼 수 있는 공고 보기', target: '_blank', rel: 'noopener' }, '원문 공고 보기');
    run('2026-11-24', { '[data-deadline]': [lg], '[data-closed-href]': [cta], '[data-row-deadline]': [], '[data-count]': [], '[data-empty]': [], '[data-hist]': [] });
    expect(lg.textContent).toBe('마감됐어요');
    expect(cta.textContent).toBe('지금 낼 수 있는 공고 보기');
    expect(cta._a.href).toBe('/c/contest/');
    expect(cta._a.target).toBeUndefined();
  });
  it('열린 상세는 그대로(D-day 보존·CTA 그대로)', () => {
    const lg = fakeEl({ 'data-deadline': '2026-11-24' }, 'D-3', ['lg']);
    const cta = fakeEl({ href: 'https://x/', 'data-closed-href': '/c/contest/', 'data-closed-label': '지금 낼 수 있는 공고 보기' }, '원문 공고 보기');
    run('2026-11-24', { '[data-deadline]': [lg], '[data-closed-href]': [cta], '[data-row-deadline]': [], '[data-count]': [], '[data-empty]': [], '[data-hist]': [] });
    expect(lg.textContent).toBe('D-day');
    expect(cta.textContent).toBe('원문 공고 보기');
  });
  it('목록: 지난 행을 감추고 건수·빈 상태를 다시 센다, 캡 초과도 감춘다', () => {
    const row = (d: string, g: string, cap?: string) => fakeEl({ 'data-row-deadline': d, 'data-group': g, ...(cap ? { 'data-cap': cap } : {}) });
    const rows = [row('2026-11-22', 'list'), row('2026-11-23', 'list'), row('2026-11-24', 'list'), row('2026-11-25', 'list'), row('2026-11-22', 'soon', '2'), row('2026-11-26', 'soon', '2'), row('2026-11-27', 'soon', '2'), row('2026-11-28', 'soon', '2')];
    const count = fakeEl({ 'data-count': 'list' }, '4'); const emptyList = fakeEl({ 'data-empty': 'list' }); emptyList.hidden = true;
    run('2026-11-24', { '[data-deadline]': [], '[data-closed-href]': [], '[data-row-deadline]': rows, '[data-count]': [count], '[data-empty]': [emptyList], '[data-hist]': [] });
    expect(rows.map((r) => r.hidden)).toEqual([true, true, false, false, true, false, false, true]);
    expect(count.textContent).toBe('2');
    expect(emptyList.hidden).toBe(true);
  });
  it('모두 지나면 빈 상태가 보인다', () => {
    const rows = [fakeEl({ 'data-row-deadline': '2026-11-22', 'data-group': 'list' })];
    const count = fakeEl({ 'data-count': 'list' }, '1'); const emptyList = fakeEl({ 'data-empty': 'list' }); emptyList.hidden = true;
    run('2026-11-24', { '[data-deadline]': [], '[data-closed-href]': [], '[data-row-deadline]': rows, '[data-count]': [count], '[data-empty]': [emptyList], '[data-hist]': [] });
    expect(count.textContent).toBe('0'); expect(emptyList.hidden).toBe(false);
  });
  it('홈 건수: 총수에서 지난 날짜 히스토그램만큼 뺀다', () => {
    const total = fakeEl({ 'data-hist': JSON.stringify({ '2026-11-22': 5, '2026-11-24': 7, '2026-11-30': 1 }), 'data-total': '1000' }, '1,000');
    run('2026-11-24', { '[data-deadline]': [], '[data-closed-href]': [], '[data-row-deadline]': [], '[data-count]': [], '[data-empty]': [], '[data-hist]': [total] });
    expect(total.textContent).toBe('995');
    const big = fakeEl({ 'data-hist': '{}', 'data-total': '1731' }, '');
    run('2026-11-24', { '[data-deadline]': [], '[data-closed-href]': [], '[data-row-deadline]': [], '[data-count]': [], '[data-empty]': [], '[data-hist]': [big] });
    expect(big.textContent).toBe('1,731');
  });
});

describe('AC-140 gk_test 사람·날 전부 제외', () => {
  const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_7 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.5 Mobile/15E148 Safari/604.1';
  const row = (t: string, ip: string, m: string, ref: string) => `${t} ${ip} "${m} /intent/app-card HTTP/1.1" 204 "${ref}" "${UA}"`;
  it('ping(Referer 빈 값) 줄도 같은 사람·날 gk_test 줄이 있으면 뺀다', () => {
    const t = [row('2026-11-24T01:00:00+00:00', '1.1.1.1', 'POST', '-'), row('2026-11-24T01:00:01+00:00', '1.1.1.1', 'GET', 'https://gonggo.oaksoo.com/g/a/?gk_test=1'), row('2026-11-24T02:00:00+00:00', '2.2.2.2', 'POST', '-')].join('\n');
    expect(countAppCardClicks(t, { since: '2026-11-24', selfIps: [] })).toBe(1);
  });
});

describe('AC-140 엣지 로그 전부', () => {
  it('회전·gz 파일을 모두 고르고 gz는 zcat, 다른 이름은 거절', () => {
    expect(['gonggo-access.log', 'gonggo-access-2026-11-20.log', 'gonggo-access.log.1.gz', 'gonggo-access-2026-11-19.log.gz', 'x.log', '../etc/passwd'].filter(isEdgeLog)).toEqual(['gonggo-access.log', 'gonggo-access-2026-11-20.log', 'gonggo-access.log.1.gz', 'gonggo-access-2026-11-19.log.gz']);
    expect(edgeReadCommand('gonggo-access.log')).toBe('cat /data/logs/gonggo-access.log');
    expect(edgeReadCommand('gonggo-access-2026-11-19.log.gz')).toBe('zcat /data/logs/gonggo-access-2026-11-19.log.gz');
    expect(() => edgeReadCommand('a; rm -rf /')).toThrow();
  });
});
