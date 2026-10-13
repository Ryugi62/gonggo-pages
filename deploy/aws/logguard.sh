#!/usr/bin/env bash
# 계측·결제 요청 로그 보존 검사 (10/14 규칙 감사 #3) — 배포 전후 줄 수가 줄면(또는 파일이 사라지면) 실패한다.
# 사용: logguard.sh snapshot <logs 디렉터리> <스냅샷 파일>   # 배포 전: 파일별 줄 수 기록 + 사본 보관
#       logguard.sh verify   <logs 디렉터리> <스냅샷 파일>   # 배포 후: 줄어든 파일이 있으면 사본 위치를 알리고 exit 1
set -euo pipefail
cmd="${1:?snapshot|verify}"; dir="${2:?logs dir}"; snap="${3:?snapshot file}"
names=(pro-requests.jsonl intent.log)
case "$cmd" in
  snapshot)
    : > "$snap"
    mkdir -p "$dir.bak"
    for n in "${names[@]}"; do
      if [ -f "$dir/$n" ]; then
        printf '%s %s\n' "$n" "$(wc -l < "$dir/$n" | tr -d ' ')" >> "$snap"
        cp -p "$dir/$n" "$dir.bak/$n.$(date -u +%Y%m%dT%H%M%SZ)"
      fi
    done
    ls -1t "$dir.bak" 2>/dev/null | tail -n +21 | while read -r old; do rm -f "$dir.bak/$old"; done
    ;;
  verify)
    bad=0
    while read -r n before; do
      after=0; [ -f "$dir/$n" ] && after="$(wc -l < "$dir/$n" | tr -d ' ')"
      if [ "$after" -lt "$before" ]; then echo "로그 줄 수 감소: $n $before -> $after (사본: $dir.bak)"; bad=1; fi
    done < "$snap"
    [ "$bad" = 0 ] || exit 1
    echo "로그 보존 확인"
    ;;
  *) echo "usage"; exit 2;;
esac
