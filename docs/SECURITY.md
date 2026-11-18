# 보안 점검과 릴리즈

## 의존성 점검 (#89)

2026-10-17 기준 Next.js와 eslint-config-next를 `16.4.2`로 맞추고 lockfile의 수정 가능한 하위 의존성을 갱신했다. 버전과 설치 결과의 기준은 `package.json`과 `package-lock.json`이다.

- `npm audit --omit=dev`: 운영 의존성 취약 패키지 0개.
- `npm audit`: 개발 도구에서 High 5개가 남는다. `braces@3.0.3`의 중첩 패턴 처리 DoS와 이를 사용하는 `micromatch → fast-glob → @next/eslint-plugin-next → eslint-config-next` 경로다. 사용자 입력이 이 경로로 전달되는 앱 기능은 없다. 신뢰할 수 있는 저장소에서 린트를 실행하고 상위 패키지의 수정을 추적한다.
- `npm audit fix --force`는 Next.js ESLint 설정을 `14.2.35`로 내리는 제안을 하므로 사용하지 않는다. 경고를 숨기기 위한 임의 override도 추가하지 않는다.
- CI는 `npm ci` 뒤 운영 의존성 audit을 실행하고, 실패하면 릴리즈 검증을 통과시키지 않는다. audit 통과가 다른 보안 검증을 대체하지는 않는다.

근거: [Next.js 릴리즈](https://github.com/vercel/next.js/releases/tag/v16.4.2), [braces 보안 공지](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm).

### Next.js 16.4.6 (#163, 2026-11-18)

- 문제: 2026-11-17 공개된 [GHSA-mfr8-8qww-v76h](https://github.com/advisories/GHSA-mfr8-8qww-v76h)(중간, Next.js 16.3.0~16.4.4, `use cache` 함수를 `unstable_cache()`로 호출할 때 root params 정보 노출)로 CI의 `npm audit --omit=dev`가 실패해 모든 PR의 웹 검증이 막혔다. 로컬 `next build`도 첫 실행에서 업그레이드 권고를 띄우고 멈췄다.
- 영향: 이 앱은 `use cache`·`unstable_cache`·`cacheComponents`를 쓰지 않아 해당 경로가 없다. CI 규칙(운영 의존성 취약점 0개)을 지키려고 올렸다.
- 수정: `next`와 `eslint-config-next`를 16.4.6(2026-11-09 패치 릴리즈, 버그 수정 백포트)으로 맞췄다. lockfile은 Next.js 관련 패키지 버전만 바뀌었다. 빌드 도구가 출력한 업그레이드 명령(`next upgrade --agent=security`)은 쓰지 않고 버전을 직접 지정했다.
- 검증: `npm audit --omit=dev` 0건, 웹 테스트 110개·익스텐션 테스트 221개, lint·UI 규칙 검사, 웹 빌드(보안 권고로 멈추지 않음), 프로덕션 빌드에서 릴리즈 7·인증 로딩/SEO 4·모달 키보드 4개 항목 통과.

### 홈 대시보드 운영 반영 전 점검 (#168, 2026-11-18)

main(`b67d7b2`) 이후 dev 변경(#161·#163·#165, 12개 파일)을 운영에 반영하기 전에 확인했다.

- 운영 의존성: `npm audit --omit=dev` 0건. 이번 lockfile 변경은 Next.js 16.4.6 관련 패키지뿐이다.
- 개발 의존성: `npm audit` 전체 22건(높음 15, 중간 7). vite·vitest·@crxjs/vite-plugin·undici·zod·@typescript-eslint/* 등 빌드·테스트·린트 도구다. 익스텐션 실행 의존성은 react·react-dom·공통 패키지뿐이고 웹앱 운영 audit도 0건이라 배포물에는 포함되지 않는다. `npm audit fix`는 peer 의존성 충돌(ERESOLVE)로 실패하고 eslint-config-next 경로는 `--force`가 14.2.35로 내리는 제안이라 쓰지 않는다. 이번 릴리즈 범위 밖으로 #167에서 추적한다.
- 비밀값: 변경 diff에서 키·토큰·개인키 패턴 없음. 저장소가 추적하는 환경 파일은 `apps/web/.env.example`뿐이다.
- 코드: 웹앱·익스텐션 소스에 `dangerouslySetInnerHTML`·`eval`·`new Function`이 없고 `innerHTML`은 테스트에만 있다. 새 탭 링크 3개는 모두 `rel="noopener noreferrer"`다. `/board`는 `(protected)` 레이아웃의 `AuthGuard` 아래에 있고 noindex·사이트맵 제외를 검증 스크립트로 확인한다. 마지막 가져오기 시각은 사용자 ID별 브라우저 키에 시각만 저장한다.

## 릴리즈 판단 (#96·#97)

계정 격리(#90), 편집 충돌(#93), 날짜 검증(#94)을 dev에 병합했다. #96·#97에서 정책 페이지·동의 확인을 추가하고 마이그레이션 이력 3건을 원격과 맞췄다. 브라우저 검증과 제한은 [RELEASE_CHECK](RELEASE_CHECK.md)에 기록한다. 사용자가 후속 검증과 main 병합까지 승인했으며, CI 통과를 확인한 커밋만 병합한다.

2026-10-17 Supabase 조직 `jobdiary`는 Free 플랜이다. [유출 비밀번호 보호](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)는 Pro 이상에서만 제공되어 활성화하지 못한다. RLS·역할 권한 점검은 통과했고 Advisor에는 이 경고 1건만 남는다. 무료 운영의 잔여 위험으로 공개 추적하며 유료 전환 시 활성화한다. 비밀번호 유출 검사가 적용된 것으로 주장하지 않는다. 유료 플랜 자동 전환이나 기존 비밀번호 일괄 변경은 하지 않았다.
