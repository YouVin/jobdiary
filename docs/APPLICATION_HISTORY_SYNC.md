# 웹앱 지원 이력과 익스텐션 비교 캐시 동기화

구현·검증일: 2026-11-04. 단계별 계획의 5단계.
추적: [#115](https://github.com/YouVin/jobdiary/issues/115).
실제 채용 페이지의 배지·버튼 표시는 6단계다.

## 문제와 결정

익스텐션의 수집 슬롯은 같은 사이트를 다시 수집하면 교체된다.
따라서 오래된 지원도 남아 있는 웹앱 DB를 지원 사실의 기준으로 삼고,
후속 자동 표시에 필요한 최소 정보만 별도 비교 캐시로 보낸다.

조사에서 웹앱 수신부가 익스텐션 응답의 `url`을 버리는 문제를 확인했다.
DB API에는 이미 URL 삽입·조회 경로가 있었지만 수신 시 빠지므로 공고 식별에 쓸 수 없었다.
또한 `externalId`는 지원 ID이므로 공고 ID로 재사용할 수 없다.

이번에 선택한 경계는 다음과 같다.

- 수집 슬롯은 수집·복사·가져오기용 스냅샷으로 유지한다.
- 웹앱에서 완전히 조회한 목록과 DB에 반영된 변경으로 비교 캐시를 갱신한다.
- 공고 식별은 같은 사이트의 검증된 공고 URL에서 얻는다. 회사명·공고명 유사성으로 추정하지 않는다.
- 마감일·지원일의 오래됨만으로 이력을 제외하지 않는다. 불합격도 지원 사실에 포함한다.
- 비교 캐시에 상태·메모·일기 전체를 복사하지 않는다.
- 계정 전환·로그아웃은 수집 데이터와 별개로 비교 캐시만 정리한다.

## 공통 패키지

`packages/shared`에 `@jobdiary/shared`를 추가했다.
브라우저·React·Supabase 의존성이 없는 TypeScript 소스 패키지다.

| 공통 항목 | 역할 |
| --- | --- |
| JobPlatform / ApplicationStatus | 양쪽의 사이트·상태 타입 |
| COLLECT_MESSAGE_TYPE | 기존 외부 가져오기 메시지 이름. 값은 유지 |
| getPostingReference | 허용 사이트·경로에서 공고 ID와 정규화 URL 추출 |
| buildHistoryEntries | 웹앱 목록을 최소 비교 정보로 변환 |
| HistoryRequest / HistoryResponse / HistoryCache | 새 동기화 계약 |
| parseHistoryRequest / parseHistoryCache | 버전·필드·배열 크기·중복 키 검증 |

웹앱과 익스텐션 Application 타입 전체를 합치지는 않았다. 웹앱 전용 일기·상태 출처와
익스텐션 전용 열람 정보·정확한 수집 시각의 책임은 다르다.
npm workspace 연결만 추가했으며 제3자 패키지 버전은 변경하지 않았다.
Next.js는 `transpilePackages`로 공유 소스를 컴파일하고 기존 tracing/root 설정을 유지한다.
새 잠금 파일이나 별도 공통 패키지 빌드 단계는 추가하지 않았다.

## 공고 식별과 URL 보존

| 사이트 | 허용하는 공고 URL | 식별자 |
| --- | --- | --- |
| 잡코리아 | HTTPS의 (www.)jobkorea.co.kr /Recruit/GI_Read/{숫자} | 경로의 공고 ID |
| 사람인 | HTTPS의 (www.)saramin.co.kr /zf_user/jobs/relay/view, m.saramin.co.kr /job-search/view 등 코드에 명시한 경로 | 단일 rec_idx |
| 원티드 | HTTPS의 (www.)wanted.co.kr /wd/{숫자} | 경로의 공고 ID |

HTTP·다른 호스트·인증 정보가 있는 URL·다른 포트·임의 경로·중복 rec_idx는 비교하지 않는다.
정규화할 때 추적 쿼리와 fragment는 제거한다. 사람인은 rec_idx만 보존한다.
이 URL 규칙이 해당 사이트 모든 화면의 지원을 뜻하지는 않는다.

웹앱 수신부는 플랫폼이 일치하는 공고 URL만 허용 필드로 남긴다.
잘못된 선택적 URL은 버리되 필수 정보가 유효한 기존 가져오기는 유지한다.
신규 삽입과 같은 배치 안의 신규 항목 병합에서 URL을 보존하며 기존 DB의 URL 컬럼을 사용한다.
새 테이블·마이그레이션·권한 변경은 필요하지 않았다.

## 과거 기록의 빈 주소 보완

종전 수신부가 URL을 버렸으므로 신규 저장만 고치면 과거 지원은 계속 미식별로 남는다.
다만 기존 카드의 상태·메모를 재수집 값으로 덮어쓰는 정책은 유지하지 않기로 했다.

예외를 주소 보완에만 한정했다.

1. 현재 사용자의 DB 목록을 먼저 조회한다.
2. 같은 플랫폼·같은 지원 externalId가 있는 수집 결과에서 안전한 공고 URL을 찾는다.
3. 기존 URL이 비어 있고 후보 URL이 하나일 때만 보완한다.
4. API에는 `{ url }`만 넘기고 `id + user_id + 기존 updated_at`으로 갱신 대상을 제한한다.
5. API가 채우는 updated_at 외에 상태·지원일·마감일·메모·일기 등은 UPDATE에 넣지 않는다.
6. 수정 충돌이 나면 가져오기를 중단하고 오류를 알린다. 이미 성공한 주소 보완은 유지한다.
7. 지원 ID가 없거나 후보 URL이 충돌하면 보완하지 않는다. 기존 URL이 있으면 교체하지 않는다.

이것은 기존 지원 상태를 자동 갱신하는 기능이 아니다.
기존 `지원완료`를 원티드의 새 `불합격`으로 바꾸지 않으며,
기존 카드의 마감일도 재수집으로 보충하지 않는다.
주소 보완이 끝나면 신규 항목만 기존 정책에 따라 삽입하고 기존 항목은 건너뛴다.

보완은 일치하는 빈 주소마다 기존 수정 API를 한 번 호출한다.
처음 큰 이력을 다시 가져오면 이 비용이 발생하며, 다음 수집부터 이미 있는 주소에는 호출하지 않는다.
상태 보존과 수정 충돌 보호를 위해 전체 행 upsert나 새 DB 함수를 도입하지 않았다.

## 보내는 정보

```typescript
{
  type: 'JOBDIARY_HISTORY_SYNC',
  version: 1,
  snapshot: {
    ownerKey: '<사용자 UUID의 SHA-256, 64자리>',
    entries: [
      { platform: 'jobkorea', postingId: '101', state: 'applied' },
      { platform: 'saramin', postingId: '202', state: 'canceled' }
    ],
    unidentifiedCount: 3
  }
}
```

`state: applied`는 현재 채용 진행 단계가 아니라 지원 사실을 뜻한다.
서류·면접·최종합격·불합격은 이 분류에 포함한다.
같은 공고에 취소 외 이력이 하나라도 있으면 applied를 남기고, 취소만 있으면 canceled로 남긴다.
회사명·공고명·지원일·마감일·이메일·원본 UUID·토큰·메모·일기는 전송하지 않는다.

ownerKey는 캐시 계정을 구분하기 위한 해시이며 로그인·인증 권한을 부여하지 않는다.
개인과 무관한 익명 데이터라고 설명하지 않는다.
익스텐션이 웹앱 DB나 인증 세션에 직접 접근하는 경로는 추가하지 않았다.

## 메시지와 저장 경계

- 기존 `JOBDIARY_COLLECT` 요청/응답 봉투는 유지한다.
- 새 요청은 `JOBDIARY_HISTORY_SYNC`와 `JOBDIARY_HISTORY_CLEAR`, 프로토콜 버전 1이다.
- 기존 manifest의 externally_connectable과 service worker origin 허용 목록을 사용한다.
- 이력 쓰기는 허용된 웹앱 origin의 최상위 프레임만 받는다.
- 한 snapshot은 최대 20,000개 공고로 제한한다. 초과 시 임의 잘림 없이 동기화 오류로 남긴다.
- 저장할 때 허용된 필드만 추출한다. 중복 공고 키·무효 ID·알 수 없는 상태/버전은 거부한다.
- 저장 시각은 웹앱 입력이 아닌 익스텐션이 성공 처리하는 시각으로 기록한다.

비교 캐시 키는 `jobdiary:application-history:v1:{웹앱 origin}`이다.
기존 `jobdiary:collected`와 별개이며 localhost와 운영 origin도 키를 분리한다.
개발 확장은 localhost, 운영 확장은 운영 origin을 기본 읽기 대상으로 삼는다.

캐시는 `{ version, ownerKey, entries, unidentifiedCount, syncedAt }`을 저장한다.
service worker 메모리의 생존을 가정하지 않으며 재시작 후 storage에서 검증해 읽는다.
저장/삭제 요청을 직렬화해 먼저 처리 중인 snapshot이 뒤의 clear를 되돌리지 않게 한다.
storage 실패는 실패 응답으로 끝나고 기존 수집 슬롯을 변경하지 않는다.

## 웹앱에서 갱신하는 시점

AuthProvider에 동기화 구독을 연결했다.

| 상황 | 처리 |
| --- | --- |
| 인증 초기 복원 중 | 세션 확정 전 snapshot을 보내지 않음 |
| 계정 전환·로그아웃·복구 세션 | 새 세션 세대로 이전 비교 캐시 정리 |
| 같은 계정의 토큰 갱신 | 기존 이력과 세대 유지 |
| 로그인 후 전체 조회 성공 | historyReady를 켜고 전체 snapshot 전송 |
| 조회 실패 | 실패 결과를 빈 지원 목록으로 보내지 않음 |
| 지원 추가·수정·삭제 성공 | 서버 반영 후 전체 snapshot 교체 |
| 가져오기 성공/기존 항목만 존재 | DB 조회·주소 보완·신규 저장 결과로 갱신 |
| 포커스 복귀·탭 표시 | 현재 확보된 목록 재전송 시도 |
| 웹앱 구독 종료·탭 닫기 | 구독과 타이머만 정리하고 캐시는 유지 |

단순한 초기 빈 Zustand 배열과 조회 성공 후 실제 빈 목록을 구분하기 위해
`historyReady`를 추가했다. 조회 전의 빈 배열을 새 이력으로 보내지 않는다.
로그아웃 시에는 ready도 초기화한다.

일반 변경은 150ms로 모아 전송하고, 인증 세대가 달라지면 지연 없이 정리를 예약한다.
같은 탭의 작업과 Chrome Web Locks의 동일 origin 탭 간 작업을 직렬화한다.
계정 세대와 요청 revision을 보내기 전·해시 계산 후·응답 후 확인해 늦은 작업을 버린다.
Supabase 인증 이벤트 콜백 안에서 비동기 Auth API를 기다리지 않고 별도 작업으로 처리한다.

설치되지 않았거나 구버전이 새 메시지를 처리하지 못해도 웹앱 조회·가져오기 저장은 유지한다.
응답 대기는 5초로 제한하고 실패 시 1초·5초·30초 간격으로 최대 3번 다시 시도한다.
이후 변경이나 포커스 복귀 전까지 주기적으로 요청하지 않는다.
마지막 성공 시각·현재 상태·실패 원인은 getApplicationHistorySyncStatus로 확인할 수 있다.
캐시 현황·자동 표시 설정 UI는 6단계에서 사용자 동작과 함께 구성한다.

## 검증

| 검증 | 결과 |
| --- | --- |
| npm run test:web | 94개 통과 |
| npm run test:extension | 172개 통과 |
| npm run lint | ESLint·UI 규칙 통과 |
| npm run build:web | Next.js 타입 검사·운영 빌드 통과 |
| npm run build --workspace=jobdiary-extension -- --outDir ../../release/history-validation/extension-production | 타입 검사·운영 Vite 빌드 통과 |
| 실제 로컬 웹앱 + 실제 Chromium MV3 | 아래 8개 시나리오 통과 |

브라우저 검증은 실제 Next.js 클라이언트·인증 상태·Zustand·가져오기/로그아웃 UI·Chrome
메시지·service worker·storage를 사용한다. Auth/DB HTTP만 고정 표본으로 대체한다.
실제 사용자 계정이나 운영 DB에 쓰지 않았다.

1. 로그인 복원→DB 조회→익스텐션 캐시, 마감된 이력 포함과 미식별 구분.
2. 가져오기 UI→빈 URL만 보완·신규 삽입→캐시 갱신.
3. 새로고침·반복 가져오기 후 날짜/주소 보존과 중복 없음.
4. 수집 슬롯 초기화 후 비교 캐시 유지.
5. 로그아웃 UI 이후 비교 캐시 삭제.
6. 다른 계정 복원 후 이전 지원 제외와 취소 구분.
7. 잘못된 버전의 외부 메시지 거부와 기존 캐시 보존.
8. 페이지 오류·예상 밖 외부 요청 없음.

단위/통합 테스트는 허용 URL·플랫폼 불일치·중복 키·크기 제한·원본 필드 제거·origin/프레임 거부,
worker 모듈 재생성 후 읽기, storage 오류, 조회 실패, 늦은 계정 응답, 주소 보완 충돌도 검증한다.

브라우저 검증 작성 중 새로고침 직후 남아 있던 캐시를 새 조회 결과로 잘못 간주하는
검증 문제가 있었다. 새 syncedAt까지 기다리는 조건으로 고쳐 새 수신 완료를 확인했다.
이것을 앱의 지원 데이터 손실로 기록하지 않는다.

로컬 결과는 `release/history-validation/`의 로그·browser-report.json에 보존하며 Git에는 넣지 않는다.
브라우저 스크립트는 `apps/web/scripts/verify-history-browser.mjs`다.
development 정적 확장을 별도 출력 폴더에 빌드하고 기존 선택적 Playwright 도구와 Chromium을 사용한다.
상세 도구 환경 변수는 [기존 브라우저 검증 문서](DEADLINE_VALIDATION.md)의 방식을 따른다.

```powershell
Set-Location C:\jobdiary
npm.cmd exec --workspace=jobdiary-extension -- vite build --mode development --outDir ../../release/history-validation/extension-development
node apps/web/scripts/verify-history-browser.mjs
```

웹앱 개발 서버가 localhost:3000에 실행 중이어야 한다.
운영 빌드 검증도 별도 출력 경로를 사용해 사용자가 로드한 개발 dist를 덮어쓰지 않았다.
빌드 플러그인이 별도로 만드는 동일 버전 ZIP은 이번 검증의 스토어 제출 대상이 아니다.

## 성능 비용과 제한

목록 변환은 지원 n건을 순회하고 식별된 공고 k개를 정렬한다.
비교 캐시는 공고별로 중복을 줄인 전체 snapshot이며 성공 시 한 번 저장한다.
이번 단계에서는 채용 페이지의 DOM 감시·상시 수집·공고별 네트워크 조회를 추가하지 않았다.
실제 긴 목록·다중 탭의 CPU/메모리 수치는 아직 측정하지 않았으며 6단계 검증 대상이다.

다음 제한을 유지한다.

- 원티드 수집 행은 아직 URL/공고 ID가 없어 일반 수집 기록을 정확히 식별할 수 없다.
- URL과 지원 ID가 모두 없는 과거 기록을 회사명으로 연결하지 않는다.
- 수동 기록도 사이트 플랫폼과 검증 가능한 공고 URL이 있어야 비교에 포함한다.
- unidentifiedCount와 캐시가 없다는 사실은 미지원 사실의 증거가 아니다. 확정 일치 표시만 후속 구현한다.
- 웹앱을 닫은 동안 다른 기기의 수정·원격 로그아웃을 즉시 알 수 없다.
- 포커스 재전송은 현재 웹앱 목록 기준이며 서버 재조회까지 보장하지 않는다.
- 기존 fetchApplications/Data API의 반환 범위가 기준이다. 대량 계정의 서버 행 제한·페이지네이션은 검증하지 않았다.
- Web Locks가 없는 환경은 같은 탭 안에서만 직렬화한다. 대상 Chrome에서는 Web Locks를 사용한다.
- 개인 계정으로 사이트 수집→웹앱 가져오기→동기화까지 확인한 결과는 아직 아니다.
- 운영 main 배포·Chrome 스토어 제출·정책 게시/시행일 검토는 별도 출시 단계다.

## 다음 단계와 기록

6단계에서는 이 캐시를 읽어 잡코리아 공고부터 정확한 ID 일치 배지를 붙인다.
허용 화면·중복 삽입 방지·변경 영역 감시·탭 비활성 처리·자동 표시 설정과 성능을 함께 검증한다.
현재 캐시를 만들었다고 3개 사이트 모든 페이지 지원이 완료됐다고 설명하지 않는다.

모노레포를 실제로 활용한 첫 공통 계약 변경으로, 양쪽 코드와 검증을 한 PR에서
검토할 수 있게 됐다. 개발 시간이나 메모리 감소율은 측정하지 않았으므로 성과 수치로 쓰지 않는다.
변경 이유·예외·테스트 증거는 이 문서와 #115/PR에 계속 이어 기록한다.
