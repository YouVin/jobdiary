# 웹앱 연동 (Integration)

> 보내는 쪽 구현과 메시지 계약을 설명한다. 받는 쪽의 최종 기준은
> [웹앱 docs/INTEGRATION.md](https://github.com/YouVin/jobdiary/blob/dev/docs/INTEGRATION.md)다.
> 과거에 검토한 postMessage/CustomEvent 방식은 현재 사용하지 않는다.

## 데이터 흐름

1. 팝업이 현재 지원현황 탭의 content script에 `COLLECT`를 보낸다.
2. 사이트 파서가 `ScrapedApplication[]`을 만든다.
3. 사람인은 PC 수집 후 background에 모바일 지원현황 한 페이지를 요청해 두 ID가
   일치하는 명시 마감일을 보충한다. 조회 실패 시 PC 결과를 유지한다.
   잡코리아는 수집된 지원의 공개 공고 상세에서 메타 날짜와 구조화 날짜가 일치하는 경우만 보충한다.
4. `registerCollectHandler`가 `convertToApplication`으로 변환한 뒤
   `chrome.storage.local`의 사이트별 슬롯에 직접 저장한다.
5. 팝업은 저장된 건수와 선택적 마감일 조회 결과를 표시하고 전체 복사 또는 웹앱 열기를 제공한다.
6. 웹앱이 `JOBDIARY_COLLECT`를 보내면 service worker가 저장된 결과로 응답한다.
   이 요청은 사이트를 새로 수집하지 않는다.
7. 웹앱이 응답을 검증하고 자기 로그인 세션으로 중복 판별·저장을 수행한다.

변환은 익스텐션의 어댑터에서 한 번만 수행한다. 팝업이 닫혀도 content script의
수집·저장은 계속될 수 있다. 익스텐션이 웹앱 함수나 DB를 직접 호출하지 않는다.

## 전달 형식

타입의 기준은 `src/types/application.ts`, 메시지 형식은 `src/lib/messages.ts`다.

- 필수: `company`, `position`, `platform`, `status`, `appliedAt`
- 선택: `externalId`, `viewed`, `appliedAtExact`, `url`, `deadlineAt`
- `id`, `updatedAt`, 상태 변경 출처 `statusSource`는 웹앱이 관리한다.
- `viewed`와 `appliedAtExact`는 익스텐션에서 보관·응답하지만 현재 웹앱
  수신 계약에서는 저장하지 않는다. 마감일 자동 분류에 열람 여부를 사용하지 않는다.

```typescript
// 웹앱 → service worker
{ type: 'JOBDIARY_COLLECT' }

// service worker → 웹앱
{ ok: true, applications: Array<Omit<Application, 'id' | 'updatedAt'>> }
// 실패
{ ok: false, error: string }
```

실제 응답은 배열 자체가 아니라 `{ ok, applications?, error? }` 객체다.
기존 클라이언트와 메시지 이름·외부 응답 구조는 유지한다.

## 날짜 변환

| 필드 | 원본 예시 | 전달 값 |
| --- | --- | --- |
| 지원일 `appliedAt` | `2026.06.09 20:27` | `2026-06-09T00:00:00.000Z` |
| 정확한 지원 시각 `appliedAtExact` | `2026.06.09 20:27` | `2026-06-09T11:27:00.000Z` |
| 선택적 마감일 `deadlineAt` | `2026.10.28(수) 23:59` | `2026-10-28` |

지원일은 날짜만 남겨 자정 UTC ISO로 표현한다. 정확한 시각은 KST로 해석해 실제
UTC 시각으로 변환한다. 마감일은 시간대 변환 없이 날짜 문자열만 전달한다.

### 마감일 수집 상태 — #63 / 상위 #60

`ScrapedApplication.deadlineAt`은 파서가 마감일 요소에서 분리한 원문,
`Application.deadlineAt`은 `normalizeDeadline`이 검증한 `YYYY-MM-DD`다.
사람인은 모바일 `/apply/state`의 제목 끝 `(~YYYY-MM-DD)`를 읽어 PC 행에 보충한다.
지원 ID와 공고 ID가 모두 일치해야 하며, 첫 응답의 확인 가능한 항목만 처리한다.
내부 메시지 `SARAMIN_MOBILE_DEADLINES`는 고정 URL 조회용이며 외부 웹앱에 공개하지 않는다.
모바일 조회 실패는 기존 PC 수집을 실패 처리하지 않고 선택적 마감일만 생략한다.
팝업 수집 응답의 선택적 `deadlines`(matchedCount/lookupFailed)는 표시용이며
웹앱으로 보내는 외부 응답에는 포함하지 않는다.
잡코리아는 실물 DOM에서 확인한 `.apply-progress .extra` 원문을 읽는다.
원문 `(~10/31)`로 연도를 추정하지 않고 해당 공고 ID의 공개 상세를 조회한다.
메타 description의 명시된 날짜와 JobPosting.validThrough 날짜, 두 공고 식별자가
모두 일치할 때만 보충한다. 상시는 구조화 날짜가 있더라도 생략한다. 요청은 쿠키 없이
최대 10개 공고·동시 2건·각 4초이며 실패 시 지원내역을 유지한다.
원티드는 마감일 요소가 없어 채우지 않는다. 실제 PC Chrome 로그인으로 모바일
HTML을 받을 수 있는지는 수동 확인이 필요하다. 상세 기준은 [DEADLINES.md](./DEADLINES.md) 참조.

- 연·월·일이 명시되고 달력상 유효한 날짜만 허용한다.
- 숫자 날짜(`YYYY-MM-DD`, 점/슬래시 구분), 한국어 연월일, 선택적 요일 및
  유효한 `HH:mm`을 검증한다. 시간은 최종 값에서 제외한다.
- 상시채용, 채용 시 마감, D-day, 연도 없는 날짜, 기간 전체, 무효 날짜는
  필드 자체를 생략한다. 빈 문자열이나 임의의 오늘 날짜로 대체하지 않는다.
- 지원일·취소일·열람일로 마감일을 추정하지 않는다.
- 익스텐션은 마감일을 근거로 `status`를 바꾸지 않는다.
- 웹앱은 한국 날짜 기준 마감 다음 날의 지원완료 중 사용자 수동 상태 변경 이력이
  없는 건만 자동 분류한다. 이는 기업의 공식 불합격 통보가 아니다.
- 기존 저장 형식에 선택 필드를 추가하므로 슬롯 키 변경이나 데이터 초기화가 필요 없다.
  마감일 없는 이전 데이터는 기존 방식으로 읽고 응답한다.

## 상태 매핑

`src/lib/statusMapping.ts`의 부분 일치 판정 순서를 따른다. 구체적인 상태가 먼저다.

| 순서 | 원문 포함 조건 | 결과 |
| --- | --- | --- |
| 1 | 취소 | canceled |
| 2 | 불합격 / 탈락 | rejected |
| 3 | 최종합격 | offer |
| 4 | 서류합격 / 서류통과 | screening |
| 5 | 면접완료 | interviewed |
| 6 | 면접 | interview |
| 7 | 그 외 | applied |

## 저장·재수집·복사

- 저장 키 `jobdiary:collected` 아래 `{ saramin, jobkorea, wanted }` 슬롯을 둔다.
- 같은 사이트 재수집 시 해당 슬롯을 교체한다. 복사 후에도 데이터는 유지한다.
- 전체 복사는 기존 여섯 열(회사·포지션·상태·지원일·플랫폼·열람)의 TSV/HTML 표다.
  이번 계약 준비에서는 마감일 열을 추가하지 않는다.
- 웹앱의 기존 지원은 재수집해도 업데이트하지 않는 수신 계약을 따른다.
  향후 익스텐션이 마감일을 수집하더라도 새로 가져오는 지원부터 제공되며,
  이미 웹앱에 저장된 지원의 마감일을 자동 보충하지 않는다.
- 실질적인 중복 판별·수동 상태 보존은 웹앱 `addApplicationsFromExtension`의 책임이다.
  웹앱은 플랫폼+외부 ID를 우선하고, 없으면 정규화한 플랫폼+회사명+공고명을 사용한다.
  익스텐션에 별도의 웹앱 중복 판별을 추가하지 않는다.

## 전달 보안과 실행 컨텍스트

- `externally_connectable.matches`로 웹앱의 요청 origin을 제한한다.
- service worker는 `sender.origin` 허용 목록과 `JOBDIARY_COLLECT` 타입을 재검증한다.
- 프로덕션 manifest는 `https://jobdiary.vercel.app/*`만 허용한다.
  개발 빌드에서만 localhost를 추가한다. 구체적인 값은 `manifest.config.ts`를 따른다.
- 웹앱은 고정된 익스텐션 ID로 요청하고 응답 스키마를 검증한다.
  자신의 로그인 세션으로 저장하며, 익스텐션은 인증 정보·토큰을 받지 않는다.
- 웹앱 페이지에 content script를 주입하거나 inline script를 실행하지 않는다.
  postMessage/CustomEvent를 통한 전달도 사용하지 않는다.
- service worker의 실행 상태는 영구적이지 않으므로 응답 시 저장소에서 읽는다.

## 웹앱 지원 이력 비교 캐시 (5단계)

공통 계약은 `packages/shared`의 `@jobdiary/shared`를 사용한다. 기존 수집 데이터 pull과 별도로
웹앱은 HISTORY_SYNC/CLEAR 요청으로 최소 비교 정보를 보낸다. 이 캐시는 수집 슬롯과
다른 키에 저장하며 사이트별 재수집과 팝업 초기화로 지우지 않는다. 로그아웃·계정 변경은
웹앱이 해당 origin의 캐시를 정리한다. 인증 토큰·메모·일기는 받지 않는다.
웹앱은 신규 공고 URL을 보존하고 같은 지원 ID의 빈 URL만 조건부로 보완한다.
기존 상태·마감일·메모·일기를 재수집으로 바꾸지 않는다.
세부 계약·검증·제한은 [통합 기록](../../../docs/APPLICATION_HISTORY_SYNC.md)을 따른다.
