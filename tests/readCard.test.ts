import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { READ_KINDS, AXES, readCardFor, assertReadCardClean, READ_CARD_COPY, APP_CARD_PING, type ReadCardData } from '../src/domain/readCard.ts';
import { findForbidden } from '../src/domain/privacy.ts';
import { countAppCardClicks } from '../src/application/visitCount.ts';
import { TOSS_MINIAPP_URL } from '../src/domain/tossLink.ts';

// SPEC §29 — 공고 상세 「공모 읽는 법」 맛보기 카드
const raw = readFileSync('data/readcards.json', 'utf8');
const data = JSON.parse(raw) as ReadCardData;

describe('AC-99 카드 데이터 모양', () => {
  it('유형 4 × 축 4, 장학은 카드 없음', () => {
    expect(READ_KINDS).toEqual(['해커톤', '공모전', '지원사업', '대외활동']);
    expect(AXES.map((a) => a.label)).toEqual(['니즈', '평가 전략', '맞춤 아이디어', '완성도']);
    for (const k of READ_KINDS) {
      const c = readCardFor(data, k)!;
      expect(c.kind).toBe(k);
      for (const a of AXES) {
        const x = c.axes[a.key];
        expect(x.line.length, `${k}/${a.key}`).toBeGreaterThan(5);
        expect(x.line.length, `${k}/${a.key}`).toBeLessThanOrEqual(60);
        expect(x.check, `${k}/${a.key}`).toHaveLength(3);
        for (const t of x.check) { expect(t.length).toBeGreaterThan(2); expect(t.length).toBeLessThanOrEqual(30); }
      }
    }
    expect(readCardFor(data, '장학')).toBeNull();
  });
});

describe('AC-100 앱 연결 문구', () => {
  it('해요체 ≤ 40자, ping 경로는 /intent/app-card', () => {
    expect(READ_CARD_COPY.link.length).toBeLessThanOrEqual(40);
    expect(READ_CARD_COPY.link).toMatch(/요$/);
    expect(APP_CARD_PING).toBe('/intent/app-card');
    expect(TOSS_MINIAPP_URL).toBe('https://minion.toss.im/L5iKJAEk');
  });
});

describe('AC-101 과장·금지 낱말 0', () => {
  it('우승·1위·합격 보장·확실·무조건·점수 단정 없음', () => {
    expect(raw).not.toMatch(/우승|1위|합격\s*보장|확실|무조건|보장|반드시 (붙|합격|수상)/);
    expect(raw).not.toMatch(/\d+\s*점|\d+\s*%/);
    expect(raw).not.toMatch(/대신(해|합)|원문을 대체/);
    expect(READ_CARD_COPY.note).toBe('원문 공고가 기준이에요');
  });
});

describe('AC-102 개인정보·내부 표기 0', () => {
  it('금지 토큰 0, 장부 id·내부 낱말 0', () => {
    expect(findForbidden(raw)).toEqual([]);
    expect(raw).not.toMatch(/L0\d{3}|events|모의|블라인드|우승게이트|item|slug/);
    for (const k of READ_KINDS) expect(() => assertReadCardClean(readCardFor(data, k)!)).not.toThrow();
  });
  it('assertReadCardClean은 내부 표기를 거부한다', () => {
    const c = structuredClone(readCardFor(data, '공모전')!);
    c.axes.needs.line = '모의 심사에서 L0004 교훈이 나왔어요';
    expect(() => assertReadCardClean(c)).toThrow();
    const d = structuredClone(readCardFor(data, '공모전')!);
    d.axes.idea.check[0] = '무조건 우승해요';
    expect(() => assertReadCardClean(d)).toThrow();
  });
});

describe('AC-104 앱 카드 클릭 집계', () => {
  const L = (t: string, ip: string, m = 'POST', ua = 'Mozilla/5.0 (iPhone) Safari', st = 204) =>
    `${t} ${ip} "${m} /intent/app-card HTTP/2.0" ${st} "https://gonggo.oaksoo.com/g/x/" "${ua}"`;
  it('사람만 · 같은 (IP,UA,날) 1명 · 운영자 IP·봇·기간 밖 제외', () => {
    const text = [
      L('2026-11-23T10:00:00+09:00', '1.1.1.1'),
      L('2026-11-23T10:05:00+09:00', '1.1.1.1'),          // 같은 사람
      L('2026-11-23T11:00:00+09:00', '2.2.2.2', 'GET'),   // GET도 인정
      L('2026-11-23T11:00:00+09:00', '9.9.9.9'),          // 운영자
      L('2026-11-23T11:00:00+09:00', '3.3.3.3', 'POST', 'Googlebot/2.1'),
      L('2026-11-01T11:00:00+09:00', '4.4.4.4'),          // since 이전
      L('2026-11-24T10:00:00+09:00', '1.1.1.1'),          // 다른 날 = 또 1명
    ].join('\n');
    expect(countAppCardClicks(text, { since: '2026-11-22', selfIps: ['9.9.9.9'] })).toBe(3);
  });
});
