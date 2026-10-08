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
- AC-12: Given 빌드 결과 When 루트를 보면 Then 구글(google09201ae909576b2d.html)·네이버(naver834f…html — 옛 주소용, naver228e…html — 정식 주소 gonggo.oaksoo.com용 2026-10-06) 소유확인 파일과 홈 `naver-site-verification` 메타가 있고, 이 파일들은 sitemap 페이지 수에 넣지 않는다.
- AC-14 (Pro v0.1, 2026-10-06): Given 상태가 조건불가·제출함·탈락인 행 When 내보내면 Then 공고는 공개되고(상태·gate 사유는 안 나감), 중복·수혜완료만 제외. **AC-1을 대체한다.**
- AC-15 조항 판독: Given 메모의 「」 원문 인용 When 내보내면 Then 종류(자격·AI 사용·본인 창작 서약·중복수혜·중복수상·현장 참석·팀 구성·업력)로 분류된 `clauses[]`가 원문 그대로 나가고, 사용자 발화(「사용자 M/D 「…」」)·메일 회신·구어체·내부 분석 메모·제목 인용은 버린다. GU 행은 괄호 원문 인용만.
- AC-16 AI 사용 판정: 금지 문장(같은 문장 25자 이내 「AI … 불가/금지/심사 제외/활용하지 않은」) → FORBIDDEN(상세 첫 화면 「AI 초안 사용 불가」), 허용 문장 → ALLOWED, 그 밖 → UNSTATED(「원문에서 AI 사용 규정을 찾지 못했어요 — 원문 확인」, 「허용」 단정 금지). 금지가 허용을 이긴다.
- AC-17 주간 페이지 `/week/`: 오늘~6일 뒤(7일) 마감하는 창업 공고(지원사업·창업자 태그·이름에 창업/스타트업) 마감 임박순, sitemap·홈 링크 포함.
- AC-18 결제 0: 어떤 페이지에도 카드 입력·결제 버튼·가격 없음(Pro 가격은 상업 허용 호스트에서 10/7 이후).
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
- v0.2 2026-10-06 공고콕 Pro 검증 SPEC(볼트 `projects/공고콕-Pro-2026/SPEC`) 1단계 — AC-14~18, 공개 1,698건·조항 1칸 이상 64%. 호스팅에 AWS(기존 EC2, edge-caddy 뒤 nginx 1개, `deploy/aws/`) 추가 — Vercel Hobby는 가격 페이지 금지라 `/pro`는 AWS에만. 문구 조정: SPEC의 「원문에 AI 사용 규정이 없어요」는 원문 전문을 다 읽지 않은 상태의 단정이라 「원문에서 AI 사용 규정을 찾지 못했어요」로.
- v0.3 2026-10-06 §11 성장 장치 ① 마감 캘린더 루프(AC-19~24).
- v0.4 2026-10-07 §12 Pro 가격 페이지·결제 요청 저장(AC-25~32, AWS 빌드 전용).
- v0.5 2026-10-06 §13 정식 주소 https://gonggo.oaksoo.com 전환(AC-33~38) — 도메인 구매 0원(기존 oaksoo.com 하위 호스트).
- v0.6 2026-10-08 §14 /pro 첫 화면 v2 — 고객 원문 인용·「판정마다 원문 조항」(AC-39~43).
- v0.7 2026-10-08 §15 검색 유입 장치 — 고객 말 제목·설명·FAQ 구조화 데이터·IndexNow·사람 방문 계측(AC-44~50).

## 11. 성장 장치 ① 마감 캘린더 루프 (v0.3, 2026-10-06 — 볼트 `projects/자동성장-서비스-2026` ④)
**목적**: 사용 행위(「내 캘린더에 마감 넣기」·「분류 구독」)가 곧 재방문·전파가 되는 루프. 캘린더 일정 1건 = 우리 상세 페이지 링크 1개(`?from=cal`)가 사용자 캘린더에 박혀, 마감 알림이 울릴 때마다 사람 손 0으로 재방문이 생긴다. 구독 링크는 동아리·단톡방에 그대로 공유된다.
**숫자 성공 조건(배포 게이트)**
- C1 마감일 있는 공개 공고 **100%**(현재 1,574/1,698)의 상세 페이지에 「구글 캘린더에 추가」(템플릿 URL, 날짜 정확)와 `.ics` 링크가 있다. 상시·마감 미상 공고 0건에 노출.
- C2 구독 피드 = 전체 1 + 분류(공고 있는 것) + 대상 태그(공고 있는 것) + 이번 주 창업 1. 피드엔 **오늘~90일 안 마감**만(전체 피드 1MB 상한 — 2026-10-06 실측 1,574건 전부 넣으면 986KB), 피드마다 VEVENT 수 = 그 창의 공고 수(±0), 파일 ≤ 1MB. 피드 일정 설명은 짧게(안내 문장은 단건 .ics에만).
- C3 RFC 5545: CRLF 줄끝 · 모든 줄 ≤ 75옥텟(접기, UTF-8 문자 안 자름) · `, ; \ 줄바꿈` 이스케이프 · UID 공고마다 고유(`<slug>@gonggo`) · DTSTAMP · 종일 일정 DTEND=마감 다음 날(월·연 넘김 포함) · 단건 `.ics`엔 VALARM 3일 전.
- C4 루프: 모든 VEVENT의 DESCRIPTION과 URL에 상세 페이지 절대 주소 + `?from=cal`이 있다(100%).
- C5 계측(가상 페이지뷰, 입력값 0): 추가 클릭 `/intent/cal/add/<slug>` · 구독 클릭 `/intent/cal/sub/<feed>` · 캘린더에서 돌아온 방문 `/intent/cal/return/<slug>`. 피드 요청은 AWS 엣지 접근 로그(UA별)로 센다 → 구독 피드 주소는 AWS 호스트(`FEED_ORIGIN`).
- C6 개인정보: 모든 `.ics`에서 금지 토큰 0 · 상세 HTML ≤ 40KB 유지 · sitemap은 HTML만(.ics 제외).
- C7 라이브: AWS·Vercel 둘 다 `/cal/all.ics` 200 + `Content-Type: text/calendar`. 실파서(python icalendar 또는 동급)로 전체 피드 파싱 오류 0.
- 결과 지표(30일, 판정 2026-11-06): 추가+구독 클릭 ≥ 20(자체 검증 클릭 제외) · `from=cal` 재방문 ≥ 5 · 피드 요청 UA 중 캘린더 클라이언트(Google-Calendar-Importer 등) ≥ 1. 미달이면 위치(첫 화면 노출)부터 바꾼다.
**비목표**: 이메일 알림 발송·계정·서버 API·푸시 없음. 비공개 캘린더 쓰기(OAuth) 없음.
**용어**: 마감 일정 `DeadlineEvent` · 피드 `CalendarFeed{slug,name,items}` · 직렬화 `serializeCalendar` · 구글 추가 링크 `googleAddUrl` · 구독 링크 `googleSubscribeUrl`/`webcalUrl`.
- AC-19: Given 마감 2026-10-30 23:59 공고 When 일정을 만들면 Then DTSTART;VALUE=DATE:20261030 · DTEND;VALUE=DATE:20261031 · SUMMARY 「[마감] <공고명> 23:59」, 12-31 마감이면 DTEND 다음 해 0101.
- AC-20: Given 긴 한글 공고명·쉼표·세미콜론·줄바꿈 When 직렬화하면 Then 모든 줄 ≤ 75옥텟·CRLF·이스케이프되고, 접은 줄을 다시 펴면 원문과 같다.
- AC-21: Given 상시·마감 미상·어제 마감 공고 When 피드를 만들면 Then 들어가지 않는다 / 오늘 마감은 들어간다.
- AC-22: Given 빌드 결과 When 마감일 있는 상세 페이지를 보면 Then 구글 템플릿 링크(dates=YYYYMMDD/YYYYMMDD+1)·`/cal/g/<slug>.ics`가 있고, 상시 공고 페이지엔 없다. 분류·태그·이번 주·홈에 구독 상자(구글 구독 링크·webcal 링크)가 있다.
- AC-23: Given dist의 모든 `.ics` When 검사하면 Then 금지 토큰 0, C2·C3·C4 만족.
- AC-24: Given nginx 설정 When `.ics`를 서빙하면 Then `text/calendar; charset=utf-8`.

## 12. Pro 가격 페이지 `/pro/` + 결제 요청 저장 (v0.4, 2026-10-07 — 볼트 `projects/공고콕-Pro-2026/SPEC` §5-4~7·§7-1·§7-2)
**목적**: 검색으로 들어온 예비·초기 창업자가 Pro(내 계획서 × 공고 배점 채점) 가격 **1안**을 보고, 돈이 나가지 않는 「창립 회원 신청」(= 결제 요청: 이메일 + 창립가 결제 의사 체크 + 개인정보 동의)을 남기게 한다. 14일 검증(D0 = 이 페이지 라이브일, D14 판정)의 보기 → 가격 클릭 → 결제 요청을 셀 수 있어야 한다. Vercel Hobby는 상품 판매 광고 금지라 **AWS(상업 이용 허용, 기존 EC2) 빌드에만** 만들고, 저장은 새 프로세스 없이 기존 nginx가 요청 본문을 파일에 한 줄씩 남긴다(데몬·DB·외부 폼 서비스 0).
**숫자 성공 조건(배포 게이트)**
- P1 `DEPLOY_TARGET=aws` 빌드에만 `/pro/`·`/terms/`·`/refund/`·`/privacy/` 4장이 생기고, 기본(Vercel) 빌드엔 0장 + `vercel.json`이 4경로를 AWS로 돌린다(리다이렉트 4). 가격 숫자(19,900·49,000)는 AWS 빌드에서도 `/pro/` 밖 0.
- P2 `/pro/` HTML ≤ 40KB, 외부 요청 0(같은 출처만 — 외부 스크립트·폰트·Vercel 분석 스크립트 0), 390px 가로 넘침 0.
- P3 저장: `POST /api/pro-request`(JSON ≤ 1KB) → 204, 서버 호스트 파일 `/home/ubuntu/gonggo/logs/pro-requests.jsonl`에 1줄(`{"t":시각,"body":본문}`). GET은 거절(403), 같은 IP 분당 5회 초과(버스트 3) 429. 컨테이너를 다시 만들어도(재배포) 파일이 남는다.
- P4 계측: `/intent/pro/{view,price,request}/<H1|H2>`가 같은 출처 GET 비콘으로 나가 호스트 `logs/intent.log`에 남는다(재배포 뒤에도 보존 — 옛 컨테이너 안 로그는 재생성 전에 옮긴다). 경로에 입력값 0.
- P5 고지: 4장 모두 하단에 사업자 정보(상호·사업자등록번호·통신판매업 신고번호·문의 메일) + 이용약관·환불 규정·개인정보처리방침 링크.
- P6 수집 최소: 요청 본문 키 = `email`·`arm`·`pledge`·`consent` 4개뿐(그 밖 키가 있으면 집계에서 버린다). 보관 2026-11-21까지 후 파기.
- 결과 지표(D14 = 2026-10-21): 적격 방문 ≥ 100 전제 결제 요청 ≥ 3(지인·자체 검증 제외) · 가격 클릭률 ≥ 8% · 결제 요청률 ≥ 2%.
**용어**: 결제 요청 `PaymentRequest{email, arm, pledge, consent}` · 저장 줄 `StoredPaymentRequest{t, email, arm}` · 로그 읽기 `parsePaymentRequestLog` · 운영자 고지 `OPERATOR` · 배포 대상 `DEPLOY_TARGET`.
- AC-25: Given `DEPLOY_TARGET` 없음 When 빌드 Then `dist/pro/` 없음·가격 문자열 0(AC-18 유지) / Given `DEPLOY_TARGET=aws` Then 4장이 있고 canonical은 AWS 주소, sitemap엔 넣지 않는다.
- AC-26: Given 같은 브라우저 When `/pro/`를 두 번 열면 Then 같은 가격안(저장소 키 고정, 저장소가 막히면 그 방문만 무작위). 첫 화면엔 그 가격안 카드 1장만 보이고, 카드 첫 요소는 큰 숫자 「월 19,900원」(또는 49,000원).
- AC-27: Then `/pro/`에 「결제는 오픈 때 · 창립가 고정 · 30일 무조건 환불 · 지금은 돈이 나가지 않아요」와 「계획서는 본인이 씁니다 — 공고콕은 조항 판독·배점 채점·보완 제안만」이 보이고, 카드 입력·「결제하기」 버튼 0. 이용약관에도 대필 아님 문구.
- AC-28: Given `/pro/` 보기 When 「창립 회원 신청」 → 이메일 → 동의 2개 → 신청 Then `/intent/pro/view/<arm>` · `/intent/pro/price/<arm>` · `/intent/pro/request/<arm>`가 순서대로 1회씩(request는 저장 204 뒤에만). 입력 스텝은 한 화면 한 질문(이메일 / 체크 2개).
- AC-29: Given 저장 파일 When `parsePaymentRequestLog`로 읽으면 Then 검증 통과 줄만(이메일 형식·가격안·두 체크·허용 키 4개), 같은 이메일은 마지막 1건, 가격안별 수를 돌려준다. 깨진 줄·허용 밖 키는 버린 수로 센다.
- AC-30: Given nginx 설정 Then `location = /api/pro-request`는 POST만·`client_max_body_size 1k`·`limit_req`·`escape=json` 로그 형식으로 `/var/log/gonggo/pro-requests.jsonl`에 쓰고, 계측 비콘은 `/var/log/gonggo/intent.log`. 배포 스크립트는 `$R/logs`를 마운트하고, AWS 빌드가 아닌 dist는 배포를 거절한다.
- AC-31: Given 개인정보처리방침 Then 수집 항목(이메일·접속 기록)·목적·보유 기간(2026-11-21 파기)·처리 위탁(AWS 서울 리전)·정보주체 권리·문의처가 있다. 환불 규정 = 지금 결제 0 + 오픈 뒤 첫 결제 30일 무조건 전액 환불.
- AC-32: Given dist 전체 When 금지 토큰을 검사하면 Then 0 — 단, 선언된 운영자 고지 문자열(`OPERATOR`)은 4장에서만 허용하고 그 밖 페이지에 나오면 실패.
**비목표**: 실결제·PG·카드 입력 · 계정·로그인 · 메일 자동 발송(신청자 메일은 메인 세션 손) · 새 서버 앱·데몬·DB · 도메인 구매 · Vercel에 가격 노출.

## 13. 정식 주소 전환 — https://gonggo.oaksoo.com (v0.5, 2026-10-06)
**목적**: 검색 유입이 vercel.app(가격 페이지 금지·/pro 입구 없음)으로 가던 것을 AWS의 정식 주소 1곳으로 모은다. 검색 방문 = /pro 입구가 있는 페이지 방문이 되게 한다(볼트 Pro 로그 「메인 결정 1」). 도메인 구매 0원 — 기존 oaksoo.com의 하위 호스트(Cloudflare DNS only A → 기존 EC2, 엣지 caddy가 인증서 자동 발급).
**정식 주소** `CANONICAL_ORIGIN = https://gonggo.oaksoo.com` — `SITE_URL`(astro `site`)·`PRO_ORIGIN`·`FEED_ORIGIN`의 기본값이 모두 이것.
**숫자 성공 조건(배포 게이트)**
- R1 dist의 모든 HTML(소유확인 파일 제외) canonical·og:url 100%가 `https://gonggo.oaksoo.com/`로 시작. sitemap `<loc>` 100% · robots `Sitemap:` · `.ics`의 상세 링크 100%도 같은 호스트.
- R2 dist 전체(HTML·xml·txt·ics·json)에 옛 주소(`gonggo-pages*.vercel.app`·`*.sslip.io`) 문자열 0. (공고 원문 링크가 남의 vercel.app인 것은 원문 주소라 허용.)
- R3 옛 주소: `gonggo-pages.vercel.app`의 모든 경로 → 같은 경로의 정식 주소로 **301**(검색 소유확인 파일 google*/naver*.html만 제외 — 옛 속성 확인 유지). `gonggo.43-202-151-104.sslip.io`의 페이지 → 정식 주소 같은 경로 **301**, 단 `/cal/*`(이미 구독한 캘린더)·`/api/*`(POST 저장)·`/intent/*`(비콘)는 301 없이 그대로 서빙.
- R4 계측 유지: 정식 주소(AWS 빌드)엔 Vercel 분석 스크립트가 없으므로 `window.va('pageview',{path:'/intent/…'})`가 같은 출처 GET 비콘(`/intent/…`, nginx intent.log)으로 나간다. `/intent/`로 시작하지 않는 경로는 보내지 않는다.
- R5 라이브: `https://gonggo.oaksoo.com/`·`/pro/` 200, 페이지 소스 canonical = 정식 주소. 같은 EC2의 다른 서비스(daboyeong.kr·oaksoo.com·EIP:7860) 상태 코드 전후 동일.
**용어**: 정식 주소 `CANONICAL_ORIGIN` · 옛 주소 `LEGACY_ORIGINS`(vercel.app·sslip.io).
- AC-33: Given 환경 변수 없음 When 설정을 읽으면 Then `SITE_URL`·`PRO_ORIGIN`·`FEED_ORIGIN` = `CANONICAL_ORIGIN` = `https://gonggo.oaksoo.com`, astro `site` 기본값도 같다.
- AC-34: Given `vercel.json` When `/`·`/g/<slug>/`·`/pro/`·`/sitemap.xml`를 맞추면 Then 리다이렉트 1개가 `https://gonggo.oaksoo.com/<같은 경로>`·statusCode 301로 보내고, `google09201ae909576b2d.html`·`naver….html`은 맞지 않는다. (§12 P1의 「4경로 → AWS」를 대체 — 4경로도 이 규칙에 포함.)
- AC-35: Given 엣지 스니펫 When 읽으면 Then 정식 호스트 블록은 `reverse_proxy gonggo-web:80`, sslip 블록은 `/cal/*`·`/api/*`·`/intent/*`만 프록시하고 나머지는 `redir https://gonggo.oaksoo.com{uri} 301`. 블록은 공고콕 호스트 2개뿐·전역 설정 없음.
- AC-36: Given 빌드 결과 When 모든 페이지·sitemap·robots·`.ics`를 보면 Then R1·R2.
- AC-37: Given AWS 빌드 When 페이지를 보면 Then `/_vercel/insights/script.js` 없음 + `va` 비콘 심(R4). 기본(Vercel) 빌드는 지금처럼 Vercel 스크립트.
- AC-38: Given 라이브 When curl(맥 DNS 음성 캐시면 `--resolve`/1.1.1.1) Then R3·R5.
**비목표**: 도메인 구매 · Vercel 사용자 지정 도메인 연결 · 서치 콘솔 새 속성 등록·주소 변경 도구(계정 행위 — 메인 몫) · 결제 연결.

## 14. /pro 첫 화면 v2 — 고객 원문으로 다시 쓰기 (v0.6, 2026-10-08 — 볼트 `projects/공고콕-Pro-2026/회차-01-2026-10-08`)
**목적**: D0 이후 /pro 사람 방문 0 상태에서, 첫 화면을 창업자가 실제로 쓴 문장(「쳇지피티는 받을수 있다는데 영 못믿겠어서요!」)으로 시작하고 「우리만」(판정마다 공고 원문 조항을 인용해 사용자가 직접 대조 + AI 사용·중복 수혜·업력·서약 조항 따로 판독)을 헤드라인으로 올린다. 경쟁(지원금AI) 실측: 요약형·자격 판정은 있으나 조항 인용 0.
**숫자 성공 조건(배포 게이트)**
- V1 블라인드 3관점(예비창업자·다건 병행 초기 창업자·컨설턴트) 평균이 기존 문구보다 높을 때만 배포(2026-10-08 기존 3.67 → 새 6.67).
- V2 고객 인용은 선언 목록 `CUSTOMER_VOICES`에서만, 각 인용 = 원문 그대로 + 누구(익명 묘사)·어디(매체)·날짜(YYYY-MM-DD)·원문 링크. 닉네임·실명 0.
- V3 과장 0: 「모든 공고·100%·완벽·정확히·합격 보장·대신 판단」 같은 낱말 0, 원문에서 못 찾으면 「찾지 못했어요」라고 말한다는 문장과 「공고 원문만 읽는다(협약서·운영지침은 아님)」 경계 문장이 있다.
- V4 §12 유지: AC-26~28 문구·흐름·계측 그대로, HTML ≤ 40KB, 외부 요청 0.
**용어**: 고객 원문 `CustomerVoice{quote, who, where, date, url}` · 목록 `CUSTOMER_VOICES`.
- AC-39: Given AWS 빌드 When `/pro/`의 `#step-intro`를 보면 Then 첫 요소(작은 글씨 다음)가 `CUSTOMER_VOICES[0]` 인용 blockquote이고 출처·날짜·원문 링크(`rel` noopener)가 붙어 있다. 나머지 인용도 전부 출처와 함께 보인다.
- AC-40: Then h1 = 「「받을 수 있다」는 답마다, 근거가 된 공고 원문 문장을 붙여 드려요」, 옛 h1(「계획서 하나로, 낼 수 있는 공고만 골라 그 배점표로 채점해 드려요」)은 0.
- AC-41: Then V3 금지 낱말 0 · 「찾지 못했어요」 · 「협약서·운영지침」 경계 문장이 있다.
- AC-42: Then 첫 화면 버튼 문구 = 「창립가로 먼저 신청 · 지금 0원」(이후 스텝 문구 `다음`·`신청하기`·`공고 둘러보기` 유지).
- AC-43: Given `CUSTOMER_VOICES` When 검사하면 Then 3개 이상, 날짜는 ISO, 링크는 https, 인용에 「」 없음.

## 15. 검색 유입 장치 — 고객이 검색하는 말로 상세 페이지를 다시 달기 (v0.7, 2026-10-08 — 볼트 `projects/공고콕-Pro-2026/회차-01-2026-10-08`)
**왜 이 채널인가(10/8 실측)**: 엣지 접근 로그(10/6 02:49~10/8 17:14 KST, 14,462줄) 중 사람으로 보이는 페이지 방문(브라우저 UA·Accept-Language·Sec-Fetch-Mode navigate·스캐너 IP 제외) = 한국어 2명(둘 다 `?utm_source=chatgpt.com` → `/c/contest/`), 외부 Referer 0. /pro 사람 방문 0. 상세 1,698장 전부에 이미 `/pro/?from=g` 링크가 있다 → 「무료 페이지에 사람이 오는데 /pro로 안 넘어온다」가 아니라 **무료 페이지에도 사람이 거의 0** → 맥락 CTA가 아니라 검색 유입이 병목. 색인: Naver `site:` 0건, Bing `site:` 무시(0으로 봄), Google `site:` curl 불가(null). ChatGPT-User가 55개 페이지를 101회 읽음 = AI 검색이 이미 인용 중.
**고객 원문 → 검색어**: 「받을 수 있나요?」(지식iN 2025-12-03) · 「중복 수혜 가능한가요?」(네이버 카페 2026-02-04) · 「예비 단계인지 이미 창업기업인지」(카페 2026-04-07) · 「쳇지피티는 받을수 있다는데 영 못믿겠어서요」 → 제목·설명·질문 문장을 이 말로 단다.
**숫자 성공 조건(배포 게이트)**
- Q1 상세 1,698장 100%의 `<title>`이 「<공고명> <신청|참가> 자격·…·마감 — 나도 <받을|낼|참가할> 수 있나요?」 형태(분류별 동사). 조항이 있으면 고객이 묻는 조항 1개(중복 수혜 > AI 사용 > 중복 수상 > 업력 > 팀 구성 > 현장 참석)가 제목에 들어간다.
- Q2 description은 질문으로 시작하고, 자격 인용이 있으면 「원문 자격: 「…」」를 싣는다. ≤ 158자, 금지 토큰·V3 과장 낱말 0.
- Q3 상세마다 `FAQPage` JSON-LD 1개 — 질문·답 전부가 **화면에 보이는 문장 그대로**(누가 낼 수 있나요? / AI(챗GPT)로 쓴 내용을 내도 되나요? / 조항별 질문). 답은 공고 원문 인용이나 「찾지 못했어요」뿐 — 우리가 지어낸 결론 0. 질문 ≥ 1(AI 질문은 모든 상세에 있다).
- Q4 IndexNow: 키 파일 `/<키>.txt`(본문 = 키)가 dist에 있고, `npm run indexnow`가 dist/sitemap.xml의 정식 주소 URL 전부를 `api.indexnow.org`·네이버 `searchadvisor.naver.com/indexnow`에 보낸다(계정·로그인 0, 응답 코드 기록). sitemap 밖 주소·옛 주소 0.
- Q5 사람 방문 계측 고정: `npm run visits` 1개가 (a) intent.log에서 /pro 사람 방문 (b) 엣지 로그에서 무료 페이지 사람 착지(유입원별: google·naver·daum·bing·chatgpt·기타·직접)를 센다. 봇 제외 규칙은 코드 1곳(`isHumanUserAgent`).
- Q6 상세 HTML ≤ 40KB 유지, 기존 테스트 전부 초록.
- 결과 지표(판정 2026-10-21, 회차 01과 같은 날): 무료 페이지 검색 착지(google+naver+daum+bing+chatgpt) 사람 ≥ 30 · /pro 사람 방문 ≥ 5. 미달이면 제목 문형이 아니라 채널(외부 게시)을 바꾼다.
**사람 판별 규칙(`isHumanUserAgent` + 로그별 조건)**
- UA: `Mozilla/5.0 (` + 플랫폼(Windows NT·Macintosh·iPhone·iPad·Android·X11·Linux)으로 시작하고, 봇 낱말(bot·crawl·spider·Google(Other|-…)·compatible;·Headless·Lighthouse·preview·scan·GPT·Claude·Perplexity·Yeti·Daum… 등) 0.
- intent.log(/pro): `GET /intent/pro/view/<H1|H2>` · 204 · Referer가 정식 주소 `/pro/`(페이지가 쏜 비콘) · 운영자 IP 제외(`privacy.local.json`의 `selfIps`, 저장소엔 없음) · D0(2026-10-07 KST) 이후 · 같은 (IP, UA, KST 날짜)는 1명.
- 엣지 로그(무료 페이지): 정식 호스트 · GET 200 · HTML 경로 · Accept-Language에 한국어(ko) · Sec-Fetch-Mode navigate · 스캐너 경로(`.env`·`.git`·`wp-`·`.php` 등)를 한 번이라도 친 IP 제외 · 하루 페이지 30장 초과 IP 제외 · 운영자 IP 제외. 유입원 = Referer 호스트 또는 `utm_source`.
**용어**: 검색 제목 `searchTitle` · 검색 설명 `searchDescription` · 자주 묻는 질문 `listingFaq` → `faqJsonLd` · 조항 질문 `CLAUSE_QUESTION` · AI 문장 `aiUseSentence` · 사람 UA `isHumanUserAgent` · /pro 방문 집계 `countProVisits` · 무료 착지 집계 `countLandings` · 색인 알림 `indexNowPayloads`.
- AC-44: Given 지원사업 공고(중복 수혜 조항 있음) When 제목을 만들면 Then 「<공고명> 신청 자격·중복 수혜·마감 — 나도 받을 수 있나요?」 / 공모전(상금 있음, 조항 없음) Then 「<공고명> 참가 자격·상금·마감 — 나도 낼 수 있나요?」 / 해커톤·대외활동은 「참가할 수 있나요?」.
- AC-45: Given 자격 인용 있는 공고 When 설명을 만들면 Then 질문(「…수 있나요?」)으로 시작, 「원문 자격: 「」 포함, ≤ 158자 / 인용 없으면 「자격은 원문 공고에서 확인」.
- AC-46: Given 공고 When `listingFaq` Then 자격 인용이 있으면 첫 질문 「누가 낼 수 있나요?」·답 「공고 원문: 「<인용>」」, AI 질문은 항상 있고 답 = `aiUseSentence`(+ AI 조항 인용), 조항 종류마다(자격·AI 제외) 첫 인용 1개로 `CLAUSE_QUESTION` 질문. `faqJsonLd`는 `@type: FAQPage`·`Question`/`acceptedAnswer`.
- AC-47: Given 빌드 결과 When 상세를 보면 Then `<title>`=`searchTitle`, `"@type":"FAQPage"` 1개, FAQ의 모든 질문 문자열이 화면 본문에 있다.
- AC-48: Given 정식 주소·키·URL 목록(옛 주소·다른 호스트 섞임) When `indexNowPayloads` Then host=`gonggo.oaksoo.com`·key·keyLocation=`https://gonggo.oaksoo.com/<키>.txt`, urlList는 정식 호스트만·중복 0·10,000개씩 나눔. dist에 키 파일이 있고 본문 = 키.
- AC-49: Given intent.log 줄(구글봇·GoogleOther·compatible; UA·Referer 없는 직접 호출·운영자 IP·D0 이전·같은 사람 2회·사람 1명 H2) When `countProVisits` Then 사람 view 1, 가격안별·날짜별 수.
- AC-50: Given 엣지 JSON 줄(사람 chatgpt 착지·google 착지·스캐너 IP·Accept-Language 없는 봇·한국어 아닌 단발 방문·하루 31장 IP·옛 호스트) When `countLandings` Then 사람 2명, 유입원 chatgpt 1·google 1.
**비목표**: 서치 콘솔·네이버 서치어드바이저 로그인 행위(메인 몫) · 원문 공고 재수집(데이터는 `data/listings.json` 그대로) · 무료 페이지 CTA 개편(이 회차 변수 밖) · 외부 커뮤니티 게시.
