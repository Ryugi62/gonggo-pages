// 짧은 문자열 지문 — 두 시드의 FNV-1a 32비트를 이은 16자리 16진수. 순수 함수.
function fnv(s: string, seed: number): string {
  let h = seed >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, '0');
}

export function tokenHash(s: string): string {
  const t = s.toLowerCase();
  return fnv(t, 0x811c9dc5) + fnv(t, 0x050c5d1f);
}
