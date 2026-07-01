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
    "https://*.saramin.co.kr/*",
    "https://*.wanted.co.kr/*",
    "https://*.jobkorea.co.kr/*"
  ],
  "background": { "service_worker": "src/background/index.ts", "type": "module" },
  "content_scripts": [
    { "matches": ["https://*.saramin.co.kr/*"], "js": ["src/content/saramin.ts"] },
    { "matches": ["https://*.wanted.co.kr/*"], "js": ["src/content/wanted.ts"] },
    { "matches": ["https://*.jobkorea.co.kr/*"], "js": ["src/content/jobkorea.ts"] }
  ],
  "action": { "default_popup": "src/popup/index.html" }
}
```

---

## 5. 셀렉터 찾는 법 (핵심 작업)

```
1. 채용 사이트 "지원 현황" 페이지 접속
2. F12 → 요소 선택 화살표 클릭
3. 회사명 텍스트 클릭 → class 확인
4. content script 셀렉터에 반영
```
---

## 6. 개발 순서

```
사람인 1개 완성 (셀렉터 → 버튼 → 수집 → 저장)
  → 검증되면 원티드, 잡코리아 복제
```

## 7. MV3 주의사항

- service worker는 항상 떠있지 않음 → 전역변수 대신 chrome.storage
- inline script 금지 (파일 분리)
- 비동기 응답 시 listener에서 `return true`
- 권한 최소화 (심사 통과)

## 8. 배포

```
Chrome 개발자 대시보드 등록 ($5 일회성)
→ npm run build → dist 폴더 zip → 업로드 → 심사 (1~3일)
```