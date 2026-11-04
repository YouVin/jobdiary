# 웹앱·익스텐션 모노레포 이전

작업일: 2026-11-04
통합 저장소: `YouVin/jobdiary`
이전 작업 브랜치: `chore/monorepo`
통합 결과: [PR #112](https://github.com/YouVin/jobdiary/pull/112)를 dev에 병합, 병합 커밋 `f3db5f9`.
의사결정·문제 해결·포트폴리오 근거는 [전환 사례](MONOREPO_CASE_STUDY.md)에 기록한다.

## 소스와 이력

- 웹앱은 검증 기준 `d335faf`에서 시작해 `b0c87dc`의 main 배포 이력을 병합했다.
- 익스텐션 `430b55d`의 이력을 squash 없이 별도 부모로 연결하고 `apps/extension`에 배치했다.
- 미커밋 마감일 작업은 별도 커밋 `debb2df`로 보존했다. 실제 로그인 Chrome 확인은 4단계에 남아 있다.
- 익스텐션 기존 태그는 `extension/v1.0.0`부터 `extension/v1.0.3`까지 이름을 구분해 보존했다.
- 원본 `C:\jobdiary-extension`의 작업 파일과 브랜치는 유지한다.
- 이전 전 검증·복구 자료는 [기준 기록](BASELINE_2026-11-04.md)을 따른다.

## 구조

```text
jobdiary/
  apps/
    web/                 # src, public, scripts, tests 및 Next.js 설정
    extension/           # 익스텐션 소스·설정·문서
  docs/                  # 웹앱 문서와 통합 계획·검증 기록
  supabase/              # 기존 위치 유지
  .github/workflows/ci.yml
  package.json
  package-lock.json      # npm workspaces 전체 잠금 파일
```

현재 workspace는 `apps/web`(`jobdiary`)와 `apps/extension`(`jobdiary-extension`)이다.
`packages/shared`는 계약 추출을 진행하는 5단계에서 추가한다.

## 설치·명령·산출물

- Node.js 22.12 이상 25 미만, npm 11 이상을 사용한다. CI는 Node.js 22를 사용한다.
- 설치는 루트에서 `npm ci`로 수행한다. 앱별 잠금 파일을 추가하지 않는다.
- 두 앱의 기존 잠금 버전·다운로드 위치·무결성 값을 바탕으로 루트 잠금 파일을 생성했다.
  새 레지스트리 버전이나 직접 의존성 버전 변경이 없는지 별도로 확인했다.
- 웹앱 환경 파일은 `apps/web/.env.local`에 둔다. 기존 루트 `.env.local`만 두면 웹앱 설정을 대체하지 않는다.
- 웹앱 개발: `npm run dev:web`, 운영 빌드 실행: `npm start`.
- 익스텐션 개발: `npm run dev:extension`.
- 전체 검증: `npm run lint`, `npm test`, `npm run build`.
- 개별 검증: `test:web`, `test:extension`, `build:web`, `build:extension`.
- 웹앱 산출물은 `apps/web/.next`, 익스텐션은 `apps/extension/dist`와 `apps/extension/release`다.
- Chrome 압축해제 확장 로드는 `apps/extension/dist`를 선택한다.
- 기존 브라우저 검증 스크립트와 선택적 `.release-tools` 설치는 `apps/web`에서 실행한다.
  기존 상세 문서의 웹앱 상대경로·직접 명령도 이 폴더를 기준으로 해석한다.

## 배포와 공개 문서

### 웹앱

기존 Vercel `jobdiary` 프로젝트를 유지한다. 점검 시 프로젝트의 Node 버전은 `24.x`였다.
이번 단계에서 운영 프로젝트 설정은 변경하지 않는다.

기존 Root Directory는 저장소 루트로 유지하고, 브랜치의 루트 `vercel.json`으로 다음을 지정한다.

- 설치: `npm ci`.
- 웹앱만 빌드: `npm run build:web`.
- Next.js 산출물: `apps/web/.next`.
- 환경 변수, 저장소 연결, 운영 브랜치와 도메인은 유지한다.
- 루트 package.json의 Node 범위는 `>=22.12.0 <25`로 지정해 검증하지 않은 새 major로 자동 변경되지 않게 한다.

PR의 첫 자동 Preview는 루트 `.next`를 찾다가 실패했다. 실제 빌드는 성공했으나 산출물이
`apps/web/.next`에 있기 때문이다. 또한 열린 Node 범위로 26이 선택된 것이 로그에 확인됐다.
프로젝트 공통 설정을 바꾸는 대신 소스에 빌드·출력 경로를 지정하고 Node 범위를 제한했다.
이 설정은 모노레포 브랜치에만 있으며 기존 운영 main의 설정은 유지한다.
향후 Root Directory를 별도로 `apps/web`로 옮기면 이 루트 설정을 함께 재검토한다.

Next.js의 `turbopack.root`와 `outputFileTracingRoot`는 저장소 루트를 가리킨다.
상위 폴더의 다른 저장소 잠금 파일을 선택하지 않으며, hoist된 의존성과 향후 공통 패키지를 해석할 수 있다.

웹앱 첫 빌드에서 `next/font/local`이 기존 앱 내부 node_modules 경로의 폰트를 찾지 못했다.
Pretendard는 이제 루트에 설치되므로 `apps/web/src/app/layout.tsx`의 정적 상대경로를
루트 node_modules에 맞췄다. 폰트 파일·설정·표시 방식은 유지한다.

공식 문서: https://vercel.com/docs/monorepos

### 익스텐션

- 버전은 기존 `1.0.3`을 유지한다. 검증용 ZIP을 새로운 출시 버전으로 취급하지 않는다.
- 기존 Chrome 웹스토어 항목과 익스텐션 ID를 유지한다.
- CI는 웹앱·익스텐션 검증을 별도 job으로 실행한다. 자동 배포나 스토어 업로드를 추가하지 않는다.

### GitHub Pages

기존 공개 정책 주소 `https://youvin.github.io/jobdiary-extension/privacy/`를 유지한다.
익스텐션 문서의 Jekyll 설정과 이미지·상대 링크는 `apps/extension/docs` 내부에 보존했다.
새 모노레포의 루트 `docs/`는 기존 익스텐션 Pages의 게시 대상과 같지 않다.
기존 저장소·Pages를 유지했고, 해당 저장소 dev 병합 후 Pages 자동 게시가 성공했다.
모노레포 변경이 기존 Pages로 자동 전달되는 새 워크플로는 추가하지 않았다.
정책 변경을 공개할 때 기존 게시 경로를 유지해 갱신할지, 별도 게시 워크플로를 만들지 7단계에서 처리한다.

## 검증

별도 복제본에서 검증한 뒤 실제 `C:\jobdiary`의 `chore/monorepo` 브랜치에서도 확인했다.

| 검증 | 결과 |
| --- | --- |
| 루트 잠금 파일 기준 `npm ci` | 통과 |
| 실제 폴더의 `npm ls --workspaces --depth=0` | 통과 |
| 실제 폴더의 `npm run lint` | ESLint·UI 스타일 규칙 통과 |
| 실제 폴더의 `npm test` | 웹앱 77개·익스텐션 166개 통과 |
| 실제 폴더의 `npm run build` | Next.js 타입 검사·빌드, 익스텐션 타입 검사·빌드·ZIP 생성 통과 |
| 기존 웹앱 CI의 `npm audit --omit=dev --workspace=jobdiary` | 취약점 0건 |
| 공개 화면 실행 | 로그인·개인정보·약관 HTTP 200, 브라우저 페이지 오류 0건 |
| 폰트·모바일 | 로컬 폰트 HTTP 200, 모바일 로그인 가로 넘침 없음 |
| 익스텐션 개발 서버 | 팝업 HTML HTTP 200, CRXJS 엔트리 준비 HTTP 204 |
| 소스 보존 | 웹앱 소스·자산·스크립트·테스트 110개는 폰트 경로 한 곳만 변경, 익스텐션 src 50개 일치 |
| 이력 보존 | 웹앱 main/dev와 익스텐션 main의 기존 커밋이 모두 현재 HEAD의 조상 |
| 환경·인프라 | 실제 환경 파일·개인키·산출물 미추적, Supabase 파일 변경 없음 |

로컬 검증 시 Node v22.13.1, npm 11.7.0을 사용했다. 이후 GitHub Actions Node 22에서
[최종 PR CI](https://github.com/YouVin/jobdiary/actions/runs/41776466593)와
[병합 후 dev CI](https://github.com/YouVin/jobdiary/actions/runs/41776784781)가 모두 성공했다.
Vercel Node 24 환경의 최종 PR·dev Preview도 READY를 확인했다. 개발 서버에는 기존 CRXJS의 Vite `server.hmr` 관련
폐기 예정 API 경고가 남아 있으며, 빌드와 개발 엔트리 응답은 정상이다.

실제 폴더의 로그는 `C:\jobdiary\release\monorepo-migration\logs`에 있다.
복제본 검증·브라우저 결과와 스크린샷은 2단계 준비 공간의 `logs/monorepo-*`에 보존했다.
검증용 의존성을 실제 폴더로 옮기고 workspace 연결을 새 경로에 맞췄으며,
기존 의존성은 `C:\jobdiary\release\pre-monorepo-2026-11-04\node_modules`에 남겼다.
기존 선택적 브라우저 도구는 `apps/web/node_modules/.release-tools`로 옮겨 보존했다.
로컬 `.claude/`와 기존 루트 환경 파일도 유지했다. 이 자료들은 Git에 포함하지 않는다.

이전 코드 커밋은 `8e2e6e9`이며, 완료 기록은 별도 문서 커밋에 포함한다.
이후 원격 푸시와 PR #112의 dev 병합을 완료했고, 양쪽 저장소의 로컬 dev를 원격과 동기화했다.
병합된 [dev Preview](https://jobdiary-5ng0tdsu9-youvins-projects.vercel.app)는 READY다.
Vercel 프로젝트 공통 설정은 변경하지 않고 브랜치 소스로 배포 경로를 지정했다.
기존 익스텐션 저장소는 dev 병합 후 CI와 Pages 자동 게시가 성공했다.
운영 main 반영과 Chrome 웹스토어 제출은 수행하지 않았다.

## 다음 단계

공통 메시지 계약과 자동 표시 구현은 아직 추가하지 않았다.
GitHub dev 통합과 Preview 배포 경로 확인은 완료했다. 남은 운영·외부 링크 작업은
[전환 정리 체크리스트](MONOREPO_HANDOFF.md)에 유지한다.
사용자 요청으로 4단계를 재개했으며 자동 브라우저 검증과 실제 Chrome 로그인 확인은
[마감일 검증 기록](DEADLINE_VALIDATION.md)에서 구분해 추적한다.
