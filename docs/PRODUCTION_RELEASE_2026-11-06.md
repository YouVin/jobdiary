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

배포·Pages 게시 검증 진행 중. 확인된 PR·커밋·CI·배포ID와 운영/공개 본문 검증 결과를 이슈 #141과 배포 PR에 남긴다.
