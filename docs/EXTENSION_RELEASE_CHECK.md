# 익스텐션 통합 검증과 출시 준비

2026-11-06 · [#137](https://github.com/YouVin/jobdiary/issues/137). 사용자가 라벨 개선 → 실사용 검증 → 출시 준비를 마친 뒤 버전 갱신을 요청했다.

## 현재 판정

| 단계 | 상태 | 근거 |
| --- | --- | --- |
| 1. 라벨 가독성 | 개발·자동 검증 완료 | [PR #136](https://github.com/YouVin/jobdiary/pull/136), 흑백·기호·대비·390px·키보드·강제 색상 |
| 2. 통합 흐름 | 표본 자동 검증 완료 / 일부 실사용 확인 | 수집/마감일 8개, 웹앱 10개, 개발·운영 표시 각각15개 |
| 3. 출시 준비 | 웹앱 운영·공개 정책 반영 / 스토어 제출 전 | outDir ZIP 수정·바이트 일치·개발 ZIP 거부·사용 안내·정책 초안 |
| 버전 | 소스1.1.0 반영 / 스토어 제출 전 | 사용자 관찰 결과와 자동 검증을 기록했다. 남은 실계정/운영 확인을 전체 성공으로 확대하지 않는다 |

수집 버튼 → 사이트 content script → 수집 슬롯 → 웹앱 가져오기 → 웹앱 자체 로그인/중복 판별/저장 → 비교 캐시 → 같은 공고 배지 흐름을 검증했다. 실제 Chrome MV3·실제 로컬 Next.js UI를 쓰되 사이트 HTTP·Auth/DB는 예시 응답으로 대체했다. 실제 계정/DB가 통과했다고 표현하지 않는다.

## 자동 확인 결과

- 익스텐션221개 테스트와 TypeScript·운영/개발 빌드 통과. 웹앱 제품 코드는 변경하지 않았다.
- 수집/마감일8개: 세 사이트 수집, 잡코리아 날짜 교차 확인/503 실패 보존, 사람인 모바일 보충/로그인 리다이렉트 보존, 재수집 슬롯 교체·외부 전달·웹앱 수신/중복 계획.
- 실제 로컬 웹앱 연동10개: 가져오기 신규/빈 URL 보완, 반복 중복 방지, 오래된 다른 탭, 배지 연결, 초기화의 비교 캐시 보존, 로그아웃 제거, 다른 계정, 잘못된 메시지 버전 거부.
- 개발/운영 표시 각각15개: 팝업·수집·2단계 초기화·CardJob 중복·상세·사람인·캐시 삭제·계정 변경·긴 목록·유휴/반복 제거·여러 탭. 새 배지 글자 대비17.72:1/7.73:1, 24px 높이. [범위와 실제 측정](APPLICATION_HISTORY_BADGES.md)을 따른다.
- 운영 빌드에서는 개발 서버 요청 없이15개 시나리오 통과. 운영 사이트 연동 메시지는 이 표본에서 직접 수행하지 않고 로컬 개발 모드의 실제 웹앱 연동과 별도로 확인한다.
- 저장소 실패·늦은 응답·숨김/BFCache·무효 컨텍스트의 기존 단위 테스트를 유지한다. 실제 인터넷 장애와 사용자 브라우저의 모든 숨김 탭 정책까지 검증한 것은 아니다.

브라우저 결과: release/deadline-validation/browser-report.json, release/history-validation/browser-report.json, release/badge-validation/browser-report.json, release/extension-release-validation/production-browser/browser-report.json. 모두 테스트 예시 데이터다.

## 사용자가 실제 Chrome에서 확인할 순서

개발 확인은 localhost:3000과 apps/extension/dist를 사용한다. 확장과 이미 열려 있던 채용 사이트 탭을 새로고침한다. 운영 ZIP은 localhost 연결을 허용하지 않으므로 개발 수집 확인용으로 바꿔 로드하지 않는다. 실제 지원·지원취소를 새로 실행할 필요 없이 기존 기록을 사용한다.

| 확인 | 기대 결과 | 상태 |
| --- | --- | --- |
| 잡코리아 지원현황 수집→가져오기 | 건수/상태 보존, 확인된 마감일이 웹앱 새 기록에 저장 | 기존 수집/날짜 표시는 사용자 확인, 새 흐름 최종 대기 |
| 사람인 수집→가져오기 | PC 지원내역 저장. 날짜 출처가 없거나 모바일 보충이 실패해도 기록 유지 | 대기 |
| 원티드 수집→가져오기 | 기존 지원 상태를 반영하고 화면의 탈락/불합격은 rejected, 날짜와 자동 배지는 생략 | 사용자 탈락 반영 확인 |
| 웹앱 저장 공고의 잡코리아/사람인 목록·상세 | 정확히 같은 공고에 검정 배지 하나. 취소는 밝은 배지, 추천의 다른 공고에는 없음 | 두 사이트 로그아웃 후 라벨 유지 사용자 관찰. 모든 목록/상세는 미확인 |
| 같은 수집 다시 가져오기 | 신규 중복 없음, 수동 상태/메모를 덮어쓰지 않음 | 대기 |
| 설정 끄기/켜기와 수집 초기화 | 끄면 제거·켜면 재표시. 초기화해도 웹앱 기록과 비교 이력은 유지 | 대기 |
| 웹앱 로그아웃/다른 계정 | 기존 계정 배지 제거, 새 계정 이력만 반영 | 대기 |

2026-11-06 사용자 결과: 사람인·잡코리아에서 로그아웃해도 라벨이 보임을 관찰했고 원티드 탈락이 웹앱에 정상 반영됨을 확인했다. 취준일기 저장 이력이 기준이므로 채용 사이트 로그아웃과 독립적인 정상 동작이다. 웹앱 로그아웃은 해당 비교 캐시를 정리한다. 웹앱 로그아웃 후 실제 배지 제거는 자동 브라우저에서 확인했으며, 이 대화를 실계정의 모든 계정 전환/날짜 검증 결과로 확대하지 않는다.

결과는 사이트와 실패 항목 위주로 기록한다. 개인정보가 담긴 화면/응답·인증 토큰·전체 DB 행은 이슈에 올리지 않는다. 지금 확인할 수 없다면 이 표를 미검증으로 유지한다.

## ZIP 오류 재현과 수정

기존 zip 플러그인은 inDir 기본값 dist를 사용했다. --outDir로 검증 빌드를 분리해도 활성 개발 dist를 압축해 개발 고정 키·localhost 로더가 섞일 수 있었다. 이번에 기존 ZIP을 검증한 결과 실제로 운영 ZIP의 개발 key 검사에서 거부돼 재현했다.

dev/releaseArchive.ts는 최종 Vite config.root/build.outDir를 사용해 운영 모드만 압축한다. 기존 플러그인의 에러를 빌드 실패로 전달한다. 검증 도구는 ZIP CRC, 현재 빌드 모든 파일의 바이트 일치, manifest 버전·운영 origin·동일 권한·4개 주입 등록·아이콘 규격·개발 로더/환경 파일 제외를 확인한다. 개발 모드 빌드 후 운영 ZIP SHA256이 유지됨을 확인했다. CI에도 같은 검사를 추가했다.

버전 갱신 전 검증용 ZIP: apps/extension/release/crx-jobdiary-extension-1.0.3.zip, 1.0.3, 30개 파일, 104881바이트, SHA256 9516d60630b1b0f82ce748e2110231f0ba077554dc651ab0b8fe8213adf507d7. 이후1.1.0으로 다시 생성·검증했으며 최종 정보는 아래와 같다. 소스맵/인증 파일/원본 개인 지원 데이터는 포함하지 않는다.

루트 재현 명령:

```powershell
npm run test:extension
npm run build --workspace=jobdiary-extension -- --outDir ../../release/extension-release-validation/production
node apps/extension/scripts/verify-release-package.mjs ../../release/extension-release-validation/production
# 기본 build:extension 후에는 경로 인자 없이 검사한다. 활성 개발 dist를 덮어쓰므로 별도 출력 권장.
```

운영 브라우저 검증은 EXTENSION_PATH를 위 production, HISTORY_ORIGIN을 https://jobdiary.vercel.app, BADGE_REPORT_DIR를 release/extension-release-validation/production-browser로 지정해 기존 verify-history-badges-browser.mjs를 실행한다. 사용자의 Chrome 프로필은 사용하지 않는다.

## 공개 자료·출시 순서

1. 사용자 관찰 결과를 기록하고 package.json과 루트 lock의 확장 버전만1.1.0으로 갱신했다. 웹앱은0.1.0을 유지한다. 미검증 실계정 항목과 운영 검증은 공개 전에 확인한다.
2. [스토어 설명](../apps/extension/docs/STORE_LISTING.md)·[사용 안내](../apps/extension/docs/index.md)·[개인정보처리방침](../apps/extension/docs/PRIVACY_POLICY.md)·[권한 설명](../apps/extension/docs/STORE_PERMISSIONS_JUSTIFICATION.md)과 버전을 대조한다.
3. 기존 youvin.github.io/jobdiary-extension/와 /privacy/ URL은 유지한다. apps/extension/docs를 그 공개 소스로 반영하는 게시 작업을 별도로 진행하고 HTTP200뿐 아니라 비교 캐시·기본 자동 표시·끄기·로그아웃 정리·사이트 범위의 실제 본문까지 확인한다. 기존 저장소를 아카이브하거나 정책 주소를 먼저 바꾸지 않는다.
4. 웹앱 dev→main PR로 모노레포/새 연동을 운영 반영하고 실제 스토어 ID의 설치 확장과 가져오기·동기화를 확인한다. 2026-11-06 PR #143으로 새 연동을 포함한 운영main을 배포했고 실제 운영 주소의 표본 통합 검증을 통과했다. 실제 스토어 설치/업데이트는 별도다.
5. 새1.1.0 운영 ZIP을 생성·검증하고 그 SHA를 기록한다. 최신1280×800 소개5장과 스토어 설명·개인정보 공개 항목을 기존 스토어 항목에 반영한 뒤 심사를 제출한다. 기존 항목/ID를 유지한다.
6. 심사 승인·실제 설치 업데이트 후 Chrome 확장 상세 버전과 공개 동작을 확인한다. GitHub 버전/태그만으로 스토어 업데이트를 완료했다고 표현하지 않는다.

2026-11-06 확인: 기존 공개 정책/소개 URL은 curl HTTP200. 정책 본문에는 비교 캐시·자동 표시 설명이 없는 상태였다. 앱 사용 안내와 정책 초안만 갱신하며 공개 게시·시행일을 임의로 완료 처리하지 않는다.

운영 반영 후 문제가 생기면 자동 표시 스위치로 표시 작업을 끄고 수집/가져오기를 유지할 수 있다. 직전 소스/산출물 SHA를 보존하고 웹앱은 호환되는 배포로 복구한다. 스토어 롤백 가능 여부/경로는 제출 시 대시보드와 공식 안내를 확인한다. DB/수집 데이터 일괄 삭제나 이전 저장소 삭제를 복구 절차로 사용하지 않는다.

확인한 공식 기준: [기존 항목 업데이트](https://developer.chrome.com/docs/webstore/update), [스크린샷 규격](https://developer.chrome.com/docs/webstore/images), [개인정보·공개 정책](https://developer.chrome.com/docs/webstore/program-policies/policies). 단순 버전 증가와 실제 업로드/심사/게시를 구분하며 신규 ZIP에는 변경되지 않은 파일도 포함한다.


## 1.1.0 버전 반영 (#139)

사용자 확인을 받은 뒤 확장만1.1.0으로 갱신했다. 채용 사이트 로그아웃과 웹앱 로그아웃의 차이를 사용 안내 FAQ에 추가했다. 버전 반영 전 운영 빌드와 비교해 manifest.version 외 모든 파일은 동일하다. 1.1.0 TypeScript·운영 빌드·ZIP 파일 단위 검증이 통과했다.

최종 ZIP apps/extension/release/crx-jobdiary-extension-1.1.0.zip · 30개 파일 · 104881바이트 · SHA256 564f3f09ff9e99e95c92ea1284cd3c9c19a1eeb276f59fb9b7c64335b89d8cea. 결과는 release/extension-release-validation/package-report.json에 남긴다. [변경 내역과 검증 범위](../apps/extension/docs/RELEASE_1.1.0.md)를 따른다. 소스 버전 갱신과 운영/스토어 반영은 별개다.


## 운영 및 공개 정책 반영 (#141)

2026-11-06 main b8e7e96을 Vercel 운영에 배포해 READY·jobdiary.vercel.app의 동일 배포 연결을 확인했다. 실제 운영 코드로 웹앱/MV3 연동10개·가입/동의/계정 회귀7개가 통과했다. Auth/DB는 예시 응답, 스토어ID는 독립 프로필의 unpacked ID 연결 어댑터를 사용해 개인 DB/계정을 건드리지 않았다. 공개 익스텐션 정책은 기존 URL에서 새 시행일·비교 캐시·자동 표시를 제공한다. 긴 주소의375px 가로 넘침을 발견해 공개 레이아웃을 보완했다. [배포·검증·공개 정책 근거](PRODUCTION_RELEASE_2026-11-06.md)와 이슈 #141에 최종 게시 결과를 기록한다. 스토어 업로드·심사 및 남은 실계정 날짜 확인은 아직 수행하지 않았다.
