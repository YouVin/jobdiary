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

### 지원 보드 개편 운영 반영 전 점검 (#181, 2026-11-19)

main(`502b728`) 이후 dev 변경(#171·#173~#176, 44개 파일)을 운영에 반영하기 전에 확인했다. DB(`supabase/`) 변경은 없다.

- 운영 의존성: `npm audit --omit=dev` 0건. 이번 변경은 의존성을 추가하거나 올리지 않았다. 화면 전환은 Next.js 16.4.6에 포함된 React의 `ViewTransition`을 쓰고, 타입 참조(`react/canary`)만 추가했다.
- 개발 의존성: `npm audit` 전체 13건(높음 4, 중간 9)으로 #168 때 22건보다 줄었다. vite·vitest·undici·zod·source-map-js·minimatch·@typescript-eslint/* 등 빌드·테스트·린트 도구라 배포물에는 포함되지 않는다. 계속 #167에서 추적한다.
- 비밀값: 변경 diff에서 키·토큰·개인키 패턴 없음(검사 명령을 적은 릴리즈 스킬 문서 한 줄만 걸린다). 저장소가 추적하는 환경 파일은 `apps/web/.env.example`뿐이다.
- 코드: 웹앱·익스텐션 소스에 `dangerouslySetInnerHTML`·`eval`·`new Function`이 없고 `innerHTML`은 익스텐션 테스트에만 있다. 새 탭 링크 4개(상세 패널 "공고 열기" 추가)는 모두 `rel="noopener noreferrer"`이고, "공고 열기"는 http(s) 주소일 때만 보인다. 기록 남기기는 React 텍스트로만 표시하고 2000자로 자르며, 저장은 기존 `expectedUpdatedAt` 충돌 검사를 거친다.

### 디자인 개편 운영 반영 전 점검 (#214, 2026-11-24)

main(`a0628c7`) 이후 dev 변경(#199 디자인 개편 #200~#206, PR #207~#213, 177개 파일)을 운영에 반영하기 전에 확인했다. DB(`supabase/`) 변경과 의존성 변경(lockfile)은 없다.

- 운영 의존성: `npm audit --omit=dev` 0건.
- 개발 의존성: `npm audit` 전체 13건(높음 4, 중간 9)으로 #181 때와 같다. vite·vitest·undici·zod·source-map-js·minimatch·@typescript-eslint/* 등 빌드·테스트·린트 도구라 배포물에는 포함되지 않는다. 계속 #167에서 추적한다.
- 비밀값: 변경 diff에서 키·토큰·개인키 패턴 없음. 저장소가 추적하는 환경 파일은 `apps/web/.env.example`뿐이다.
- 코드: 웹앱·익스텐션 소스에 `dangerouslySetInnerHTML`·`eval`·`new Function`이 없고 `innerHTML`은 익스텐션 테스트에만 있다. 새 탭 링크 6개(약관·개인정보 링크, 중복 보기·결과 기다리는 목록·상세 패널의 공고 링크, 홈 요약 카드)는 모두 `rel="noopener noreferrer"`다. 화면 부품을 바꾸는 개편이라 인증(`AuthGuard`)·저장 경로(`applicationStore` → `applicationsApi`)는 그대로이고, 운영 빌드 fixture 검증(release 14 등)으로 계정 전환 격리·편집 충돌을 다시 확인했다.
- 복구 기준: 이전 main `a0628c7`, 이전 Production 배포 `jobdiary-24u4tr3bh-youvins-projects.vercel.app`.

### 화면 피드백 운영 반영 전 점검 (#217, 2026-11-24)

main(`f80dd16`) 이후 dev 변경(#215 화면 피드백, PR #216, 7개 파일: 화면 4개·문서 3개)을 운영에 반영하기 전에 확인했다. DB·의존성·익스텐션 변경은 없다.

- 운영 의존성: `npm audit --omit=dev` 0건. 개발 의존성 13건(높음 4, 중간 9)은 #214 때와 같고 #167에서 추적한다.
- 비밀값: 변경 diff에서 키·토큰·개인키 패턴 0건. 환경 파일은 `apps/web/.env.example`뿐이다.
- 코드: `dangerouslySetInnerHTML`·`eval`·`new Function` 0건. 바뀐 것은 배치·글자 표시와 로고 이미지 불러오기 시점(`loading="eager"`)뿐이다.
- 복구 기준: 이전 main `f80dd16`, 이전 Production 배포 `jobdiary-7gweocwx2-youvins-projects.vercel.app`.

### Claude SDK 추가와 zod 고정 (#226, 2026-11-24)

공고 분석 실측을 위해 웹앱 의존성에 `@anthropic-ai/sdk` 1.7.0(공개 2주 이상 된 버전, 정확한 버전으로 고정)을 추가했다.

- 문제: SDK는 `zod`를 선택적 짝 의존성(peer)으로 요구한다. 그동안 개발 도구(eslint-plugin-react-hooks)만 쓰던 `zod 4.4.3`이 운영 의존성으로 함께 잡혀, `npm audit --omit=dev`가 **0건 → 1건(높음, zod <4.6.6)**이 됐다.
- 수정: 웹앱 의존성에 `zod 4.6.7`(2026-10-12, 수정 버전 이후 2주 이상)을 명시하고, 루트 `overrides`로 저장소 전체 zod를 4.6.7 하나로 맞췄다. zod를 쓰는 개발 도구(eslint-plugin-react-hooks, zod-validation-error)는 모두 `^3.25.0 || ^4.0.0`을 허용한다.
- 결과: 운영 의존성 **0건**, 전체 **13건 → 12건**(높음 4 → 3, zod 해결). lint·웹 테스트 140개·타입 검사·웹 빌드·익스텐션 테스트 221개 통과.
- 설치 함정: `apps/web/node_modules/.release-tools`(브라우저 검증 도구, 자체 package.json 보유)가 있으면 npm 11.7.0 설치가 `Cannot read properties of null (reading 'location')`로 멈춘다. 설치할 때만 이 폴더를 잠시 옮겼다가 되돌린다.
- API 키(`ANTHROPIC_API_KEY`)는 `apps/web/.env.local`에만 두고, 측정 스크립트는 값을 출력하지 않는다. 공고 원문·결과 폴더 `apps/web/.eval/`는 커밋하지 않는다.

### 회사 정보(AI) 운영 반영 전 점검 (#250, 2026-11-25)

main(`19ce64e`) 이후 dev 변경(PR #219~#249, 82개 파일)을 운영에 반영하기 전에 확인했다. 회사 정보 AI(#226~#243), 익스텐션 공고 읽기(#238)·팝업(#239)·지원 이력 배지(#246), 중복 판별(#220)이 들어 있다.

- 운영 의존성: `npm audit --omit=dev` 0건. 개발 의존성 12건(높음 3: vite·undici·source-map-js, 중간 9)은 #226 때와 같고 #167에서 추적한다. 의존성 변경은 #226의 `@anthropic-ai/sdk` 1.7.0·`zod` 4.6.7 고정뿐이다.
- 비밀값: 변경 diff의 키 패턴 일치는 모두 변수 이름(`ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`)과 설명 문장이고 값은 없다. Anthropic 키는 Supabase 비밀값과 로컬 `apps/web/.env.local`에만 있다. 추적하는 환경 파일은 `apps/web/.env.example`뿐이다.
- 코드: 웹앱·익스텐션 소스에 `dangerouslySetInnerHTML`·`eval`·`new Function` 0건.
- 서버(Edge Function, 이미 운영 배포됨):
  - `company-info`: JWT 필수(verify_jwt), 지원은 요청자 권한(RLS)으로 읽고, 서류 통과 전 지원은 403 `stage_not_ready`(한도·AI 호출 없음), 하루 5번 한도는 DB 함수 한 문장으로 센다. AI에는 공고 내용과 회사 이름만 보내고 사용자 id·이메일은 보내지 않는다.
  - `posting-image`: JWT 필수, 잡코리아·사람인 이미지 서버 허용 목록(공유 계약과 테스트로 비교)·https만·리다이렉트 거절·이미지 형식·10MB 상한으로 서버를 거친 내부망 접근(SSRF)을 막는다. 받은 이미지는 저장하지 않는다.
  - 배포본 확인: 운영 `company-info`(v5)를 내려받아 dev의 `index.ts`·`handler.ts`·`analysis.ts`·`strengths.ts`와 같음을 비교했다. `posting-image` v1 배포 확인. 무인증 호출 401은 #230 때 확인했다.
- DB: 마이그레이션 `20261124120000_company_info.sql`(표 3개·한도 함수 2개)은 운영에 적용돼 있다(#230, 확인 SQL 통과). 결과 표는 본인 읽기만, 공고별 결과·사용량 표는 service_role만.
- 익스텐션: 권한 변경 없음(`storage` + 기존 채용 사이트 host 3개). 공고 페이지는 쿠키 없이(`credentials: omit`) 읽는다. manifest 변경은 32px 아이콘 추가뿐이다. 스토어 출시는 이번 웹 배포와 따로 한다.
- 개인정보처리방침: Anthropic 처리위탁·국외 처리, 공고 이미지 미저장, 익스텐션 공고 페이지 읽기와 서버 이미지 대신 받기를 #229·#238에서 추가했다.
- 복구 기준: 이전 main `19ce64e`, 이전 Production 배포 `jobdiary-ac4if0r5a-youvins-projects.vercel.app`.

### 개발 도구 취약점 정리 1차 (#167, 2026-11-25)

- 전체 `npm audit`: **12건(높음 3, 중간 9) → 7건(중간 7)**. 운영 의존성은 계속 0건.
- 고친 것: vite 8.1.3 → 8.1.7, vitest 4.1.11 → 4.1.12(익스텐션 개발 의존성을 정확한 버전으로 고정), undici 7.29.0 → 7.30.2(jsdom 경유), source-map-js 1.2.1 → 1.2.2.
- 2주 기준: 새로 고르는 버전이 모두 공개 2주가 지나도록 `npm install --before=2026-11-11`로 설치했다. 처음에는 `npm audit fix`·`npm update`가 6일·하루 전에 나온 하위 패키지(source-map-js 1.2.4, tinyexec 1.4.0, @rolldown/pluginutils 1.1.1)를 골라 되돌렸다.
- 함정: 루트 `overrides`와 lock 항목을 손으로 지우는 방식은 npm이 숨은 lock(`node_modules/.package-lock.json`)을 믿고 빠진 패키지를 다시 찾지 않아 source-map-js·undici가 설치에서 아예 빠졌다. 원래 lock으로 `npm ci` 후 위 방식으로 다시 했다.
- 배치: vite·vitest가 루트로 올라가며 익스텐션 폴더의 jsdom을 못 찾아 테스트가 실패했다. 익스텐션 폴더 패키지 배치를 다시 정해 jsdom도 루트로 올렸다. 이때 익스텐션 react가 웹앱 고정값(19.2.4)으로 합쳐져, 스토어 1.2.0과 같은 19.2.7로 익스텐션 react·react-dom을 고정했다.
- 남은 7건: typescript-eslint 8.62.1 경로(minimatch 10, 린트 전용). 고친 8.73.0이 2026-11-16 공개라 2026-11-30 이후 올린다(#167 유지).
- 익스텐션: 스토어에 제출한 1.2.0 ZIP(SHA256 2d4eccb7…ec74)은 그대로 두었다. 새 도구로 빌드하면 번들 파일 이름·내용이 달라지므로 다음 출시 때 새로 검증한다.
- 검증: lint·웹 테스트 172개·tsc·웹 빌드, 익스텐션 테스트 231개·tsc·빌드 통과.

### Supabase 자동 반영 비밀값 (#258, 2026-11-25)

- GitHub Actions `supabase-deploy.yml`이 main push에서만 운영 DB·Edge Function에 반영한다. PR·dev에서는 돌지 않는다(포크 PR에 비밀값이 넘어가지 않음).
- 비밀값 `SUPABASE_ACCESS_TOKEN`(개인 접근 토큰)·`SUPABASE_DB_PASSWORD`·`SUPABASE_PROJECT_ID`는 Actions Secrets에만 둔다. 저장소·로그·채팅에 쓰지 않는다. 워크플로는 값이 비어 있는지만 확인하고 출력하지 않는다.
- 권한: `contents: read`만. setup-cli 액션은 커밋 SHA(v3.2.0)로, CLI는 2.112.0으로 고정했다(2주 기준).
- 토큰이 유출되면 Supabase 계정 → Access Tokens에서 폐기하고 새로 등록한다. DB 비밀번호를 바꾸면 Secrets도 함께 바꾼다.

## 릴리즈 판단 (#96·#97)

계정 격리(#90), 편집 충돌(#93), 날짜 검증(#94)을 dev에 병합했다. #96·#97에서 정책 페이지·동의 확인을 추가하고 마이그레이션 이력 3건을 원격과 맞췄다. 브라우저 검증과 제한은 [RELEASE_CHECK](RELEASE_CHECK.md)에 기록한다. 사용자가 후속 검증과 main 병합까지 승인했으며, CI 통과를 확인한 커밋만 병합한다.

2026-10-17 Supabase 조직 `jobdiary`는 Free 플랜이다. [유출 비밀번호 보호](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)는 Pro 이상에서만 제공되어 활성화하지 못한다. RLS·역할 권한 점검은 통과했고 Advisor에는 이 경고 1건만 남는다. 무료 운영의 잔여 위험으로 공개 추적하며 유료 전환 시 활성화한다. 비밀번호 유출 검사가 적용된 것으로 주장하지 않는다. 유료 플랜 자동 전환이나 기존 비밀번호 일괄 변경은 하지 않았다.
