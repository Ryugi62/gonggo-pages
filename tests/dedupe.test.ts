import { describe, it, expect } from 'vitest';
import { dedupeClauses } from '../src/domain/clause.ts';

describe('AC-110 조항 판독은 자격 원문을 되풀이하지 않는다', () => {
  const elig = '지원자격 : 감귤 요리에 관심이 있는 누구나 (개인 또는 2인 이하 팀) 공모주제 : 감귤을 활용한 모든 요리 모집기간 : 2026.10.19.~2026.11.2. 18시까지';
  it('말줄임만 다른 같은 문장은 뺀다, AI 사용 조항은 남긴다', () => {
    const cs = [{ kind: 'TEAM', quote: elig + '…' }, { kind: 'AI_USE', quote: elig }, { kind: 'DUPLICATE_AWARD', quote: '다른 대회 수상작은 낼 수 없어요' }];
    expect(dedupeClauses(cs, elig).map((c) => c.kind)).toEqual(['AI_USE', 'DUPLICATE_AWARD']);
  });
  it('자격 인용이 없으면 그대로', () => {
    const cs = [{ kind: 'TEAM', quote: 'a' }];
    expect(dedupeClauses(cs, null)).toEqual(cs);
  });
});
