import { classify } from '../domain/category.ts';
import { parseConstraints, tagsFor } from '../domain/eligibility.ts';
import { cleanName, extractEligibility, extractOrganizer, extractPrize } from '../domain/extract.ts';
import type { PublicListing, SourceRow } from '../domain/listing.ts';
import { findForbidden, isClean } from '../domain/privacy.ts';
import { makeSlug } from '../domain/slug.ts';
import { readClauses } from '../domain/clause.ts';

export const PUBLIC_KEYS = [
  'slug', 'name', 'category', 'kind', 'deadline', 'deadlineTime', 'rolling', 'url',
  'organizer', 'prize', 'eligibilityQuote', 'tags', 'constraints', 'clauses', 'aiUse',
] as const;

// Pro v0.1: 운영자 개인 사유로 컷된 행(조건불가)·이미 낸 행도 공고 자체는 공개(상태·사유는 내보내지 않음). 중복·수혜완료만 제외.
const PUBLIC_STATES = new Set(['후보', '신청예정', '조건불가', '제출함', '탈락']);
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const ROLLING_RE = /상시|소진|수시/;

export type DropReason = 'state' | 'kind' | 'expired' | 'nodate' | 'url' | 'name' | 'duplicate';

export interface ExportResult {
  listings: PublicListing[];
  stats: { total: number; kept: number; dropped: Record<DropReason, number> };
}

/** UC-1: 원천 행 → 공개 공고. today = YYYY-MM-DD(KST) */
export function exportPublicListings(rows: SourceRow[], today: string): ExportResult {
  const dropped: Record<DropReason, number> = { state: 0, kind: 0, expired: 0, nodate: 0, url: 0, name: 0, duplicate: 0 };
  const out: PublicListing[] = [];
  const seenUrl = new Set<string>();
  const seenSlug = new Set<string>();

  for (const r of rows) {
    if (!PUBLIC_STATES.has(r.state)) { dropped.state++; continue; }
    const category = classify(r.kind);
    if (!category) { dropped.kind++; continue; }

    let deadline: string | null = null;
    let rolling = false;
    if (r.due_date && ISO_DATE.test(r.due_date)) {
      if (r.due_date < today) { dropped.expired++; continue; }
      deadline = r.due_date;
    } else if (ROLLING_RE.test(r.due ?? '')) {
      rolling = true;
    } else { dropped.nodate++; continue; }

    const url = (r.url ?? '').trim();
    if (!/^https?:\/\/\S+$/.test(url) || !isClean(url)) { dropped.url++; continue; }
    const name = cleanName(r.name ?? '');
    if (name.length < 2 || !isClean(name)) { dropped.name++; continue; }
    const urlKey = url.replace(/#.*$/, '').replace(/\/$/, '');
    if (seenUrl.has(urlKey)) { dropped.duplicate++; continue; }
    seenUrl.add(urlKey);

    const note = String(r.note ?? '');
    const why = String(r.why ?? '');
    const timeM = deadline ? (r.due ?? '').match(/^\d{4}-\d{2}-\d{2}\s+(\d{1,2}:\d{2})/) : null;
    const eligibilityQuote = extractEligibility(note);
    const constraints = parseConstraints(eligibilityQuote ?? '', name);
    const reading = readClauses({ name, note, gateQuote: r.gate_quote == null ? null : String(r.gate_quote), gate: r.gate == null ? null : String(r.gate), gateEvidence: r.gate_evidence == null ? null : String(r.gate_evidence), url });

    let slug = makeSlug(name, url);
    for (let i = 2; seenSlug.has(slug); i++) slug = `${makeSlug(name, url)}-${i}`;
    seenSlug.add(slug);

    out.push({
      slug,
      name,
      category,
      kind: r.kind,
      deadline,
      deadlineTime: timeM ? timeM[1] : null,
      rolling,
      url,
      organizer: extractOrganizer(note, why),
      prize: extractPrize(why, note),
      eligibilityQuote,
      tags: tagsFor(eligibilityQuote ?? '', name, constraints),
      constraints,
      // 자격 인용과 같은 문장은 「누가 낼 수 있나요」에 이미 보이므로 조항 목록에서 뺀다
      clauses: reading.clauses.filter((c) => c.quote !== eligibilityQuote),
      aiUse: reading.aiUse,
    });
  }

  out.sort((a, b) => (a.deadline ?? '9999') .localeCompare(b.deadline ?? '9999') || a.name.localeCompare(b.name, 'ko'));
  assertPublicSafe(out);
  return { listings: out, stats: { total: rows.length, kept: out.length, dropped } };
}

/** 방어 심층: 내보낼 JSON 전체에 금지 토큰이 하나라도 있으면 던진다 */
export function assertPublicSafe(listings: PublicListing[]): void {
  const hits = findForbidden(JSON.stringify(listings));
  if (hits.length) throw new Error(`공개 내보내기에 금지 토큰: ${hits.join(', ')}`);
  for (const l of listings) {
    const extra = Object.keys(l).filter((k) => !(PUBLIC_KEYS as readonly string[]).includes(k));
    if (extra.length) throw new Error(`허용 밖 키: ${extra.join(', ')}`);
  }
}
