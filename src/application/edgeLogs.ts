// SPEC §34 AC-140 — 엣지 로그는 최신 하나가 아니라 gonggo-access*.log(.gz 포함) 전부. 순수: 파일 이름 → 읽는 명령.
const NAME = /^gonggo-access[\w.-]*\.log(\.\d+)?(\.gz)?$/;
export const isEdgeLog = (name: string): boolean => NAME.test(name);
/** 컨테이너 안에서 한 파일을 읽는 셸 명령(.gz는 zcat). 이름은 isEdgeLog를 통과한 것만 쓴다 */
export function edgeReadCommand(name: string): string {
  if (!isEdgeLog(name)) throw new Error(`엣지 로그 이름이 아니에요: ${name}`);
  return `${name.endsWith('.gz') ? 'zcat' : 'cat'} /data/logs/${name}`;
}
