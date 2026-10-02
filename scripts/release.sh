#!/usr/bin/env bash
# 주간 스윕 뒤 재생성·배포: 내보내기 → 테스트 → 빌드 → 산출물 테스트 → 커밋·푸시 → 프로덕션 배포
# 사용: npm run release   (원천 경로 바꾸기: OPPS_PATH=/path/to/opportunities.jsonl npm run release)
set -euo pipefail
cd "$(dirname "$0")/.."
npm run export
npm test
npm run build
npm run test:dist
if ! git diff --quiet -- data/listings.json; then
  git add data/listings.json
  git commit -q -m "data: 공고 재생성 $(node -e 'console.log(require("./data/listings.json").generatedAt)')"
  git push -q origin main
fi
vercel deploy --prod --yes
