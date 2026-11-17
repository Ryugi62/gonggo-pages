// SPEC §27 — 원문 마크업(글자)에서 자격 문장 인용 1개를 결정적으로 뽑는다. I/O·DOM 라이브러리를 모른다.
import { decodeEntities } from './extract.ts';

export type FillSite = 'contestkorea' | 'thinkcontest' | 'linkareer' | 'bizinfo';
export const FILL_SITES: readonly FillSite[] = ['contestkorea', 'thinkcontest', 'linkareer', 'bizinfo'];

export function fillSiteOf(url: string): FillSite | null {
  const host = url.match(/^https?:\/\/([^/?#]+)/)?.[1]?.toLowerCase() ?? '';
  for (const s of FILL_SITES) if (host === `${s}.com` || host === `www.${s}.com` || host === `www.${s}.go.kr`) return s;
  return null;
}

/** 태그를 걷고 엔티티를 풀어 한 줄 글자로 */
export function textOf(html: string): string {
  const t = html.replace(/<(?:script|style)[\s\S]*?<\/(?:script|style)>/gi, ' ').replace(/<br\s*\/?>/gi, ' ').replace(/<[^>]*>/g, ' ');
  return decodeEntities(t.replace(/&nbsp;/gi, ' ')).replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
}

const ELIG_H2 = '(?:참가\\s*자격|참가\\s*대상|응시\\s*자격|참여\\s*대상|응모\\s*자격|응모\\s*대상|지원\\s*자격|지원\\s*대상|신청\\s*자격(?:\\s*\\(공통\\))?|신청\\s*대상)';

function contestkorea(html: string): string | null {
  const m = html.match(new RegExp(`<h2[^>]*>\\s*${ELIG_H2}\\s*</h2>\\s*<p[^>]*>([\\s\\S]*?)</p>`));
  return m ? textOf(m[1]) : null;
}

function thinkcontest(html: string): string | null {
  const m = html.match(/<div class="tit">\s*참가\s*자격\s*<\/div>\s*<div class="txt">([\s\S]*?)<\/div>/);
  if (!m) return null;
  const lis = [...m[1].matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((x) => textOf(x[1])).filter(Boolean);
  return lis.length ? lis.join(' ') : textOf(m[1]);
}

function linkareer(html: string): string | null {
  const m = html.match(/<dt[^>]*>\s*참여\s*대상\s*<\/dt>\s*<dd[^>]*>([\s\S]*?)<\/dd>/);
  return m ? textOf(m[1]) : null;
}

/** 지원 금액·내용을 말하는 ☞ 문장은 자격이 아니다 */
const BIZ_NOT_ELIG = /지원\s*(?:금액|내용|규모|한도)|최대\s*[\d,]+|소요\s*비용|\d[\d,]*\s*(?:천원|만원|백만원|억원)/;

function bizinfo(html: string): string | null {
  const m = html.match(/<span class="s_title">\s*사업개요\s*<\/span>([\s\S]*?)<\/li>/);
  if (!m) return null;
  for (const p of m[1].matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
    const t = textOf(p[1]);
    if (!t.startsWith('☞')) continue;
    const q = t.replace(/^☞\s*/, '');
    return BIZ_NOT_ELIG.test(q) ? null : q;
  }
  return null;
}

const BY_SITE: Record<FillSite, (html: string) => string | null> = { contestkorea, thinkcontest, linkareer, bizinfo };

/** 입력 = 마크업 글자, 출력 = 자격 인용 후보(공개 관문은 sanitizeQuote가 맡는다) 또는 null */
export function extractFillQuote(site: FillSite, html: string): string | null {
  const q = BY_SITE[site](html);
  return q && q.length >= 2 ? q : null;
}
