# 기술 설계

현재 웹앱 구현 기준, 2026-10-14 (#75). 제품 계획은 [PLANNING](PLANNING.md), 남은 작업은 [ROADMAP](ROADMAP.md)을 참고한다.

## 기술 스택

| 역할 | 기술 |
|---|---|
| 웹앱 | Next.js 16.4.2 App Router, React 19, TypeScript |
| 스타일 | Tailwind CSS 4, tailwind.config.ts 디자인 토큰, Pretendard |
| 상태 | Zustand 지원 내역 스토어, React 화면 상태 |
| 드래그 | @dnd-kit/core |
| 인증·저장 | Supabase Auth / Database |
| 배포 | Vercel (main 배포, dev 통합) |
| 테스트 | Node test runner, tests/loadSource.mjs |

설치 버전은 package.json과 lockfile을 기준으로 한다. 이미지 공유 라이브러리는 아직 도입하지 않았다.

## 데이터 흐름

익스텐션 수집 → 웹앱에서 가져오기 요청 → 응답 검증 → DB의 기존 내역 조회 → 신규 지원만 저장 → 칸반 표시.
이미 저장된 지원은 재수집으로 갱신하지 않는다. 상세 규칙은 [INTEGRATION](INTEGRATION.md).

화면의 변경 요청은 applicationStore.ts → lib/applicationsApi.ts → Supabase로 전달한다.
lib/storage.ts는 이전 localStorage 구현이며 현재 지원 내역 저장 경로가 아니다. 다만 로그아웃 시 이전 저장값을 비우는 saveApplications([]) 호출은 남아 있다.
인증과 DB 정책·적용 이력은 각각 [AUTH](AUTH.md), [SUPABASE](SUPABASE.md)를 참고한다.

## 데이터와 상태

정확한 타입은 src/types/application.ts, 상태 라벨·순서는 src/constants/status.ts, 플랫폼은 src/constants/platform.ts를 기준으로 한다.
문서에 전체 타입을 복제하지 않아 구현과의 불일치를 줄인다.

- 상태 7개: 지원완료, 서류통과, 면접예정, 면접완료, 합격, 탈락, 지원취소.
- 플랫폼: 사람인, 원티드, 잡코리아, 직접입력.
- statusSource는 익스텐션 수집·직접 추가·수동 상태 변경·마감일 자동 분류의 출처다. 외부 입력에서 신뢰하지 않는다.
- 선택적 공고 마감일과 자동 탈락 분류 기준은 [DEADLINE](DEADLINE.md)을 따른다.
- memo, diary, url 필드는 존재하지만 일기·메모 작성 UI는 아직 없다.

## 화면과 진입 파일

| 화면/역할 | 위치 |
|---|---|
| 보호 페이지 공통 서버 레이아웃 | src/app/(protected)/layout.tsx |
| 대시보드 서버 페이지 | src/app/(protected)/page.tsx |
| 계정 서버 페이지 | src/app/(protected)/account/page.tsx |
| 로딩·오류·가져오기 | src/components/dashboard/DashboardClient.tsx |
| 칸반·드래그 | src/components/board/ |
| 지원 추가·편집·삭제 | src/components/modal/ |
| 헤더 로고·홈 이동 | src/components/header/Header.tsx |
| 헤더 버튼 동작 | src/components/header/HeaderActions.tsx |
| 로그인·복구 | src/components/auth/ |
| 계정 관리 | src/components/account/ |

현재 보드는 1열(모바일), 3열(태블릿), 7열(데스크톱) 그리드다.
대시보드와 계정 페이지의 공통 헤더에서 로고·서비스명 전체를 누르면 홈(`/`)으로 이동한다 (#79). Next.js Link를 사용하며 키보드 포커스와 Enter 이동을 지원한다.
두 페이지의 공통 셸과 Server/Client 경계는 [RENDERING](RENDERING.md)에 정리한다 (#83).
카드 클릭 시 지원 정보 편집 모달을 연다. 면접일 입력과 카드 날짜 표시를 지원한다.
일기 작성·상세 통계·공유·다크 모드는 계획이며 현재 구현으로 간주하지 않는다.

색·타이포·모서리·그림자는 tailwind.config.ts, 토큰·정수 간격·SVG 적용 규칙은 [DESIGN_SYSTEM](DESIGN_SYSTEM.md)을 따른다. 폼·버튼 스타일은 src/components/common에서 공유한다.
새 기능 진입점과 검증 명령은 [문서 인덱스](README.md)에 추가한다.
