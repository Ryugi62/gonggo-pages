import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateReadRequest, type ReadRequest } from '../src/domain/readRequest.ts';
import { parseReadRequestLog } from '../src/application/readRequestLog.ts';
import { parsePaymentRequestLog } from '../src/application/paymentRequestLog.ts';
import { readFunnelPath } from '../src/application/funnel.ts';

// SPEC §21 — 무료 공고 판독 요청(AC-74~79)
const ok: ReadRequest = { kind: 'read', link: 'https://example.com/notice/1', email: 'a.b@example.co.kr', consent: true };
const line = (t: string, body: object) => JSON.stringify({ t, body: JSON.stringify(body) });

describe('AC-74 validateReadRequest', () => {
  it('링크·이메일·동의·kind가 맞으면 통과', () => {
    expect(validateReadRequest(ok)).toEqual({ ok: true, errors: [] });
  });
  it('항목별 오류', () => {
    expect(validateReadRequest({ ...ok, link: 'ftp://x.kr/a' }).errors).toEqual(['link']);
    expect(validateReadRequest({ ...ok, link: 'not a url' }).errors).toEqual(['link']);
    expect(validateReadRequest({ ...ok, link: 'https://ex.com/' + 'a'.repeat(400) }).errors).toEqual(['link']);
    expect(validateReadRequest({ ...ok, link: 'https://ex.com/한글' }).errors).toEqual(['link']);
    expect(validateReadRequest({ ...ok, email: 'nope' }).errors).toEqual(['email']);
    expect(validateReadRequest({ ...ok, consent: false }).errors).toEqual(['consent']);
    expect(validateReadRequest({ ...ok, kind: 'pay' } as any).errors).toEqual(['kind']);
    expect(validateReadRequest({ ...ok, phone: '010' } as any).errors).toEqual(['extra']);
  });
  it('최대 길이 입력의 JSON ≤ 1024바이트', () => {
    const body = { kind: 'read', link: 'https://e.co/' + 'a'.repeat(387), email: 'a'.repeat(64) + '@' + 'b'.repeat(180) + '.com', consent: true };
    expect(validateReadRequest(body as any).ok).toBe(true);
    expect(Buffer.byteLength(JSON.stringify(body))).toBeLessThanOrEqual(1024);
  });
});

describe('AC-75 parseReadRequestLog', () => {
  const text = [
    line('2026-10-30T01:00:00+09:00', ok),
    line('2026-10-30T02:00:00+09:00', { ...ok, link: 'https://example.com/2' }), // 같은 이메일 → 처음 1건만
    line('2026-10-30T03:00:00+09:00', { ...ok, email: 'me@own.kr' }), // 제외
    line('2026-10-30T04:00:00+09:00', { ...ok, email: 'c@example.com', consent: false }),
    'garbage',
    line('2026-10-30T05:00:00+09:00', { email: 'p@example.com', arm: 'H1', pledge: true, consent: true }), // 결제 요청
  ].join('\n');
  it('유효 1건·중복 제거·제외·버린 줄', () => {
    const r = parseReadRequestLog(text, { exclude: ['me@own.kr'] });
    expect(r.valid).toEqual([{ t: '2026-10-30T01:00:00+09:00', email: 'a.b@example.co.kr', link: 'https://example.com/notice/1' }]);
    expect(r.excluded).toBe(1);
    expect(r.rejected).toBe(2); // 동의 없음 + 깨진 줄(결제 요청 줄은 세지 않음)
  });
  it('결제 요청 집계는 kind:"read" 줄을 버린 줄로 세지 않는다', () => {
    const r = parsePaymentRequestLog(text);
    expect(r.valid.map((v) => v.email)).toEqual(['p@example.com']);
    expect(r.rejected).toBe(1); // kind:"read" 줄은 세지 않고 깨진 줄 1만
  });
});

describe('AC-76 계측 경로', () => {
  it('click·request, 입력값 자리 없음', () => {
    expect(readFunnelPath('CLICK')).toBe('/intent/read/click');
    expect(readFunnelPath('REQUEST')).toBe('/intent/read/request');
  });
});

describe('AC-78 처리방침 · AC-79 nginx', () => {
  it('개인정보처리방침에 공고 판독 요청 목적 1줄', () => {
    const s = readFileSync('src/pro/privacy.astro', 'utf8');
    expect(s.match(/공고 판독 요청/g)?.length).toBe(1);
    expect(s).toContain('2026-11-21');
  });
  it('nginx에 새 location 없음', () => {
    const n = readFileSync('deploy/aws/nginx.conf', 'utf8');
    expect(n.match(/^\s*location /gm)?.length).toBe(7);
    expect(n).not.toMatch(/read-request|판독/);
  });
});
