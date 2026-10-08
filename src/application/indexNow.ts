// IndexNow 알림(SPEC §15 Q4) — 계정·로그인 없이 검색엔진(Bing·네이버 등)에 바뀐 주소를 알린다. 순수 함수, 전송은 scripts/indexnow.ts.
export interface IndexNowPayload { host: string; key: string; keyLocation: string; urlList: string[] }

const MAX_URLS = 10_000;

export function indexNowPayloads(origin: string, key: string, urls: string[]): IndexNowPayload[] {
  const base = new URL(origin);
  const list = [...new Set(urls.filter((u) => { try { return new URL(u).host === base.host && new URL(u).protocol === base.protocol; } catch { return false; } }))];
  const out: IndexNowPayload[] = [];
  for (let i = 0; i < list.length; i += MAX_URLS) {
    out.push({ host: base.host, key, keyLocation: `${base.origin}/${key}.txt`, urlList: list.slice(i, i + MAX_URLS) });
  }
  return out;
}

export function sitemapUrls(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&lt;/g, '<').replace(/&amp;/g, '&'));
}
