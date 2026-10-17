# 미사용 후보 조사

2026-10-17, #99. #81의 후보를 다시 검사해 실제 미사용 항목을 제거했다. TypeScript 모듈 해석으로 페이지·레이아웃 10개에서 소스 70개가 모두 연결되는 것을 확인했다. import 그래프에 도달하지 않는 소스 파일은 없었다. 정적 자산·패키지는 소스, 테스트, 스크립트, 설정의 참조도 함께 검색했다.

## 제거한 항목

| 대상 | 근거 | 처리 |
|---|---|---|
| `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | 초기 템플릿 자산. 소스·설정·테스트에서 경로 참조 없음 | 파일 5개 삭제 |
| `@dnd-kit/sortable` | import 없음. 현재 칸반은 core의 useDraggable/useDroppable 사용 | npm uninstall로 직접 의존성과 lock 항목 제거 |
| `@dnd-kit/utilities` | 직접 import 없음 | 직접 선언만 제거. core가 사용하는 전이 의존성은 유지 |
| `src/lib/storage.ts`의 `getApplications()` | 함수 정의 외 호출·import 없음 | 이전 localStorage 조회 함수 제거 |
| `STATUS_INFO.color`, `PLATFORM_INFO.bg/text` | 현재 UI는 label만 읽고 색은 Tailwind 토큰 매핑 사용 | 미사용 색상 필드와 타입 제거 |

## 사용 중이어서 유지한 항목

- `src/lib/storage.ts` 전체: `applicationStore.resetApplications()`가 로그아웃 시 `saveApplications([])`로 이전 저장값을 비운다. 테스트도 이 경계를 mock한다.
- `pretendard`: 일반 JS import가 없어도 app/layout.tsx의 next/font/local이 패키지의 WOFF2 경로를 사용한다.
- `react-dom`: React/Next 런타임 의존성이다. 직접 import가 없다는 이유로 제거하지 않는다.
- `@types/chrome`: 웹앱에서 chrome.runtime.sendMessage와 lastError 타입을 사용한다.
- `src/app/*/page.tsx`, `layout.tsx`, `favicon.ico`, Next/Tailwind 설정 파일: 프레임워크 진입점이므로 일반 import 개수로 판단하지 않는다.
- `supabase/`의 SQL·체크·Edge Function: 배포/운영 도구에서 실행하며 프론트엔드 import 대상이 아니다.
- `.claude/` 등 사용자 로컬 설정은 조사·삭제 범위에서 제외했다. `.next/`와 node_modules는 생성물/설치물이며 소스 미사용 파일로 분류하지 않는다.
- `public/icons/`의 12개 SVG는 공통 Icon의 이름 매핑이나 Google 버튼에서 사용한다.
- docs는 개발 지침·설계 이력·검증 기록으로 쓰이며, 오래된 설명은 현재 코드에 맞게 수정한다.
- `scripts/verify-release-browser.mjs`는 수동 릴리즈 검증용이다. package.json script가 없어도 RELEASE_CHECK.md에 실행 방법이 있다.

## 검증

테스트 64개·lint(UI 규칙 포함)·프로덕션 빌드가 통과했다. `npm ls`에서 core → utilities 전이 의존성 유지도 확인했다. 외부에서 템플릿 SVG URL을 직접 링크한 경우까지 탐지하는 분석은 아니다. 현재 앱이 제공하는 기능과 화면은 유지한다.
