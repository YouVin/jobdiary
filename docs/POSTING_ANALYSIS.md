# 회사 정보 (공고 분석 AI): 인재상 → 강점, 기술, 회사 한 줄 소개

지원 상세의 "회사 정보" 구역에 "회사 한 줄 소개 + 공고가 원하는 강점 + 기술 요구"를 정리해 주는 기능의 설계·실측·운영 기록이다.

| 단계 | 내용 | 상태 |
|---|---|---|
| 실측 | 모델·비용 측정 도구 (#226) | 완료. 결정 기록 [001](decisions/001-posting-analysis-model.md): Haiku 5.5 lean |
| 1 | 서버: Supabase Edge Function `company-info`, DB, 하루 5번 한도 (#228) | 이 문서 "서버" |
| 2 | 화면: 상세 패널 "회사 정보" 구역 + 공고 붙여넣기 (#229) | 예정 |
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

1. 2단계(#229): 상세 패널 "회사 정보" 구역 + 공고 붙여넣기 + 개인정보처리방침 문구
2. 써 보고 좋으면 3단계: 서류 통과 시 자동 생성 + 알림
3. 익스텐션이 공고 본문·기업정보 칸 저장 → 붙여넣기 없이 자동
4. 회사 정보 출처(공고 기업정보 → 국민연금 → DART), 홈페이지는 스팸·주입 문구를 거른 뒤 사용(비주얼캠프 홈페이지에 시계 스팸이 섞여 있던 사례)
5. 결과 형식이 입력을 약 820토큰 차지 → 강점 목록 중복 줄이기(결정 기록 001 6절)
