# 모노레포 주소·연동 점검

점검일: 2026-11-04
점검 대상: `C:\jobdiary`, `chore/monorepo` 브랜치

## 범위와 결론

웹앱·익스텐션 소스, manifest, CI, 설정, README·문서에서 GitHub·Pages·서비스 주소와
익스텐션 ID를 검색했다. 의존성·Git 내부 이력·임시 산출물은 소스 검색에서 제외하고,
생성된 프로덕션 manifest는 별도로 확인했다.
로컬 환경 파일은 GitHub 저장소 참조 여부만 검사했으며 값을 출력하지 않았다.

웹앱과 익스텐션이 통신하는 실행 코드에는 GitHub 저장소 주소가 없다.
통신은 웹앱 origin과 Chrome 익스텐션 ID를 사용하므로 저장소 통합으로 그 주소를 바꾸지 않는다.

## 실행 경로 확인

| 연결 지점 | 현재 값·처리 | 결과 |
| --- | --- | --- |
| 팝업의 웹앱 열기 | 운영 `https://jobdiary.vercel.app/?import=1`, 개발 `http://localhost:3000/?import=1` | 유지 |
| manifest의 웹앱 허용 origin | 운영 서비스만, 개발 빌드에서 localhost 추가 | 소스·프로덕션 산출물 확인 |
| background의 발신 origin 검증 | 위 운영·개발 origin 목록 | 일치 |
| 웹앱 서비스 메타데이터 | `https://jobdiary.vercel.app` | 일치 |
| 웹앱의 운영 익스텐션 ID | `afnboeihbppogfinbickjaaadcgjkmil` | 기존 스토어 항목 ID와 일치 |
| 웹앱의 개발 익스텐션 ID | `dckfpbmglbagcpnkkkdcnbnpjdpfjcde` | manifest 공개키에서 계산한 ID와 일치 |
| 생성된 운영 manifest | 개발 key 없음, 허용 origin은 운영 서비스만 | 정상 |
| 가져오기 요청 | `JOBDIARY_COLLECT` | 양쪽 일치 |
| 가져오기 신호 | `?import=1` | 기존 동작 유지 |
| Vercel Preview 주소 | 현재 확장 통신 허용 대상이 아님 | 의도된 제한 유지 |
| 로컬 환경 파일의 GitHub 저장소 참조 | 루트와 웹앱 `.env.local` | 없음. 값은 출력하지 않음 |

개발 ID는 manifest 공개키의 SHA-256 앞 16바이트를 Chrome ID 문자로 변환해 대조했다.
참고: [Chrome manifest key](https://developer.chrome.com/docs/extensions/reference/manifest/key),
[Chromium ID 구현](https://chromium.googlesource.com/chromium/src/+/refs/heads/main/components/crx_file/id_util.cc).

실제 Chrome에 현재 로드된 확장의 ID와 로그인 후 가져오기 성공을 확인한 결과는 아니다.
개발 검증 시에는 개발 서버가 만든 확장을 사용하고 ID를 확인한다.
프로덕션 ZIP을 압축해제 로드한 ID와 개발용 고정 ID가 같다고 가정하지 않는다.
Preview 화면의 웹앱 자체 실행 확인과 익스텐션 가져오기 확인은 구분한다.
현재 계약의 확장 연동 확인은 허용된 localhost 또는 기존 운영 origin에서 진행한다.

## GitHub 주소가 사용되는 곳

- 대표 저장소·clone·CI 배지: `YouVin/jobdiary`.
- 앱 실행 소스·환경 파일: GitHub 저장소 주소를 통신 대상으로 사용하지 않음.
- Vercel Git 연결: `YouVin/jobdiary` URL로 필터링한 프로젝트 조회에서 기존 `jobdiary` 프로젝트를 확인함.
  Root Directory·운영 반영 설정은 이번 점검에서 변경하지 않았다.
- 기존 Pages: `https://youvin.github.io/jobdiary-extension/`와 `/privacy/`를 계속 사용.
- 과거 이슈: 기존 `YouVin/jobdiary-extension/issues/60`, `/63` 등은 실제 이슈 이력이므로 유지.
- npm workspace 이름 `jobdiary-extension`: 패키지 식별자이므로 GitHub 저장소 이름과 함께 일괄 변경하지 않음.

직전 전환 정리에서 웹앱·Pages 안내·Pages 정책·웹스토어 링크의 HTTP 200을 확인했다.
이 확인은 웹스토어의 현재 공개 버전이나 로그인 기능 전체를 검증한 결과는 아니다.

## 정리한 문서

- 웹앱 작업 메모와 익스텐션 설계 문서의 별도 저장소 개발 설명을 현재 경로로 수정했다.
- 초기 로드맵의 익스텐션 저장소 경로를 `apps/extension` 기준으로 정리했다.
- 익스텐션 README의 프로젝트 구조와 관련 프로젝트 설명을 모노레포 기준으로 정리했다.
- 이전 저장소의 과거 이슈·릴리스·정책 링크는 바꾸지 않았다.

## 후속 작업과 확인 범위

GitHub 원격 반영, Vercel Root Directory 전환, 실제 Chrome의 수집·가져오기,
외부 이력서·포트폴리오의 실제 링크 점검은 [전환 체크리스트](MONOREPO_HANDOFF.md)에 남아 있다.
코드와 설정을 확인한 결과를 전체 운영 연동 완료로 설명하지 않는다.

추가로 현재 웹앱 수신부 `apps/web/src/lib/extensionImport.ts`는 허용 필드만 남기면서
익스텐션의 `url`을 보존하지 않는다. 현재 수집·가져오기의 주소 변경 문제는 아니며,
향후 웹앱 이력 기반 공고 ID 비교를 구현하는 5단계에서 저장·조회 경로와 함께 검토한다.
