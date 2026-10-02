# 공고콕 — SPEC (SDD 스펙, v0.1 2026-10-02)

## 0. 한 줄
대학생·청년·예비창업자가 「○○ 공모전 자격」을 검색했을 때, 공모전·해커톤·지원사업·장학 공고 1건마다 **자격·마감·상금을 원문 인용으로 정리한 정적 페이지**를 보여 주고 원문 공고로 보낸다.
본질 = "공고 모음 사이트가 아니라, 공고 1건 = 검색 착지 페이지 1장(롱테일 검색 유입 장치)".

## 1. 성공 조건 (숫자) · 마감 · 비목표
- 레퍼런스: 위비티·링커리어(공고 1건 = 상세 페이지 1장, 검색 상위). 신규 도메인이라 롱테일(공고명+자격/마감/상금)부터.
- 성공(MVP 출고 게이트):
  - S1 색인 가능 페이지 ≥ 400 (sitemap.xml URL 수, 공고 상세 + 목록)
  - S2 `npm run build` ≤ 60초 (로컬 M-시리즈 맥)
  - S3 Lighthouse SEO ≥ 90 (상세 1장·홈 1장)
  - S4 상세 페이지 HTML ≤ 40KB, 페이지당 요청 수 ≤ 3(HTML·CSS·분석 스크립트), 외부 폰트·CDN 0
  - S5 개인정보 테스트 0 위반: 공개 내보내기에 금지 토큰(운영자 개인 식별 5종 + 사용자결정·tier·opp-·GO·GU·hold + 내부 메모 표지) 0
- 이후 지표(MVP 범위 밖, 측정만): 30일 검색 유입 방문, 「마감 알림 받기」 클릭 의향 → 유료 알림 전환.
- 마감: 2026-10-02 MVP 배포.
- **비목표**: 계정·로그인 없음 · 결제 없음 · 런타임 스크래핑 없음(빌드 때 이미 정리된 파일만 읽음) · 서버 API 없음 · 알림 실제 발송 없음 · 원문 전문 복제 없음(자격 문장 인용만).

## 2. 제약
- 원천: 운영자의 내부 공고 목록(`opportunities.jsonl`, 스키마 v3). **내부 판단·식별자·개인 정보는 절대 공개하지 않는다** — 공개 필드 허용 목록(allowlist)만 뽑는다.
- 공개 대상 행: `state ∈ {후보, 신청예정}` ∧ (마감일 ≥ 오늘(KST) ∨ 상시). 마감 미상(날짜 없음·미확인)은 제외. 대출·크레딧 종류는 제외(개인 금융·계정 상품).
- 비용: Vercel Hobby(무료)·Web Analytics(무료 한도)만. 유료 기능 0.
- 저작권: 원문은 링크로 보내고, 자격은 짧은 인용(≤300자)만.

## 3. 유비쿼터스 언어 (용어집) — 코드 식별자와 1:1
| 용어 | 뜻 | 코드 이름 |
|---|---|---|
| 원천 행 | 내부 목록 1줄 | `SourceRow` |
| 공개 공고 | 공개 허용 필드만 남은 1건 | `PublicListing` |
| 공개 내보내기 | 원천 행 → 공개 공고 목록 변환 | `exportPublicListings` |
| 금지 토큰 | 공개물에 나오면 안 되는 문자열. 개인 식별 토큰은 저장소에 평문 없이 지문(`PRIVATE_TOKEN_HASHES`)만, 평문은 운영자 로컬 `privacy.local.json`(gitignore) | `FORBIDDEN_TOKENS`, `PRIVATE_TOKEN_HASHES`, `findForbidden` |
| 분류 | 공모전·해커톤·지원사업·장학·대외활동 | `Category` |
| 자격 인용 | 공고 원문의 자격 문장 그대로 | `eligibilityQuote` |
| 자격 태그 | 대학생·청년·누구나·창업자 | `EligibilityTag` |
| 자격 조건 | 인용에서 읽은 나이·학생·지역·사업자 조건 | `Constraints` |
| 내 조건 | 방문자가 체커에 넣은 값(브라우저 밖으로 안 나감) | `Profile` |
| 판정 | 맞음·확인 필요·안 맞음 | `MatchVerdict`, `matchListing` |
| 마감 주 | 마감일이 속한 주의 월요일 | `deadlineWeek` |
| 상시 | 마감일 없이 수시 모집 | `rolling` |

## 4. 도메인 모델
- 컨텍스트: 공고 공개(Publishing).
- 값 객체: `PublicListing { slug, name, category, kind, deadline(YYYY-MM-DD|null), deadlineTime, rolling, url, organizer, prize, eligibilityQuote, tags[], constraints }`.
- 도메인 서비스: `classify(kind)`, `parseConstraints(quote, name)`, `tagsFor(quote, name, constraints)`, `matchListing(constraints, profile)`, `makeSlug(name, url)`, `findForbidden(text)`.
- 포트: `SourceRowReader`(jsonl 읽기), `ListingWriter`(json 쓰기).

## 5. 유스케이스
| UC | 입력 | 출력 | 규칙 |
|---|---|---|---|
| UC-1 공개 내보내기 | 원천 행[], 오늘 | 공개 공고[] | 허용 필드만, 금지 토큰 0, 상태·마감 필터 |
| UC-2 사이트 색인 구성 | 공개 공고[] | 분류별·주별·태그별 목록, 관련 공고 | 마감 임박순 |
| UC-3 자격 체커 | 공개 공고[], 내 조건 | 맞음/확인 필요/안 맞음 | 브라우저 안에서만 |
| UC-4 sitemap/robots | 페이지 경로[] | sitemap.xml, robots.txt | 절대 URL |

## 6. 수용 기준 (Given/When/Then)
- AC-1: Given 상태가 조건불가·제출함·탈락·중복인 행 When 내보내면 Then 결과에 없다.
- AC-2: Given 마감일이 어제인 후보 행 When 내보내면 Then 없다 / 마감일이 오늘이면 있다 / due에 「상시」면 rolling=true로 있다 / 날짜 미상이면 없다.
- AC-3: Given note·why·due·gate_quote·source에 운영자 개인 식별 토큰·사용자결정·tier·opp-·GO·GU·hold가 섞인 행 When 내보내면 Then 내보낸 JSON 전체 문자열에 금지 토큰 0.
- AC-4: Given 공개 공고 When 키를 보면 Then 허용 목록(slug·name·category·kind·deadline·deadlineTime·rolling·url·organizer·prize·eligibilityQuote·tags·constraints) 밖의 키가 없다.
- AC-5: Given note에 `자격:「만 19세 이상 대학생」` When 내보내면 Then eligibilityQuote가 그 문장이고 태그에 대학생, 조건 minAge=19.
- AC-6: Given 「본문에 자격 줄 없음」 같은 내부 메모 인용 When 내보내면 Then eligibilityQuote=null.
- AC-7: Given 내 조건(나이 25, 학생 아님) When 「대학생만」 공고를 판정하면 Then 안 맞음 / 조건 없는 공고는 확인 필요 / 「누구나」는 맞음.
- AC-8: Given 같은 원천 When 두 번 내보내면 Then slug가 같다(안정적) 그리고 slug는 `[a-z0-9-]`만.
- AC-9: Given 저장소의 `data/listings.json`(실제 내보내기) When 검사하면 Then 금지 토큰 0, 허용 키만.
- AC-10: Given 빌드 결과 When 상세 페이지를 보면 Then `<title>`이 「<공고명> 자격·마감·상금 정리」, meta description·canonical·og:title·JSON-LD(BreadcrumbList)·원문 링크·면책 문구가 있다.
- AC-11: Given 빌드 결과 When sitemap.xml을 세면 Then URL 수 = 생성된 HTML 페이지 수(404 제외) ≥ 400.
- AC-12: Given 빌드 결과 When 루트를 보면 Then 구글(google09201ae909576b2d.html)·네이버(naver834f…html) 소유확인 파일과 홈 `naver-site-verification` 메타가 있고, 이 파일들은 sitemap 페이지 수에 넣지 않는다.
- AC-13: Given 상세 페이지 When 「마감 알림 받기」를 켜면 Then Vercel Analytics에 가상 페이지뷰 `/intent/alert/<slug>`를 1회 보낸다(무료 플랜은 커스텀 이벤트가 없어 페이지뷰로 센다). 끌 때는 보내지 않는다.

## 7. 아키텍처 (Clean) — 의존성은 안쪽으로만
```
src/domain/        순수 TS(파일·네트워크·Astro 모름)
src/application/   UC-1·UC-2·UC-4 (domain만 import)
src/adapters/      jsonl 읽기·json 쓰기(node:fs), Astro 페이지/컴포넌트(src/pages, src/components)
src/infrastructure/ 설정(SITE_URL, 경로)·composition root(scripts/export.ts)
```
역방향 import 금지 — `tests/architecture.test.ts`가 grep으로 검사.

## 8. UI 수용 기준 (토스 원칙 체크리스트 10 구체화)
1. 모바일 퍼스트: 390px 가로 스크롤 0, 1280px 본문 폭 ≤ 720px 중앙.
2. 한 화면 한 질문: 자격 체커는 입력 4개 → 2스텝(나이·학생 / 지역·사업자), 스텝당 ≤2, 진행 표시.
3. 타이포: 제목 ≥22px 700, 본문 16px, 보조 13px.
4. 여백·라운드: 섹션 간 ≥24px, 카드 라운드 16px, 그림자 0~1단계.
5. 하단 고정 CTA: 상세 페이지 「원문 공고 보기」 1개, 하단 고정, 높이 ≥52px, 전폭(모바일).
6. 숫자 먼저: 상세 첫 카드 = 「D-n」(≥28px), 그 아래 마감일·상금 1줄. 체커 결과 = 「낼 수 있는 공고 N개」.
7. 근거는 접힘: 정리 기준·출처 안내는 `<details>`(닫힘).
8. 마이크로카피: 존댓말·짧게(「모르면 비워도 돼요」).
9. 색: 흰 배경 + #3182F6 1색 + 상태 3색, 본문 대비 ≥4.5:1, `prefers-color-scheme: dark` 최소 대응.
10. 성능: 시스템 폰트, 외부 CDN 0, 상세 페이지 JS = D-day 계산·알림 의향 인라인 소량.

## 9. 물리 검증 계획
- `npm run export`(실데이터) → 내보낸 건수·제외 사유별 수 출력.
- `npm run build` 시간 측정, `dist/` HTML 수·sitemap URL 수 대조.
- 상세 1장·홈 1장 Lighthouse(로컬 크로미움) SEO 점수.
- 390/1280 캡처 2장씩 육안.
- 배포 후 curl: 200·sitemap URL 수·상세 title/meta·`/_vercel/insights/script.js` 200.

## 10. 변경 이력
- v0.1 2026-10-02 최초(MVP).
