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

## 5. 중복 판별 (핵심 기능)

목적: "같은 지원 내역의 재수집"(스킵), "같은 공고의 상태 변화"(업데이트), "서로 다른 공고로의 진짜 재지원"(중복)을 구분한다.

### 왜 다시 재정의했는가

직전 버전은 `externalId`를 "공고 식별자"로 가정하고, 이를 기준으로 "같은 공고"를 판별했다. 그런데 실데이터를 확인해보니 `externalId`는 공고 단위가 아니라 **지원 행위(지원 내역) 단위로 발급되는 번호**였다(잡코리아 `idx`, 사람인 `recruitapply_idx`). 즉 같은 공고에 지원했다가 취소해도 "지원"과 "취소"가 서로 다른 `externalId`를 받는다 — 그래서 `externalId`만으로는 "같은 공고"를 판단할 수 없다.

→ `externalId`의 쓰임을 좁힌다: **"같은 지원 내역의 재수집 방지(스킵)"** 용도로만 쓴다. "같은 공고"인지는 `platform` + `company` + `position` 조합으로 판단한다.

### 판별 순서

새 지원건이 들어왔을 때 순서대로 판정한다:

1. 기존 저장분에 같은 `platform` + 같은 `externalId`인 건이 있고, 내용(`status`, `appliedAt`)까지 완전히 동일한가?
   → **있으면 `skip`** (같은 지원 내역의 기술적 재수집, 여기서 종료). `externalId`는 이 판정에만 쓰인다 — "지원 행위 자체가 같다"는 뜻이지 "공고가 같다"는 뜻이 아니다.
2. (1에 해당 없음) 기존 저장분에 같은 `platform` + 같은 `company` + `position`인 건이 있는가?
   → **있으면 `update`** (같은 공고의 상태 변화로 간주). 들어온 건의 `appliedAt`이 기존 저장분보다 최신이면 그 내용으로 기존 건을 대체한다(오래된 상태 정보가 최신 정보를 되돌리지 않도록).
   - 예: 잡코리아 "플레이웍스" 지원완료(`externalId=A`, 05.21)가 저장돼 있는데, 잡코리아 "플레이웍스" 지원취소(`externalId=B`, 06.01)가 들어오면 → `externalId`는 다르지만(A≠B, 지원 내역 번호가 다를 뿐) 같은 `platform`+`company`+`position`이므로 같은 공고의 상태변경으로 보고 06.01 취소 건으로 업데이트한다(이전 건 대체).
3. (2에도 해당 없음) 다른 `platform` + 같은 `company` + `position`인 기존 건이 있는가?
   → **있으면 `add-duplicate`** (크로스플랫폼 중복 지원으로 감지하며 새 건으로 추가한다).
   - 예: 사람인 "카카오 프론트엔드"와 잡코리아 "카카오 프론트엔드" → 사이트(`platform`)는 다르지만 `company`+`position`이 같음 → 중복 지원.
4. 없으면 → `add` (일반 추가).

### 한계 (3사이트 공통 — 정직하게 밝힘)

`externalId`가 "공고 식별자"가 아니라 "지원 내역 번호"인 이상, **"같은 공고의 상태변경"과 "같은 사이트에 같은 회사+포지션으로 재지원"을 구분할 방법이 없다.** 사람인·잡코리아·원티드 3사이트 모두 — `externalId` 유무와 무관하게 — 같은 `platform`+`company`+`position`이면 2번 규칙에 의해 무조건 `update`로 처리된다. 즉 같은 사이트에서 같은 회사의 같은 포지션에 진짜로 재지원(예: 예전에 지원했다가 몇 달 뒤 재공고에 다시 지원)하더라도 새 지원으로 잡히지 않고, 이전 지원 기록 위에 그대로 덮어써진다.

- 이 한계는 사이트가 제공하는 식별자의 성격(공고 단위가 아니라 지원 행위 단위) 때문에 발생하며, `externalId`를 사용하는 방식을 어떻게 바꾸더라도 근본적으로 해소되지 않는다.
- (정정: 직전 문서 버전은 이 한계를 "원티드만의 문제(`externalId` 부재)"로 기술했으나, 실제로는 `externalId`를 보유한 사람인·잡코리아도 동일하게 겪는 한계다. `externalId`가 지원 내역 단위인 이상 있어도 도움이 되지 않기 때문이다.)
- 완화책(예: 재지원임을 사용자가 직접 표시하게 하는 UI)은 §7 추후 과제로 남긴다.

### 판별 결과 4종

| 결과 | 조건 | 동작 |
| --- | --- | --- |
| `skip` | 같은 `platform`+`externalId`이고 내용(`status`/`appliedAt`)까지 동일 | 아무 것도 하지 않는다 (같은 지원 내역의 재수집). |
| `update` | skip 조건에 해당 없음 + 같은 `platform`+`company`+`position`인 기존 건 있음 | 기존 건을 최신 내용으로 대체한다 (같은 공고의 상태 변화로 간주). |
| `add-duplicate` | 위 두 조건에 해당 없음 + 다른 `platform` + 같은 `company`+`position`인 기존 건 있음 | 새 건으로 추가하되 크로스플랫폼 중복 지원임을 표시한다. |
| `add` | 위 어디에도 해당하지 않음 | 새 지원건으로 그대로 추가한다. |

- 판별의 최우선 단위는 이제 **"공고"**(`platform`+`company`+`position`)다. `externalId`는 "같은 지원 내역 재수집인가"를 가리기 위한 좁은 용도(1번 skip 판정)로만 쓰인다.

### 플래그·업데이트 저장 방식 (미확정)

- 현재 단계에서는 판별 결과(4종)까지만 정의한다.
- `add-duplicate` 감지 결과를 어디에 저장할지(예: `Application`에 필드 추가) 또는 화면에서 실시간 계산할지는 "중복 지원 표시 UI" 설계 시 함께 결정한다.
- `update`가 기존 레코드를 실제로 어떻게 대체하는지(레코드 `id` 유지 여부, `status`/`appliedAt` 외 필드 처리 등)의 구현 세부사항도 코드 작업 시 함께 결정한다. (7번 추후 과제 참조)

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
- 익스텐션 ID: `dckfpbmglbagcpnkkkdcnbnpjdpfjcde` (`jobdiary-extension`의 `manifest.json`에 `key` 필드로 고정)

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

- **"중복 지원" 표시 UI** (카드 뱃지 등)는 데이터 갖춘 뒤 별도 설계. (§5 "플래그·업데이트 저장 방식" 참조)
- **`externalId`가 "공고 식별자"가 아니라 "지원 내역 번호"인 데서 오는 중복 판별의 한계**(같은 사이트·같은 회사+포지션 재지원을 상태변경과 구분 못함)는 3사이트 공통이며 근본적으로 해소되지 않는다 (§5 "한계" 참조).
- ~~로그인 + Supabase(2단계) 도입 시 저장 경로 변경 필요~~ → 완료. 웹앱은 이미 로그인 + Supabase 기반이며, `addApplicationsFromExtension`도 Supabase에 저장하도록 전환되어 있다. §6의 방법 A는 이 상태를 전제로 설계되었다 — 별도의 "익스텐션이 user_id를 어떻게 아는가" 문제가 없다(웹앱 세션 재사용).
