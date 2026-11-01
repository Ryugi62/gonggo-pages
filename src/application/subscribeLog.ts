import { validateSubscribeRequest, isTestEmail, SUB_KIND, SUB_TOPICS, type SubscribeRequest, type SubscribeTopic } from '../domain/subscribe.ts';

// UC: 저장 파일(nginx escape=json 로그, 줄마다 {"t","body"}) → 구독자 목록(SPEC §25 AC-88).
// kind:"sub" 줄만 읽는다. 같은 이메일은 마지막 1건(관심 분야 변경 반영), 예약 도메인은 시험 제출로 따로 센다.
export interface StoredSubscribe { t: string; email: string; topic: SubscribeTopic }

export function parseSubscribeLog(text: string): { valid: StoredSubscribe[]; test: number; rejected: number; byTopic: Record<SubscribeTopic, number> } {
  const byEmail = new Map<string, StoredSubscribe>();
  const testEmails = new Set<string>();
  let rejected = 0;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    try {
      const outer = JSON.parse(line) as { t?: unknown; body?: unknown };
      const body = JSON.parse(String(outer.body)) as SubscribeRequest;
      if (!body || typeof body !== 'object') { rejected++; continue; }
      const kind = (body as { kind?: unknown }).kind;
      if (kind === undefined || kind === 'read') continue; // 결제·판독 요청은 각자 집계
      if (typeof outer.t !== 'string' || kind !== SUB_KIND || !validateSubscribeRequest(body).ok) { rejected++; continue; }
      const email = body.email.toLowerCase();
      if (isTestEmail(email)) { testEmails.add(email); continue; }
      byEmail.delete(email);
      byEmail.set(email, { t: outer.t, email, topic: body.topic });
    } catch {
      rejected++;
    }
  }
  const valid = [...byEmail.values()];
  const byTopic = Object.fromEntries(SUB_TOPICS.map((k) => [k, 0])) as Record<SubscribeTopic, number>;
  for (const v of valid) byTopic[v.topic]++;
  return { valid, test: testEmails.size, rejected, byTopic };
}
