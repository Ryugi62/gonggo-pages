/** SPEC §38 AC-168 — 이미 공개한 날짜 주소(/digest/ /ai-ok/ /solo/) 목록. 새 정리 기준일은 뺀다 */
export function publishedDates(kept: string[], prev: string | null, next: string): string[] {
  return [...new Set([...kept, ...(prev ? [prev] : [])])].filter((d) => d !== next).sort();
}
