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

목적: 같은 지원건 재수집(기술적 중복)은 막고, 같은 회사+포지션 재지원(실제 중복)은 알아차린다.

### 판별 순서

새 지원건이 들어왔을 때, `externalId` 유무에 따라 기준은 다르지만 두 경우 모두 "먼저 기술적 중복(스킵) 여부를 판정하고, 거기서 걸리지 않으면 실제 중복(중복 지원 감지) 여부를 판정한다"는 동일한 2단계 구조로 판별한다.

#### `externalId`가 있는 경우 (사람인/잡코리아)

1. 기존 저장분에 같은 `platform` + 같은 `externalId`가 있으면 → 스킵한다 (기술적 중복, 여기서 종료).
   - `platform`도 함께 봐야 하는 이유: `externalId`는 사이트별로 독립 발급되므로, `platform`이 다르면 값이 우연히 같아도 서로 다른 지원건이다.
2. 없으면 `company` + `position`이 동일한 기존 지원건이 있는지 확인한다.
   - 있으면: 추가하되 "중복 지원"으로 감지한다 (`add-duplicate`).
   - 없으면: 일반 추가한다 (`add`).

#### `externalId`가 없는 경우 (원티드)

1. 기존 저장분에 같은 `platform` + `company` + `position` + `appliedAt`(날짜)가 모두 같은 건이 있으면 → 스킵한다 (기술적 중복, 여기서 종료). `externalId`가 없으므로 이 조합으로 재수집 여부를 판정한다.
2. 없으면 `company` + `position`이 동일한 기존 지원건이 있는지 확인한다.
   - 있으면: 추가하되 "중복 지원"으로 감지한다 (`add-duplicate`).
   - 없으면: 일반 추가한다 (`add`).

- 중복 판별의 기본 기준은 `company` + `position` 조합이다 (같은 회사라도 다른 포지션은 별개로 취급).

### 플래그 저장 방식 (미확정)

- 현재 단계에서는 "중복 지원 여부를 감지"하는 것까지만 정의한다.
- 감지 결과를 어디에 저장할지(예: `Application`에 필드 추가) 또는 화면에서 실시간 계산할지는 "중복 지원 표시 UI" 설계 시 함께 결정한다. (7번 추후 과제 참조)

---

## 6. 전달 방식

### 방법 A: 웹앱 경유 (확정)

익스텐션이 열려있는 웹앱 탭에 데이터를 전달하고, **웹앱이 자기 로그인 세션(Supabase `user_id`)으로 저장한다.** 익스텐션은 `user_id`나 인증을 전혀 신경 쓰지 않는다 — 웹앱이 이미 로그인돼 있으므로 그 세션을 그대로 재사용한다.

- 이로써 "익스텐션이 어떤 `user_id`로 저장하나"라는 기존의 열린 문제가 해소된다. 익스텐션은 Supabase 자격증명을 절대 알 필요가 없다(보안상으로도 바람직 — 익스텐션이 탈취되어도 DB 접근 권한이 새지 않는다).
- 저장은 웹앱의 `addApplicationsFromExtension` (`src/store/applicationStore.ts`)이 그대로 수행한다. 이 액션은 이미 구현되어 있으며, 중복 판별(§5) 후 `insertApplications`로 Supabase에 일괄 저장하고 `ImportSummary`를 반환한다.

### 6.1 통신 방식: `externally_connectable` (chrome.runtime), postMessage 아님

크롬 익스텐션이 "특정 웹페이지"와 통신하는 표준 방법은 두 가지가 있다.

| 방식 | 개념 | 이 프로젝트 채택 여부 |
| --- | --- | --- |
| A. content script + `window.postMessage` | 익스텐션이 웹앱 도메인에 content script를 주입 → 페이지 DOM 컨텍스트에 `postMessage`로 데이터를 흘려보냄 → 웹앱이 `message` 이벤트로 수신 | 채택 안 함 (§6.2 참고) |
| B. `externally_connectable` + `chrome.runtime.connect` | manifest에 웹앱 origin을 `externally_connectable.matches`로 등록 → 웹앱이 직접 `chrome.runtime.connect(extensionId)`로 연결 → 이후 양방향 `postMessage` | **채택** |

**B를 선택한 이유**: origin 검증을 브라우저(Chrome API)가 대신 해준다. `externally_connectable.matches`에 등록되지 않은 페이지에서는 `chrome.runtime`이 아예 주입되지 않으므로, 웹앱 쪽에서 "이 메시지가 정말 우리 익스텐션에서 왔는가"를 문자열 비교로 검증할 필요가 없다. content script 방식(A)은 DOM `postMessage`이므로 웹앱이 직접 `event.origin`을 검증해야 하고, 그 검증은 애플리케이션 코드의 실수(예: origin 체크 누락, `'*'` 사용)에 취약하다. 자세한 비교는 §6.2.

**확정된 값**:
- 웹앱 origin (`externally_connectable.matches`에 등록): `http://localhost:3000`, `https://jobdiary.vercel.app`
- 익스텐션 ID: `jobdiary-extension`의 `manifest.json`에 `key` 필드를 넣어 고정한다 — 구체적인 key/ID 값 자체는 실제 구현(익스텐션 프로젝트 생성) 시 생성한다. 이 문서에서 확정하는 것은 "ID를 고정한다"는 방침이다.

#### 흐름

```text
[익스텐션 팝업] "웹앱으로 보내기" 클릭
  → [service worker] chrome.storage에서 수집된 항목 로드
  → [service worker] 웹앱 탭과의 연결(port) 확인
      - 이미 연결돼 있으면 바로 전송
      - 웹앱 탭은 있는데 연결이 없으면(페이지 새로고침 등) 탭 포커스 후 재연결 대기
      - 웹앱 탭이 아예 없으면 chrome.tabs.create로 열고 연결 수립 대기
  → [service worker] port.postMessage({ type: 'jobdiary/import', payload })
  → [웹앱] onMessage 핸들러가 수신 → 로그인 세션 확인 → addApplicationsFromExtension(payload) 호출
  → [웹앱] 결과(ImportSummary)를 화면에 배너로 표시 (§6.3)
  → [웹앱] port.postMessage({ type: 'jobdiary/import-ack', received })  // 익스텐션 팝업의 로딩 상태 종료용, 상세 수치는 웹앱 화면이 진실 공급원
```

**웹앱 쪽에 필요한 작업 (이 문서 확정 후 별도 이슈)**:
- 루트 레이아웃 등 전역 위치에서 마운트 시 `chrome.runtime.connect(EXTENSION_ID)` 시도 (익스텐션 미설치 환경에서도 안전하게 동작하도록 `typeof chrome`, `chrome.runtime` 존재 여부 가드 + try/catch 필수)
- 수신 메시지 핸들러: 메시지 형식(`type` 필드) 검증 → 로그인 세션 확인 → `addApplicationsFromExtension` 호출 → 결과 배너 표시
- 결과 배너/토스트 컴포넌트 (`ImportSummary`의 `addedCount`/`duplicateCount`/`skippedCount`/`error`를 그대로 렌더링)

**익스텐션 쪽에 필요한 작업 (`jobdiary-extension` 레포, 이 문서 확정 후 착수)**:
- `manifest.json`에 `externally_connectable.matches`로 웹앱 origin 등록 (§6.4 예시)
- service worker에 웹앱 탭과의 port 연결 관리(연결 추적, 탭 탐색/생성, 연결 대기 타임아웃)
- popup에 "웹앱으로 보내기" 버튼과 진행 상태 UI(전송 중 / ack 수신 / 실패)

### 6.2 보안

**핵심 위협**: 아무 웹사이트나 웹앱에 가짜 지원 데이터를 밀어넣거나, 웹앱의 Supabase 세션을 이용해 원치 않는 쓰기를 유발하는 것.

- **① 익스텐션 → 웹앱 방향: origin 등록 (브라우저가 검증).** `externally_connectable.matches`에 웹앱 origin(`http://localhost:3000`, `https://jobdiary.vercel.app`)만 등록해두면, 그 외의 어떤 페이지도 이 익스텐션의 `chrome.runtime`에 연결할 수 없다. 임의의 사이트가 `chrome.runtime.connect(EXTENSION_ID)`를 호출해도 매칭되는 origin이 아니면 브라우저가 거부한다 — 웹앱 코드가 직접 origin 문자열을 비교하는 것보다 신뢰도가 높다(비교 로직 누락/실수의 여지가 없음).
- **② 웹앱 → 익스텐션 방향: 익스텐션 ID 고정 (웹앱이 검증).** ①만으로는 "우리 웹앱에 연결 가능한 익스텐션이 우리 것 하나뿐"이라는 보장이 없다 — 이론상 다른 익스텐션도 자기 manifest에 같은 웹앱 origin을 `externally_connectable.matches`로 등록하면 연결을 시도할 수 있다(연결 자체를 반드시 성공시키는 건 아니지만, 웹앱 쪽에서 "발신자가 우리 익스텐션인지"까지 확인하는 게 안전하다). 이를 막기 위해 `jobdiary-extension`의 `manifest.json`에 `key` 필드를 넣어 익스텐션 ID를 고정하고, 웹앱은 `chrome.runtime.onConnectExternal`/`onMessageExternal` 콜백에서 받는 `sender.id`가 이 고정된 ID와 일치하는지 확인한 뒤에만 메시지를 처리한다.
  ```ts
  // 웹앱 수신 핸들러 스케치
  chrome.runtime.onConnectExternal.addListener((port) => {
    if (port.sender?.id !== JOBDIARY_EXTENSION_ID) {
      port.disconnect(); // 우리 익스텐션이 아니면 즉시 끊는다
      return;
    }
    // 이후 port.onMessage로 §6.4 형식의 메시지만 처리
  });
  ```
- **결과: 양방향 잠금.** 익스텐션은 등록된 웹앱 origin에만 연결할 수 있고(①), 웹앱은 등록된 익스텐션 ID에서 온 연결만 처리한다(②). 둘 중 하나만으로도 핵심 방어는 성립하지만(①이 사실상 대부분의 위협을 막는다), 함께 갖춰 다층 방어(defense in depth)를 구성한다.
- **왜 A안(content script + postMessage)을 배제했는가**: content script는 매칭되는 모든 페이지의 DOM 컨텍스트에 주입되고, 그 안에서 쓰는 `window.postMessage`는 같은 페이지에서 실행되는 다른 스크립트(다른 익스텐션의 content script, 웹앱에 XSS 취약점이 있을 경우 주입된 악성 스크립트 등)도 형태만 흉내 내면 보낼 수 있다. 수신측이 `event.origin`을 검증해도, "메시지가 우리 익스텐션에서 왔다"는 보장은 아니고 "같은 origin의 어떤 스크립트에서 왔다"는 보장일 뿐이다. B안은 이 계층의 위협 자체가 성립하지 않는다.
- **그래도 웹앱은 메시지 내용을 신뢰하지 않는다(defense in depth)**: `type` 필드로 알려진 메시지 형식인지 확인하고, `payload`가 기대하는 배열 형태(§6.4)인지 최소한의 런타임 검증을 거친 뒤에만 `addApplicationsFromExtension`에 넘긴다. 형식이 어긋나면 무시하고 로그만 남긴다.
- **저장 시점 인증은 기존 로직 그대로 재사용한다.** `addApplicationsFromExtension` → `insertApplications`는 내부적으로 `getCurrentUserId()`(`src/lib/applicationsApi.ts`)로 현재 세션 사용자를 가져오고, 로그인 세션이 없으면 실패한다. 즉 웹앱이 로그아웃 상태면 익스텐션이 아무리 데이터를 보내도 저장되지 않는다 — 별도 방어 코드를 추가하지 않아도 기존 인증 경로가 그대로 방어막이 된다. 다만 사용자에게는 "로그인이 필요합니다" 안내를 보여줘야 하므로 §6.3에서 다룬다.
- **postMessage를 어딘가에서 쓰게 되더라도** (예: 팝업 ↔ service worker 내부 통신) 항상 대상 origin을 명시하고(`'*'` 금지), 수신측에서 `event.origin`과 `event.source`를 함께 검증한다.

### 6.3 UX 흐름

1. 사용자가 익스텐션 팝업에서 "웹앱으로 보내기"를 클릭한다.
2. 웹앱 탭이 없으면 새 탭으로 연다. 탭이 이미 있으면 포커스한다 — 사용자가 결과를 바로 눈으로 확인할 수 있어야 하므로, 저장 후 익스텐션 팝업이 아니라 **웹앱 화면에 결과를 보여주는 쪽**으로 설계한다(익스텐션 팝업으로 상세 결과를 되돌려 보내는 왕복 채널은 만들지 않는다 — 단순화).
3. 웹앱이 메시지를 수신하면 로그인 세션을 확인한다.
   - 로그인 안 됨: 저장을 시도하지 않고 "로그인 후 다시 시도해주세요" 안내를 표시한다(로그인 페이지로 유도).
   - 로그인 됨: `addApplicationsFromExtension(payload)`를 호출한다.
4. 처리 결과는 웹앱 화면 상단 배너/토스트로 표시한다. `ImportSummary`를 그대로 사용:
   - `addedCount`건 추가, `duplicateCount`건 중복 지원 감지, `skippedCount`건 재수집으로 스킵.
   - `error`가 있으면 "저장 실패: {error}" 형태로 표시 (배치 저장 자체가 실패한 경우).
5. 익스텐션 팝업은 ack만 받아 "전송 완료, 웹앱에서 결과를 확인하세요" 정도로 짧게 안내하고 닫는다. 상세 수치의 진실 공급원은 항상 웹앱 화면이다(같은 정보를 두 곳에서 따로 계산/표시하지 않는다).
6. 연결 실패(웹앱 탭 로드 지연, 익스텐션 미설치 등)는 팝업에서 타임아웃 후 실패 안내로 처리한다. 구체적인 타임아웃 값과 재시도 UX는 익스텐션 구현 시 결정.

### 6.4 데이터 형식

§2에서 정의한 형식을 그대로 사용한다 — 별도 변환 계층을 두지 않는다.

```ts
// 익스텐션 → 웹앱
interface ExtensionImportMessage {
  type: 'jobdiary/import';
  payload: Array<Omit<Application, 'id' | 'updatedAt'>>; // §2, §3, §4 규칙에 따라 이미 변환 완료된 상태
}

// 웹앱 → 익스텐션 (수신 확인용. 상세 결과는 웹앱 화면에 표시하므로 요약 수치는 담지 않는다)
interface ExtensionImportAck {
  type: 'jobdiary/import-ack';
  received: number;
}
```

- `payload`의 각 항목은 §3(status 매핑)·§4(날짜 정규화)를 이미 거친 상태여야 한다 — 변환(어댑터)은 이번에도 익스텐션 쪽 책임이고, 웹앱은 완성된 `Application` 형식만 받는다는 §1 원칙이 그대로 적용된다.
- 웹앱은 `payload`를 그대로 `addApplicationsFromExtension`에 전달한다. 이 함수가 이미 `id`/`updatedAt` 생성과 중복 판별(§5)을 처리하므로 웹앱 수신 핸들러에는 추가 변환 로직이 필요 없다.

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

- **"중복 지원" 표시 UI** (카드 뱃지 등)는 데이터 갖춘 뒤 별도 설계. (§5 "플래그 저장 방식" 참조)
- **원티드 `externalId` 부재**로 인한 중복 판별의 한계는 §5에 기술된 방식(§5 "externalId가 없는 경우")으로 완화만 하고 있으며, 근본적으로 해소되지는 않는다.
- ~~로그인 + Supabase(2단계) 도입 시 저장 경로 변경 필요~~ → 완료. 웹앱은 이미 로그인 + Supabase 기반이며, `addApplicationsFromExtension`도 Supabase에 저장하도록 전환되어 있다. §6의 방법 A는 이 상태를 전제로 설계되었다 — 별도의 "익스텐션이 user_id를 어떻게 아는가" 문제가 없다(웹앱 세션 재사용).
