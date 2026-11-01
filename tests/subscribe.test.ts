import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateSubscribeRequest, SUB_TOPICS, type SubscribeRequest } from '../src/domain/subscribe.ts';
import { parseSubscribeLog } from '../src/application/subscribeLog.ts';
import { parsePaymentRequestLog } from '../src/application/paymentRequestLog.ts';
import { parseReadRequestLog } from '../src/application/readRequestLog.ts';
import { subFunnelPath } from '../src/application/funnel.ts';
import { pickDeadlineSoon } from '../src/application/deadlineSoon.ts';
import { countSubSteps } from '../src/application/visitCount.ts';
import type { PublicListing } from '../src/domain/listing.ts';

// SPEC §25 — 마감 임박 메일 구독 입구 v0(AC-87~92)
const ok: SubscribeRequest = { kind: 'sub', email: 'a.b@example.co.kr', topic: 'contest', consent: true };
const line = (t: string, body: object) => JSON.stringify({ t, body: JSON.stringify(body) });

describe('AC-87 validateSubscribeRequest', () => {
  it('통과', () => expect(validateSubscribeRequest(ok)).toEqual({ ok: true, errors: [] }));
  it('항목별 오류', () => {
    expect(validateSubscribeRequest({ ...ok, email: 'nope' }).errors).toEqual(['email']);
    expect(validateSubscribeRequest({ ...ok, topic: 'x' as any }).errors).toEqual(['topic']);
    expect(validateSubscribeRequest({ ...ok, consent: false }).errors).toEqual(['consent']);
    expect(validateSubscribeRequest({ ...ok, kind: 'read' as any }).errors).toEqual(['kind']);
    expect(validateSubscribeRequest({ ...ok, phone: '010' } as any).errors).toEqual(['extra']);
  });
  it('topic 4종, 최대 JSON ≤ 1024바이트', () => {
    expect([...SUB_TOPICS]).toEqual(['contest', 'support', 'scholarship', 'all']);
    const body = { kind: 'sub', email: 'a'.repeat(64) + '@' + 'b'.repeat(180) + '.com', topic: 'scholarship', consent: true };
    expect(validateSubscribeRequest(body as any).ok).toBe(true);
    expect(Buffer.byteLength(JSON.stringify(body))).toBeLessThanOrEqual(1024);
  });
});

describe('AC-88 parseSubscribeLog', () => {
  const text = [
    line('2026-11-02T01:00:00+09:00', ok),
    line('2026-11-02T02:00:00+09:00', { ...ok, topic: 'support' }), // 같은 이메일 → 마지막 1건
    line('2026-11-02T03:00:00+09:00', { ...ok, email: 'test+gonggo@example.com' }), // 시험 제출
    line('2026-11-02T04:00:00+09:00', { ...ok, email: 'c@real.kr', consent: false }),
    'garbage',
    line('2026-11-02T05:00:00+09:00', { email: 'p@real.kr', arm: 'H1', pledge: true, consent: true }), // 결제 요청
    line('2026-11-02T06:00:00+09:00', { kind: 'read', link: 'https://e.co/a', email: 'r@real.kr', consent: true }),
  ].join('\n');
  it('유효·중복·시험·버린 줄', () => {
    const r = parseSubscribeLog(text);
    expect(r.valid).toEqual([{ t: '2026-11-02T02:00:00+09:00', email: 'a.b@example.co.kr', topic: 'support' }]);
    expect(r.test).toBe(1);
    expect(r.rejected).toBe(2);
    expect(r.byTopic.support).toBe(1);
  });
  it('결제·판독 집계는 sub 줄을 버린 줄로 세지 않는다', () => {
    const p = parsePaymentRequestLog(text);
    expect(p.valid.map((v) => v.email)).toEqual(['p@real.kr']);
    expect(p.rejected).toBe(1);
    expect(parseReadRequestLog(text).rejected).toBe(1);
  });
});

describe('AC-89 계측 경로', () => {
  it('click·request', () => {
    expect(subFunnelPath('CLICK')).toBe('/intent/sub/click');
    expect(subFunnelPath('REQUEST')).toBe('/intent/sub/request');
  });
});

describe('AC-91 처리방침 · nginx', () => {
  it('처리방침에 구독 목적 1줄 + 보유 기간', () => {
    const s = readFileSync('src/pro/privacy.astro', 'utf8');
    expect(s.match(/마감 임박 메일 구독/g)?.length).toBe(1);
    expect(s).toContain('2027-11-02');
  });
  it('nginx 새 location 없음', () => {
    expect(readFileSync('deploy/aws/nginx.conf', 'utf8').match(/^\s*location /gm)?.length).toBe(7);
  });
});

const L = (p: Partial<PublicListing>): PublicListing => ({
  slug: p.name ?? 'x', name: '공고', category: '공모전', kind: '공모', deadline: '2026-11-04', deadlineTime: null, rolling: false,
  url: 'https://e.org', organizer: null, prize: '총상금 100만원', eligibilityQuote: null, tags: ['대학생'], constraints: {} as any,
  clauses: [], aiUse: 'UNSTATED', ...p,
});
describe('AC-92 pickDeadlineSoon', () => {
  const T = '2026-11-02';
  it('오늘~7일, 마감순, 최대 5, 상시·미상·팀전용 제외', () => {
    const ls = [
      L({ name: 'a', deadline: '2026-11-09' }), L({ name: 'b', deadline: '2026-11-02' }), L({ name: 'c', deadline: '2026-11-10' }),
      L({ name: 'd', deadline: '2026-11-01' }), L({ name: 'e', deadline: null, rolling: true }), L({ name: 'f', deadline: null }),
      L({ name: 'g', eligibilityQuote: '최소 3인 팀' }),
      ...['h', 'i', 'j', 'k', 'l'].map((n, i) => L({ name: n, deadline: `2026-11-0${3 + (i % 3)}` })),
    ];
    const r = pickDeadlineSoon(ls, T);
    expect(r.length).toBe(5);
    expect(r[0].name).toBe('b');
    expect(r.every((l) => l.deadline! >= T && l.deadline! <= '2026-11-09')).toBe(true);
    expect(r.map((l) => l.deadline)).toEqual([...r.map((l) => l.deadline)].sort());
    expect(r.some((l) => ['c', 'd', 'e', 'f', 'g'].includes(l.name))).toBe(false);
  });
});

describe('AC-89b 구독 단계 집계', () => {
  const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
  const row = (step: string, ip = '1.1.1.1') => `2026-11-02T10:00:00+09:00 ${ip} "GET /intent/sub/${step} HTTP/1.1" 204 "https://gonggo.oaksoo.com/g/x/" "${UA}"`;
  it('click·request 사람 수, 운영자 IP·중복 제외', () => {
    const text = [row('click'), row('click'), row('click', '2.2.2.2'), row('request'), row('request', '9.9.9.9')].join('\n');
    expect(countSubSteps(text, { since: '2026-11-02', selfIps: ['9.9.9.9'] })).toEqual({ click: 2, request: 1 });
  });
});

import { renderSubDigest } from '../src/application/subDigest.ts';
const OP = { name: '루미아', email: 'xorjf1027@gmail.com' };
describe('AC-92b renderSubDigest', () => {
  const T = '2026-11-02';
  const items = [L({ name: '가 공모전', deadline: '2026-11-03', prize: '총상금 100만원', url: 'https://e.org/a' }), L({ name: '나 해커톤', deadline: '2026-11-08', prize: null })];
  const out = renderSubDigest(items, T, 'https://gonggo.oaksoo.com', OP);
  it('제목·항목·상세 링크·원문 링크', () => {
    expect(out).toContain('제목:');
    expect(out).toContain('가 공모전');
    expect(out).toContain('https://gonggo.oaksoo.com/g/가 공모전/');
    expect(out).toContain('https://e.org/a');
  });
  it('수신 거부 안내·운영자 고지, 가격·광고 0', () => {
    expect(out).toContain('수신 거부');
    expect(out).toContain('루미아');
    expect(out).not.toMatch(/19,900|49,000|\(광고\)|Pro|결제/);
  });
  it('항목이 없으면 보내지 않는다는 표시', () => {
    expect(renderSubDigest([], T, 'https://gonggo.oaksoo.com', OP)).toContain('발송 보류');
  });
});
