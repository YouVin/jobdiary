# 익스텐션 연동 설계 (INTEGRATION)

> 익스텐션(`jobdiary-extension`)이 수집한 데이터를 이 웹앱으로 연동하는 설계 문서. "받는 쪽 계약"의 단일 진실 공급원.

---

## 1. 개요

- 익스텐션이 사람인/잡코리아/원티드에서 수집한 `ScrapedApplication`을, 이 웹앱의 `Application` 형식으로 변환해 저장한다.
- 변환(어댑터)은 익스텐션 쪽에 둔다. 웹앱은 완성된 `Application` 형식만 받는다.
- 이 문서는 "웹앱이 받는 `Application`의 최종 형식과 규칙"을 정의한다. 익스텐션은 이 문서를 참조해 변환한다.

---

## 2. 저장 형식 (Application)

- 웹앱은 `src/types/application.ts`의 `Application` 타입으로 저장한다.
- 익스텐션이 채워 보내는 필드: `company`, `position`, `platform`, `status`, `appliedAt`, `externalId`
- 웹앱이 자동 생성하는 필드: `id`(`crypto.randomUUID`), `updatedAt`(현재시각 ISO) — `addApplication` 액션이 처리
- 즉 익스텐션은 `Omit<Application, 'id' | 'updatedAt'>` 형태로 전달하면 된다.

---

## 3. status 매핑 (한글 원본 → 웹앱 status)

익스텐션이 사이트에서 긁는 한글 상태를 웹앱 영어 status로 변환한다. 변환은 익스텐션 어댑터가 수행:

| 사이트 | 원본(한글) | 웹앱 status |
| --- | --- | --- |
| 사람인 | 지원완료 | applied |
| 사람인 | 지원취소완료 | canceled |
| 잡코리아 | 지원완료 | applied |
| 잡코리아 | 지원취소 | canceled |
| 원티드 | 접수 | applied |
| 원티드 | 불합격 | rejected |

- 매핑 규칙: 텍스트에 "취소"가 포함되면 `canceled`로 처리 (사람인 "지원취소완료", 잡코리아 "지원취소" 등 표기 차이 흡수)
- `screening`/`interview`/`interviewed`/`offer`는 사이트가 제공하지 않음. 사용자가 웹앱에서 칸반으로 직접 관리한다. 익스텐션이 넣는 건 주로 `applied`, 일부 `rejected`/`canceled`.

---

## 4. 날짜 변환 (appliedAt)

익스텐션 수집 원본은 사이트별로 형식이 다르다.

- 사람인/잡코리아: `"2026.06.09 20:27"` (시분 포함)
- 원티드: `"2026. 7. 11"` (날짜만)
- 잡코리아 원천 `data-applydate`는 14자리 숫자 문자열 `"20260601235538"`

웹앱 저장 시에는 시각을 버리고 **날짜만** 사용한다.

- 이유: 취업 지원 관리에서 지원 "일자"가 핵심이고 시·분은 의미가 낮다. 시각을 버리면 timezone(KST/UTC) 해석 차이로 날짜가 어긋나는 문제를 원천 제거할 수 있다.
- 저장 형식: 자정 기준 ISO 문자열로 통일한다 (예: `"2026-06-09T00:00:00.000Z"`). 기존 웹앱 데이터도 자정 기준 ISO를 사용하므로 호환된다.
- 변환 책임: 익스텐션 어댑터가 각 사이트 원본에서 연·월·일만 추출해 위 형식으로 만들어 전달한다. 시·분·초는 버린다.
- 3사이트 모두 이 규칙으로 통일되므로 timezone 및 `Z` 처리로 인한 시각 오차가 발생하지 않는다.

---

## 5. 재수집과 수동 상태 보존

두 진입점(웹앱의 가져오기 버튼, 익스텐션의 취준일기 열기)은 같은 저장 로직을 사용한다.

1. 가져오기 직전에 현재 사용자의 DB 내역을 조회한다. 조회가 실패하면 저장하지 않는다. 화면의 초기 빈 스토어를 기준으로 신규 여부를 판단하지 않는다.
2. 같은 `platform + externalId`를 먼저 찾는다. 회사명이나 공고명이 달라져도 같은 지원 ID이면 기존 행을 갱신한다.
3. ID로 찾을 수 없으면 `platform + company + position`으로 찾는다. 회사명/공고명은 유니코드, 연속 공백, 줄바꿈을 정규화한다. 지원→취소에서 ID가 바뀌거나 원티드처럼 ID가 없는 경우를 처리한다.
4. 기존 지원이 있으면 같은 `id`를 유지하고 회사명·공고명·지원일·수집 ID를 갱신한다. 수집 ID가 누락되면 기존 ID를 유지한다. 적용할 내용이 같으면 `skip`한다.
5. `statusSource = manual`인 상태는 갱신 대상에서 제외한다. 메모·일기·면접일·URL도 수집 데이터로 덮어쓰지 않는다. 자동 수집 상태(`extension`)는 수집 결과에 따라 갱신한다.
6. 기존 지원이 없을 때만 추가한다. 다른 플랫폼의 같은 회사명+공고명은 별도 지원으로 추가하고 중복 지원 배지를 표시한다.

### 상태의 출처

- DB `status_source`, 앱 `statusSource`: `extension | manual`.
- 익스텐션 신규 저장은 `extension`, 수동 추가/드래그/편집의 상태 변경은 `manual`로 저장한다.
- 편집 폼에서 회사명 등만 수정하고 상태를 바꾸지 않았다면 출처는 바뀌지 않는다.
- 출처는 웹앱만 관리한다. 익스텐션 응답에 `statusSource`가 섞여 와도 버린다.
- 예: 잡코리아는 계속 지원완료를 보내더라도 사용자가 탈락으로 옮긴 카드는 재수집/새로고침 후에도 탈락이다. 메시지의 불합격 내용을 별도로 수집하는 기능은 아니다.
- 현재 수동 상태를 자동 수집 상태로 되돌리는 UI는 없으며, 사용자는 보드에서 상태를 계속 직접 바꿀 수 있다.

### 동시 실행과 배치 처리

- 조회·가져오기·수동 변경을 직렬화한다. Web Locks 지원 브라우저에서는 같은 origin의 탭 간에도 공유하고, 미지원 환경에서는 같은 탭 안에서 직렬화한다.
- 한 배치에 같은 지원이 여러 번 있으면 최종 삽입/갱신 내용을 합친다. 아직 삽입되지 않은 임시 ID에 UPDATE를 보내지 않는다.
- ID가 달라 회사명+공고명으로 매칭한 오래된 지원 행은 더 최신 지원일의 행을 덮어쓰지 않는다. 지원일은 수집 시각이 아니므로 동일 날짜 내 상태의 선후까지 판별하지는 못한다.
- DB 트리거는 다른 기기의 가져오기와 수동 변경이 겹쳐도 수동 상태를 보호한다.

### 적용과 남은 범위

- 웹앱 배포 **전에** `supabase/migrations/202610130001_application_status_source.sql`을 한 번 적용해야 한다.
- 기존 행에는 변경 주체 기록이 없으므로, 기존의 지원완료 외 상태와 수동 플랫폼 기록은 `manual`로 보수적으로 설정한다. 기존 탈락 기록도 보호되지만, 기존 자동 취소/불합격도 이후 직접 관리하는 상태가 된다.
- 기존에 쌓인 중복 행은 삭제하지 않는다. 메모/일기 등이 다를 수 있어 별도 확인 후 정리해야 한다.
- 서로 다른 기기/브라우저의 동시 신규 가져오기는 클라이언트 잠금만으로 완전하게 막을 수 없다. DB의 고유 키/트랜잭션 기반 가져오기는 별도 과제다.
- 공고 ID가 없으므로 같은 플랫폼·회사·공고명에 대한 실제 재지원도 이전 행에 합쳐지는 기존 정책을 유지한다.

---
## 6. 전달 방식

### 방법 A: 웹앱 경유, pull 방식 (확정)

웹앱이 **필요할 때 익스텐션에 요청해서** 데이터를 가져오고, **자기 로그인 세션(Supabase `user_id`)으로 저장한다.** 익스텐션은 `user_id`나 인증을 전혀 신경 쓰지 않는다 — 웹앱이 이미 로그인돼 있으므로 그 세션을 그대로 재사용한다.

- 이로써 "익스텐션이 어떤 `user_id`로 저장하나"라는 기존의 열린 문제가 해소된다. 익스텐션은 Supabase 자격증명을 절대 알 필요가 없다(보안상으로도 바람직 — 익스텐션이 탈취되어도 DB 접근 권한이 새지 않는다).
- 저장은 웹앱의 `addApplicationsFromExtension` (`src/store/applicationStore.ts`)이 그대로 수행한다. 이 액션은 이미 구현되어 있으며, 중복 판별(§5) 후 `insertApplications`로 Supabase에 일괄 저장하고 `ImportSummary`를 반환한다.

### 6.1 통신 방식: `externally_connectable` + `chrome.runtime.sendMessage` (pull), postMessage 아님

크롬 익스텐션이 "특정 웹페이지"와 통신하는 표준 방법은 두 가지가 있다.

| 방식 | 개념 | 이 프로젝트 채택 여부 |
| --- | --- | --- |
| A. content script + `window.postMessage` | 익스텐션이 웹앱 도메인에 content script를 주입 → 페이지 DOM 컨텍스트에 `postMessage`로 데이터를 흘려보냄 → 웹앱이 `message` 이벤트로 수신 | 채택 안 함 (§6.2 참고) |
| B. `externally_connectable` + `chrome.runtime.sendMessage`/`onMessageExternal` | manifest에 웹앱 origin을 `externally_connectable.matches`로 등록 → **웹앱이 먼저** `chrome.runtime.sendMessage(extensionId, message, callback)`로 요청 → 익스텐션의 `onMessageExternal` 리스너가 받아 `sendResponse`로 응답 | **채택** |

**방향에 대한 정정**: `externally_connectable`은 "웹페이지가 익스텐션에 메시지를 보낼 수 있게" 허용하는 API다. 즉 **웹페이지 → 익스텐션 방향의 요청(request)만 가능**하며, 웹페이지 쪽에는 `chrome.runtime.onMessageExternal` 자체가 존재하지 않는다(이 리스너는 익스텐션 컨텍스트에만 있다). 그러므로 "익스텐션이 웹앱에 먼저 데이터를 밀어넣는(push)" 구조는 이 API로 만들 수 없다 — 이 프로젝트는 **pull 방식**을 채택한다: 웹앱이 사용자 액션(§6.3 "가져오기" 버튼)을 계기로 익스텐션에 요청을 보내고, 익스텐션이 수집해둔 데이터로 응답한다.

**B를 선택한 이유**: origin 검증을 브라우저(Chrome API)가 대신 해준다. `externally_connectable.matches`에 등록되지 않은 페이지에서는 `chrome.runtime`이 아예 주입되지 않으므로(`sendMessage`조차 호출할 수 없음), 익스텐션 쪽에서 "이 요청이 정말 우리 웹앱에서 왔는가"를 문자열 비교로 검증할 필요가 없다. content script 방식(A)은 DOM `postMessage`이므로 수신측이 직접 `event.origin`을 검증해야 하고, 그 검증은 애플리케이션 코드의 실수(예: origin 체크 누락, `'*'` 사용)에 취약하다. B안은 이 계층의 위협 자체가 성립하지 않는다. 자세한 비교는 §6.2.

**확정된 값**:
- 웹앱 origin (`externally_connectable.matches`에 등록): `http://localhost:3000`, `https://jobdiary.vercel.app`
- 익스텐션 ID: 크롬 웹스토어 정식 배포 후 dev/prod 두 값으로 나뉜다 (`src/constants/extension.ts`가 `NODE_ENV`로 분기).
  - 프로덕션: `afnboeihbppogfinbickjaaadcgjkmil` (크롬 웹스토어가 최초 업로드 시 부여한 ID)
  - 로컬 dev: `dckfpbmglbagcpnkkkdcnbnpjdpfjcde` (`jobdiary-extension`을 압축해제 상태로 로드할 때 `manifest.config.ts`의 `key`로 고정되는 ID)
  - 이 프로젝트의 프로덕션 빌드(`manifest.config.ts`)는 최초 업로드 시 `key` 필드를 빼서 올렸고(크롬 웹스토어 대시보드가 업로드 매니페스트에 `key` 필드가 있으면 거부했기 때문 — "key 입력란은 매니페스트에 허용되지 않습니다"), 그 결과 스토어가 별도 ID를 부여해 두 ID가 서로 다르다. (Chrome 공식 문서는 최초 업로드 후 발급된 공개 키를 `manifest.json`의 `key`에 추가해 이후 로컬 빌드 ID를 스토어 ID와 맞추는 절차도 안내하지만, 이 프로젝트는 아직 그 방식을 적용하지 않았다.)

#### 흐름

```text
[웹앱] 사용자가 "익스텐션에서 가져오기" 버튼 클릭
  → [웹앱] chrome/chrome.runtime 존재 여부 가드 (미설치 환경 안전 처리)
  → [웹앱] chrome.runtime.sendMessage(JOBDIARY_EXTENSION_ID, { type: 'JOBDIARY_COLLECT' }, callback)
  → [익스텐션 service worker] chrome.runtime.onMessageExternal 리스너가 수신
      - sender 검증(§6.2) 통과 확인
      - chrome.storage에서 수집해둔 항목 로드
      - sendResponse(payload)  // payload: Omit<Application,'id'|'updatedAt'>[]
  → [웹앱] callback(response)로 payload 수신 → 최소 형식 검증(§6.2) → 로그인 세션 확인
  → [웹앱] addApplicationsFromExtension(payload) 호출 (중복 판별 §5 포함)
  → [웹앱] 결과(ImportSummary)를 화면에 배너로 표시 (§6.3)
```

**웹앱 쪽에 필요한 작업 (이 문서 확정 후 별도 이슈)**:
- "익스텐션에서 가져오기" 버튼: 클릭 시 `chrome.runtime.sendMessage` 호출. 익스텐션 미설치/`chrome.runtime` 없는 환경(일반 브라우저, SSR, 빌드)에서도 안전하게 동작하도록 `typeof chrome`, `chrome.runtime` 존재 여부 가드 + `chrome.runtime.lastError` 처리 필수.
- 응답 처리: payload 형식(배열 + 필수 필드) 검증 → 로그인 세션 확인 → `addApplicationsFromExtension` 호출 → 결과 배너 표시.
- 결과 배너/토스트 컴포넌트 (`ImportSummary`의 `addedCount`/`duplicateCount`/`skippedCount`/`error`를 그대로 렌더링).

**익스텐션 쪽에 필요한 작업 (`jobdiary-extension` 레포, 이 문서 확정 후 착수)**:
- `manifest.json`에 `externally_connectable.matches`로 웹앱 origin 등록 (§6.4 예시).
- service worker에 `chrome.runtime.onMessageExternal` 리스너 등록: `message.type === 'JOBDIARY_COLLECT'` 확인 → `chrome.storage`에서 수집된 항목 로드 → `sendResponse`로 반환.
- popup은 더 이상 데이터를 "보내는" 주체가 아니다 — 수집 현황 표시 정도의 역할만 남고, 실제 전달은 웹앱이 주도한다.

### 6.2 보안

**핵심 위협**: 아무 웹사이트나 익스텐션에 요청을 보내 수집된 데이터를 빼가거나, 웹앱이 아닌 다른 확장이 자신을 이 익스텐션인 것처럼 속여 데이터를 흘려보내는 것.

- **① 웹앱 → 익스텐션 방향: origin 등록 (브라우저가 검증).** `externally_connectable.matches`에 웹앱 origin(`http://localhost:3000`, `https://jobdiary.vercel.app`)만 등록해두면, 그 외의 어떤 페이지도 이 익스텐션에 `chrome.runtime.sendMessage`를 보낼 수 없다(애초에 `chrome.runtime`이 주입되지 않는다). "어떤 웹페이지가 이 익스텐션에 요청 가능한지"를 통제하는 1차 방어선이며, 브라우저가 강제하므로 애플리케이션 코드의 검증 누락에 좌우되지 않는다.
- **② 익스텐션 응답 신뢰: 웹앱은 고정된 익스텐션 ID로만 요청한다.** 웹앱은 `chrome.runtime.sendMessage`를 호출할 때 하드코딩된 상수(`JOBDIARY_EXTENSION_ID`)만 대상으로 삼는다 — 이 값이 코드에 고정돼 있으므로 웹앱이 의도치 않은(가짜) 확장에 요청을 보내 오염된 데이터를 응답받을 여지가 없다.
- **익스텐션 쪽 sender 검증(참고, 익스텐션 레포 구현 시 적용)**: `onMessageExternal` 콜백의 `sender`는 발신자가 "웹페이지"일 때 `sender.id`가 채워지지 않는다(그 필드는 확장 간 메시징에서만 쓰인다) — 대신 `sender.url`/`sender.origin`으로 확인한다. `externally_connectable.matches`가 이미 브라우저 레벨에서 origin을 강제하므로 필수는 아니지만, defense-in-depth로 익스텐션 쪽에서 한 번 더 origin을 확인해도 좋다.
  ```ts
  // 익스텐션 쪽 수신 핸들러 스케치 (jobdiary-extension 레포)
  chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
    if (message?.type !== 'JOBDIARY_COLLECT') {
      return; // 알려진 타입이 아니면 무시
    }
    // sender.url/origin은 이미 externally_connectable.matches로 제한되어 있음 (defense-in-depth로만 재확인)
    const payload = loadCollectedApplicationsFromStorage();
    sendResponse(payload);
  });
  ```
- **결과: 양방향 잠금.** 익스텐션은 등록된 웹앱 origin에서 온 요청만 받고(①), 웹앱은 고정된 익스텐션 ID에만 요청한다(②). 둘 중 하나만으로도 핵심 방어는 성립하지만(①이 사실상 대부분의 위협을 막는다), 함께 갖춰 다층 방어(defense in depth)를 구성한다.
- **왜 A안(content script + postMessage)을 배제했는가**: content script는 매칭되는 모든 페이지의 DOM 컨텍스트에 주입되고, 그 안에서 쓰는 `window.postMessage`는 같은 페이지에서 실행되는 다른 스크립트(다른 익스텐션의 content script, 웹앱에 XSS 취약점이 있을 경우 주입된 악성 스크립트 등)도 형태만 흉내 내면 보낼 수 있다. 수신측이 `event.origin`을 검증해도, "메시지가 우리 익스텐션에서 왔다"는 보장은 아니고 "같은 origin의 어떤 스크립트에서 왔다"는 보장일 뿐이다. B안은 이 계층의 위협 자체가 성립하지 않는다.
- **그래도 웹앱은 응답 내용을 신뢰하지 않는다(defense in depth)**: 응답이 기대하는 배열 형태(§6.4)이고 각 항목이 필수 필드(company/position/platform/status/appliedAt)를 갖췄는지 최소한의 런타임 검증을 거친 뒤에만 `addApplicationsFromExtension`에 넘긴다. 형식이 어긋나면 무시하고 에러로 처리한다.
- **저장 시점 인증은 기존 로직 그대로 재사용한다.** `addApplicationsFromExtension` → `insertApplications`는 내부적으로 `getCurrentUserId()`(`src/lib/applicationsApi.ts`)로 현재 세션 사용자를 가져오고, 로그인 세션이 없으면 실패한다. 즉 웹앱이 로그아웃 상태면 "가져오기" 버튼을 눌러도 저장되지 않는다 — 별도 방어 코드를 추가하지 않아도 기존 인증 경로가 그대로 방어막이 된다. 다만 사용자에게는 "로그인이 필요합니다" 안내를 보여줘야 하므로 §6.3에서 다룬다.
- **postMessage를 어딘가에서 쓰게 되더라도** (예: 팝업 ↔ service worker 내부 통신) 항상 대상 origin을 명시하고(`'*'` 금지), 수신측에서 `event.origin`과 `event.source`를 함께 검증한다.

### 6.3 UX 흐름

1. 사용자가 웹앱 화면에서 **"익스텐션에서 가져오기"** 버튼을 클릭한다(트리거는 익스텐션 팝업이 아니라 웹앱).
2. 웹앱이 로그인 세션을 확인한다.
   - 로그인 안 됨: 요청을 보내지 않고 "로그인 후 다시 시도해주세요" 안내를 표시한다.
   - 로그인 됨: `chrome.runtime.sendMessage(JOBDIARY_EXTENSION_ID, { type: 'JOBDIARY_COLLECT' }, callback)`를 호출한다.
3. 익스텐션 미설치이거나 응답이 없으면(`chrome.runtime.lastError`) "익스텐션이 설치되어 있지 않거나 응답하지 않습니다" 안내를 표시한다.
4. 정상 응답을 받으면 §6.2의 최소 형식 검증을 거쳐 `addApplicationsFromExtension(payload)`를 호출한다.
5. 처리 결과는 웹앱 화면 상단 배너/토스트로 표시한다. `ImportSummary`를 그대로 사용:
   - `addedCount`건 추가, `duplicateCount`건 중복 지원 감지, `skippedCount`건 재수집으로 스킵.
   - `error`가 있으면 "저장 실패: {error}" 형태로 표시 (배치 저장 자체가 실패한 경우).
6. 상세 수치의 진실 공급원은 항상 웹앱 화면이다 — 익스텐션 팝업에 별도로 같은 정보를 표시하지 않는다.

### 6.4 데이터 형식

§2에서 정의한 형식을 그대로 사용한다 — 별도 변환 계층을 두지 않는다.

```ts
// 웹앱 → 익스텐션 (요청)
interface JobdiaryCollectRequest {
  type: 'JOBDIARY_COLLECT';
}

// 익스텐션 → 웹앱 (응답 = 수집해둔 데이터 그 자체)
type JobdiaryCollectResponse = Array<Omit<Application, 'id' | 'updatedAt'>>; // §2, §3, §4 규칙에 따라 이미 변환 완료된 상태
```

- 응답 배열의 각 항목은 §3(status 매핑)·§4(날짜 정규화)를 이미 거친 상태여야 한다 — 변환(어댑터)은 이번에도 익스텐션 쪽 책임이고, 웹앱은 완성된 `Application` 형식만 받는다는 §1 원칙이 그대로 적용된다.
- 웹앱은 응답 배열을 그대로 `addApplicationsFromExtension`에 전달한다. 이 함수가 이미 `id`/`updatedAt` 생성과 중복 판별(§5)을 처리하므로 웹앱 수신 쪽에는 추가 변환 로직이 필요 없다.

manifest 설정 예시(§6.1 B안, 확정된 origin 기준 — `key`는 실제 구현 시 생성되는 값을 채운다):

```json
{
  "key": "<익스텐션 ID를 고정하는 공개키, 구현 시 생성>",
  "externally_connectable": {
    "matches": [
      "https://jobdiary.vercel.app/*",
      "http://localhost:3000/*"
    ]
  }
}
```

---

## 7. 미해결/추후 과제

- ~~"중복 지원" 표시 UI (카드 뱃지 등)는 데이터 갖춘 뒤 별도 설계~~ → 완료. 저장 없이 렌더 시 실시간 계산하는 방식으로 구현됨 (§5 참조).
- 같은 사이트·같은 회사+포지션 재지원 구분, 기존 중복 데이터 정리, 다른 기기 간 신규 삽입의 원자성은 §5 "적용과 남은 범위" 참조.
- ~~로그인 + Supabase(2단계) 도입 시 저장 경로 변경 필요~~ → 완료. 웹앱은 이미 로그인 + Supabase 기반이며, `addApplicationsFromExtension`도 Supabase에 저장하도록 전환되어 있다. §6의 방법 A는 이 상태를 전제로 설계되었다 — 별도의 "익스텐션이 user_id를 어떻게 아는가" 문제가 없다(웹앱 세션 재사용).
