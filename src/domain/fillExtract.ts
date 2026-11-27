// SPEC §27 — 원문 마크업(글자)에서 자격 문장 인용 1개를 결정적으로 뽑는다. I/O·DOM 라이브러리를 모른다.
import { decodeEntities } from './extract.ts';

export type FillSite = 'contestkorea' | 'thinkcontest' | 'linkareer' | 'bizinfo' | 'unstop' | 'wevity';
export const FILL_SITES: readonly FillSite[] = ['contestkorea', 'thinkcontest', 'linkareer', 'bizinfo', 'unstop', 'wevity'];

export function fillSiteOf(url: string): FillSite | null {
  const host = url.match(/^https?:\/\/([^/?#]+)/)?.[1]?.toLowerCase() ?? '';
  for (const s of FILL_SITES) if (host === `${s}.com` || host === `www.${s}.com` || host === `www.${s}.go.kr`) return s;
  return null;
}

/** 원문을 받을 주소 — unstop은 상세 화면이 읽는 공개 API(SPEC §40 AC-173), 나머지는 url 그대로 */
export function fillFetchUrl(site: FillSite, url: string): string | null {
  if (site !== 'unstop') return url;
  const id = url.replace(/[?#].*$/, '').replace(/\/$/, '').match(/-(\d+)$/)?.[1];
  return id ? `https://unstop.com/api/public/competition/${id}` : null;
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

/** unstop API JSON의 eligible 칸 이름만(자유 본문 details는 안 읽음, AC-174) */
function unstop(json: string): string | null {
  let filters: unknown;
  try { filters = (JSON.parse(json) as { data?: { competition?: { filters?: unknown } } })?.data?.competition?.filters; } catch { return null; }
  if (!Array.isArray(filters)) return null;
  const names: string[] = [];
  for (const f of filters as { type?: unknown; name?: unknown }[]) {
    const n = typeof f?.name === 'string' ? f.name.trim() : '';
    if (f?.type === 'eligible' && n && !names.includes(n)) names.push(n);
  }
  return names.length ? `Eligibility: ${names.join(', ')}` : null;
}

/** wevity 상세의 「응모대상」 칸 — 왼쪽 분류 메뉴(h4.cat-tit)는 안 읽는다(SPEC §41 AC-177) */
function wevity(html: string): string | null {
  const m = html.match(/<span class="tit">\s*응모\s*대상\s*<\/span>([\s\S]*?)<\/li>/);
  return m ? textOf(m[1]) : null;
}

const BY_SITE: Record<FillSite, (html: string) => string | null> = { contestkorea, thinkcontest, linkareer, bizinfo, unstop, wevity };

/** 입력 = 마크업 글자, 출력 = 자격 인용 후보(공개 관문은 sanitizeQuote가 맡는다) 또는 null */
export function extractFillQuote(site: FillSite, html: string): string | null {
  const q = BY_SITE[site](html);
  return q && q.length >= 2 ? q : null;
}

/** 다른 곳을 가리키기만 하거나 값이 없다고 말하는 줄 — 자격의 답이 아니다(SPEC §39 AC-170) */
const NOT_ANSWER = /(?:아래|다음)(?:의|에|에서|과)?\s*[^.]{0,14}(?:요건|사항|해당|자격|조건|중소기업자|같)|명시되어\s*있지\s*않|(?:요강|공고문?|홈페이지|누리집|본문)\s*(?:을|를)?\s*(?:확인|참조|참고)|따라\s*변동/;
/** thinkcontest 대상 칸의 정해진 낱말 — 이 밖의 글자는 해석기가 못 읽는 덧붙은 조건(AC-171) */
const TC_WORDS = /동 연령대 청소년|제한 없음|어린이|초등학생|중학생|고등학생|대학생|대학원생|일반인/g;

/** wevity 응모대상 칸의 정해진 낱말(사이트 분류 목록) — 쉼표로만 잇는다, 「기타」 하나만은 답이 아님(AC-178) */
const WEVITY_WORDS = new Set(['제한없음', '일반인', '대학생', '청소년', '어린이', '기타']);

function isWevityAnswer(quote: string): boolean {
  const words = quote.split(',').map((w) => w.trim());
  return words.every((w) => WEVITY_WORDS.has(w)) && words.some((w) => w !== '기타');
}

export function isFillAnswer(site: string, quote: string): boolean {
  if (NOT_ANSWER.test(quote)) return false;
  if (site === 'wevity') return isWevityAnswer(quote);
  return site !== 'thinkcontest' || quote.replace(TC_WORDS, '').trim() === '';
}
