// SPEC §40 AC-173~175
import { describe, expect, it } from 'vitest';
import { extractFillQuote, fillFetchUrl, fillSiteOf } from '../src/domain/fillExtract.ts';

const api = (filters: unknown) => JSON.stringify({ data: { status: true, competition: { id: 1, details: '<p>Eligibility Open to everyone</p>', filters } } });

describe('AC-173 unstop 받기 주소', () => {
  it('사이트를 가리고 API 주소로 바꾼다', () => {
    expect(fillSiteOf('https://unstop.com/hackathons/404-hackathon-hax-baby-1793392')).toBe('unstop');
    expect(fillFetchUrl('unstop', 'https://unstop.com/hackathons/404-hackathon-hax-baby-1793392')).toBe('https://unstop.com/api/public/competition/1793392');
    expect(fillFetchUrl('unstop', 'https://unstop.com/quiz/x-1788045/')).toBe('https://unstop.com/api/public/competition/1788045');
  });
  it('끝 숫자가 없으면 null, 4곳은 그대로', () => {
    expect(fillFetchUrl('unstop', 'https://unstop.com/competitions')).toBeNull();
    expect(fillFetchUrl('linkareer', 'https://linkareer.com/activity/1')).toBe('https://linkareer.com/activity/1');
  });
});
describe('AC-174 unstop 자격 칸', () => {
  it('eligible 칸 이름을 순서대로 잇는다(다른 type·중복 제외)', () => {
    expect(extractFillQuote('unstop', api([
      { name: 'Undergraduate', type: 'eligible' }, { name: 'Hackathon', type: 'category' },
      { name: 'Engineering Students', type: 'eligible' }, { name: 'Undergraduate', type: 'eligible' },
    ]))).toBe('Eligibility: Undergraduate, Engineering Students');
    expect(extractFillQuote('unstop', api([{ name: 'All', type: 'eligible' }]))).toBe('Eligibility: All');
  });
  it('칸이 없거나 JSON이 깨지면 null(자유 본문은 안 읽음)', () => {
    expect(extractFillQuote('unstop', api([]))).toBeNull();
    expect(extractFillQuote('unstop', api([{ name: 'Quiz', type: 'category' }]))).toBeNull();
    expect(extractFillQuote('unstop', '<!DOCTYPE html><title>Not Found</title>')).toBeNull();
    expect(extractFillQuote('unstop', '{"data":{}}')).toBeNull();
  });
});
