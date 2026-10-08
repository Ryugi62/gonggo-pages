import { describe, it, expect } from 'vitest';
import { assignArm, PRICE_ARMS } from '../src/domain/pricing.ts';
import { validatePaymentRequest } from '../src/domain/paymentRequest.ts';
import { funnelPath } from '../src/application/funnel.ts';
import { parsePaymentRequestLog } from '../src/application/paymentRequestLog.ts';
import { PRO_PLAN, formatWon } from '../src/domain/pricing.ts';

describe('Pro §5-4 가격 배정 고정', () => {
  it('가격안 = H1 19,900 · H2 49,000', () => {
    expect(PRICE_ARMS).toEqual({ H1: 19900, H2: 49000 });
  });
  it('같은 방문자 키 → 같은 가격안', () => {
    expect(assignArm('visitor-abc')).toBe(assignArm('visitor-abc'));
  });
  it('1만 개 무작위 키에서 H1 비율 48~52%', () => {
    let seed = 42;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31).toString(36).slice(2);
    let h1 = 0;
    for (let i = 0; i < 10000; i++) if (assignArm(`${rnd()}-${i}`) === 'H1') h1++;
    expect(h1 / 10000).toBeGreaterThanOrEqual(0.48);
    expect(h1 / 10000).toBeLessThanOrEqual(0.52);
  });
});

describe('Pro §5-5 퍼널 사건 경로', () => {
  it('보기·가격 클릭·결제 요청 → /intent/pro/<event>/<arm>', () => {
    expect(funnelPath('VIEW', 'H1')).toBe('/intent/pro/view/H1');
    expect(funnelPath('PRICE', 'H2')).toBe('/intent/pro/price/H2');
    expect(funnelPath('REQUEST', 'H1')).toBe('/intent/pro/request/H1');
  });
  it('입력값(이메일)은 경로에 들어갈 자리가 없다 — 쿼리·추가 세그먼트 없음', () => {
    for (const e of ['VIEW', 'PRICE', 'REQUEST'] as const) expect(funnelPath(e, 'H1')).toMatch(/^\/intent\/pro\/[a-z]+\/H[12]$/);
  });
});

describe('Pro 결제 요청(돈 0) 검증', () => {
  const ok = { email: 'a.b@example.co.kr', arm: 'H1' as const, pledge: true, consent: true };
  it('이메일 형식·가격안·창립가 체크가 맞으면 통과', () => {
    expect(validatePaymentRequest(ok)).toEqual({ ok: true, errors: [] });
  });
  it('형식 오류는 항목별로 돌려준다', () => {
    expect(validatePaymentRequest({ ...ok, email: 'nope' }).errors).toEqual(['email']);
    expect(validatePaymentRequest({ ...ok, pledge: false }).errors).toEqual(['pledge']);
    expect(validatePaymentRequest({ ...ok, arm: 'H3' as any }).errors).toEqual(['arm']);
    expect(validatePaymentRequest({ ...ok, consent: false }).errors).toEqual(['consent']);
  });
  it('허용 밖 필드(이름·전화 등)는 받지 않는다', () => {
    expect(validatePaymentRequest({ ...ok, phone: '010-0000-0000' } as any).errors).toEqual(['extra']);
  });
});

describe('Pro §12 가격 카드 문구(AC-26)', () => {
  it('원 단위 쉼표 표기', () => {
    expect(formatWon(19900)).toBe('19,900');
    expect(formatWon(49000)).toBe('49,000');
  });
  it('가격안마다 포함 기능이 있다(H1 채점 월 5회 · H2 무제한 + 보완안)', () => {
    expect(PRO_PLAN.H1.join(' ')).toContain('월 5회');
    expect(PRO_PLAN.H2.join(' ')).toContain('무제한');
    expect(PRO_PLAN.H2.join(' ')).toContain('보완안');
  });
});

describe('AC-29 결제 요청 저장 파일 읽기', () => {
  const line = (t: string, body: unknown) => JSON.stringify({ t, body: typeof body === 'string' ? body : JSON.stringify(body) });
  const ok = { email: 'a@example.com', arm: 'H1', pledge: true, consent: true };
  it('검증 통과 줄만 세고, 가격안별 수를 돌려준다', () => {
    const text = [
      line('2026-10-07T10:00:00+00:00', ok),
      line('2026-10-07T10:01:00+00:00', { ...ok, email: 'b@example.com', arm: 'H2' }),
      line('2026-10-07T10:02:00+00:00', { ...ok, email: 'nope' }),
      line('2026-10-07T10:03:00+00:00', { ...ok, email: 'c@example.com', consent: false }),
      line('2026-10-07T10:04:00+00:00', { ...ok, email: 'd@example.com', phone: '010' }),
      '{깨진 줄',
      line('2026-10-07T10:05:00+00:00', '{not json'),
      '',
    ].join('\n');
    const r = parsePaymentRequestLog(text);
    expect(r.valid.map((v) => v.email)).toEqual(['a@example.com', 'b@example.com']);
    expect(r.byArm).toEqual({ H1: 1, H2: 1 });
    expect(r.rejected).toBe(5);
  });
  it('같은 이메일(대소문자 무시)은 마지막 1건만', () => {
    const text = [line('2026-10-07T10:00:00+00:00', ok), line('2026-10-07T11:00:00+00:00', { ...ok, email: 'A@Example.com', arm: 'H2' })].join('\n');
    const r = parsePaymentRequestLog(text);
    expect(r.valid).toEqual([{ t: '2026-10-07T11:00:00+00:00', email: 'a@example.com', arm: 'H2' }]);
    expect(r.byArm).toEqual({ H1: 0, H2: 1 });
  });
  it('nginx escape=json 로그 줄(본문이 이스케이프된 문자열)을 읽는다', () => {
    const raw = '{"t":"2026-10-07T20:00:00+09:00","body":"{\\"email\\":\\"x@example.com\\",\\"arm\\":\\"H2\\",\\"pledge\\":true,\\"consent\\":true}"}';
    expect(parsePaymentRequestLog(raw).valid).toEqual([{ t: '2026-10-07T20:00:00+09:00', email: 'x@example.com', arm: 'H2' }]);
  });
});

describe('§14 AC-43 고객 원문 목록', () => {
  it('3개 이상 · 날짜 ISO · 링크 https · 인용에 「」 없음 · 출처 칸 채움', async () => {
    const { CUSTOMER_VOICES } = await import('../src/infrastructure/proCopy.ts');
    expect(CUSTOMER_VOICES.length).toBeGreaterThanOrEqual(3);
    for (const v of CUSTOMER_VOICES) {
      expect(v.date, v.quote).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(v.url, v.quote).toMatch(/^https:\/\//);
      expect(v.quote).not.toMatch(/[「」]/);
      expect(v.who.length * v.where.length * v.quote.length).toBeGreaterThan(0);
    }
    expect(CUSTOMER_VOICES[0].quote).toBe('쳇지피티는 받을수 있다는데 영 못믿겠어서요!');
  });
});
