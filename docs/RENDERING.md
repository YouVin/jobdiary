# 렌더링 경계

현재 구현 기준: 2026-10-15 (#83). Next.js App Router의 Server Component와 Client Component 경계를 기록한다. 이 구분은 사용자 데이터의 서버 조회 여부와 별개다.

| 경로 | 서버 컴포넌트 | 클라이언트 컴포넌트 |
|---|---|---|
| `/`, `/account` | `src/app/(protected)/layout.tsx`의 공통 헤더·본문 틀과 각 `page.tsx` | `AuthGuard`, `DashboardClient`, 계정 관리 폼·동작 |
| `/login` | `src/app/login/page.tsx`의 배치·시각 요소 | `LoginForm`과 인증 동작 |
| `/reset-password`, `/update-password` | 각 `page.tsx`의 배치 | 재설정 폼과 복구 세션 처리 |
| 모든 경로 | `src/app/layout.tsx`의 문서·폰트 설정 | `AuthProvider`의 세션 구독 |

`(protected)`는 URL에 포함되지 않는 route group이다. `/`와 `/account`만 공통 레이아웃을 거치고 로그인·비밀번호 재설정 화면은 거치지 않는다. 레이아웃은 Server Component이며 `AuthGuard`에 서버에서 만든 자식 UI를 `children`으로 전달한다. `AuthGuard`는 브라우저에서 인증 상태를 확인한 뒤 자식을 보여준다.

현재 Supabase 클라이언트는 브라우저 세션을 사용한다. 대시보드 데이터는 `DashboardClient`가 인증 후 `applicationStore`를 통해 조회하며, 서버 페이지는 개인 지원 내역을 읽지 않는다. 따라서 이 구조를 사용자별 데이터 SSR이나 서버 측 접근 제어로 간주하지 않는다. 데이터 권한은 Supabase RLS가 담당한다. 인증 상세는 [AUTH](AUTH.md), 데이터 정책은 [SUPABASE](SUPABASE.md)를 따른다.

새 화면은 서버에서 처리할 수 있는 정적 구조를 `page.tsx`나 `layout.tsx`에 두고, 상태·이벤트·브라우저 API가 필요한 부분만 Client Component로 분리한다. 사용자별 데이터의 서버 렌더링이 필요해지면 서버에서 읽을 수 있는 세션 방식, 서버 측 사용자 검증, 데이터 조회 위치, 로그인·복구 흐름을 함께 설계한다. 현재 브라우저 세션만 서버 컴포넌트에서 재사용하는 방식으로 옮기지 않는다.

근거: 설치된 Next.js 16.2.9의 `node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`, `03-layouts-and-pages.md`, `03-api-reference/03-file-conventions/route-groups.md`.
