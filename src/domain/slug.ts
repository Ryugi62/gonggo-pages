// FNV-1a 32비트 — 순수 함수(런타임 crypto 의존 없음). 같은 입력 = 같은 slug.
function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function makeSlug(name: string, url: string): string {
  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
    .replace(/-+$/g, '');
  const hash = fnv1a(`${url}|${name}`);
  return ascii ? `${ascii}-${hash}` : `g-${hash}`;
}
