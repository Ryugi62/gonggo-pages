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
- AC-16 AI 사용 판정: 금지 문장(같은 문장 25자 이내 「AI … 불가/금지/심사 제외/활용하지 않은」) → FORBIDDEN(상세 첫 화면 「AI 초안 사용 불가」), 허용 문장 → ALLOWED, 그 밖 → UNSTATED(「원문에서 AI 사용 규정을 찾지 못했으니 지원 전 원문을 확인해 주세요.」, 「허용」 단정 금지). 금지가 허용을 이긴다.
- AC-16b 부정문·내부 메모 오판 수리(10/22): Given AI 문장에 부정(「No … AI-generated … is allowed」·「허용되지 않는다」) When 판독하면 Then ALLOWED가 아니라 FORBIDDEN. Given 인용이 내부 메모(「저작 모드: 컷(AI금지)」) When 내보내면 Then 조항으로 나가지 않고 판독 근거가 되지 않는다. 긍정문(「AI coding assistants are allowed」)은 그대로 ALLOWED.
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

## 8. UI 수용 기준 (토스 원칙 체크리스트 10 구체화) — 자동 = `tests/dist/ui.test.ts`(+ `ui_audit.py` fail 0), 수동 = 볼트 `UI검수-YYYY-MM-DD.md`
1. 모바일 퍼스트: 390px 가로 스크롤 0, 1280px 본문 폭 ≤ 720px 중앙. [자동: viewport·확대 차단 없음·.wrap 720 / 가로 스크롤·캡처는 수동 — UI검수 기록]
2. 한 화면 한 질문: 자격 체커는 입력 4개 → 2스텝(나이·학생 / 지역·사업자), 스텝당 ≤2, 진행 표시. [수동 — UI검수 기록]
3. 타이포: 제목 ≥22px 700, 본문 16px, 보조 13px. [자동: 본문 16px·12px 미만 0·굵기 ≥400]
4. 여백·라운드: 섹션 간 ≥24px, 카드 라운드 16px, 그림자 0~1단계. [자동: ui_audit spacing(warn 허용 — 사유는 검수 기록) · 터치 ≥44]
5. 하단 고정 CTA: 상세 페이지 「원문 공고 보기」 1개, 하단 고정, 높이 ≥52px, 전폭(모바일). **그 외 버튼은 모두 보조 스타일(btn primary 0)** — 페이지마다 주 행동 1개. [자동]
6. 숫자 먼저: 상세 첫 카드 = 「D-n」(≥28px), 그 아래 마감일·상금 1줄. 체커 결과 = 「낼 수 있는 공고 N개」. /pro는 가격 카드가 질문 목록보다 앞이고 하단 고정 버튼에 가리지 않게 아래 여백 ≥112px. [자동: 순서·크기·여백 / 첫 화면 안 위치는 수동]
7. 근거는 접힘: 정리 기준·출처 안내는 `<details>`(닫힘). 조항 판독 인용은 제품 본문이라 예외(차별 축). [자동: open 속성 0]
8. 마이크로카피: 존댓말·짧게(「모르면 비워도 돼요」), 공고명 뒤에 조사를 조립하지 않는다(AC-54). [수동 — UI검수 기록]
9. 색: 흰 배경 + #3182F6 1색 + 상태 3색(원칙 쌍), 본문 대비 ≥4.5:1, `prefers-color-scheme: dark` 최소 대응. [자동: 다크 규칙·outline 유지·ui_audit contrast fail 0]
10. 성능: 시스템 폰트, 외부 CDN 0, 상세 페이지 JS = D-day 계산·알림 의향 인라인 소량. [자동: 외부 의존 0]

## 9. 물리 검증 계획
- `npm run export`(실데이터) → 내보낸 건수·제외 사유별 수 출력.
- `npm run build` 시간 측정, `dist/` HTML 수·sitemap URL 수 대조.
- 상세 1장·홈 1장 Lighthouse(로컬 크로미움) SEO 점수.
- 390/1280 캡처 2장씩 육안.
- 배포 후 curl: 200·sitemap URL 수·상세 title/meta·`/_vercel/insights/script.js` 200.

## 10. 변경 이력
- v1.0 2026-10-14 §18 규칙 감사 2차 — 공고명 HTML 엔티티 해제·체커 오류/빈 상태/뒤로·홈·목록 보조 버튼·.astro 로직 domain 이동(AC-60~64).
- v0.1 2026-10-02 최초(MVP).
- v0.2 2026-10-06 공고콕 Pro 검증 SPEC(볼트 `projects/공고콕-Pro-2026/SPEC`) 1단계 — AC-14~18, 공개 1,698건·조항 1칸 이상 64%. 호스팅에 AWS(기존 EC2, edge-caddy 뒤 nginx 1개, `deploy/aws/`) 추가 — Vercel Hobby는 가격 페이지 금지라 `/pro`는 AWS에만. 문구 조정: SPEC의 「원문에 AI 사용 규정이 없어요」는 원문 전문을 다 읽지 않은 상태의 단정이라 「원문에서 AI 사용 규정을 찾지 못했어요」로.
- v0.3 2026-10-06 §11 성장 장치 ① 마감 캘린더 루프(AC-19~24).
- v0.4 2026-10-07 §12 Pro 가격 페이지·결제 요청 저장(AC-25~32, AWS 빌드 전용).
- v0.5 2026-10-06 §13 정식 주소 https://gonggo.oaksoo.com 전환(AC-33~38) — 도메인 구매 0원(기존 oaksoo.com 하위 호스트).
- v0.6 2026-10-08 §14 /pro 첫 화면 v2 — 고객 원문 인용·「판정마다 원문 조항」(AC-39~43).
- v0.7 2026-10-08 §15 검색 유입 장치 — 고객 말 제목·설명·FAQ 구조화 데이터·IndexNow·사람 방문 계측(AC-44~50).
- v1.1 2026-10-15 §11 C2 — 피드 설명에서 원문 주소·주최 제외(공고당 ~555→423B, 전체 1,233,494→940,570B), 1MB 초과 시 창 자동 축소(공고 2배 가정 시 90→14일, 984,238B). 상한 1MB는 유지.
- v0.8 2026-10-08 §16 목록 페이지 /pro 맥락 입구 — 분류·주간·홈에 `?from=c|week|home` 링크 1개, 출처별 /pro 방문 집계(AC-51~53). §15 비목표 「무료 페이지 CTA 개편」 중 목록 페이지 입구 1개만 해제.
- v1.7 2026-11-02 §25 마감 임박 메일 구독 입구 v0 — 구독 폼 1개(AWS 빌드 전용)·저장은 기존 `POST /api/pro-request`에 `kind:"sub"` 1키 추가(§21과 같은 방식, 새 location·프로세스 0). 해제 범위: §1 비목표 「알림 실제 발송 없음」과 §11 「이메일 알림 발송 없음」은 그대로 — 이 절은 **주소 수집만** 연다(발송은 메인 세션 주 1회 손, 코드 발송 0). 「서버 API 없음」은 §12가 이미 푼 nginx 한 줄 저장 경로 재사용이라 추가 해제 없음.

## 11. 성장 장치 ① 마감 캘린더 루프 (v0.3, 2026-10-06 — 볼트 `projects/자동성장-서비스-2026` ④)
**목적**: 사용 행위(「내 캘린더에 마감 넣기」·「분류 구독」)가 곧 재방문·전파가 되는 루프. 캘린더 일정 1건 = 우리 상세 페이지 링크 1개(`?from=cal`)가 사용자 캘린더에 박혀, 마감 알림이 울릴 때마다 사람 손 0으로 재방문이 생긴다. 구독 링크는 동아리·단톡방에 그대로 공유된다.
**숫자 성공 조건(배포 게이트)**
- C1 마감일 있는 공개 공고 **100%**(현재 1,574/1,698)의 상세 페이지에 「구글 캘린더에 추가」(템플릿 URL, 날짜 정확)와 `.ics` 링크가 있다. 상시·마감 미상 공고 0건에 노출.
- C2 구독 피드 = 전체 1 + 분류(공고 있는 것) + 대상 태그(공고 있는 것) + 이번 주 창업 1. 피드엔 **오늘~90일 안 마감**만(전체 피드 1MB 상한 — 2026-10-06 실측 1,574건 전부 넣으면 986KB). **전체 피드가 1MB를 넘으면 창을 마감 날짜 단위로 줄여 1MB 안에 드는 가장 넓은 창(0~90일)을 모든 피드에 같이 쓴다**(`fitWindowDays`, 2026-10-15 — 90일 창 2,224건이 1,233,494B로 상한 초과). 피드마다 VEVENT 수 = 그 창의 공고 수(±0), 파일 ≤ 1MB. 피드 일정 설명은 마감·상금·상세 링크만(원문 주소·주최·안내 문장은 상세 페이지와 단건 .ics에만).
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

## 16. 목록 페이지 /pro 맥락 입구 (v0.8, 2026-10-08 — 볼트 `projects/공고콕-Pro-2026/회차-01-2026-10-08`)
**왜(10/8 실측)**: 사람 착지 2명(둘 다 `utm_source=chatgpt.com`)이 `/c/contest/`(분류 페이지)에 내렸는데, /pro 입구는 상세 1,698장에만 있고 홈·분류·주간 페이지엔 0. ChatGPT-User가 55쪽을 101회 읽는 중 = 목록 페이지가 실제 입구.
**숫자 성공 조건(배포 게이트)**
- E1 AWS 빌드의 홈 `/`·분류 `/c/*/`·주간 `/week/`·`/w/*/` 마다 `/pro/` 링크 정확히 1개, `href="/pro/?from=<home|c|week>"`. 기본(Vercel) 빌드엔 0(AC-25 유지).
- E2 문구는 /pro v2와 같은 결(고객이 묻는 말 「나 내도 되나?」 + 「답마다 근거가 된 공고 원문 조항을 붙여 드려요」) + 「오픈 준비 중」 표기. V3 과장 낱말 0, 없는 기능 약속 0.
- E3 목록 첫 화면 안(건수 카드 바로 뒤, 목록보다 위) — 긴 목록 끝에 묻히지 않게. 390/1280px 가로 넘침 0.
- E4 `npm run visits`가 /pro 사람 방문을 `from=` 값별로 센다(비콘 Referer `…/pro/?from=x` 기준, 없으면 `none`).
**용어**: /pro 입구 `proEntry` · 입구 출처 `ProEntryFrom`(`home`·`c`·`week`) · 출처별 방문 `byFrom`.
- AC-51: Given `proEntry('c', '지원사업')` When 문구를 만들면 Then href=`/pro/?from=c`, 제목에 「지원사업」·「받을 수 있나?」·「공고 원문 조항」, 보조 문구에 「오픈 준비 중」. `proEntry('home')`·`proEntry('week')`는 href `?from=home`·`?from=week`. 모든 문구에 V3 금지 낱말 0.
- AC-52: Given AWS 빌드 When 홈·분류 5장·`/week/`·`/w/*/`를 보면 Then `/pro/` 링크가 정확히 1개(`?from=` 값 일치)이고 목록(`ListingList`)보다 앞에 있다. Given 기본 빌드 Then 0.
- AC-53: Given intent.log view 비콘(Referer `from=c`·`from=week`·`from=g`·from 없음, 봇 1줄) When `countProVisits` Then `byFrom` = {c:1, week:1, g:1, none:1}.


## 17. AI 검색 인용 장치 — 답변 엔진이 판독 문장을 그대로 집어 가게 (v0.9, 2026-10-14 — 볼트 `projects/공고콕-Pro-2026/실측-2026-10-14` 후보 1)
**왜(10/14 실측)**: 28시간 nginx 로그 GPTBot 621·ClaudeBot 905·OAI-SearchBot 503·ChatGPT-User 240 대비 사람 방문 수십 건, 검색 유입 0. 답변 엔진이 이미 우리 판독 페이지를 읽는다 → 읽은 쪽이 「한 문장 요약 + 원문 인용 FAQ」를 바로 집을 수 있고, 사이트 전체 지도를 한 파일로 받게 한다. 새 판정은 만들지 않는다 — 기존 `aiUseSentence`·원문 인용만 재배치.
**숫자 성공 조건(배포 게이트)**
- I1 FAQ(§15 Q3) 유지·확인: 상세 100%에 `FAQPage` 1개, 「AI(챗GPT)로 쓴 내용을 내도 되나요?」 질문 100%, 자격 인용이 있으면 「누가 낼 수 있나요?」, 중복 수상 조항이 있으면 「다른 대회에서 상 받은 작품도 낼 수 있나요?」 — 답은 원문 인용·`aiUseSentence`뿐.
- I2 상세 100%의 `<h1>` 바로 다음 첫 단락 `<p class="lead">` ≤ 2문장, 문장 재료는 공고명·분류·마감·`aiUseSentence`(기존 판독 문장)뿐. 상세 HTML ≤ 40KB 유지.
- I3 사이트 루트 `/llms.txt`(text/plain, UTF-8): 첫 줄 `# 공고콕`, 인용문 `> 설명`, 정식 주소 절대 링크만(옛 주소·sslip 0), 주요 경로(`/`·`/week/`·`/check/`·`/about/`·`/rolling/`·분류 `/c/*/`·`/sitemap.xml`·`/cal/all.ics`), 이번 주 마감 창업 공고(주간 페이지 항목, 최대 30건, 각 줄 = 링크 + 마감 + AI 문장), 금지 토큰 0, ≤ 20KB. sitemap에는 넣지 않는다.
- I4 배포 뒤 curl: 표본 상세 3장 200 + JSON-LD 파싱 성공 + `/llms.txt` 200 text/plain, 다른 주소(daboyeong.kr·oaksoo.com·www) 상태 전후 동일.
- 결과 지표(며칠 뒤, 로그): `/llms.txt` 요청 수 · ChatGPT-User·OAI-SearchBot의 상세 재방문 · `utm_source=chatgpt.com` 등 답변 엔진 착지 사람(`npm run visits`). 10/21 판정 지표(§15)는 그대로.
**용어**: 첫 요약 `leadSummary` · 모델용 사이트 안내 `llmsTxt` · 이번 주 줄 `weekLines`.
- AC-54: Given 공고(AI 금지 / 허용 / 미언급) When `leadSummary` Then 문장 배열 길이 2, 첫 문장 = 「「<공고명>」 — <마감> 마감하는 <분류> 공고예요.」(상시면 「상시 모집하는」). 조사(은/는)를 조립하지 않는다 — 공고명 끝이 영문·숫자·문장이어도 받침 판별이 틀리므로 이름을 낫표로 감싼다(원칙-디자인 8, 10/14 감사 #2), 둘째 = `aiUseSentence`와 같은 문자열. 금지 토큰·과장 낱말 0.
- AC-55: Given 빌드 When 상세 전부를 보면 Then `<h1>` 다음 첫 `<p>`가 `class="lead"`이고 본문이 `leadSummary` 문장 이음과 같다.
- AC-56: Given 공고 목록·주간 When `llmsTxt` Then I3 형식 전부(첫 줄·인용문·절대 링크만·주간 ≤30건·금지 토큰 0). Given 빌드 Then `dist/llms.txt`가 있고 같은 내용.
- AC-57: Given 상세 전부 When FAQ를 보면 Then I1(AI 질문 100%, 조항이 있을 때만 해당 질문, 질문 문자열이 화면에 있음 — AC-47과 합쳐 검증).
**비목표**: 새 판정·점수·요약 생성(LLM 호출) · 외부 게시 · 서버 설정 변경 · `llms-full.txt`(공고 1,700장 본문 복제 — 한 사실 한 곳).
- AC-58: Given 배포 전 `logs/pro-requests.jsonl`·`intent.log` When 배포 뒤 어느 파일이든 줄 수가 줄었거나 사라졌으면 Then `deploy/aws/logguard.sh verify`가 exit 1(배포 실패)이고 사본은 `logs.bak/`에 남는다. 배포 전 `snapshot`이 컨테이너 교체보다 앞이다(tests/proDeploy.test.ts). 10/14 감사 #3. 10/8 08:10Z 0바이트 원인: 배포 스크립트·compose·nginx 설정에 truncate/rm 없음 → 미확인(정본 기록은 볼트 UI검수/규칙감사 후속).
- AC-59: Given 빌드 산출물 When `tests/dist/ui.test.ts`와 `ui_audit.py` Then §8 자동 항목 통과·fail 0. 수동 항목은 볼트 `UI검수-*.md`.


## 18. 규칙 감사 2차 수정 (v1.0, 2026-10-14 — 볼트 `projects/공고콕-Pro-2026/규칙감사-2026-10-14` #4·#6·#8, `UI검수-2026-10-14` 수동 8)
**비목표 불변**: 계정·결제·서버 API 없음. 빌드 때 정리한 파일과 브라우저 안 계산만 쓴다.
**숫자 성공 조건**: 산출 HTML의 이중 엔티티(`&amp;#NNN;`·`&amp;lt;` 등) 0 · 체커 문구 3종(오류·빈 상태·뒤로) 각 1개 이상 · `btn primary` 0(404 제외 없이 전 페이지) · `.astro` `<script>`가 계산·판정을 하지 않음(domain 호출만).
**용어**: 체커 문구 `checkerCopy` · 체커 단계 `checkerStep` · Pro 단계 `proStep`.
- AC-60: Given 원천 공고명에 `&#034;`·`&lt;`·`&gt;`·`&amp;` When `exportPublicListings` Then 공개 이름·주최·상금·자격 인용에 엔티티가 풀린 글자(`"`·`<`·`>`·`&`)만 남는다. Given 빌드 When 산출 HTML 전부를 보면 Then `&amp;(#\d+|#x[0-9a-f]+|lt|gt|quot|amp);` 0건.
- AC-61: Given 체커 When 공고 파일을 못 불러오면 Then 「공고를 불러오지 못했어요. 인터넷을 확인하고 다시 눌러 주세요.」와 버튼 「다시 불러오기」. Given 결과 0개 When 보면 Then 「아직 맞는 공고가 없어요. 조건을 바꿔 다시 골라 보세요.」(확인 필요 탭이면 「확인할 공고가 없어요.」). 뒤로: 2스텝과 결과에 「이전」 보조 버튼, 입력값은 유지.
- AC-62: Given 홈·목록의 캘린더 구독 카드 When 보면 Then 버튼은 모두 보조 스타일이고 `btn primary`는 404(유일한 행동 1개) 외 전 페이지 0, 주 행동은 하단 고정 `.cta` 1개.
- AC-63: Given `nextStep`·`proNextStep`·`checkerCounts`·`dDayLabel` When 단위 호출 Then 위 화면 상태가 domain 순수 함수로 결정된다(`.astro`에 D-day 계산·상태 전이 중복 없음).
- AC-64: Given `tests/architecture.test.ts` When `.astro` 전부 Then 비-inline `<script>`는 domain/application만 import하고 `Date.parse`·`Math.round` 계산을 하지 않는다. 예외 1: `is:inline` 스크립트(D-day 표시·비콘·알림 의향)는 번들러를 못 쓰므로 소량 인라인 허용(§8-10).
- AC-65: Given `/pro` 사람 방문·가격 클릭·결제 요청 수 When `verdict(counts, today)` Then 방문 ≥100 ∧ 요청 ≥3 ∧ 가격 클릭 ≥8% ∧ 요청률 ≥2% = GO, 방문 <100 = 보류(D45 11/21 이후 채널 실패), 요청 1~2 = 보류, 그 외 NO-GO. `npm run visits` 끝에 판정 1줄(10/14 감사 #10).
- AC-66: Given 상세 When `?from=cal`로 열면 Then 페이지 load 뒤 1.5초에 `/intent/cal/return/<slug>` 비콘이 나가도록 인라인 스크립트가 있다(10/14 감사 #9, tests/dist/ui.test.ts).


## 19. 실험 X1·X3 — 상세 조항 미리보기 + 조항 모음 페이지 (v1.1, 2026-10-22 — 볼트 `projects/공고콕-Pro-2026/회차-02-2026-10-22/실험.md` X1·X3)
**왜(10/22 실측)**: 10/20~21 이틀 착지 35명 중 /pro 진입 0. 상세 화면 첫 장면에 Pro가 주는 것(그 공고의 AI·중복 조항 판독)이 안 보임(X1). 「중복 수상 되나」「AI로 써도 되나」를 공고별로 답하는 곳이 없음(X3). 메인 J 결정 10/22: §15 비목표 「무료 페이지 CTA 개편」 중 상세 조항 미리보기 1줄만 해제.
**데이터 현실(10/22 실측, 2,321건)**: AI 판독 15건(허용 11·금지 4), 중복 수상 조항 3건(모두 「제한」 문장 — 「허용」 문장 0), 중복 지원 허용 문장 2건. 그래서 **원문 인용이 판독 방향과 일치하는 것만** 쓴다(허용 판독인데 인용이 「AI-generated … is allowed」를 부정하는 8건 등 불일치는 모두 제외).
**숫자 성공 조건(배포 게이트)**
- P1 상세: 근거 있는 공고(AI 인용 일치 또는 중복 인용 방향 분명)에만 `<h1>` 뒤 미리보기 1줄(`.clause-preview`), 근거 없는 상세엔 0개. 줄은 인용을 70자까지만(넘으면 …) 옮기고 새 판정 문장을 만들지 않는다.
- P2 AWS 빌드에서만 `/pro/?from=gp` 링크 1개(기존 하단 `from=g` 타일과 구분되는 X1 전용 출처), 기본 빌드엔 0(AC-25).
- P3 모음 `/clauses/ai/`·`/clauses/duplicate/`: 항목마다 공고 링크 + 원문 인용 + 마감 + 「<generatedAt> 판독」 표기, 근거 없는 공고 0, 항목 수 = 근거 있는 공고 수. 「중복」 모음은 **허용(중복 지원 가능)** 과 **제한(수상·중복 제한)** 을 갈라 쓰고, 중복 수상 허용 문장이 없으면 그렇게 적는다(없는 것을 만들지 않음).
- P4 두 주소가 sitemap·llms.txt에 들어간다. 금지 토큰 0, V3 과장 낱말 0, 상세 HTML ≤ 40KB.
- P5 배포 뒤 curl: 두 모음 200 · 미리보기가 붙은 상세 2장 200 + 줄 원문 확인.
**용어**: 조항 미리보기 `clausePreview` · AI 근거 `aiEvidence` · 중복 근거 `duplicateEvidence` · 모음 `clauseCollections`.
- AC-67: Given AI 판독 ALLOWED + 허용 인용 / FORBIDDEN + 금지 인용 When `aiEvidence` Then {verdict, quote}. Given 판독과 인용이 어긋남(ALLOWED인데 「…not allowed」·FORBIDDEN인데 내부 메모 「저작 모드: 컷」) 또는 인용 없음 Then null.
- AC-68: Given 중복 조항 인용 When `duplicateEvidence` Then 「가능」 계열은 ALLOW, 「불가·제외·취소·환수·경력 없음」 계열은 LIMIT, 둘 다 아니면 null.
- AC-69: Given 공고 When `clausePreview` Then 근거 0이면 null, 있으면 「이 공고의 AI 사용·중복수상 조항」으로 시작하고 인용이 ≤70자.
- AC-70: Given 빌드 When 상세 전부를 보면 Then 미리보기 줄 수 = `clausePreview`가 null이 아닌 공고 수이고, AWS에서만 `from=gp` 링크가 줄 안에 1개.
- AC-71: Given 공고 목록 When `clauseCollections` Then ai.allowed/forbidden, duplicate.allow/limit가 근거 있는 것만 마감 순으로 나온다. 빌드에 `/clauses/ai/`·`/clauses/duplicate/`가 있고 sitemap에 포함, 항목 수 일치.
**비목표**: 새 판정·분류기 수정(`clause.ts` 불일치 8건은 원천 수정 대상으로 메인에 넘김) · 결제·가격 · 외부 게시 · 서버 API.


## 20. 주간 마감 임박 요약 글 `/digest/<날짜>/` (v1.2, 2026-10-28)
**왜**: 자체 채널 주 3건 게시(볼트 공고콕-Pro 상태판 jarvis_channel). 목록 페이지와 달리 「이번 주 마감 대학생·청년 공고 상위 8건」을 한 글로 묶어 검색·AI 인용 착지를 늘린다.
**규칙**: 오늘+1 ~ 오늘+10일 마감 ∧ 태그 대학생|청년 ∧ 분류 공모전|해커톤|지원사업 ∧ 상금 문구에 원화 금액 ∧ 한글 공고명 ∧ 이름에 「청소년」 없음. (마감, 상금 큰 순) 정렬, 같은 (마감, 상금)은 1건만, 상위 8건.
- AC-72: Given 공고 목록 When `weeklyDigest(listings, today)` Then 위 규칙대로 ≤8건이 나온다(범위 밖·상금 없음·영문명·청소년·중복 제외).
- AC-73: Given 빌드 When `/digest/<generatedAt>/`를 보면 Then 항목 수 = `weeklyDigest` 수, 항목마다 공고 상세 링크 + 원문 URL + 마감일, sitemap 포함, 금지 토큰 0, 글 끝에 /pro 안내 1줄(AWS 빌드만, `from=digest` 아닌 기존 `from=week`).
**비목표**: 메일 발송 · 개인 계정 게시 · 새 판정.

## 21. 실험 A — 「무료 공고 판독 요청」 입구 (v1.3, 2026-10-29 — 볼트 `raw/2026-10-29-리서치-공고콕-새판로.md` §4, track-stall 2026-W44)
**목적**: 착지한 사람 대부분이 AI 답변에서 건너온 정보 확인형이라 /pro 가격 카드(돈 약속)는 문턱이 높다. 돈 약속 없이 「내가 가진 이 공고의 원문 조항을 읽어 주세요」를 남길 수 있는 입구를 첫 화면에 하나 두고, 요청 내용 자체를 Pro 수요 신호로 센다. 처리는 운영자(메인 세션)가 접수 24시간 안에 원문 조항 인용으로 정리해 그 이메일 1통으로만 답한다.
**저장**: 새 백엔드 없음 — 기존 `POST /api/pro-request`(§12 P3, nginx 한 줄 기록, ≤1KB, 분당 5회)와 `/intent/` 비콘을 그대로 쓴다. 구분은 본문 키 `kind: "read"` 하나. AWS 빌드에서만 입구가 생긴다(저장 경로가 AWS에만 있음).
**숫자 성공 조건**
- R1 입구: AWS 빌드의 공고 상세·`/clauses/ai/`·`/clauses/duplicate/` 페이지마다 입구 정확히 1개(`data-read-entry`), 기본(Vercel) 빌드 0개. 가격 숫자(19,900·49,000) 0, 카드 입력·결제 버튼 0.
- R2 폼 3칸: 공고 링크 1 + 이메일 1 + 개인정보 동의 1뿐. 본문 키 = `kind`·`link`·`email`·`consent` 4개(그 밖 키는 버린다). 직렬화 최대 길이 ≤ 1KB(링크 ≤ 400자 ASCII, 이메일 ≤ 254자).
- R3 계측: 입구 펼침 `/intent/read/click`, 저장 204 뒤 `/intent/read/request`, 사건마다 1회, 경로에 입력값 0.
- R4 고지: 개인정보처리방침에 수집 목적 「공고 판독 요청」 1줄(공고 링크·이메일, 답신 1통에만 사용, 2026-11-21 파기). 입구 문구에 「무료」「24시간 안 메일 1통」「가격·광고 안내 없음」.
- R5 성공(7일): 시작 후 7일 안 유효 제출 ≥ 1(확장 판정 ≥ 3) — 운영자·자체 테스트·같은 이메일 중복 제외. Kill: 입구 클릭 < 3이면 위치·문구 문제, 클릭 ≥ 3인데 제출 0이면 폼 1칸으로 축소, 두 번 연속 제출 0이면 「정보 확인형 유입은 접촉을 안 만든다」로 기록(볼트 실험 대장이 정본).
**용어**: 판독 요청 `ReadRequest{kind,link,email,consent}` · 저장 줄 `StoredReadRequest{t,email,link}` · 입구 `ReadRequestEntry` · 집계 `parseReadRequestLog`.
- AC-74: Given 판독 요청 When `validateReadRequest` Then 링크가 http(s) URL(≤400자 ASCII)·이메일 형식·동의 true·허용 키 4개일 때만 통과하고, 항목별 오류(`link`·`email`·`consent`·`kind`·`extra`)를 돌려준다. 최대 길이 입력의 JSON ≤ 1024바이트.
- AC-75: Given 저장 파일 When `parseReadRequestLog(text, {exclude})` Then 검증 통과 줄만, 같은 이메일은 처음 1건, 제외 이메일은 센 수만 따로 돌려준다. 깨진 줄은 버린 수로 센다. 결제 요청 집계(`parsePaymentRequestLog`)는 `kind:"read"` 줄을 결제 요청으로도 버린 줄로도 세지 않는다.
- AC-76: Given 이벤트 When `readFunnelPath` Then `/intent/read/click`·`/intent/read/request`이고 입력값 자리가 없다.
- AC-77: Given AWS 빌드 When 상세·모음 페이지를 보면 Then 입구가 1개씩 있고 폼 입력은 3칸(링크·이메일·동의)이며 기본 빌드엔 0개. 입구 문구에 과장 낱말 0.
- AC-78: Given 개인정보처리방침 Then 「공고 판독 요청」 목적 1줄이 있고 보관 기한은 기존과 같다.
- AC-79: Given nginx 설정 Then 기존 `/api/pro-request`·`/intent/` 블록이 그대로이고 새 location·프로세스가 없다.
**비목표**: 결제·PG·카드 입력 · 계정·로그인 · 메일 자동 발송(답신은 메인 세션 손, 접수에 대한 응답 1통) · 새 서버 앱·데몬·DB · 답신에 Pro 가격·광고 문구(별도 동의 없이) · 원문 전문 복제 · 외부 게시.

## 22. 「AI 활용 허용 · 마감 임박 공고」 주간 목록 `/ai-ok/<날짜>/` (v1.4, 2026-10-30 — 볼트 `projects/공고콕-Pro-2026` jarvis_channel)
**목적**: 「AI로 만들어도 되는 공모전」을 찾는 검색·AI 답변 질문에 착지하는 새 목록 1장. 원문에 AI 활용을 허용하는 문장이 있는 공고만, 마감 순으로, 원문 인용 1줄과 원문 링크를 붙인다. 기존 `/g/`·`/digest/` 유형이 못 낸 새 URL을 주 1장 만든다.
**규칙**: `aiUse = ALLOWED` ∧ AI_USE 조항 인용이 있음 ∧ 상시 아님 ∧ 오늘 ≤ 마감 ≤ 오늘+14일. (마감, 공고명) 정렬. 인용은 160자까지(넘으면 「…」), 원문 전문 복제 없음.
**숫자 성공 조건**
- A1 항목 수 = `aiOkList` 수(0이면 페이지·sitemap 항목 모두 만들지 않는다). 항목마다 상세 링크 1 + 원문 링크 1 + 마감일 + 원문 인용 1줄.
- A2 AI 허용 문장 없는 공고(UNSTATED·FORBIDDEN)·마감 지난 공고·범위 밖·상시 공고 0건.
- A3 금지 토큰 0, sitemap 포함, AWS 빌드에서만 /pro 입구 정확히 1개 `href="/pro/?from=ai-ok"`(기본 빌드 0).
- A4 라이브 `https://gonggo.oaksoo.com/ai-ok/<날짜>/` 200.
**용어**: AI 허용 목록 `aiOkList` · 입구 출처 `ProEntryFrom`에 `ai-ok` 추가.
- AC-80: Given 공고 목록 When `aiOkList(listings, today)` Then A2 규칙대로 걸러져 마감순으로 나오고 각 항목에 인용이 있다.
- AC-81: Given 빌드 When `/ai-ok/<generatedAt>/`를 보면 Then A1·A3을 만족한다.
**비목표**: 새 판정 · 메일 발송 · 개인 계정 게시 · 원문 전문 복제 · 사용자 전용 공고 전략 기능(반대편 분석·모의 심사) 노출.

## 23. 「혼자 낼 수 있는(1인 참가 가능) · 11월 마감 공고」 목록 `/solo/<날짜>/` (v1.5, 2026-10-30 — 볼트 `projects/공고콕-Pro-2026` jarvis_channel)
**목적**: 「혼자 나갈 수 있는 공모전」을 찾는 검색·AI 답변 질문에 착지하는 새 목록 1장. 원문에 개인(1인) 참가가 가능하다고 적힌 문장이 있는 공모전·해커톤만 마감 순으로, 원문 인용 1줄과 원문 링크를 붙인다.
**규칙**: 분류 공모전|해커톤 ∧ 상시 아님 ∧ 오늘 ≤ 마감 ≤ 2026-11-30 ∧ TEAM|ELIGIBILITY 조항 인용에 「개인 또는/및/·/으로/참가」「1인 참가」「혼자 참가」 등이 있음(「개인정보」「개인사업자」, 법인·기업·기관·입주 대상 문장, 「입력」 자리표시자 인용 제외). (마감, 공고명) 정렬, 같은 (공고명, 마감) 1건, 상위 30건. 인용은 160자까지(넘으면 「…」), 원문 전문 복제 없음.
**숫자 성공 조건**
- S1 항목 수 = `soloList` 수 ≥ 3(3건 미만이면 페이지·sitemap 항목 모두 만들지 않는다 = kill). 항목마다 상세 링크 1 + 원문 링크 1 + 마감일 + 원문 인용 1줄.
- S2 개인 참가 문장 없는 공고·11월 밖·마감 지난·상시·지원사업 등 다른 분류 0건.
- S3 금지 토큰 0, sitemap 포함, AWS 빌드에서만 /pro 입구 정확히 1개 `href="/pro/?from=solo"`(기본 빌드 0).
- S4 라이브 `https://gonggo.oaksoo.com/solo/<날짜>/` 200.
- AC-82: Given 공고 목록 When `soloList(listings, today)` Then S2 규칙대로 걸러져 마감순으로 나오고 각 항목에 인용이 있다.
- AC-84: Given 빌드 When `/solo/<generatedAt>/`를 보면 Then S1·S3을 만족한다.
**비목표**: 새 판정 · 메일 발송 · 개인 계정 게시 · 원문 전문 복제 · 사용자 전용 공고 전략 기능 노출 · 12월 이후 월 자동 전환(월이 바뀌면 SOLO_MONTH와 본 절 갱신).

## 24. /pro 첫 화면 v3 — 판독 샘플·정확도 1줄·무료/Pro 비교 (v1.6, 2026-11-01 — 볼트 `projects/공고콕-Pro-2026/회차-03-2026-10-31/착수`)
**목적**: 독립 블라인드 3인(평균 4.0/10)의 공통 지적 「창업알리미 Pro 5,000원 대비 4배인데 근거 없음」(3/3)·「실제 판독 결과 샘플·정확도 숫자 없음」(2/3)에 답한다. 가격 블록 바로 아래에 ① 실제 공고 1건 판독 샘플 ② 표본 대조 정확도 1줄 ③ 무료/Pro 2열 비교.
**규칙**: 샘플은 공개 공고 원문에서 옮긴 문장만(2026-11-01 원문 재조회로 대조한 것). 「찾지 못했어요」 사례 1줄 포함. 정확도 숫자는 볼트 `판독표본-원문대조-2026-10-06` 실측값(표본 10건 중 10건 일치)만 — 퍼센트로 바꾸지 않고, 표본이 작다는 말을 같은 줄에 붙인다. 가격·환불·무료 체험 문구는 바꾸지 않는다.
**숫자 성공 조건**
- V1 /pro/ 첫 화면(`#step-intro`)에서 가격 카드 다음 순서로 샘플 → 정확도 → 비교. 샘플 행 ≥ 3(그중 「찾지 못했어요」 1), 인용마다 「」, 공고 원문 링크 1(`rel` noopener).
- V2 정확도 줄에 「10건 중 10건」·「2026-10-06」 포함, 「100%」 0. V3 비교 2열(무료·Pro) 각 항목 ≥ 2. V4 /pro/ ≤ 40KB·외부 요청 0·과장 낱말 0 유지.
- V5 라이브 `https://gonggo.oaksoo.com/pro/`에서 세 블록 문구 3개 curl로 확인.
- AC-85: Given `PRO_SAMPLE`·`PRO_ACCURACY`·`PRO_COMPARE` When 시험 Then V1~V3 규칙 충족. AC-86: Given AWS 빌드 When `dist/pro/index.html` Then V1·V2·V3·V4.
**용어**: 판독 샘플 `PRO_SAMPLE` · 표본 정확도 `PRO_ACCURACY` · 무료/Pro 비교 `PRO_COMPARE`.
**비목표**: 가격·결제·환불·무료 체험 정책 변경 · 책임 보장 문구 · 퍼센트 환산.

## 25. 마감 임박 메일 구독 입구 v0 (v1.7, 2026-11-02 — 볼트 `projects/공고콕-Pro-2026` channels 3번째)
**목적**: 무료 착지 16명·/pro 방문 5·결제 요청 0(10/28)의 병목 = 무료 → 유료 입구. 돈 약속 없이 「마감 임박 공고를 주 1회 메일로」만 남기게 해 재방문 접촉을 쌓는다. 발송은 코드가 아니라 메인 세션이 주 1회(받는 사람 ≤ 수십 명 규모에서) 손으로 한다.
**저장**: 새 백엔드·가입·데몬 0. 기존 `POST /api/pro-request`(§12 P3)에 본문 키 `kind: "sub"` 하나로 구분(§21 방식). AWS 빌드에서만 폼이 생긴다.
**숫자 성공 조건**
- U1 폼: AWS 빌드의 공고 상세 전부 + `/week/` + `/digest/<날짜>/` 페이지마다 폼 정확히 1개(`data-sub-entry`), 기본(Vercel) 빌드 0개. 입력 3개(이메일 · 관심 분야 선택 1 · 동의 체크). 동의 안 하면 제출 불가(오류 문구, 전송 0).
- U2 본문 키 = `kind`·`email`·`topic`·`consent` 4개뿐, 직렬화 최대 ≤ 1KB. `topic` ∈ {contest, support, scholarship, all}.
- U3 동의 문구에 항목(이메일·관심 분야)·목적(주 1회 마감 임박 공고 메일)·보유 기간·거부 권리(거부해도 무료 기능 그대로)가 모두 있다. 처리방침에 「마감 임박 메일 구독」 목적 1줄 + 보유 기간(구독을 끊는 날 또는 2027-11-02 중 빠른 날).
- U4 계측: 폼 펼침 `/intent/sub/click`, 저장 204 뒤 `/intent/sub/request`, 사건마다 1회, 경로에 입력값 0. `visits.ts`가 구독 단계 수를 센다.
- U5 집계: `parseSubscribeLog` — 검증 통과 줄만, 같은 이메일은 마지막 1건(관심 분야 변경 반영), `example.com`/`.test`/`.invalid` 예약 도메인은 시험 제출로 따로 센다. 결제 요청·판독 요청 집계는 `kind:"sub"` 줄을 버린 줄로 세지 않는다.
- U6 문안: `npm run sub:digest`가 오늘~7일 안 마감 공고 5건을 뽑아 본문 초안을 출력한다(발송 0). 본문에 수신 거부 안내·운영자 고지·가격/광고 문구 0.
- U7 라이브: 배포 뒤 외부 curl로 폼 있는 페이지 200, 시험 제출 `test+gonggo@example.com` 1건이 서버 `logs/pro-requests.jsonl`에 쌓임(삭제 대신 예약 도메인 규칙으로 시험 표시), 390px 가로 넘침 0.
- 결과 지표(7일, 2026-11-09): 폼 펼침 ≥ 5(자체 제외) · 유효 구독 ≥ 1. 두 번 연속 0이면 위치(첫 화면)부터 바꾼다.
**용어**: 구독 요청 `SubscribeRequest{kind,email,topic,consent}` · 관심 분야 `SubscribeTopic` · 입구 `SubscribeEntry` · 집계 `parseSubscribeLog` · 주간 추출 `pickDeadlineSoon`.
- AC-87: Given 구독 요청 When `validateSubscribeRequest` Then kind·이메일 형식·topic 4종·동의 true·허용 키 4개일 때만 통과하고 항목별 오류(`kind`·`email`·`topic`·`consent`·`extra`)를 돌려준다. 최대 길이 JSON ≤ 1024바이트.
- AC-88: Given 저장 파일 When `parseSubscribeLog(text)` Then 유효 줄·같은 이메일 마지막 1건·시험 제출 수·버린 줄 수를 돌려준다. 결제·판독 집계는 sub 줄을 세지 않는다.
- AC-89: Given 이벤트 When `subFunnelPath` Then `/intent/sub/click`·`/intent/sub/request`.
- AC-90: Given AWS 빌드 When 상세·주간·digest를 보면 Then 폼 1개·입력 3개·동의 문구 4요소, 기본 빌드엔 0. 가격 숫자·카드·결제 문구 0.
- AC-91: Given 처리방침 Then 「마감 임박 메일 구독」 목적 1줄과 보유 기간이 있다. Given nginx Then 새 location 0(기존 7개 그대로).
- AC-92: Given 공고 목록·오늘 When `pickDeadlineSoon` Then 오늘~7일 안 마감만 마감순 최대 5건, 상시·마감 미상 제외, 팀 전용(최소 2인) 제외.
**비목표**: 메일 코드 발송·발송 서비스 가입·데몬·cron · 계정·로그인 · 자동 수신 거부 링크(수신 거부는 답장 1통 → 메인 세션이 그 줄을 파기 기록) · 가격·광고 문구 · 결제.

## 26. /pro 무료·Pro 비교를 표로 (v1.8, 2026-11-03 — 볼트 `projects/공고콕-Pro-2026/회차-03-2026-10-31` 실험 X3)
**목적**: §24 비교(2열 목록)가 표가 아니라 행별 차이가 한눈에 안 보인다(11/03 실측 `<table` 0). 같은 문구를 표(항목·무료·Pro)로 바꿔 보기 → 가격 클릭 전환을 돕는다. 무료 열은 지금 라이브 기능만, Pro 열은 「오픈 준비 중」 약속(pricing.ts)만. 가격·결제 문구 불변.
- AC-93: Given AWS 빌드 When `dist/pro/index.html` Then `#compare` 안에 `<table>` 1개, 열 머리 「무료」「Pro」, 본문 행 ≥ 3, 행마다 칸 3개. 과장 낱말 0·≤ 40KB 유지.
**비목표**: 가격 변경 · 책임 보장 문구 · 새 기능 약속.
**변경 이력**: v1.8 2026-11-03 §26 표 비교 추가.

## 27. 자격 인용 보강 — 원문 받기(fill quote) (v1.9, 2026-11-17 — 볼트 `.scratch/data-fill-1117`)
**목적**: 공개 내보내기 1,634건 중 854건이 자격 인용(eligibilityQuote)이 없다(메모에서 정규식으로만 뽑기 때문). 서버 렌더에 자격 칸이 있는 4곳(contestkorea·thinkcontest·linkareer·bizinfo)의 원문 마크업에서 자격 문장 인용 1개(보강 인용, **fill quote**)를 결정적으로 뽑아 채운다.
**용어(유비쿼터스)**: 보강 인용 = fill quote · 보강 파일 = `data/fill.jsonl`(url·quote·site·fetchedAt) · 원문 받기 = `scripts/fill-eligibility.ts`(빌드와 따로 도는 일회성 수집, 런타임 아님) · 로컬 캐시 = `.cache/fill/`(원문 전문, 커밋 안 함).
**성공 조건(숫자)**: 4곳 대상 합계 348건 중 채움 ≥ 150건(예측 목표: 보유 780 → 1,080 이상, 달성 시 사실대로 보고 · 미달이면 미달로 기록). 표본 20건 인용이 받은 원문 글자(태그 뺀)에 20/20 들어 있음.
- AC-94: Given 사이트별 저장 마크업 조각 When `extractFillQuote(site, html)` Then contestkorea=`<h2>`(참가자격·응시자격·참여대상) 다음 `<p>` · thinkcontest=`.tit`가 참가자격인 칸의 `<li>` 이음 · linkareer=`참여대상` dt의 dd · bizinfo=사업개요 안 첫 `☞` 문장, 자격 칸이 없으면 null.
- AC-95: Given note에서 자격 인용을 못 뽑은 행과 같은 url의 fill 행 When 내보내기 Then eligibilityQuote = fill quote(isClean·INTERNAL_QUOTE_RE·clip(MAX_QUOTE)·assertPublicSafe 통과분만). note에서 뽑았으면 fill을 쓰지 않는다.
- AC-96: domain 추출기는 I/O를 모른다(입력 글자 → 문자열|null), 받기·파일은 scripts/adapters.
**비목표**: AI 조항 추출 · allforyoung·unstop(앱 셸·자유 본문) · 로그인·가입·발신 · 원문 전문 커밋 · 런타임 스크래핑. 충돌 점검: 저장하는 것은 자격 문장 인용 1개와 url뿐(원문 전문 복제 없음), 빌드는 fill.jsonl만 읽는다.
**변경 이력**: v1.9 2026-11-17 §27 추가.

## 28. 토스 미니앱 열기 링크 (v1.10, 2026-11-19 — 볼트 `projects/공고콕-앱인토스-2026` 실험 X5)
**목적**: 웹 검색(네이버 79%·처음 온 사람 92%)으로 착지한 방문자를 토스 앱의 미니앱 「공고콕」으로 보내, 웹 → 미니앱 외부 유입을 잰다. 기준선: 웹판 7일 사람 착지 66(2026-11-19 접속 실측), 예상 이동 ~2명.
**용어(유비쿼터스)**: 토스 미니앱 링크 = `TOSS_MINIAPP_URL`(앱인토스 콘솔 「홍보 소재」 공식 단축 링크 `https://minion.toss.im/L5iKJAEk`) · 링크 줄 = `TossMiniappLink` 컴포넌트(타일 1개).
**위치(대안안 채택)**: 상단 띠(첫 화면을 밀어 내려 본 과업을 가림)보다 본문 과업 뒤 타일 줄을 채택 — 홈은 「마감 임박」 목록 뒤, 상세는 「내 조건으로 낼 수 있는 공고 찾기」 타일 뒤. 과업 수 1(누르면 토스 앱의 미니앱으로).
**숫자 성공 조건**
- T1: 게시 7일(~11/26) 외부 유입 신규 ≥ 1(콘솔 지표 기준선 위 실측). 0이면 위치(첫 화면)부터 바꾼다.
- AC-97: Given 빌드 산출물(기본·AWS 둘 다) When 홈과 공고 상세 전부를 보면 Then 페이지마다 `href="https://minion.toss.im/L5iKJAEk"` 링크가 정확히 1개, `target="_blank"`·`rel="noopener"`.
- AC-98: Given `TOSS_MINIAPP_URL`·문구 When 시험 Then URL이 위 값과 정확히 같고 문구는 해요체 한 줄(≤ 40자).
- 유지: 상세 HTML ≤ 40KB(S4), 페이지 요청 수 ≤ 3.
**비목표**: 추적 스크립트 추가 0 · 딥링크(`servicetoss://`) 직접 생성 0 · 새 요청·이미지·외부 스크립트 0 · 배너·그림자·음수 여백.
**변경 이력**: v1.10 2026-11-19 §28 추가.

## 29. 공고 상세 「공모 읽는 법」 맛보기 카드 (v1.11, 2026-11-22 — 볼트 `projects/공고콕-앱인토스-2026/유입실험-2026-11-22/SPEC` 실험 E1)
**목적**: 공고 정보는 경쟁자도 무료라 검색 착지가 머물 이유가 없다. 「이 공고는 이렇게 읽어요」 4칸(니즈·평가 전략·맞춤 아이디어·완성도)을 상세에 싣고, 전체 카드는 토스 앱 미니앱으로 잇는다.
**용어**: 읽는 법 카드 `ReadCard` · 축 `Axis` · 유형 `ReadKind`(해커톤·공모전·지원사업·대외활동, 장학 제외) · 맛보기. 데이터 `data/readcards.json`(유형 4 × 축 4, 줄 1문장 ≤60자 + 체크 3개 ≤30자) · 도메인 `src/domain/readCard.ts` · 컴포넌트 `ReadCard.astro`.
**성공 조건(배포일 D, 측정 = `npm run visits`)**: D+14 웹 무료 착지 ≥ 40/주(기준 약 21) · 카드 앱 열기 클릭 ≥ 착지의 5% · D+21 착지 < 25/주 이고 클릭 < 2%이면 문구 1회 재작성, 같으면 kill.
- AC-99: Given 기본·AWS 빌드 When 4유형 상세 Then `#read-card` 1개 · 소제목 4 · 줄 4 · 체크 12. 장학엔 0개.
- AC-100: Given 카드 When 링크 Then `href`=`TOSS_MINIAPP_URL`·`target="_blank"`·`rel="noopener"`·`ping="/intent/app-card"`, 문구 해요체 ≤40자. 페이지당 minion 링크는 정확히 1개 — 카드 상세에선 카드 링크가 기존 타일을 대체한다(AC-97 유지).
- AC-101: Given `readcards.json` Then 「우승·1위·합격 보장·확실·무조건」·점수/% 단정 0, 카드 아래 고정 문장 「원문 공고가 기준이에요」.
- AC-102: Given 데이터·산출물 Then `privacy.ts` 금지 토큰·장부 id(`L0xxx`)·「모의」「블라인드」「우승게이트」 0. 카드 문장은 교훈 장부를 일반화해 새로 쓴 지원자 문장(원문 복사 0).
- AC-103: Given `domain/readCard.ts` Then fs·astro·adapters import 0. 카드 섹션 ≤ 3KB, 상세 ≤ 40KB.
- AC-104: Given 배포 When `npm run visits` Then 「앱 카드 클릭」 줄(`/intent/app-card` POST·GET, 같은 IP·UA·날 1명, 운영자·봇 제외). Firefox는 ping 기본 꺼짐 — Chrome·Safari·모바일 기준.
- AC-105 (맨 위로, 11/22 UX 실조작 막힘 해소): Given 공고 상세(카드로 약 1화면 길어져 4~5화면) When 한 화면 넘게 내려간 뒤 위로 스크롤하면 Then 오른쪽 아래 `aria-label="맨 위로"` 버튼(48px, 하단 CTA 바 있으면 그 위)이 나타나고 누르면 맨 위로 간다. 처음엔 `hidden`, 인라인 스크립트 1개(판정·계산 없음, AC-64 예외 범위).
**비목표**: 앱 번들·결제·가격 숫자 · 공고별 맞춤 카드(앱 유료) · 새 nginx location · 추적 스크립트 · 「수상 보장」류 약속.
**변경 이력**: v1.11 2026-11-22 §29 추가.

## 30. 공고 상세 흐름 재설계 — 읽는 법 별도 화면 + 공고별 앱 링크 (v1.12, 2026-11-22 — 토스 UX 1회차 검수 r1 43·r2 38·r3 43, 막힘 2 겹침)
**목적**: 상세 한 화면 과업 12 → 3, 자격 원문이 첫 화면, 토스 링크가 「이 공고」 약속을 지킨다.
- AC-106: `data/app-slugs.json` = 앱 번들(`~/dev/gonggo-appsintoss/dist/p`)과 웹 공고에 같은 slug가 있는 목록(11/22 실측 988/2,169). 정렬·중복 0.
- AC-107: 앱에 있는 공고는 링크에 `data-intoss="intoss://gonggokok/p/<slug>.html"`(휴대폰에서 먼저 열고 1.5초 안에 앱이 안 열리면 기본 링크), 없으면 앱 홈. 문구 「토스 앱에서 이 공고 열기」/「…공고콕 열기」.
- AC-108: 4유형 상세는 `/g/<slug>/read/`(noindex, sitemap 제외)로 가는 ListRow 1줄만 두고 4칸은 그 화면에. 판독 요청·구독·Pro·조건 찾기·토스 앱은 상세 하단 「더 해 볼 수 있어요」 한 묶음. 「준비 중」 버튼 제거. 장학은 4칸 데이터가 없어 진입 행만 없다.
- AC-109: 상단바 sticky, 호버(hover:hover)·눌림 반응, 간격 4배수, 위계 17/15/13, 체크 아이콘, 맨 위로 24px 아이콘·사용자 입력 뒤에만, .ics 받은 뒤 안내 한 줄, 푸터 「공고콕은」.

## 31. 데이터 신선도 + 마감 흐름 + 상세 정리 (v1.13, 2026-11-22 — 토스 UX 2회차 검수 r1 61·r2 58·r3 57, 3/3 겹침)
**목적**: 정리 기준일이 11/02에 멈춰 상세 1,892 중 1,186(63%)이 마감이고 그중 1,183건은 비슷한 공고 6건도 전부 마감이었다(마감 → 마감 고리). 9617fee는 새 export가 만료 행을 빼 옛 /g/ URL 1,100개(검색 착지 45%)가 사라질 뻔해 데이터를 11/02로 되돌렸다 — 그 원인(덮어쓰기 export)을 병합으로 바꿔 URL은 지키고 열린 공고를 더한다.
**용어**: 병합 `mergeListings` · 열림 `isOpen`(상시 또는 마감일 ≥ 정리 기준일) · 마감 상세 · 마감 시각 대조 `quoteDeadlineTime` · 조항 중복 제거 `dedupeClauses` · 4칸 한 줄 `axisFacts`.
**성공 조건**: 병합 전후 slug 집합 ⊇ 기존(소멸 0), 정리 기준일 = 오늘, 마감 상세는 열린 비슷한 공고 3건(100%), 마감 시각 불일치 0, 상세 HTML ≤ 40KB, 3회차 독립 검수 각 ≥80·평균 ≥85·막힘 0.
- AC-111: Given 옛 목록(이미 공개한 slug)과 새 export When `npm run export`(병합) Then 옛 slug는 하나도 없어지지 않고(만료 공고는 마감 페이지로), 새 열린 공고가 더해지고, 같은 slug·같은 원문 주소는 새 값으로 갱신(주소 slug는 옛 것), 멱등. 공개 필드 allowlist 불변. `MERGE=0`이면 옛 덮어쓰기.
- AC-112: Given 자격 인용에 마감일 뒤 「N시까지·HH:MM 마감」 When 병합 Then `deadlineTime`이 그 시각(원문이 맞다). 다른 날짜의 시각은 읽지 않는다.
- AC-113: 목록·색인·피드·llms·체커는 열린 공고만, `/g/<slug>/`·`.ics`·sitemap의 /g/ URL은 전부. 비슷한 공고 = 열린 것만(마감 상세 3건, 열린 상세 5건).
- AC-114: 읽는 법 4칸 각 칸에 공개 필드(주최·상금·대상·마감)에서 뽑은 「이 공고」 한 줄.
- AC-115: 조항 판독은 자격 원문과 같은 문장을 되풀이하지 않는다(FAQ 구조화 데이터도 같은 목록).
- 상세(마감): 첫 화면 「마감됐어요」 배지 + 「지금 낼 수 있는 비슷한 공고」 3건 → 하단 고정 「지금 낼 수 있는 공고 보기」(분류 목록), 캘린더·3일 전 알림 숨김, 끝난 원문은 하단 묶음 행.
- 상세(열림): 제목 → 마감 배지·한 줄(+캘린더 텍스트 링크 2) → 자격 원문 → 읽는 법 행(첫 화면 안) → 조항 판독 → 비슷한 공고(구분선 행+D-day 배지) → 더 해 볼 수 있어요. 「한눈에 보기」·제목 되풀이 리드·미리보기 회색 줄·회색 카드 제거. 읽는 법 돌아가기 = 상세에서 왔으면 `history.back()`.
- 개인정보 동의 문구의 지난 날짜(2026-11-21)는 「받은 날부터 30일 뒤」로(상대 표현).
**비목표**: 앱 번들 재빌드 · 새 요청·스크립트 · 서버 API · 배포(검수 통과 전 금지).
**변경 이력**: v1.13 2026-11-22 §31 추가.

## 32. 상세 전면 교체 + 내부 메모 차단 + 목록 첫 화면 (v1.14, 2026-11-22 — 토스 UX 3회차 r1 75·r2 70·r3 64, 평균 69.7 < 75 → kill 「r1 대안 전면 교체」 발동)
**목적**: 3/3 겹친 지적 — ① 마감 출구 /c/contest/ 첫 화면 결과 0건(막힘) ② 자격 칸에 내부 분석 메모 ③ 비슷한 공고가 마감일만 같음 ④ 마감 공고 읽는 법에 마감 표시 없음.
**성공 조건(숫자)**: 4회차 독립 검수 3명 각 ≥80·평균 ≥85·막힘 0. 자격·조항 인용의 내부 판단 낱말 전수 0건(3,062건). 목록 첫 화면(390×844) 결과 ≥3건. kill: 4회차 평균 80 미만이면 E1 배포를 접고 상세 변경 없이 데이터 병합·메모 차단만 재배포.
- AC-116: Given 자격·조항 인용 When 내보내기·병합·`assertPublicSafe` Then 「분석 결과·과거 수상작·수상 가능성·& 제안·우승·블라인드·모의 심사」가 있으면 `scrubQuote`가 메모 문단을 버리고(「참가 자격은 …」 문장만 남김, 없으면 null) 못 버리면 빌드 실패. 공고 이름·주최는 대상 아님(「정책 제안 공모전」 정상). 병합은 옛 목록도 정리.
- AC-117: 비슷한 공고 = 같은 유형 + 같은 세부 분야(`topicsOf`, 이름 주제어 19종) 겹침 많은 순 → 같은 유형 → 같은 태그 → 전체, 칸 안은 마감 가까운 순.
- AC-118: `isAudition`(오디션·캐스팅·아역·엑스트라…)은 읽는 법 행·화면·Pro 행 없음.
- AC-119 상세 = 제목 · 마감 배지 1개+날짜 줄 · (AI 배지) · 자격 원문 · 읽는 법 행 1 · 비슷한 공고 · 접힘 조항 판독, 하단 고정 CTA 1개(열림 「원문 공고 보기」·마감 「지금 낼 수 있는 공고 보기」). 판독 요청·구독·Pro·조건 찾기·캘린더·토스는 상세 0개 → `/read/` 맨 아래 「더 해 볼 수 있어요」(토스는 열림=하단 CTA, 마감=묶음 행). 마감 상세엔 끝난 원문 작은 링크. /g/<slug>/ URL·제목·자격 본문·구조화 데이터 유지.
- AC-120 읽는 법 화면: 마감이면 맨 위 「마감됐어요」(1번)+열린 비슷한 공고 3행, 4칸은 칸별 목록 행(`.rc-row`, 제목 17·본문 15·보조 13), 공개 필드에서 못 뽑은 「공고별 한 줄」은 줄째 감춤, 「맨 위로」가 보이면 행 오른쪽 여백 52px. AWS는 폼이 같이 있어 ≤ 40KB(AC-103 갱신).
- AC-121 목록 /c/<분류>/: 건수는 머리 한 줄, 결과 구분선 행이 Pro·캘린더 상자보다 먼저(회색 카드 목록 폐지).
**비목표**: 개인정보 처리방침 문구 변경 · 배포(검수 통과 전 금지).
**변경 이력**: v1.14 2026-11-22 §32 추가.

## 33. 한 서비스 두 문 — 옛 웹판 가격 숨김 + 앱 문 되살림 (v1.15, 2026-11-24 — 사용자 16:08 「공고콕을 서비스 전체 이름으로. 가격 숨겨. 앱으로 가는 링크 살려」, 볼트 `projects/공고콕-앱인토스-2026/하나로-기획-2026-11-24`)
**목적**: 옛 웹판은 무료로 찾고 읽는 입구, 돈을 받는 곳은 앱 하나. 11/22 21:47 핫픽스로 열린 상세 40/40쪽에서 앱 링크가 사라졌고(클릭 0), 웹의 19,900원은 사람 방문 9·신청 0이었다. 가격은 숨기고 문(앱 링크)은 되살려 「검색 착지 → 상세 → 문 클릭」을 센다.
**용어**: 문 `appDoor`(앱으로 가는 링크 1개 = `TOSS_MINIAPP_URL` 첫 화면 공식 링크, 공고별 딥링크 없음) · 문 클릭 `app-card`(`/intent/app-card`) · 면 `surface`(상세·홈·/pro·read — 클릭 Referer 경로로 나눔).
**숫자 성공 조건**: 열린 상세 문 링크 100%(건수 출력) · 딥링크(`data-intoss`·`intoss://`) 0 · dist의 「19,900」「19900」「49,000」「창립가」「Pro 사전 신청」는 약관·환불·처리방침 3장 밖 0 · /pro/ 200 유지 · 사이트맵 주소 라이브 대비 소멸 0 · 독립 검수 3명 각 ≥80·평균 ≥85·막힘 0(검수는 메인).
- AC-126(문): Given 열린 공고 상세 When 390×844 첫 화면 Then 문 링크 정확히 1개(`href` = 공식 단축 링크, `target=_blank rel=noopener`, 문구 「토스에서 공고콕 써보기」, 토스 로고·제휴·공식·인증 낱말 0). 마감 공고도 같다. 읽는 법 화면·홈도 같은 함수 한 곳(`appDoor()`)에서 나온다.
- AC-127(PC): 폭 ≥ 960px에서는 문 아래 「휴대폰의 토스 앱에서 열려요」 한 줄(CSS 폭으로만 보임)이 있어 PC가 막다른 길이 아니다.
- AC-128(세기): 문은 `ping="/intent/app-card"`와 `data-intent="/intent/app-card"`를 함께 가진다(ping 안 보내는 브라우저 대비). 집계는 (IP·UA·KST날짜·면) 하나로 합쳐 한 클릭이 두 번 세지지 않는다. 운영자 IP·헤드리스·자동화 UA·`gk_test=1` Referer는 뺀다. 면은 Referer 경로(상세 `/g/<slug>/`·읽는 법 `/g/<slug>/read/`·홈 `/`·`/pro/`·그 밖)로 나눠 읽힌다.
- AC-129(모바일 상세 보기): `npm run visits`가 「모바일 상세 보기」(휴대폰 UA의 `/g/<slug>/` 착지·읽는 법 제외)를 한 줄로 낸다. 12/09 판정 = 모바일 상세 보기 ≥50에 문 클릭 <3.
- AC-130(가격 숨김): `/pro/`는 200이고 앱 안내 문장 + 문 1개뿐(가격·창립가·사전 신청 폼·비교표·관련 스크립트 없음). 상세·목록·홈·조항 모음·읽는 법·주간·digest·영어·사이트맵·llms.txt·JSON-LD·메타설명에서 `/pro` 링크·가격 문구 0. `/terms/ /refund/ /privacy/`는 내용 그대로 200. 구독 폼·`/api/pro-request`·nginx·서버 기록·`scripts/pro-requests.ts`는 그대로.
- 옛 약속을 바꾼 이유: AC-26(가격 카드)·AC-27~28(사전 신청 입력)·AC-39~42·AC-86·AC-93(/pro 첫 화면)·AC-52(목록 /pro 입구)·AC-97(상세 링크 0)은 사용자 승인(11/24 16:08)으로 대체된다. 가격 문구 시험은 「가격이 없다」 시험으로 뒤집었다.
**비목표**: 웹 결제 · 앱 가격 · 데이터 다시 뽑기(`data/listings.json` 불변) · 공고 원본·판정 칸 합치기 · 공고별 앱 딥링크 · 서버 설정·배포(검수 통과 전 금지).
**UI 수용기준(토스)**: 첫 화면 과업 = 마감·자격 읽기 + 문 1(곁가지, 행 1줄 ListRow) + 하단 CTA 1. 새 상자·그림자 0, 간격 4배수, 눌림·호버 반응은 기존 `.row`.
**되돌리는 법**: `git revert`(가지 단위) 또는 직전 `dist` 재배포(`deploy/aws/deploy.sh`). 데이터·서버 기록 변경 0이라 되돌려도 손실 없음.
**변경 이력**: v1.15 2026-11-24 §33 추가.
