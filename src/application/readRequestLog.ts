import { validateReadRequest, READ_KIND, type ReadRequest } from '../domain/readRequest.ts';

// UC: 저장 파일(nginx escape=json 로그, 줄마다 {"t","body"}) → 판독 요청 목록(SPEC §21 AC-75).
// 결제 요청 줄(kind 없음)은 세지 않는다. 같은 이메일은 처음 1건, exclude(운영자·자체 테스트)는 센 수만 남긴다.
export interface StoredReadRequest {
  t: string;
  email: string;
  link: string;
}

export function parseReadRequestLog(text: string, opts: { exclude?: string[] } = {}): { valid: StoredReadRequest[]; rejected: number; excluded: number; duplicates: number } {
  const exclude = new Set((opts.exclude ?? []).map((e) => e.toLowerCase()));
  const seen = new Set<string>();
  const valid: StoredReadRequest[] = [];
  let rejected = 0, excluded = 0, duplicates = 0;
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line) continue;
    try {
      const outer = JSON.parse(line) as { t?: unknown; body?: unknown };
      const body = JSON.parse(String(outer.body)) as ReadRequest;
      if (body && typeof body === 'object' && (body as { kind?: unknown }).kind === undefined) continue; // 결제 요청
      if (typeof outer.t !== 'string' || !body || typeof body !== 'object' || !validateReadRequest(body).ok || body.kind !== READ_KIND) {
        rejected++;
        continue;
      }
      const email = body.email.toLowerCase();
      if (exclude.has(email)) { excluded++; continue; }
      if (seen.has(email)) { duplicates++; continue; }
      seen.add(email);
      valid.push({ t: outer.t, email, link: body.link });
    } catch {
      rejected++;
    }
  }
  return { valid, rejected, excluded, duplicates };
}
