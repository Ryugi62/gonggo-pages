import { isClean } from './privacy.ts';

// 원천 행의 자유 메모(note·why)에서 「공고 원문에서 따온 공개 사실」만 좁은 패턴으로 뽑는다(허용 목록 방식).
// 메모 본문을 통째로 옮기지 않는다 — 패턴에 안 맞으면 버린다.

const ELIG_LABEL = '(?:참가\\s*자격|지원\\s*자격|신청\\s*자격|응모\\s*자격|자격|응모\\s*대상|신청\\s*대상|지원\\s*대상|참가\\s*대상|모집\\s*대상|공모\\s*대상|대상)';
const ELIG_RE = new RegExp(`${ELIG_LABEL}\\s*[:：]?\\s*「([^」]{2,800})」`, 'g');
/** 내부 메모로 쓴 「」(공고 원문이 아님) */
const INTERNAL_QUOTE_RE = /줄\s*없음|미판독|판독\s*전|Live page|[{}]|미기재|확인\s*필요|미확인|원문\s*없음|본문\s*없음|\.\.\.|…/;
const MAX_QUOTE = 300;

const squash = (s: string) => s.replace(/\s+/g, ' ').trim();

function clip(s: string, max: number): string {
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const sp = cut.lastIndexOf(' ');
  return `${(sp > max * 0.6 ? cut.slice(0, sp) : cut).trim()}…`;
}

export function extractEligibility(note: string): string | null {
  for (const m of note.matchAll(ELIG_RE)) {
    const q = squash(m[1]);
    if (q.length < 2 || INTERNAL_QUOTE_RE.test(q) || !isClean(q)) continue;
    return clip(q, MAX_QUOTE);
  }
  return null;
}

export function extractOrganizer(note: string, why: string): string | null {
  const cands: string[] = [];
  for (const m of note.matchAll(/주최\s*[:：]\s*([^·\n「」\[\]|]{2,60}?)\s*(?=·|\n|\||$)/g)) cands.push(m[1]);
  for (const m of why.matchAll(/(?:주최|주관)\s*[:：]?\s+([^·\n「」\[\]|]{2,40}?)\s*(?=·|\n|\||$)/g)) cands.push(m[1]);
  for (const c of cands) {
    const o = squash(c).replace(/[,，]+$/, '');
    if (o.length < 2 || /^(?:-|n\/a|미노출|미표기|미상|없음|미기재|비공개)$/i.test(o) || /^\d+$/.test(o) || !isClean(o)) continue;
    return o;
  }
  return null;
}

const KRW = '([\\d,.]+\\s*(?:억\\s*)?(?:[\\d,.]+\\s*)?만?\\s*원)';

export function extractPrize(why: string, note: string): string | null {
  for (const src of [why, note]) {
    let m = src.match(new RegExp(`시상\\s*규모\\s*(?:\\(총\\))?\\s*${KRW}`));
    if (m && nonZero(m[1])) return ok(`시상규모 ${m[1].replace(/\s+/g, '')}`);
    m = src.match(new RegExp(`총\\s*상금\\s*[:：]?\\s*${KRW}`));
    if (m && nonZero(m[1])) return ok(`총상금 ${m[1].replace(/\s+/g, '')}`);
    m = src.match(/\$\s?([\d,]+)\s*\+?\s*in (?:cash )?prizes/i);
    if (m && Number(m[1].replace(/,/g, '')) >= 100) return ok(`$${m[1]} 상금`);
  }
  return null;
}

const nonZero = (amt: string) => /[1-9]/.test(amt);

function ok(s: string): string | null {
  return isClean(s) ? s : null;
}

/** 스크래핑 잔여물(「N새글」 등)을 걷어 낸 공고명 */
export function cleanName(name: string): string {
  return squash(name.replace(/N?새글$/, '').replace(/\s*N$/, ''));
}
