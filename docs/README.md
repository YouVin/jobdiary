# 개발 문서 인덱스

마지막 정리: 2026-10-14 (#75). 구현 상태는 이 저장소 기준이며 배포·외부 서비스 상태는 별도로 확인한다.

## 필요한 부분부터 읽기

1. [개발 규칙](WORKING_AGREEMENT.md)과 아래 표에서 작업에 해당하는 문서만 읽는다.
2. `rg`로 관련 절과 진입 파일을 찾는다. 이미 읽은 문서는 변경되었거나 새 정보가 필요할 때만 다시 읽는다.
3. 프레임워크 API를 수정할 때는 설치된 `node_modules/next/dist/docs/`에서 해당 가이드를 먼저 확인한다.
4. 코드와 문서가 다르면 실제 구현을 확인하고 같은 작업에서 관련 문서를 갱신한다. 의도적인 설계 변경은 이유와 범위를 남긴다.

| 작업 | 문서 | 코드 진입점 |
|---|---|---|
| UI 스타일·SVG 규칙 (#81) | [DESIGN_SYSTEM](DESIGN_SYSTEM.md) | `tailwind.config.ts`, `src/components/common/`, `public/icons/` |
| 미사용 후보 조사 (#81) | [UNUSED_AUDIT](UNUSED_AUDIT.md) | 소스·자산·직접 의존성 참조 근거 |
| 개발 순서·현황 | [ROADMAP](ROADMAP.md), [CONVENTION](CONVENTION.md) | `package.json`, `.github/workflows/ci.yml` |
| 화면·구조 | [TECH_DESIGN](TECH_DESIGN.md) | `src/app/(protected)/`, `src/components/dashboard/`, `src/components/board/` |
| Server/Client 렌더링 (#83) | [RENDERING](RENDERING.md) | `src/app/(protected)/layout.tsx`, `src/components/auth/AuthGuard.tsx` |
| 검색·필터 (#73) | [DASHBOARD](DASHBOARD.md) | `src/utils/applicationFilters.ts`, `src/components/dashboard/ApplicationFilters.tsx` |
| 공고 마감일·자동 탈락 (#85) | [DEADLINE](DEADLINE.md) | `src/utils/applicationDeadline.ts`, `src/lib/applicationsApi.ts`, `supabase/migrations/` |
| 헤더 로고·홈 이동 (#79) | [TECH_DESIGN](TECH_DESIGN.md) | `src/components/header/Header.tsx` |
| 가져오기·중복 판별 | [INTEGRATION](INTEGRATION.md) | `src/hooks/useExtensionImport.ts`, `src/utils/extensionImportPlan.ts`, `src/utils/duplicateDetection.ts` |
| 저장·DB | [SUPABASE](SUPABASE.md) | `src/lib/applicationsApi.ts`, `src/store/applicationStore.ts`, `supabase/` |
| 로그인·계정 | [AUTH](AUTH.md) | `src/lib/auth.ts`, `src/components/auth/`, `src/components/account/` |
| 보안 점검·릴리즈 보류 | [SECURITY](SECURITY.md) | `package.json`, `.github/workflows/ci.yml` |
| 익스텐션 계약 | [EXTENSION](EXTENSION.md), [INTEGRATION](INTEGRATION.md) | `src/lib/extensionImport.ts` (익스텐션 구현은 별도 저장소) |
| 제품 방향 | [PLANNING](PLANNING.md) | 기획·목표 자료이며 구현 완료 증거로 사용하지 않는다 |

## 검증

```sh
npm test
npm run lint
npx tsc --noEmit
npm run build
```

Windows PowerShell에서 실행 정책으로 `npm.ps1`이 차단되면 `npm.cmd`, `npx.cmd`를 사용한다. 파일 권한 오류는 실행 정책 문제와 구분한다.
테스트는 `tests/*.test.mjs`와 기존 소스 로더를 사용한다. 표시 문구만 변경한 경우처럼 영향이 작으면 불필요한 테스트를 추가하지 않는다.
UI 작업은 관련 화면의 모바일·데스크톱·키보드 동작을 확인하고, 실행하지 못한 검증은 PR에 명시한다.
검사가 통과한 후에는 코드 변경이나 새 문제가 없는 한 반복 실행하지 않는다.

## 이슈와 PR

독립적인 기능마다 이슈 → dev 기반 작업 브랜치 → 관련 코드·문서·검증 → 커밋 → dev 대상 PR 순으로 진행한다.
PR은 문제와 달라진 동작, 검증 결과를 간결히 쓰고 `Closes #번호`로 연결한다. 실제 병합 후 이슈 종료를 확인한다.
자동 종료 여부는 기본 브랜치 설정에 따라 달라지므로 상태를 확인한다. 배포는 별도 `dev → main` PR로 진행한다.
라벨·마일스톤은 기존 항목 중 맞는 것이 있을 때 사용하며, 없으면 새 분류를 불필요하게 만들지 않는다.
