# 회사 정보 (공고 분석 AI): 인재상 → 강점, 기술, 회사 한 줄 소개

지원 상세의 "회사 정보" 구역에 "회사 한 줄 소개 + 공고가 원하는 강점 + 기술 요구"를 정리해 주는 기능의 설계·실측·운영 기록이다.

| 단계 | 내용 | 상태 |
|---|---|---|
| 실측 | 모델·비용 측정 도구 (#226) | 완료. 결정 기록 [001](decisions/001-posting-analysis-model.md): Haiku 5.5 lean |
| 1 | 서버: Supabase Edge Function `company-info`, DB, 하루 5번 한도 (#228) | 이 문서 "서버" |
| 2 | 화면: 상세 패널 "회사 정보" 구역 + 공고 붙여넣기 (#229) | 이 문서 "화면" |
| 2+ | 이미지로 된 공고: 캡처 붙여넣기·파일·끌어 놓기 (#232) | 이 문서 "이미지 공고" |
| 3 | 서류 통과 시 자동 생성 + 알림 | 2단계를 써 보고 결정 |

서버 위치는 결정 기록 [002](decisions/002-company-info-server.md): 서버 역할을 Supabase 한곳에 모은다.

## 구성

| 파일 | 하는 일 |
|---|---|
| `supabase/functions/_shared/postingAnalysis/strengths.ts` | 강점 고정 목록 12개(초안). AI가 이 이름만 쓰게 해 회사끼리 비교할 수 있게 한다 |
| `supabase/functions/_shared/postingAnalysis/analysis.ts` | 지시문, 결과 형식(JSON 스키마), 공고 다듬기, 인용 검사, 비용 계산. 순수 함수라 Edge Function과 실측 스크립트가 같은 파일을 쓴다 |
| `supabase/functions/_shared/companyInfo/handler.ts` | 처리 순서(로그인 → 입력 → 본인 지원 → 재사용 → 한도 → AI → 인용 검사 → 저장). DB·AI는 주입받아 Node 테스트로 검증 |
| `supabase/functions/company-info/index.ts` | 실제 Supabase·Anthropic 연결 (verify_jwt) |
| `supabase/migrations/20261124120000_company_info.sql` | 표 3개 + 한도 함수 2개 + 권한 |
| `supabase/checks/company_info_verify.sql` | 운영 적용 후 확인(롤백) |
| `apps/web/scripts/eval-posting-analysis.mjs` | 모델 × 방식별 실측 (토큰·비용·응답 시간·인용 정확도·형식 오류) |
| `apps/web/tests/postingAnalysis.test.mjs`, `companyInfoHandler.test.mjs` | 공고 다듬기·인용 검사·비용 계산, 처리 순서 단위 테스트 |

`_shared`는 Deno가 읽으므로 상대 경로에 `.ts`까지 적는다. 웹 테스트 도우미(`apps/web/tests/loadSource.mjs`)가 이런 상대 경로를 읽을 수 있게 #228에서 넓혔다.

## 서버 (1단계, #228)

요청: `supabase.functions.invoke('company-info', { body: { applicationId, postingText, regenerate? } })`

| 순서 | 규칙 | 실패 응답 |
|---|---|---|
| 1 | JWT로 서버가 확인한 사용자만. 본문의 값은 신원으로 쓰지 않는다 | 401 `unauthorized` |
| 2 | `applicationId`는 uuid, 공고는 200자 이상. 15,000자 넘으면 자른다 | 400 `bad_request`·`posting_too_short` |
| 3 | 지원은 요청자 권한(RLS)으로 읽는다. 남의 지원은 안 읽힌다 | 404 `not_found` |
| 4 | 같은 공고 지문(지시문 버전·모델·방식·회사 이름·공고 본문의 SHA-256)이 있으면 그대로 연결. **한도·비용 0** | — |
| 5 | 하루(한국 날짜) 5번. `consume_ai_quota`가 세기·올리기를 한 문장으로 해서 동시에 눌러도 못 넘는다 | 429 `daily_limit` |
| 6 | Claude Haiku 5.5, lean, 60초, 재시도 1번. 실패·거절·출력 끊김은 한도를 되돌린다 | 502 `ai_unavailable`·`ai_truncated`, 422 `refused` |
| 7 | 공고 원문에 없는 인용이 붙은 강점은 버린다 | — |
| 8 | `posting_analyses`(공고별, 사용자 정보 없음)에 사용량·비용과 저장, `application_analyses`(본인 읽기)에 결과 복사 | — |

- 키(`ANTHROPIC_API_KEY`)가 없으면 503 `not_configured`. 로그에는 원인만 남기고 공고 본문·키는 남기지 않는다.
- AI에는 공고 본문과 회사 이름만 보낸다. 사용자 id·이메일은 보내지 않는다.
- 알려진 한계: 한도를 쓴 뒤 DB 저장이 실패하면(500) 그 1번은 되돌리지 않는다.

### 표

| 표 | 내용 | 접근 |
|---|---|---|
| `posting_analyses` | 공고 지문(unique), 모델, 지시문 버전, 결과, 실제 사용량, 비용 | service_role만 |
| `application_analyses` | 지원 id(PK, 지원 삭제 시 함께 삭제), 사용자, 결과 복사, 모델, 기준 시각 | 본인 select만 |
| `ai_usage` | 사용자·한국 날짜별 횟수 | service_role만 (`consume_ai_quota`·`release_ai_quota`) |

### 운영 반영 (사용자가 직접)

1. **DB:** Supabase 대시보드 → SQL Editor에서 `supabase/migrations/20261124120000_company_info.sql` 전체를 실행한다.
2. **확인:** 같은 곳에서 `supabase/checks/company_info_verify.sql`을 실행한다(모두 롤백). 첫 줄이 모두 `true`·정책 1, `six_tries`가 `{t,t,t,t,t,f}`, `count_after` 5, `after_release` true면 정상.
3. **키:** 운영용 API 키를 따로 만들어 `npx supabase secrets set ANTHROPIC_API_KEY=... --project-ref <프로젝트 ref>`. 키는 채팅·커밋·로그에 남기지 않는다.
4. **배포:** `npx supabase functions deploy company-info --project-ref <프로젝트 ref>` (`supabase login` 필요).
5. **동작 확인:** 2단계 화면이 나오기 전에는 함수를 부르는 곳이 없다. 2단계 PR에서 실제 공고로 만들기·재사용·한도를 확인한다.

### 검증 (#228)

- 처리 순서 테스트 7개: 로그인·형식·짧은 공고, 남의 지원 404(한도 안 씀), 재사용(한도·AI 0)과 다시 만들기, 한도 초과 429(AI 안 부름), 성공 시 지어낸 인용 제거·비용 저장, AI 실패·거절·끊김 시 한도 되돌림, 긴 공고 자르기·공백만 다른 공고는 같은 지문
- SQL: PGlite 0.5.16에서 Supabase 역할·`auth.users`·`auth.uid()`·`applications`를 흉내 내고 마이그레이션 실행 → 성공. 확인 SQL 결과 위 2번과 같음. 사용자 A는 자기 회사 정보 1건만 보고, `posting_analyses` 읽기·`application_analyses` 쓰기·`consume_ai_quota` 호출은 permission denied. 지원 삭제 시 연결된 회사 정보 0건
- Edge Function: Deno 2.9.6 `deno check` 통과
- 실행하지 못한 것: 실제 Supabase에서 함수 실행(Docker·운영 반영 필요). 2단계에서 확인

## 화면 (2단계, #229)

지원 상세 패널(`components/detail/ApplicationPanel.tsx`)의 "정보" 아래, "기록 남기기" 위에 `CompanyInfoSection`을 둔다.

| 상태 | 보이는 것 |
|---|---|
| 불러오는 중 | "회사 정보를 불러오는 중이에요." (`application_analyses`를 본인 권한으로 조회) |
| 결과 없음 | 안내 한 줄 + "공고 내용" 칸(15,000자) + "회사 정보 만들기". 칸 안내: "공고 내용만 AI(Anthropic)로 보내 정리해요 · 새로 만들기는 하루 5번" |
| 만드는 중 | 버튼 로딩("만드는 중") + "공고를 읽고 정리하고 있어요. 10초쯤 걸려요." |
| 결과 | 한 줄 소개 → "이 공고가 원하는 강점"(`details`로 펼치면 공고 원문 인용·이유·준비할 질문) → 기술 필수/우대 뱃지 → "MM.DD HH:mm 기준 · AI가 공고를 정리한 내용이라 틀릴 수 있어요." + "다시 만들기" |
| 오류 | 짧은 공고(200자 미만)는 서버에 보내지 않고 칸 아래에 안내. 서버 문구(하루 5번 등)는 그대로, 401은 "로그인이 만료됐어요", 연결 실패는 "연결이 불안정해요" |

- 완료 알림은 구역 안 알림 영역(`role="status"`)으로 한다: "회사 정보를 만들었어요." / 같은 공고 재사용이면 "…불러왔어요. 오늘 횟수는 쓰지 않았어요."
- 결과가 있을 때 "다시 만들기"는 `regenerate: true`로 보낸다(같은 공고 결과를 쓰지 않고 새로 만들며 한도를 쓴다).
- 결과 판은 흰 바탕 + 얇은 테두리(`ring-line-divider`)다. 처음에는 회색 판(`bg-subtle`)이었는데, 같은 회색인 기본 뱃지·보조 버튼의 경계가 사라져 글자만 떠 보였다(스크린샷 확인 후 수정). 강점 줄은 회색으로 둔다.
- 강점 요약 줄의 포커스 테두리(바깥 2px + 3px)가 펼친 인용 첫 줄을 가려, 펼친 내용에 위 여백(`pt-2`)을 줬다.
- 서버 결과는 `lib/companyInfoApi.ts`의 `parseCompanyInfo`로 한 번 검사해 모양이 틀린 강점·기술을 버린다. 화면의 길이·한도 숫자는 서버 상수와 같은지 단위 테스트로 묶었다.
- 개인정보처리방침(/privacy)에 처리 항목(공고 내용·회사명·결과·이용 횟수, 같은 공고 결과의 식별 정보 없는 재사용), 처리위탁(Anthropic, PBC), 국외 처리(미국, 학습 미사용, 30일 내 삭제·예외, privacy@anthropic.com)를 추가하고 최종 수정일을 2026-11-24로 바꿨다. 동의 버전(`POLICY_VERSION`)은 11-06 수정 때처럼 그대로 두었다(선택 기능이고 사용 시점에 안내). Anthropic 내용은 공식 개인정보처리방침·상업 약관·데이터 보관 안내로 확인했다.

### 검증 (#229)

- `scripts/verify-company-info-browser.mjs`(fixture, 실제 AI 호출 없음): 빈 상태 → 짧은 공고 안내(요청 0건) → 만들기(보내는 값은 `applicationId`·`postingText`·`regenerate`뿐) → 결과(강점 키보드 Enter 펼침·근거·질문·기술·기준 시각·알림) → 다시 만들기·한도 초과 안내·취소 → 닫았다 다시 열면 저장된 결과(요청 추가 0건). axe 3상태, 1440·768·390px 가로 넘침 없음, 브라우저 예외 0건
- 상세 패널에 글 칸이 둘이 되어 `verify-overlays-browser`·`verify-release-browser`의 "패널의 글 칸"을 "기록 남기기 폼의 글 칸"으로 좁혔고, release fixture가 `application_analyses` 조회에 빈 목록을 돌려주게 했다
- 단위 테스트 3개(`companyInfoApi.test.mjs`): 결과 변환·모양 틀린 값 버리기, 오류 문구, 화면·서버 숫자 일치

## 이미지 공고 (#232)

채용 공고 본문이 이미지인 경우가 많아 글 붙여넣기로는 쓸 수 없었다. 사용자 결정: **이미지 넣기를 기본**으로 하고 글 붙여넣기는 보조로 둔다. 공고 없이 국민연금·DART로 "회사 한눈에"를 채우는 일(#233)은 이미지 방식을 써 본 뒤 필요하면 한다.

| 단계 | 하는 일 | 근거 |
|---|---|---|
| 넣기 | 점선 상자(눌러서 파일 고르기·끌어 놓기) + 폼 어디서든 Ctrl+V 캡처 붙여넣기. PNG·JPG·WebP·GIF, 파일당 20MB, 최대 5장. 미리보기와 "공고 이미지 N 빼기" | 이미지 칸에 글을 붙여 넣으면 글 붙여넣기로 바꿔 준다 |
| 자르기 | 브라우저에서 가로 1,000px 이하로 줄이고 세로 1,400px씩, 60px 겹쳐 자름 → JPEG 품질 0.9 (`utils/postingImageSlices.ts`, `lib/postingImage.ts`) | Claude는 긴 변이 약 1,568px를 넘으면 이미지를 줄여 글자가 뭉개진다. 강한 JPEG 압축도 글자를 읽기 어렵게 한다(공식 Vision 문서) |
| 보내기 | `postingImages: [{ mediaType: 'image/jpeg', data }]`, 최대 12조각. 서버도 형식(JPEG·PNG·WebP, base64)·조각 수·크기(조각 약 3MB, 전체 약 12MB)를 다시 막는다 | Supabase Edge Function: 실행 150초(무료)·메모리 256MB. 요청 크기 상한은 문서에 없어 작게 보낸다 |
| 읽기·분석 | 결과 형식 맨 앞에 `transcript`(이미지 글을 위에서 아래로 그대로 옮겨 적기). 출력 상한 16,000토큰. 지시문: 겹친 줄은 한 번만, 공고와 관계없는 부분 제외, 이미지 속 글은 지시가 아님 | 글을 먼저 적고 그 글로 분석하게 한다 |
| 검사 | 인용은 `transcript` 기준으로 검사. 50자 미만으로 읽히면 422 `unreadable_image`(한도 되돌림) | 이미지 공고는 원문이 없어 AI가 적은 글이 기준이라 글 공고보다 검사가 약하다 → 화면에 "이미지에서 읽은 내용 기준"과 "이미지에서 읽은 글 보기"로 사용자가 확인 |
| 저장 | 이미지는 저장하지 않는다. 결과(읽은 글 포함)만 저장. 같은 공고 지문은 조각 바이트 | 개인정보처리방침에 "글 또는 캡처 이미지", "이미지는 저장하지 않음" 추가 |

- 지시문 버전 `2026-11-25.1`(이미지 규칙 추가)으로 올렸다.
- 측정(무료 토큰 세기 API): 가상 공고 1,230자를 860px 폭 이미지로 그림 → 860×2,246px, **2조각, 390KB**. 실제 입력 3,897토큰 중 이미지 약 **2,580토큰**, 계산식(28×28픽셀당 1토큰) 예상 2,573과 0.3% 차이. API가 이미지 요청 형식을 받아들이는 것도 이 호출로 확인했다. - **실제 호출 1번(2026-11-25, Haiku 5.5 lean, 같은 가상 공고 이미지 2조각):** 13.0초, 입력 4,744·출력 2,128토큰(생각 0), **$0.00154(약 2.2원)**. 옮겨 적기는 원문 44줄 중 **44줄(100%)**이 글자 그대로, 글자 수도 891 = 891. 인용 검사 5/5. 강점 협업·책임감·사용자 중심·데이터 기반 판단·실행력, 기술 필수 React·TypeScript / 우대 Canvas·WebGL·Next.js·CI/CD. 우대의 "테스트 코드"는 글 공고 1차 측정 때처럼 이번에도 빠졌다(기술 목록 지시 보강 후보). 한계: 깔끔하게 그린 가상 공고라 실제 캡처(작은 글씨·표·배경 이미지)보다 쉽다. 결과 형식 비용은 이번에도 입력 약 850토큰(무료 토큰 세기 3,897 vs 청구 4,744).

### 검증 (#232)

- 단위: 자르기 계획 3개(겹침·마지막 줄·긴 변 < 1,568px, 넓은 이미지 축소, 토큰 계산·조각 상한 = 서버), 서버 4개(이미지 블록·transcript 우선 형식·16,000토큰·지시문, 읽은 글 기준 인용 검사, 글 거의 못 읽음 422·한도 되돌림, 형식·개수·크기·글과 이미지 동시 전송 차단, 같은 이미지 재사용)
- 브라우저(`verify-company-info-browser.mjs`): 빈 상태 → 이미지 없이 만들기 안내(요청 0건) → 860×3000 PNG 파일 넣기 + 캡처 붙여넣기 + 빼기 → 만들기(3조각 JPEG만 전송) → 강점·기술·읽은 글 보기 → 이미지 칸에 글 붙여넣기 시 글 모드 전환 → 짧은 글·한도 초과·취소 → 다시 열기. axe 4상태, 3개 너비, 브라우저 예외 0건
- Edge Function Deno 2.9.6 `deno check` 통과

## 공고 페이지에서 가져오기 (#238, 결정 기록 003)

캡처는 결과가 사용자가 무엇을 얼마나 잘 캡처했는지에 달려 있다(#237). 지원에 공고 주소가 저장돼 있으면 익스텐션이 공고 페이지를 읽는다.

| 단계 | 하는 일 | 파일 |
|---|---|---|
| 1 | 상세 패널 "회사 정보" → "공고 페이지에서 가져오기"(잡코리아·사람인·원티드 공고 주소가 있을 때만) | `components/detail/CompanyInfoSection.tsx` |
| 2 | 웹앱 → 익스텐션 `JOBDIARY_POSTING_READ`(공유 계약 `packages/shared`). 익스텐션이 공고 페이지를 쿠키 없이 읽어 본문 글·본문 이미지 주소·근무지·근무 일정을 돌려준다 | `apps/extension/src/lib/postingReader.ts`, `background/index.ts` |
| 3 | 본문 이미지: 사람인(`*.saraminimage.co.kr`, CORS 허용)은 브라우저가 바로, 잡코리아(`file*.jobkorea.co.kr`, CORS 없음)는 Edge Function `posting-image`가 대신 받음 → 브라우저가 잘라 JPEG | `lib/postingPage.ts`, `supabase/functions/posting-image` |
| 4 | `company-info`에 `postingPage`(글 + 이미지 조각 + 제목·근무지·근무 일정)로 보냄. 근무지·근무 일정은 **AI 값보다 페이지 값을 우선** | `_shared/companyInfo/handler.ts` (`preferPageFacts`) |
| 5 | 익스텐션이 없거나 예전 버전이면 업데이트·캡처 안내, 이미지 받기에 실패하면 글이 100자 이상일 때만 글로 진행 | |

사이트별 구조(2026-11-25 실물 확인): 잡코리아는 공고 페이지 JSON-LD에 정확한 근무지, 본문은 `/Recruit/GI_Read_Comt_Ifrm`(글 또는 이미지). 사람인은 `/zf_user/jobs/relay/view-detail`(글 + 이미지, 근무지는 "근무지 :" 줄). 원티드는 공고 페이지 `__NEXT_DATA__`(`props.pageProps.initialData`)에 칸별 본문·`address.full_location`, 이미지 없음.

- **익스텐션 권한 변경 없음**(기존 `www.jobkorea.co.kr`·`*.saramin.co.kr`·`www.wanted.co.kr`). 출시 패키지 검사로 확인.
- `posting-image`: 로그인 필요, 허용 목록(공유 계약 `isPostingImageUrl`과 같음, 테스트로 비교)·https·리다이렉트 거절·이미지 형식(PNG·JPEG·WebP·GIF)·10MB. 받은 이미지는 저장하지 않는다.
- 지시문 버전 `2026-11-25.4`.
- 검증: 익스텐션 테스트 229개(공고 읽기 8개, 실제 공고 4개로 별도 확인 — 잡코리아 2·사람인 1·원티드 1 모두 정확한 근무지), 웹 테스트 171개(공고 페이지 서버 경로 3·이미지 대신 받기 3·공유 계약 2), 브라우저(가짜 익스텐션: 예전 버전 안내 → 읽기 → 잡코리아 이미지 대신 받기 1번 → `postingPage` 전송), Deno 타입 검사 두 함수 통과.

## 결과 형식 개편 (#235)

실제 공고 캡처로 써 본 사용자 피드백: 이유가 인용을 바꿔 말하는 수준이라 애매하고, 읽은 글 전체·기술 목록까지 정보가 너무 많다.

| 순서 | 보이는 것 | 결과 형식 |
|---|---|---|
| 1 | **이 회사는**: 무엇을 만드는(개발하는) 회사인지 한두 문장 + 대표 서비스(뱃지, 최대 3개) + 대표 사이트 링크 | `company.about`, `products`, `website` |
| 2 | **이 공고가 원하는 강점**: 강점 이름(협동성·자기주도성 등 12개 고정 목록) + 회사가 원하는 것 한 줄 + "이런 경험을 넣으면 좋아요" 1~2개 + 공고 근거(접힘) | `strengths[].strength`, `wants`, `experiences`, `quote` |
| 3 | **근무 조건**: 근무지(네이버 지도 검색 링크 `map.naver.com/p/search/…`) + 근무일 + 근무 시간 | `workplace.location`, `workDays`, `workHours` |

- 뺀 것: 이미지에서 읽은 글 보기(`transcript`는 서버의 인용 검사에만 쓰고 저장은 한다), 기술 필수/우대, 이유·예상 질문.
- 강점 이름을 "협업 → 협동성, 주도성 → 자기주도성"처럼 바꿨다. lean의 강점 상한은 5 → 4개.
- 대표 사이트는 공고(이미지면 읽은 글)에 실제로 적힌 주소만 남긴다(`keepVerifiedWebsite`). 링크는 http(s)만 만든다(`websiteHref`, `javascript:` 등은 링크 없음).
- 공고 다듬기에서 근무지·근무 조건 칸은 더 이상 빼지 않는다(화면에 보여 주므로). 복리후생·지원 방법·전형 절차는 계속 뺀다.
- 예전 형식으로 저장된 결과도 깨지지 않게 `companySummary → about`, `reason → wants`로 옮겨 읽는다.
- 지시문 버전 `2026-11-25.2`. **Edge Function 재배포 필요**.
- 실제 호출 1번(가상 공고 글, Haiku 5.5 lean): 입력 3,711·출력 886토큰, 약 1원, 5.6초, 인용 4/4. 강점 협동성·책임감·사용자 중심·문제 해결력, 추천 경험 예 "웹 페이지가 느려진 원인을 가설로 세우고 측정해 개선한 경험".

## 입력을 공고 페이지에서 가져오기 하나로 (#242)

- 사용자 결정: 공고 페이지에서 가져오기(#238) 결과가 만족스러워, 캡처(이미지 넣기·Ctrl+V·끌어 놓기)와 글 붙여넣기 입력을 화면에서 없앴다. 근무지까지 정확하고 손이 덜 간다.
- 공고 주소가 없거나 잡코리아·사람인·원티드가 아니면 가져오기 버튼 대신 "정보 수정에서 공고 주소를 넣어 주세요"를 안내한다. 결과가 있으면 취소로 돌아갈 수 있다.
- 익스텐션이 없거나 예전 버전일 때, 이미지·공고를 못 읽었을 때의 안내에서 "캡처해 넣어 주세요"를 뺐다(웹앱 `lib/postingPage.ts`, 서버 `page_empty`·`unreadable_image` 문구). 서버 문구는 **company-info 재배포** 후 반영된다.
- 서류 통과부터(사용자 결정: 그 전에는 알 필요가 적다). 지원 단계가 서류 통과·면접 예정·면접 완료·합격일 때만 만들 수 있다. 서버가 `stage_not_ready`(403)로 막고(한도·AI 호출 없음, `COMPANY_INFO_STAGES`), 웹은 `COMPANY_INFO_STATUSES`로 같은 목록을 쓴다. 지원 완료는 "서류 통과로 바꾸면 … 정리해 드려요" 안내만, 탈락·취소는 결과가 없으면 구역을 숨긴다. 이미 만든 결과는 단계와 상관없이 보여 주고 다시 만들기만 숨긴다.
- 서버는 `postingText`·`postingImages` 입력을 그대로 받는다(이미 저장된 결과와 계약 유지). 화면에서만 쓰지 않는다.
- 지원 상세 패널(SidePanel)을 440px에서 640px 이상 480px, 1024px 이상 520px로 넓혔다(좁아 보인다는 의견). 모바일은 아래에서 올라오는 시트 그대로.
- 검증: `scripts/verify-company-info-browser.mjs` PASS 13개(빈 상태에 캡처·글 입력 없음, 서류 통과 전 안내·다시 만들기 숨김, 예전 익스텐션 안내·서버 요청 0건, 공고 페이지 입력 전송·이미지 대신 받기·결과, 한도 초과·취소, 다시 열기, 주소 없음 안내·취소, axe 6상태, 패널 너비 480·520px, 1440·768·390px 가로 넘침 없음). `verify-release-browser.mjs` PASS 14개. 웹 테스트 172개(서버 단계 검사 포함). 실제 AI 호출은 하지 않았다. 서버 단계 검사는 **company-info 재배포** 후 반영된다.

## 비용 절감 전(baseline)과 후(lean)

| | baseline | lean |
|---|---|---|
| 공고 | 전체 | 복리후생·근무지·지원 방법·전형 절차·제출 서류·유의 사항 칸을 뺌 |
| 홈페이지 본문 | 전체 | 2,000자까지 |
| 회사 소개 | 3~5문장, 직원 수·설립 연도 같은 숫자도 다시 씀 | 하는 일 한 문장(60자), 숫자는 화면이 직접 보여 주므로 쓰지 않음 |
| 강점 | 찾을 수 있는 만큼, 인용은 문장 전체 | 최대 5개, 인용 100자 이내 |
| 생각 깊이(effort) | 모델 기본값 | low |

- 공고 다듬기는 줄 내용을 고치지 않고 칸 단위로만 뺀다. 인용이 공고 원문에 그대로 있어야 하기 때문이다.
- 칸 제목은 표시(줄 앞 `■`·`[`·`1.` 등, 줄 끝 `:`)가 있으면 앞부분으로, 없으면 정확히 같을 때만 제목으로 본다. 표시 없이 앞부분만 보면 "위치 기반 서비스 개발" 같은 본문 줄을 "위치" 칸으로 읽어 내용을 지운다(테스트로 막음).
- 프롬프트 캐싱은 쓰지 않는다. 요청이 1~2시간에 1번꼴이라 5분 캐시가 대부분 만료되고, 쓸 때마다 입력의 1.25배를 낸다.

## 실측 방법

1. `apps/web/.env.local`에 `ANTHROPIC_API_KEY`를 넣는다. 스크립트는 값을 출력하지 않는다.
2. `apps/web/.eval/postings/회사이름.txt`에 공고 본문을 넣는다. 회사 자료(`회사이름.facts.json`, 예: `{"직원수": 18, "설립": 2019}`)와 홈페이지 본문(`회사이름.home.txt`)은 있으면 넣는다. `apps/web/.eval/`은 커밋하지 않는다(.gitignore).
3. 미리보기 (돈이 들지 않음): `npm run eval:posting --workspace=jobdiary`
   - 키가 있으면 입력 토큰을 무료 토큰 세기 API로 센다. 출력이 상한(8,000토큰)까지 나온다고 본 최대 비용을 먼저 보여 준다.
4. 실제 호출: `npm run eval:posting --workspace=jobdiary -- --yes --models haiku,sonnet,opus`
   - `--variants baseline,lean`(기본 둘 다), `--repeat N`, `--limit N`
   - Sonnet·Opus 5.5는 안전 분류기가 거절하면 서버에서 다른 모델로 다시 돌리는 `fallbacks`를 켠다. 다른 모델이 응답한 건은 요약표의 "다른 모델 응답"으로 따로 센다. Haiku 5.5에는 이 기능이 없다.
5. 결과: `.eval/results/<시각>.json`(전체 기록), `<시각>-review.md`(강점 연결이 맞는지 "맞다" 칸에 O/X). 요약 표는 결정 기록 001 6절로 옮긴다.

## 의존성

- 웹(측정 스크립트): `@anthropic-ai/sdk` 1.7.0, `zod` 4.6.7(웹앱 의존성 + 루트 overrides). 운영 의존성 취약점이 0건 → 1건이 됐던 경위와 해결은 [SECURITY](SECURITY.md) "Claude SDK 추가와 zod 고정 (#226)".
- Edge Function: `supabase/functions/company-info/deno.json`에서 `npm:@anthropic-ai/sdk@1.7.0`(웹과 같은 버전), `jsr:@supabase/supabase-js@2`.

## 다음 단계

1. 실제 공고로 써 보기(운영) → 결정 기록 002 회고
2. 써 보고 좋으면 3단계: 서류 통과 시 자동 생성 + 알림
3. 익스텐션이 공고 본문·기업정보 칸 저장 → 붙여넣기 없이 자동
4. 회사 정보 출처(공고 기업정보 → 국민연금 → DART), 홈페이지는 스팸·주입 문구를 거른 뒤 사용(비주얼캠프 홈페이지에 시계 스팸이 섞여 있던 사례)
5. 결과 형식이 입력을 약 820토큰 차지 → 강점 목록 중복 줄이기(결정 기록 001 6절)
