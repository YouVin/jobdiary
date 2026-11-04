# 🏗️ 아키텍처

## 1. Manifest V3 구조

크롬 익스텐션은 4가지 요소로 구성된다.

```
manifest.json      익스텐션 설정 (권한, 진입점)
content script     지원현황 페이지에 주입 → DOM 파싱 (사이트별)
service worker     웹앱 요청 응답 및 사람인 모바일 보충 요청
popup              아이콘 클릭 시 뜨는 UI (React)
```

## 2. 데이터 흐름

```
[지원현황 페이지]
   content script (사이트별 파서)
      ↓ 지원 목록 파싱 (SELECTORS.md 기준)
   ScrapedApplication[] 생성
      ↓ 사람인만 background 고정 모바일 URL 요청 → 지원 ID/공고 ID 일치 날짜 보충
      ↓ content/collectHandler.ts → lib/adapter.ts에서 Application으로 변환
      ↓ chrome.storage.local에 사이트별 슬롯으로 누적 저장 (saramin/jobkorea/wanted,
      ↓ 같은 사이트 재수집 시 해당 슬롯만 덮어씀)
   [popup] 건수 표시·전체 복사(TSV+HTML)·웹앱 열기
   [웹앱] JOBDIARY_COLLECT 요청 → service worker → 저장 데이터 응답
```

> 상태 매핑과 날짜 정규화는 content script의 공통 수집 핸들러가 저장 직전에
> `convertToApplication`으로 한 번 수행한다. 선택적 `deadlineAt`은 날짜 문자열로
> 정규화한다. 사람인은 모바일 한 페이지의 명시 날짜를 일치하는 PC 행에 보충한다.
> 잡코리아는 연결된 공개 공고의 표시 날짜/구조화 날짜와 공고 ID를 교차 검증해 보충한다.
> 원티드는 마감일 출처가 없어 생략한다.
> 모바일 요청의 실제 로그인 환경 검증은 아직 남아 있다
> ([DEADLINES.md](./DEADLINES.md)). 최종 중복 판별과 웹앱 저장은
> 웹앱의 `addApplicationsFromExtension`이 담당한다([INTEGRATION.md](./INTEGRATION.md)).
>
> 전체 복사 출구는 웹앱을 거치지 않으므로 `addApplicationsFromExtension`도, 중복 판별도 적용되지 않는다 — 익스텐션은 두 출구 모두에서 사이트별 슬롯 덮어쓰기 이상의 중복 판별 로직을 갖지 않는다 (상세: [PLANNING.md](./PLANNING.md#7-데이터-정합성--저장-전략)).

## 3. 폴더 구조

```
jobdiary-extension/
├── manifest.config.ts           # manifest 정의 (CRXJS)
├── src/
│   ├── content/                 # content scripts (사이트별)
│   │   ├── collectHandler.ts    # 파서 결과 변환·저장·응답 공통 핸들러
│   │   ├── saramin.ts
│   │   ├── jobkorea.ts
│   │   ├── wanted.ts
│   │   ├── selectors/           # 셀렉터 상수 (SELECTORS.md 반영)
│   │   │   ├── saramin.ts
│   │   │   ├── jobkorea.ts
│   │   │   └── wanted.ts
│   │
│   ├── background/
│   │   └── index.ts             # service worker
│   │
│   ├── popup/                   # popup UI (React)
│   │   ├── index.html
│   │   ├── App.tsx
│   │   └── main.tsx
│   │
│   ├── lib/
│   │   ├── statusMapping.ts     # 상태 원문 → Status
│   │   ├── dateNormalize.ts     # 날짜 정규화
│   │   └── storage.ts           # chrome.storage.local 사이트별 슬롯 저장/조회/초기화
│   │
│   └── types/
│       └── application.ts       # ScrapedApplication 등 (웹앱과 공유)
│
├── docs/
├── public/                      # 아이콘 등
└── package.json
```

## 4. 컴포넌트 역할

| 요소 | 역할 |
|------|------|
| content/{site}.ts | 해당 사이트 지원현황 파싱·페이지 순회 및 공통 수집 핸들러 등록 |
| content/collectHandler.ts | 파서 결과를 어댑터로 변환한 뒤 직접 저장하고 팝업에 응답 |
| content/selectors/ | 사이트별 셀렉터 상수 (깨지면 여기만 수정) |
| background/index.ts | 웹앱 pull 요청의 origin·타입 검증 후 저장된 데이터 응답 |
| background/saraminMobile.ts | 사람인 PC 최상위 탭 요청만 검증하고 고정 모바일 지원현황 한 페이지 조회 |
| content/saraminDeadlines.ts | 모바일 HTML의 명시된 마감일 추출, 지원 ID+공고 ID로 PC 결과에 보충. 실패 시 원본 유지 |
| content/jobkoreaDeadlines.ts | 연결된 공개 공고의 메타 날짜·JobPosting 날짜·공고 ID 교차 검증, 제한된 추가 조회. 실패 시 원본 유지 |
| popup/App.tsx | 수집·복사·초기화·웹앱 열기, 로딩/오류 안내 및 접근성 상태 메시지 |
| popup/useSiteCounts.ts | 저장 현황 조회와 local 저장소 변경 구독. 늦은 응답 무시 및 팝업 종료 시 구독 해제 |
| lib/statusMapping.ts | "지원완료" → applied, "취소" 포함 → canceled 등 |
| lib/dateNormalize.ts | 지원일은 자정 ISO, 정확한 시각은 KST→UTC, 선택적 마감일은 유효성 검사 후 YYYY-MM-DD |
| lib/storage.ts | chrome.storage.local 사이트별 슬롯(saramin/jobkorea/wanted) 누적 저장·조회. 재수집 시 해당 슬롯만 덮어씀, "초기화" 버튼 호출 시에만 전체 비움 |

## 5. MV3 주의사항

- **service worker는 항상 떠있지 않음** → 전역변수 대신 chrome.storage 사용
- **inline script 금지** → 모든 스크립트 파일 분리
- **비동기 메시지 응답** → listener에서 `return true`
- **권한 최소화** → 필요한 host_permissions만 (심사 통과 위해)

## 6. manifest.json 핵심

```json
{
  "manifest_version": 3,
  "name": "취준일기",
  "version": "0.1.0",
  "permissions": ["storage"],
  "host_permissions": [
    "https://*.saramin.co.kr/*",
    "https://*.jobkorea.co.kr/*",
    "https://*.wanted.co.kr/*"
  ],
  "background": {
    "service_worker": "src/background/index.ts",
    "type": "module"
  },
  "content_scripts": [
    { "matches": ["https://*.saramin.co.kr/*"], "js": ["src/content/saramin.ts"] },
    { "matches": ["https://*.jobkorea.co.kr/*"], "js": ["src/content/jobkorea.ts"] },
    { "matches": ["https://*.wanted.co.kr/*"], "js": ["src/content/wanted.ts"] }
  ],
  "action": { "default_popup": "src/popup/index.html" }
}
```

> 위 JSON은 역할 설명용 축약 예시다. 실제 권한·경로 제한은 `manifest.config.ts`와
> `src/lib/platformDetect.ts`가 기준이다. 현재 `storage` 권한을 사용하며 전체 복사는
> 사용자 클릭 맥락의 표준 Clipboard API를 사용한다. 마감일 계약 준비로 권한이나
> content script 주입 범위를 추가하지 않는다.

## 7. 개발 규칙 (웹앱과 동일)

- named export, 함수형, TypeScript
- 셀렉터는 상수로 분리 (하드코딩 금지)
- Atomic 커밋 (한 커밋 하나의 작업)
- 사이트별 파서는 동일 인터페이스(ScrapedApplication[]) 반환
- 사람인 1개 완성 후 나머지 복제

## 5단계: 비교 캐시의 별도 흐름

웹앱의 조회/저장 성공 → 공통 공고 식별 → HISTORY_SYNC → service worker 검증 →
origin별 `jobdiary:application-history:v1:` 키에 최소 정보 저장. 로그아웃/계정 변경은
HISTORY_CLEAR로 이 키만 정리한다. 수집 슬롯과 저장 책임이 분리되어 있다.
실제 채용 화면 배지는 다음 단계이며 [공통 계약 기록](../../../docs/APPLICATION_HISTORY_SYNC.md)을 따른다.

## 지원 이력 자동 표시 (6단계)

웹앱 기준 캐시 → historyBadges 저장소/가시성 구독 → historyBadgeEngine 사이트별 Map → 공고 링크/단일 제목 배지 흐름이다.
수집 슬롯과 표시 설정·캐시는 별개다. cache 없음/꺼짐/해당 사이트 이력 없음은 탐색·observer를 시작하지 않는다.
TreeWalker는 200요소/약 6ms 단위로 나누고 MutationObserver는 변경 영역을 큐에 넣는다.
자체 배지 변경은 무시하며 삭제 노드와 순회 cursor 연결 여부를 함께 검사한다.
숨김은 구독·작업·배지·Map을 해제하고 복귀는 최신 캐시를 다시 읽는다.
일반 pagehide는 리스너까지 제거하고 BFCache는 복귀 이벤트만 유지한다.
[설계·버그 재현·성능과 제한](../../../docs/APPLICATION_HISTORY_BADGES.md)을 따른다.

팝업은 초기 세로 구성(별도 사이트 안내줄·세로 건수·전체 너비 버튼)을 유지한다.
`지원 이력 표시` details는 핵심 연결 상태만 한 줄로 노출하고 스위치·최근 동기화·미식별·갱신은 펼쳤을 때 보여준다.
수집 슬롯 건수와 웹앱 비교 공고 수는 별개이며 0개 안내는 미지원 판정이 아니다.

잡코리아의 확인된 CardJob 검색 카드 안에서는 Title 링크 하나만 표시한다.
카드 내부의 동적 변경은 해당 카드 단위로 재검사해 제목 추가/삭제 시 이전 위치를 정리한다.
같은 공고가 다른 카드에 나오면 각각 표시하며 공고 식별과 상태 분류는 기존 공통 URL 계약을 따른다.
