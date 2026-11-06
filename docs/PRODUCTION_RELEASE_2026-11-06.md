# 모노레포 운영 반영과 공개 정책 게시

2026-11-06 · #141. 사용자가 최신 main 반영·운영 배포 확인·공개 개인정보처리방침 확인을 요청했다.

## 배포 전 기준

- 운영 main b0c87dcfe7d035c39bee58583a5dd5a86c72d572, Vercel 배포 dpl_DjUk2SES759VcSQicFZdhPgh7oeo, jobdiary.vercel.app.
- 검증된 dev 6d09a7bad2e40c252710ffec4c724ccaf2a22529. [dev CI 성공](https://github.com/YouVin/jobdiary/actions/runs/42226705797).
- main은 dev의 조상이며 분기 충돌이 없다. supabase/의 main/dev 차이는 없어 이번 배포에 DB 마이그레이션은 추가하지 않는다.
- 기존 Vercel 프로젝트 prj_HVbf4Eu1kppSfw3kjUxBMScSr0n0 / team_vxc1nA2QWAk7zrnO5ubroKds와 공개 주소를 유지한다. 루트 vercel.json이 npm ci·build:web·apps/web/.next를 지정한다.
- 확장 소스1.1.0·웹앱0.1.0. Chrome 웹스토어 업로드/심사는 이번 작업에 포함하지 않는다.

## 공개 정책의 출처와 반영 방식

정책의 기준 소스는 apps/extension/docs/PRIVACY_POLICY.md이며, 공개 사용 안내는 같은 폴더의 index.md이다. 시행일2026-11-06, 비교 캐시 항목·기본 자동 표시와 끄기·정확한 공고 ID·지원/취소·로그아웃/계정 변경 정리·데이터 제외 항목을 실제 코드와 대조했다. 웹앱에 가져온 뒤의 처리는 웹앱 /privacy로 연결한다.

기존 youvin.github.io/jobdiary-extension/ 및 /privacy/ 주소를 유지한다. 과거 Pages 배포 이력에서 YouVin/jobdiary-extension의 dev/docs가 실제 게시 원본임을 확인했다. 모노레포에서 기준 문서2개만 기존 저장소의 docs에 동일 내용으로 반영하며, 익스텐션 런타임 소스를 되돌리거나 두 저장소에서 따로 개발하지 않는다. 향후 수정도 모노레포 소스 먼저 → 공개 문서2개만 동기화 → Pages 성공과 실제 본문 확인 순서다.

공개 본문에는 내부 PR/배포 대기 체크리스트를 넣지 않으며 스토어에 아직 배포되지 않은1.1.0 기능을 이미 설치 가능하다고 표현하지 않는다. 기존 공개 URL은 HTTP200뿐 아니라 내용과 시행일까지 확인한다. 정책을 최신 구현에 맞추는 작업이며 법률적 적합성을 보증하는 문서가 아니다.

## 검증 순서와 경계

1. 정책·안내 문서의 UTF-8·frontmatter·링크·구현 설명을 확인하고 dev에 통합한다.
2. dev→main PR에서 두 앱 CI·운영 ZIP 검사를 확인한 후 병합한다.
3. 실제 운영 배포가 새 main SHA로 READY인지, 공개 도메인이 그 배포를 가리키는지 확인한다.
4. 운영 주소의 로그인·가입·정책·보호 화면, 정적 자산과 콘솔 오류를 확인한다.
5. 별도 Chrome 프로필에서 실제 운영 웹앱과 실제 MV3를 사용하되 Auth/DB HTTP는 예시로 격리해 가져오기→비교 캐시→공고 표시→로그아웃 흐름을 검증한다. 개인 운영 DB 행을 읽거나 쓰지 않는다.
6. 기존 공개 정책 본문의 시행일·비교 캐시·자동 표시·끄기·정리 설명, 모노레포 기준 문서와의 일치를 확인한다.

실제 사용자 OAuth·메일·로그인 계정의 전체 공고·모바일 마감일·스토어 심사/설치 업데이트는 자동 표본 통과로 대신하지 않는다. 필요한 실사용 항목은 #113과 EXTENSION_RELEASE_CHECK.md에 유지한다. 배포와 실제 게시 결과는 확인 후 아래에 기록한다.

## 결과

PR #143을 통해 main b8e7e96a9eb12cbed12fcd7bc4bfecd215f57d04로 운영 반영했다. Vercel dpl_GKkjWLZk7NDfa68LvcUYk2EhTUvp가 READY이며 jobdiary.vercel.app이 같은 배포/커밋을 가리킴을 확인했다. 검증된 dev와 main의 트리는502a6670e4490354a682234939641e5c7da3897a로 동일하다. [main PR CI 성공](https://github.com/YouVin/jobdiary/actions/runs/42236123304).


## 웹앱 공개 정책과 운영 검증 도구

웹앱 /privacy에도 사이트·공고 ID·지원/취소·해시·시각·미확인 건수의 익스텐션 로컬 전달, 데이터 제외 항목, 표시 끄기와 로그아웃 정리를 추가했다. 최초 시행일은 유지하고 최종 수정일을2026-11-06으로 표시했다. 인증·동의 판정/기존 동의 버전·서버 보관 범위·처리위탁 설정은 변경하지 않는다.

기존 실제 웹앱/MV3 검증 도구를 TEST_ORIGIN·HISTORY_REPORT_DIR로 운영 주소에서도 실행할 수 있게 했다. 운영 페이지의 고정 스토어 ID를 별도 프로필에 로드한 실제 운영 ZIP의 unpacked ID로 연결하는 명시적 테스트 어댑터만 사용한다. 호출 payload·외부 메시지 origin 검증·실제 storage·표시 엔진은 그대로 실행한다. 이는 실제 스토어 설치/업데이트 검증이 아니며 Auth/DB는 예시 HTTP로 격리한다.


## 실제 운영 주소와 공개 본문 확인

- https://jobdiary.vercel.app에서 실제 웹앱/MV3 연동10개 시나리오가 통과했다. 가져오기→빈 공고 URL 보완/신규 저장→비교 캐시→배지, 오래된 탭·반복 가져오기·수집 초기화·로그아웃·다른 계정·잘못된 메시지 버전을 확인했다. 콘솔 예외와 예상 밖 요청은0개였다.
- 기존 verify-release-browser.mjs를 같은 운영 주소에서 실행해 정책375/768/1440px, 이메일 미동의 차단/동의, 신규 소셜 동의 재시도, 날짜 검증, 두 탭 편집 충돌, 다중 탭 로그아웃과 이전 계정 지연 응답의7개 시나리오가 통과했다.
- 두 검증은 실제 배포된 코드와 브라우저를 쓰며 Auth/DB HTTP는 예시로 격리했다. 운영 개인 계정/DB 행은 읽거나 쓰지 않았다. MV3 검증의 고정 스토어 ID는 독립 프로필에 로드한 실제 운영 ZIP의 unpacked ID로만 연결했다. 실제 스토어 설치/업데이트나 실제 OAuth/메일을 검증한 결과가 아니다.
- 운영 배포ID를 지정한 최근15분 runtime error/fatal 집계는 빈 결과였다. 관찰 기간의 결과이며 향후 모든 장애가 없음을 보장하지 않는다.
- 기존 공개 정책·안내 URL이 HTTP200이며 시행일2026-11-06·비교 캐시·기본 자동 표시·로그아웃·1.1.0 설치 버전 차이 설명을 실제 제공함을 확인했다. 내부 초안 메모는 공개하지 않았다.
- 공개 문서는 legacy PR YouVin/jobdiary-extension#66으로 반영했다. dev fbeea6b0707d6960567150952790c83ba58813e4의 [Pages 배포 성공](https://github.com/YouVin/jobdiary-extension/actions/runs/42235809299), [CI 성공](https://github.com/YouVin/jobdiary-extension/actions/runs/42235810197)을 확인했다. 기준 문서2개의 내용은 모노레포와 같다.

## 공개 정책 모바일 가로 넘침 후속 수정

375px 실제 공개 화면에서 모바일 보충 URL의 인라인 CODE가387.14px까지 나와 scrollWidth387px를 재현했다. 본문/시행일 문제와 분리해 기록한다. 기준과 게시용 _layouts/default.html에 overflow-wrap:anywhere만 추가해 긴 주소도 줄바꿈한다. 내용을 자르거나 숨기지 않으며 정책 내용·URL·개인정보 처리 동작은 바꾸지 않는다. 최종 실제 공개 화면 재검증과 후속 PR/배포 정보는 이슈 #141 및 legacy #67에 남긴다.

결과 파일은 release/production-release/history/browser-report.json과 public-browser-report.json, 공개 정책/로그인 예시 화면에 보관한다. 최초 배포 후의 기록·문서 레이아웃 후속 반영은 제품 런타임과 구분하며 현재 운영 SHA는 이슈 #141/배포 PR과 Vercel 도메인으로 확인한다.
