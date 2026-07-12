# 크롬 익스텐션 설계

> 별도 레포(`jobdiary-extension`)에서 개발. 웹앱 완성 후 착수.

---

## 1. 개념

크롬 익스텐션은 브라우저에 설치되어 웹페이지를 읽거나 조작하는 프로그램. 채용 사이트에서 유저가 지원한 내역을 감지·수집하는 역할. 2026년 표준인 **Manifest V3**로 만든다.

### 4가지 요소
| 요소 | 역할 |
|------|------|
| manifest.json | 익스텐션 설정 (권한, 진입점) |
| content script | 페이지에 주입되어 DOM에서 정보 추출 (사이트별) |
| service worker | 백그라운드에서 데이터 가공·저장 |
| popup | 아이콘 클릭 시 뜨는 UI |

### 데이터 흐름
```
content script (정보 추출)
  → service worker (가공/중복제거)
  → chrome.storage (저장)
  → popup / 웹앱 (표시)
```

> **진행 상황**: 현재는 content script가 3개 사이트(사람인/원티드/잡코리아)에서 지원내역을 파싱해 `console.table`로 결과를 검증하는 단계까지 완료. service worker(가공/중복제거) · `chrome.storage` 저장 · popup · 웹앱 연동은 다음 단계(연결 챕터)에서 구현 예정.

---

## 2. 스택

```
CRXJS + Vite + React + TypeScript
```
- 웹앱과 스택 통일, 핫 리로드 지원
- 생성: `npm create crxjs@latest`

---

## 3. 데이터 수집 전략

각 사이트는 HTML 구조가 달라 사이트별 전략을 세운다. **유저 브라우저에 이미 로그인된 화면**을 읽는 방식이라 로그인 정보를 서버로 보내지 않는다 (보안 안전).

### 전략 A: 지원완료 감지
지원 완료 페이지/모달을 MutationObserver로 감지해 정보 추출.

### 전략 B: 지원내역 스크래핑 (권장)
유저가 마이페이지 "지원 현황"에 들어가면, 목록 전체를 한 번에 읽어옴. 안정적이고 여러 건 동시 수집 가능.

### 전략 C: 수동 저장 버튼 (백업)
페이지에 "취준일기로 가져오기" 버튼 삽입. 감지 실패 시에도 유저가 직접 저장.

---

## 4. manifest.json 핵심

```json
{
  "manifest_version": 3,
  "name": "취준일기",
  "version": "1.0.0",
  "permissions": ["storage"],
  "host_permissions": [
    "https://www.saramin.co.kr/zf_user/*",
    "https://saramin.co.kr/zf_user/*",
    "https://www.wanted.co.kr/status/*",
    "https://wanted.co.kr/status/*",
    "https://www.jobkorea.co.kr/User/*",
    "https://jobkorea.co.kr/User/*"
  ],
  "background": { "service_worker": "src/background/index.ts", "type": "module" },
  "content_scripts": [
    {
      "matches": ["https://www.saramin.co.kr/zf_user/*", "https://saramin.co.kr/zf_user/*"],
      "js": ["src/content/saramin.ts"]
    },
    {
      "matches": ["https://www.wanted.co.kr/status/*", "https://wanted.co.kr/status/*"],
      "js": ["src/content/wanted.ts"]
    },
    {
      "matches": ["https://www.jobkorea.co.kr/User/*", "https://jobkorea.co.kr/User/*"],
      "js": ["src/content/jobkorea.ts"]
    }
  ],
  "action": { "default_popup": "src/popup/index.html" }
}
```

> **계획 대비 변경**: 초안의 와일드카드(`https://*.saramin.co.kr/*`)와 달리, 실제로는 경로까지 좁히고 `www.` 서브도메인 유무 두 패턴을 모두 포함해 구현했다.
> - 경로 제한: 모바일(`m.`) 서브도메인과 지원 현황과 무관한 페이지 제외
> - `www.` + 맨몸 도메인 병기: 서브도메인 없이 접속하는 URL까지 대응

---

## 5. 셀렉터 찾는 법 (핵심 작업)

```
1. 채용 사이트 "지원 현황" 페이지 접속
2. F12 → 요소 선택 화살표 클릭
3. 회사명 텍스트 클릭 → class 확인
4. content script 셀렉터에 반영
```

---

## 6. 파서 구현 패턴 (계획 이후 정립)

계획서에는 없었지만, 실제로 사이트별 파서를 만들며 공통으로 정립된 규칙.

### data 속성 우선
텍스트 셀렉터보다 견고해서 `data-*` 속성이 있으면 그쪽을 우선 사용한다.
- 사람인: `data-company_nm`, `data-rec_division`
- 잡코리아: `data-memname`, `data-gititle`, `data-applydate`, `data-idx`
- 원티드는 class명이 해시라 `data-*` 대신 부분 매칭 셀렉터(`[class*="..."]`)를 사용

### 다건 순회 + 스킵 처리
지원 현황 목록은 한 페이지에 여러 건이 나열되므로 전체를 순회하며 파싱한다. 빈 `tr`, 헤더 행처럼 실제 지원건이 아닌 행은 스킵.

### 날짜 정규화
사이트마다 날짜 포맷이 달라 파싱 후 공통 포맷(ISO)으로 정규화한다.
- 잡코리아: 14자리 숫자 문자열
- 원티드: `"2026. 7. 11"` 형식
- 그 외 사이트별 원본 포맷도 동일하게 ISO 문자열로 변환

### externalId 현황
사이트별 지원건 고유 ID로, 중복 판별에 사용한다.
- 사람인: `recruitapply_idx` 있음
- 잡코리아: `data-idx` 있음
- 원티드: 고유 ID 없음 → 웹앱 `Application.externalId`도 optional로 정의됨

---

## 7. 개발 순서

```
사람인 1개 완성 (셀렉터 → 버튼 → 수집 → 저장)
  → 검증되면 원티드, 잡코리아 복제
```

## 8. MV3 주의사항

- service worker는 항상 떠있지 않음 → 전역변수 대신 chrome.storage
- inline script 금지 (파일 분리)
- 비동기 응답 시 listener에서 `return true`
- 권한 최소화 (심사 통과)

## 9. 배포

```
Chrome 개발자 대시보드 등록 ($5 일회성)
→ npm run build → dist 폴더 zip → 업로드 → 심사 (1~3일)
```