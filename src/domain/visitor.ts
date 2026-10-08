// 사람 방문 판별(SPEC §15 Q5) — 봇 제외 규칙은 이 한 곳에만 둔다.
const PLATFORM = /^Mozilla\/5\.0 \((?:Windows NT|Macintosh|iPhone|iPad|Linux; Android|Android|X11|Linux)/;
const BOT = /bot|crawl|spider|slurp|Google(?:Other|-)|compatible;|Headless|Lighthouse|PTST|preview|scan|python|curl|wget|httpx|okhttp|java\/|go-http|node-fetch|axios|scrapy|facebookexternalhit|Yeti|Daum|GPT|ChatGPT|Claude|Perplexity|Bytespider|Amazon|Applebot|Keenable|Petal|Semrush|Ahrefs|Bing|Yandex|Baidu|monitor|uptime|check|Aside/i;

export function isHumanUserAgent(ua: string | null | undefined): boolean {
  if (!ua) return false;
  return PLATFORM.test(ua) && !BOT.test(ua);
}

/** 취약점 스캐너가 두드리는 경로 — 한 번이라도 친 IP는 사람으로 세지 않는다 */
export const SCANNER_PATH = /(?:^|\/)\.(?:env|git|svn|aws|ht|DS_Store)|wp-|xmlrpc|\.php(?:$|\?)|phpmyadmin|\/cgi-bin|\/actuator|\/vendor\/|\/config\.(?:json|yml|js)|\/server-status|\.amplifyrc|README\.md$/i;
