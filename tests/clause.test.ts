import { describe, it, expect } from 'vitest';
import { readClauses, deriveAiUse, type Clause } from '../src/domain/clause.ts';

const URL = 'https://example.org/notice/1';
const kinds = (cs: Clause[]) => cs.map((c) => c.kind);

describe('조항 판독 (Pro SPEC §5)', () => {
  it('G/W/T 1 — 본인 창작 서약 인용은 원문 그대로, AI 사용 판정 = 금지', () => {
    const r = readClauses({ note: '접수 hwp · 「생성형 AI 등을 활용하지 않은 본인(팀)의 순수창작물」 · 시상 3건', gateQuote: null, gate: null, url: URL });
    const c = r.clauses.find((x) => x.kind === 'ORIGINALITY_PLEDGE');
    expect(c?.quote).toBe('생성형 AI 등을 활용하지 않은 본인(팀)의 순수창작물');
    expect(c?.source).toBe(URL);
    expect(r.aiUse).toBe('FORBIDDEN');
  });

  it('G/W/T 2 — AI 문장이 없으면 단정하지 않는다(UNSTATED)', () => {
    const r = readClauses({ note: '자격:「만 19세 이상 대학생」', gateQuote: null, gate: null, url: URL });
    expect(r.aiUse).toBe('UNSTATED');
    expect(kinds(r.clauses)).toEqual(['ELIGIBILITY']);
  });

  it('AI 활용 허용 문장은 ALLOWED', () => {
    const r = readClauses({ note: '「생성형 AI 도구 활용 가능(활용 내역 기재)」', gateQuote: null, gate: null, url: URL });
    expect(r.aiUse).toBe('ALLOWED');
    expect(kinds(r.clauses)).toEqual(['AI_USE']);
  });

  it('금지와 허용이 같이 있으면 금지가 이긴다', () => {
    expect(deriveAiUse([
      { kind: 'AI_USE', quote: '생성형 AI 활용 가능', source: URL },
      { kind: 'AI_USE', quote: '생성형 AI로 만든 이미지는 사용 불가', source: URL },
    ])).toBe('FORBIDDEN');
  });

  it('주제로서의 AI(「AI 수질예측」)는 AI 사용 조항이 아니다', () => {
    const r = readClauses({ note: '분야 「물안전·물환경·물이용(AI 수질예측·디지털트윈 예시 포함)」', gateQuote: null, gate: null, url: URL });
    expect(kinds(r.clauses)).not.toContain('AI_USE');
    expect(r.aiUse).toBe('UNSTATED');
  });

  it('종류 분류 — 중복수상·중복수혜·현장·팀·업력', () => {
    const note = [
      '「타 공모전 수상작은 수상 취소」',
      '「정부지원사업 중복 수혜 불가」',
      '「본선 현장 발표 참석 필수」',
      '「개인 또는 5인 이내 팀」',
      '「공고일 기준, 업력 7년 이내 창업기업의 대표자」',
    ].join(' · ');
    const r = readClauses({ note, gateQuote: null, gate: null, url: URL });
    expect(kinds(r.clauses)).toEqual(['DUPLICATE_AWARD', 'DUPLICATE_BENEFIT', 'ONSITE', 'TEAM', 'BUSINESS_AGE']);
  });

  it('사용자 발화·메일 회신 인용은 원문이 아니므로 버린다', () => {
    const r = readClauses({
      note: '사용자 10/3 「치과 홍보 카피 공모 그럼 접자」 · 주최 측 메일 회신 「대학생도 참가 가능합니다」',
      gateQuote: '사용자 9/28 22:5x 「엥…? 시나 그림이나 공연이나 그딴게 왜 나와…?」',
      gate: 'G0', url: URL,
    });
    expect(r.clauses).toEqual([]);
  });

  it('구어체 인용(거르자·필요 없음)은 버린다', () => {
    const r = readClauses({ note: '「사무실 지원이나 네트워킹 지원이나 그런거는 공고에서 이제 거르자 나한테 필요 없음」', gateQuote: null, gate: null, url: URL });
    expect(r.clauses).toEqual([]);
  });

  it('사용자 제외(GU) 행의 gate 인용은 괄호 없는 문장을 쓰지 않고, 괄호 원문 인용만 쓴다', () => {
    const r = readClauses({ note: '', gateQuote: '성남시 관내 예비창업자 및 7년 미만 창업기업', gate: 'GU', url: URL });
    expect(r.clauses).toEqual([]);
    const b = readClauses({ note: '', gateQuote: '「생성형 AI 등을 활용하지 않은 본인(팀)의 순수창작물」 · 사용자 10/3 「치과 홍보 카피 공모 그럼 접자」', gate: 'GU', url: URL });
    expect(b.clauses.map((c) => c.quote)).toEqual(['생성형 AI 등을 활용하지 않은 본인(팀)의 순수창작물']);
  });
  it('「대상 1점: 500만원」(대상=1등상)·행사 제목은 자격 조항이 아니다', () => {
    const r = readClauses({ note: '「[시상내역] 대상 1점: 500만원 사진·영상 통합」 · 「[구로청년이룸] 제로베이스 5기 모집」', gateQuote: null, gate: null, url: URL });
    expect(r.clauses).toEqual([]);
  });

  it('G0 행의 괄호 없는 gate 인용은 조항 낱말이 있을 때만 자격 조항으로', () => {
    const ok = readClauses({ note: '', gateQuote: '성남시 관내 예비창업자 및 7년 미만 창업기업', gate: 'G0', url: URL });
    expect(ok.clauses).toEqual([{ kind: 'BUSINESS_AGE', quote: '성남시 관내 예비창업자 및 7년 미만 창업기업', source: URL }]);
    const no = readClauses({ note: '', gateQuote: '광주전남지방중소벤처기업청', gate: 'G0', url: URL });
    expect(no.clauses).toEqual([]);
  });

  it('같은 인용은 한 번만, 내부 메모 인용(미판독·…)은 버린다', () => {
    const r = readClauses({ note: '자격:「만 39세 이하 청년」 · 「만 39세 이하 청년」 · 「자격 미판독」 · 「대상 … 생략」', gateQuote: '「만 39세 이하 청년」', gate: 'G0', url: URL });
    expect(r.clauses).toHaveLength(1);
  });

  it('「AI에 관심 있는 누구나… 전공 제한이 없으며」는 AI 금지가 아니다', () => {
    const r = readClauses({ note: '「참가 자격 의료 AI에 관심 있는 누구나 참가할 수 있습니다. 전공 제한이 없으며 개인 또는 최대 4인 팀」', gateQuote: null, gate: null, url: URL });
    expect(r.aiUse).toBe('UNSTATED');
  });
  it('내부 분석 메모·목록 주석·제목 인용은 버린다', () => {
    const r = readClauses({
      name: '2026년 10월 서리풀 소상공인 창업 클리닉',
      note: '「수상 취소 규정 명시 AI 과거 수상작 분석 결과 & 제안」 · 「Flushing, NY · In-Person · 10-09 (MLH 2027 시즌 목록)」 · 「2026년 10월 서리풀 소상공인 창업 클리닉 모집 공고」',
      gateQuote: null, gate: null, url: URL,
    });
    expect(r.clauses).toEqual([]);
  });
  it('마크다운 기호는 걷어 낸다', () => {
    const r = readClauses({ note: '「## 참가 대상 **참가 대상:** 전국 대학생 및 대학원생」', gateQuote: null, gate: null, url: URL });
    expect(r.clauses[0].quote).toBe('참가 대상 참가 대상: 전국 대학생 및 대학원생');
  });
  it('110자 안팎에서 잘린 인용은 끝에 「…」를 붙여 잘림을 드러낸다', () => {
    const cut = '신청대상 혁신적 기술 솔루션을 보유한 초기 기술기업으로 아래 요건을 모두 충족하는 법인 ① 설립 3년 이내 기업 또는 기관투자 유치 이력이 없는 설립 5년 미만 기업 ② 투자 전 기업가치(Pre';
    const r = readClauses({ note: `「${cut}」`, gateQuote: null, gate: null, url: URL });
    expect(r.clauses[0].quote).toBe(`${cut}…`);
    const whole = readClauses({ note: '「만 19세 이상 대학생」', gateQuote: null, gate: null, url: URL });
    expect(whole.clauses[0].quote).toBe('만 19세 이상 대학생');
  });
  it('gate 근거가 사용자 발화면 괄호 없는 gate 인용은 쓰지 않는다(G1 행이라도)', () => {
    const r = readClauses({ note: '', gateQuote: '만 19세 이상 대학생 대상이면 다 넣는 걸로 정리', gate: 'G1', gateEvidence: '2026-09-30 사용자 발화(채팅)', url: URL });
    expect(r.clauses).toEqual([]);
    const m = readClauses({ note: '', gateQuote: '만 19세 이상 대학생 참가 가능합니다', gate: 'G0', gateEvidence: 'Gmail 1a0e mbhope@ 회신', url: URL });
    expect(m.clauses).toEqual([]);
  });
  it('영문 공고 — in-person·team 조항', () => {
    const r = readClauses({ note: '「Teams of up to 4 members」 · 「This is an in-person event」', gateQuote: null, gate: null, url: URL });
    expect(kinds(r.clauses)).toEqual(['TEAM', 'ONSITE']);
  });
});
