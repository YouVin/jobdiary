# 사용량 지표

쓰레드 홍보 전후로 사용자 수·재방문·유입 경로를 숫자로 보기 위한 지표(#256, [결정 기록 004](decisions/004-usage-metrics.md)).

## 어디서 보나

| 보고 싶은 것 | 보는 곳 | 근거 데이터 |
|---|---|---|
| 가입자, 지원 1건 이상 넣은 사람, 지원 수(익스텐션 가져오기 포함), 회사 정보 생성 수 | Supabase SQL Editor에서 [`supabase/checks/usage_metrics.sql`](../supabase/checks/usage_metrics.sql) 1번 | `auth.users`, `applications`, `application_analyses`, `ai_usage` |
| 오늘·7일·30일 활성 사용자 | 같은 파일 1번 | `user_activity` |
| 최근 30일 날짜별 가입·활성·지원 추가·회사 정보 | 같은 파일 2번 | 위와 같음 |
| 가입 주별 1주 재방문율 | 같은 파일 3번 | `auth.users` + `user_activity` |
| 가입 경로별 가입·지원 1건 이상·1주 안에 다시 옴 (쓰레드 등) | 같은 파일 4번 | `user_acquisition` (#290) |
| 페이지 조회, 방문자 수, 이전 사이트(Referrers), 기기·국가 | Vercel 대시보드 → 프로젝트 → Analytics | Vercel Web Analytics |

Vercel Hobby는 utm 값을 보여 주지 않는다(UTM 패널은 Web Analytics Plus·Enterprise만, 페이지 목록은 쿼리를 뺀다). 그래서 홍보 링크로 몇 명이 **가입**했는지는 `user_acquisition`으로 직접 센다.

집계 SQL은 읽기만 하며 사용자 ID·이메일을 출력하지 않는다. 밖에 공유할 때는 숫자만 옮긴다.

## 지표 정의

- **활성 사용자**: 그날 로그인하고 약관 동의까지 마친 화면(홈·지원 보드·계정)을 연 사람. 하루에 몇 번 와도 1명이다.
- **1주 재방문율**: 가입한 날 다음 1~7일 안에 한 번이라도 활성인 사람 ÷ 그 주 가입자. 2026-11-25(방문 기록 시작) 이후 가입자만 센다.
- **방문자 수(Vercel)**: 로그인하지 않은 소개·로그인 화면 방문까지 포함한다. 쿠키 없이 하루 단위로 세므로 DB 활성 사용자와 숫자가 다르다.

## 무엇을 남기나

| | 남기는 것 | 남기지 않는 것 |
|---|---|---|
| `user_activity` (Supabase) | 계정 ID, 한국 날짜 — 하루 한 줄 | 본 화면, 횟수, 시각, 지원 내용 |
| `user_acquisition` (Supabase, #290) | 계정 ID, utm_source·medium·campaign, 이전 사이트 도메인(소개 페이지로 들어왔을 때만), 처음 본 경로 — 계정당 한 줄 | 쿼리 전체, 이전 사이트의 경로, 가입 전 방문 기록 |
| Vercel Web Analytics | 경로(쿼리·해시 제거), 이전 사이트 주소, 기기·브라우저·국가 | 쿠키, 계정 ID, 이메일, `?code=`·`?import=1` 같은 쿼리 |

- 기록은 서버 함수 `record_daily_activity()`가 한다. 사용자와 날짜를 함수가 정해서 브라우저가 남의 기록이나 다른 날짜를 넣을 수 없다. 브라우저는 표를 직접 읽거나 쓰지 못한다.
- 웹앱은 이 브라우저에서 오늘 이미 기록했으면 요청하지 않는다(`localStorage`의 `jobdiary:activityDate:<계정>`). 탭을 다시 볼 때도 확인해 며칠 열어 둔 탭도 날짜가 바뀌면 기록된다.
- 기록에 실패해도 화면에는 영향이 없고, 다음 방문 때 다시 시도한다.
- 탈퇴하면 `user_activity`도 계정과 함께 지워진다(`on delete cascade`).
- 가입 경로는 처음 들어올 때 브라우저(`localStorage`의 `jobdiary:acquisition`, 첫 출처만·30일)에 기억했다가, 로그인·동의를 마치면 `record_acquisition()`으로 한 번 보내고 지운다. 서버는 가입한 지 하루가 안 된 계정만 받아, 기존 사용자가 홍보 링크를 눌러도 세지 않는다.
- 가입 확인 메일을 다른 브라우저(메일 앱 등)에서 열어 가입을 마치면 기억한 출처가 없어 "경로 없음"으로 잡힌다. 그래서 4번 숫자는 최소값이다.
- 개인정보처리방침 1·2·3절에 반영했다(2026-11-25 수정, 가입 경로는 2026-11-26).

## 홍보 링크 만들기

링크 끝에 출처를 붙인다. 값은 영문 소문자·숫자·`_`·`-`만 쓴다(그 밖의 글자는 지워진다).

```
https://jobdiary.vercel.app/intro?utm_source=threads&utm_medium=social&utm_campaign=launch_2026_11
```

| 어디에 올리나 | utm_source | utm_medium | utm_campaign |
|---|---|---|---|
| 쓰레드 첫 홍보 글 | `threads` | `social` | `launch_2026_11` |
| 쓰레드 프로필 링크 | `threads` | `profile` | `always` |
| 카카오톡 오픈채팅·지인 | `kakao` | `chat` | `launch_2026_11` |

- 같은 사람이 여러 링크로 들어오면 **처음 들어온 링크**로 센다.
- 게시 전에 링크를 한 번 열어 소개 페이지가 뜨는지, 미리보기 카드가 나오는지 본다.

## 처음 켤 때 (운영)

1. 표와 함수는 main 병합 때 Supabase 자동 반영(#258)으로 만들어진다. 반영 전에 화면이 먼저 배포돼도 요청만 실패하고 화면은 그대로다.
2. Vercel 대시보드 → 프로젝트 → Analytics → Enable. 켜기 전에는 스크립트가 수집하지 않는다.
3. 배포 후 다음 날 `usage_metrics.sql`을 돌려 `오늘 활성`이 1 이상인지 확인한다.

## 검증

- `apps/web/tests/usageMetrics.test.mjs`: 하루 한 번만 요청, 동시 요청 1번, 실패 시 다시 시도, 주소에서 쿼리 제거, DB 권한(브라우저 표 접근 없음·함수가 본인과 한국 날짜 결정), 집계 SQL 읽기 전용.
- `apps/web/scripts/verify-release-browser.mjs`: 동의 전 기록 0번, 동의 뒤 1번, 같은 날 새로고침해도 1번.
