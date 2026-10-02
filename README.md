# 공고콕 (gonggo-pages)

공모전·해커톤·지원사업 공고 1건마다 **자격·마감·상금**을 원문 인용으로 정리한 정적 사이트.
검색으로 들어온 사람이 원문 공고로 가기 전에 「내가 낼 수 있나」를 바로 판단하게 돕는다. 우리는 안내 페이지이고, 원문 공고가 기준이다.

- 스펙: [SPEC.md](SPEC.md) (목적·숫자 성공 조건·수용 기준·비목표)
- 스택: Astro 정적 빌드 · Vercel(Hobby) · Vercel Web Analytics · 외부 폰트·CDN 없음

## 구조 (Clean Architecture)
```
src/domain/          순수 로직: 금지 토큰, 분류, 자격 조건 파싱, 체커 판정, slug, 날짜 표기
src/application/     UC-1 공개 내보내기 · UC-2 사이트 색인 · UC-4 sitemap/robots
src/adapters/        jsonl 읽기, json 쓰기, 화면용 데이터(site/data.ts)
src/infrastructure/  설정(SITE_URL 등)
src/pages, components, layouts   Astro 화면(어댑터)
scripts/             export.ts(composition root) · postbuild.ts(측정) · shots.ts(캡처) · release.sh
data/listings.json   공개 내보내기 결과(커밋 대상, 공개 필드만)
```

## 개인정보 안전 내보내기
원천 목록(운영자 로컬 `opportunities.jsonl`)은 저장소에 없다. `npm run export`가 다음만 뽑아 `data/listings.json`에 쓴다.
- 대상 행: 상태 `후보`·`신청예정` ∧ (마감일 ≥ 오늘(KST) ∨ 상시). 마감 미상·대출·크레딧 제외.
- 허용 필드: 공고명·분류·마감(일·시각)·상시 여부·원문 URL·주최·상금 문구·자격 인용·자격 태그·자격 조건.
- 자유 메모는 통째로 옮기지 않고, 좁은 패턴(「자격:「…」」, 「주최:…」, 「시상규모 N원」 등)에 맞는 조각만 뽑는다.
- 금지 토큰(`src/domain/privacy.ts`)이 하나라도 나오면 그 조각을 버리고, 마지막에 JSON 전체를 다시 검사해 하나라도 있으면 실패한다. `tests/real-export.test.ts`·`tests/dist/build.test.ts`가 커밋 파일과 빌드 산출물 전체를 다시 검사한다.

## 명령
```bash
npm run export      # 원천 → data/listings.json (OPPS_PATH, TODAY 환경 변수로 바꿀 수 있음)
npm test            # 단위·수용 테스트
npm run build       # dist/ 생성 + 페이지 수·크기 출력
npm run test:dist   # 빌드 산출물 검사(sitemap 수, 메타, 금지 토큰)
npm run release     # 위 전부 + 데이터 커밋·푸시 + vercel 프로덕션 배포
```

## 주간 재생성 (메인 세션, 공고 스윕 뒤)
```bash
cd ~/dev/gonggo-pages && npm run release
```
= `npm run export && npm test && npm run build && npm run test:dist` → `data/listings.json`이 바뀌었으면 커밋·푸시 → `vercel deploy --prod --yes`.
테스트가 하나라도 실패하면 거기서 멈추고 배포하지 않는다. 마감이 지난 공고는 다음 재생성 때 빠진다(페이지는 404, 화면의 D-day는 브라우저에서 오늘 기준으로 다시 계산해 「마감」으로 바뀐다).
