#!/usr/bin/env bash
# 공고콕 → 기존 AWS EC2(다보영 서버) 배포: dist 동기화 → nginx 컨테이너(없으면 생성) → 엣지 스니펫 동기화·검증·리로드.
# 사용: npm run build && bash deploy/aws/deploy.sh   (SSH 호스트 별칭: DEPLOY_HOST, 기본 daboyeong)
# 다른 서비스 보호: 엣지 Caddyfile·타 서비스 스니펫은 건드리지 않는다. validate 실패 시 스니펫 원복 후 중단.
set -euo pipefail
cd "$(dirname "$0")/../.."
HOST="${DEPLOY_HOST:-daboyeong}"
REMOTE=/home/ubuntu/gonggo
test -f dist/index.html || { echo "dist 없음 — npm run build 먼저"; exit 1; }

ssh "$HOST" "mkdir -p $REMOTE/site $REMOTE/conf/nginx"
rsync -az --delete dist/ "$HOST:$REMOTE/site/"
rsync -az deploy/aws/nginx.conf "$HOST:$REMOTE/conf/nginx/default.conf"
scp -q deploy/aws/gonggo.caddy "$HOST:$REMOTE/conf/gonggo.caddy"

ssh "$HOST" bash -s <<'REMOTE_EOF'
set -euo pipefail
R=/home/ubuntu/gonggo
# 설정은 디렉터리로 마운트(단일 파일 바인드는 rsync 교체 뒤 옛 inode를 계속 본다). 매 배포 재생성 — 순간 끊김은 엣지 lb_try_duration이 흡수.
docker rm -f gonggo-web >/dev/null 2>&1 || true
docker run -d --name gonggo-web --network edge --restart unless-stopped \
  --memory 48m --cpus 0.25 \
  -v $R/site:/usr/share/nginx/html:ro \
  -v $R/conf/nginx:/etc/nginx/conf.d:ro \
  nginx:1.27-alpine >/dev/null
docker exec gonggo-web nginx -t -q
S=/home/ubuntu/edge/sites/gonggo.caddy
[ -f $S ] && cp $S $R/conf/gonggo.caddy.prev || true
cp $R/conf/gonggo.caddy $S
if ! docker exec edge-caddy caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
  if [ -f $R/conf/gonggo.caddy.prev ]; then cp $R/conf/gonggo.caddy.prev $S; else rm -f $S; fi
  echo "caddy validate 실패 — 스니펫 원복"; exit 1
fi
docker exec edge-caddy caddy reload --config /etc/caddy/Caddyfile --adapter caddyfile
echo "배포 완료"
REMOTE_EOF
