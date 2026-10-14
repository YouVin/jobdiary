# 미사용 후보 조사

2026-10-14, #81. 소스 import, 정적 경로, 패키지 사용처를 검색한 결과다. 동적 외부 참조까지 완전히 증명하는 분석은 아니며, 아래 후보는 삭제하지 않았다.

## 삭제 검토 후보

| 대상 | 근거 | 권장 처리 |
|---|---|---|
| `public/file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg` | 초기 템플릿 자산. src·설정·테스트에서 경로 참조 없음 | 외부에서 직접 링크한 곳이 없다면 별도 정리 이슈로 삭제 가능 |
| `@dnd-kit/sortable` | package.json에 있으나 src·tests에 import 없음. 현재 칸반은 core의 useDraggable/useDroppable 사용 | 카드 순서 정렬 계획이 없다면 직접 의존성 제거 검토 |
| `@dnd-kit/utilities` | 직접 import 없음 | core 등 전이 의존성은 필요할 수 있음. package.json 직접 선언만 검토하고 lockfile에서 강제로 제거하지 않기 |
| `src/lib/storage.ts`의 `getApplications()` | 함수 정의 외 호출·import 없음 | 이전 localStorage 읽기 함수만 제거 검토 |
| `STATUS_INFO.color`, `PLATFORM_INFO.bg/text` | 현재 UI는 label만 읽고 색은 Tailwind 토큰 매핑 사용 | 색상 중복 정의만 정리 검토. 상수 객체 전체는 사용 중 |

## 삭제하면 안 되는 항목

- `src/lib/storage.ts` 전체: `applicationStore.resetApplications()`가 로그아웃 시 `saveApplications([])`로 이전 저장값을 비운다. 테스트도 이 경계를 mock한다.
- `pretendard`: 일반 JS import가 없어도 app/layout.tsx의 next/font/local이 패키지의 WOFF2 경로를 사용한다.
- `react-dom`: React/Next 런타임 의존성이다. 직접 import가 없다는 이유로 제거하지 않는다.
- `@types/chrome`: 웹앱에서 chrome.runtime.sendMessage와 lastError 타입을 사용한다.
- `src/app/*/page.tsx`, `layout.tsx`, `favicon.ico`, Next/Tailwind 설정 파일: 프레임워크 진입점이므로 일반 import 개수로 판단하지 않는다.
- `supabase/`의 SQL·체크·Edge Function: 배포/운영 도구에서 실행하며 프론트엔드 import 대상이 아니다.
- `.claude/` 등 사용자 로컬 설정은 조사·삭제 범위에서 제외했다. `.next/`와 node_modules는 생성물/설치물이며 소스 미사용 파일로 분류하지 않는다.

## 이번 변경에서 정리한 것

인증 전용 스타일 파일은 `common/formStyles.ts`로 통합했으며 모든 소비자의 import를 변경했다. 기존 SVG 도형은 `public/icons/`로 이동했다. 오래된 파일을 무조건 지우는 작업과 구분한다.
일반 src 모듈 중 파일 전체가 참조되지 않는 항목은 이번 정적 import 조사에서 발견하지 못했다.
