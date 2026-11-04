# 모노레포 전환 정리 체크리스트

정리일: 2026-11-04
새 기능 개발은 전환 정리 이후에 이어간다.

## 현재 상태

- [x] 실제 개발 폴더를 `C:\jobdiary`, 작업 브랜치를 `chore/monorepo`로 정리했다.
- [x] 웹앱 `apps/web`, 익스텐션 `apps/extension`으로 이동했다.
- [x] 기존 Git 이력과 마감일 작업, 환경 파일, 브라우저 검증 도구를 보존했다.
- [x] lint, 웹앱 테스트 77개, 익스텐션 테스트 166개, 양쪽 빌드를 검증했다.
- [x] 공개 웹앱·익스텐션 안내·개인정보처리방침·웹스토어 주소의 HTTP 200을 확인했다.
- [x] 실행 코드·허용 origin·스토어/개발 ID·Vercel Git 연결과 저장소 주소를 [점검](MONOREPO_LINK_AUDIT.md)했다.
- [x] 통합 브랜치 원격 푸시와 [PR #112](https://github.com/YouVin/jobdiary/pull/112) 생성.
- [ ] 원격 CI, Preview, dev/main 반영 및 Vercel 경로 전환.
- [ ] 기존 저장소 안내와 이력서·포트폴리오 링크 갱신.

모노레포 통합은 [PR #112](https://github.com/YouVin/jobdiary/pull/112)에서 추적한다.
기존 익스텐션은 [PR #64](https://github.com/YouVin/jobdiary-extension/pull/64)를 dev에 병합하고
로컬 dev도 동기화했다. 운영 main·프로젝트 공통 설정·스토어·외부 문서는 별도 후속 작업이다.

## 진행 순서

### 1. GitHub 반영 준비와 검증

- [x] 최신 원격 dev/main을 확인하고 `chore/monorepo`를 푸시했다.
- [x] 기본 브랜치 `dev`를 대상으로 PR #112를 작성했다.
- [ ] 웹앱과 익스텐션의 CI job이 모두 통과하는지 확인한다.
- [ ] 브랜치 보호 규칙에 이전 CI 이름이 지정되어 있으면 새 job 이름에 맞춘다.
  현재 workflow 이름은 `Web lint, test and build`, `Extension test and build`다.
- [ ] 이전 PR은 **merge commit**으로 병합한다. squash/rebase로 기존 익스텐션 부모 이력을 제거하지 않는다.
- [ ] 운영 반영용 dev→main PR에서도 이력을 보존한다.

익스텐션의 과거 커밋이 함께 연결되어 PR의 커밋 수가 많을 수 있다.
이번 이전 변경과 기존 이력을 구분하고, 파일 변경·분리된 마감일 커밋·검증 기록을 기준으로 리뷰한다.
공통 패키지와 지원 이력 자동 표시는 아직 구현하지 않았다.

### 2. Vercel 경로 전환

기존 `jobdiary` 프로젝트와 `https://jobdiary.vercel.app` 주소를 유지한다.

| 설정 | 전환 시 확인할 값 |
| --- | --- |
| Git 저장소 | `YouVin/jobdiary` 유지 |
| Root Directory | 저장소 루트 유지 (`vercel.json`에서 앱 빌드 경로 지정) |
| Install Command | workspace 루트 잠금 파일 기준 `npm ci` |
| Build Command | 루트의 `npm run build:web` |
| Framework / Output | Next.js / `apps/web/.next` |
| 루트 밖 소스 포함 | workspace 의존성을 읽을 수 있도록 허용 |
| 환경 변수·도메인·운영 브랜치 | 현재 값 유지·확인 |
| Node.js | `>=22.12.0 <25`; 로컬·CI는 22, Vercel은 24 계열로 제한 |

- [ ] 현재 프로젝트 설정을 기록하고 새 경로의 Preview 검증 방법을 정한다.
- [x] 운영 프로젝트의 Root Directory를 변경하는 대신 브랜치의 루트 `vercel.json`에 빌드·출력 경로를 지정했다.
  기존 main에는 이 파일이 없으므로 이전 구조와 혼용하는 기간에도 프로젝트 공통 설정을 유지할 수 있다.
- [ ] 새 구조 배포의 공개 화면·정적 자산·로그인·기존 저장 데이터 조회를 확인한다.
- [ ] 운영 반영 후 도메인과 주요 링크를 다시 확인한다.

새 프로젝트·리소스나 인증 정보를 만들 필요가 있다고 가정하지 않는다.
웹앱 URL을 유지하는 이번 이전만으로 Supabase 로그인 콜백이나 익스텐션 허용 origin을 바꾸지 않는다.
실제 변경이 필요한 경우에는 기존 연결을 확인한 뒤 해당 항목만 조정한다.

공식 경로 설정: https://vercel.com/docs/monorepos

### 3. 기존 익스텐션 저장소와 공개 문서

- [x] 기존 익스텐션 dev README에 새 개발 위치를 안내했다. About 수정 여부는 별도로 확인한다.
- [ ] 이전 이슈·릴리스·공개 정책 주소를 유지한다. 과거 이슈 링크를 새 저장소의 같은 번호로 바꾸지 않는다.
- [ ] Pages 게시 방식을 정리하기 전에는 기존 저장소를 삭제하거나 아카이브하지 않는다.
- [ ] 향후 정책을 갱신할 때 `apps/extension/docs`의 내용을 기존 공개 주소에 게시할 방법을 정한다.
- [ ] 기존 저장소의 CI·이슈 접수 안내를 계속 사용할지 정리한다.

README 안내 초안:

> 이 익스텐션의 개발은 [취준일기 모노레포](https://github.com/YouVin/jobdiary)의
> `apps/extension`에서 이어갑니다. 이 저장소는 기존 이슈·릴리스와 공개 안내·개인정보처리방침 주소를 유지합니다.

Chrome 웹스토어 항목과 익스텐션 ID는 유지한다. 폴더 이동을 이유로 새 스토어 항목을 만들지 않는다.
현재 소스에는 미출시 마감일 작업이 포함되어 있다. 실사용 검증과 새 출시 버전 결정 전에는
개발용 `1.0.3` ZIP을 기존 출시본의 새 패키지로 업로드하지 않는다.

### 4. 이력서·포트폴리오 링크

대표 GitHub 링크는 **`https://github.com/YouVin/jobdiary`** 하나를 권장한다.
이미 이 주소를 사용했다면 그대로 유지한다. 아래 세부 경로는 해당 구조가 main에 반영된 뒤 사용한다.

| 현재 사용한 링크 | 처리 |
| --- | --- |
| `https://github.com/YouVin/jobdiary` | 유지 |
| `https://github.com/YouVin/jobdiary-extension` | 대표 모노레포 링크로 교체하거나 익스텐션 하위 폴더 링크 사용 |
| 웹앱 소스 폴더 링크 | `https://github.com/YouVin/jobdiary/tree/main/apps/web` |
| 익스텐션 소스 폴더 링크 | `https://github.com/YouVin/jobdiary/tree/main/apps/extension` |
| 기존 웹앱 `blob/main/src/...` 파일 링크 | `blob/main/apps/web/src/...`로 변경 |
| 익스텐션 과거 이슈·릴리스 링크 | 기존 주소 유지 |
| 웹앱 서비스 주소 | `https://jobdiary.vercel.app` 유지 |
| Chrome 웹스토어 설치 링크 | 기존 항목 ID `afnboeihbppogfinbickjaaadcgjkmil` 유지 |
| 익스텐션 안내·정책 Pages 링크 | 기존 `youvin.github.io/jobdiary-extension/`와 `/privacy/` 유지 |

- [ ] 이력서 원본과 배포한 PDF.
- [ ] 포트폴리오 웹사이트·Notion 등 프로젝트 소개와 README.
- [ ] GitHub 프로필 README, 고정 저장소, 블로그·회고의 코드 링크.
- [ ] 스크린샷·발표 자료의 QR 코드와 링크, GitHub raw 이미지의 파일 경로.

외부 이력서·포트폴리오의 실제 위치는 아직 전달받지 않았다. 이번 작업에서는 링크 수정 대상을
안내했으며 실제 외부 문서는 수정하지 않았다. 새 기능은 구현·출시 상태에 맞춰 설명한다.

### 5. 로컬 개발 환경

- [ ] 편집기와 코딩 도구의 작업 폴더를 `C:\jobdiary`로 연다.
- [ ] 웹앱은 `npm run dev:web`, 익스텐션은 `npm run dev:extension`을 사용한다.
- [ ] 환경 파일은 `apps/web/.env.local`에 있는지 확인한다.
- [ ] 개발용 Chrome 확장의 로드 경로를 `apps/extension/dist`로 확인한다.
  기존 수집 데이터를 보존하고 개발용 익스텐션 ID가 웹앱의 기대값과 일치하는지 확인한다.
- [ ] 원격 반영과 검증이 끝난 뒤, 보존한 기존 의존성·임시 검증 폴더의 정리 여부를 결정한다.

기존 원본 `C:\jobdiary-extension`과 백업은 유지 중이다. 새 구조가 원격에 반영되기 전에 삭제하지 않았다.

## 완료 기준과 재개

원격 코드·CI·웹앱 배포 경로·기존 공개 링크가 정리되고 사용자가 외부 문서 변경 대상을 확인하면
기능 개발을 재개한다. 다음 기능 단계는 기존 계획의 4단계인 마감일 실사용 검증이다.
