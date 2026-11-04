# 웹앱·익스텐션 모노레포 이전

작업일: 2026-11-04
통합 저장소: `YouVin/jobdiary`
작업 브랜치: `chore/monorepo`

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

- Node.js 22.12 이상, npm 11 이상을 사용한다. CI는 Node.js 22를 사용한다.
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

운영 반영 전에 Root Directory를 `apps/web`로 지정하고 다음 설정을 확인한다.

- 저장소 루트의 workspace 잠금 파일을 사용하는 설치 (`npm ci`).
- 앱 폴더에서의 빌드 `npm run build`, Next.js 기본 출력 `.next`.
- 프로젝트 루트 바깥의 workspace 소스를 빌드에 포함하도록 허용.
- 기존 환경 변수, 저장소 연결, 운영 브랜치, 도메인 유지.
- Root Directory는 Vercel 프로젝트 설정이다. `vercel.json`에 `rootDirectory` 키를 추가하지 않는다.

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
기존 저장소·Pages를 삭제하거나 설정을 바꾸지 않았으므로 현재 공개 문서는 이전 게시본을 계속 사용한다.
정책 변경을 공개할 때 기존 게시 경로를 유지해 갱신할지, 별도 게시 워크플로를 만들지 7단계에서 처리한다.

## 검증

통합 설치 후 전체 lint·테스트·빌드, 소스·이력·환경 제외 검증을 진행한다.
최종 결과는 검증이 끝나면 이 절에 기록한다.

## 다음 단계

공통 메시지 계약과 자동 표시 구현은 아직 추가하지 않았다.
4단계에서 실제 Chrome 로그인 환경의 마감일 수집·실패 시 보존·웹앱 전달을 검증한다.
