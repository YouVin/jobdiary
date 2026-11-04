# GitHub 소개 이미지·사용 방법 그림 재제작

최신 실제 확장 UI를 독립 Chrome 프로필과 예시 데이터로 촬영한 뒤, 흑백 소개 이미지와 사이트별 안내 도식을 만듭니다. 이 폴더가 기존 screenshots의 제작 원본입니다. 운영 페이지·웹스토어 업로드는 실행하지 않습니다.

## 결과물

| 경로(확장 폴더 기준) | 내용 |
| --- | --- |
| docs/store-screenshots/1-overview.png | 수집·가져오기 소개 |
| docs/store-screenshots/2-copy.png | 실제 복사 완료 UI |
| docs/store-screenshots/3-start.png | 빈 상태에서 수집 시작 |
| docs/store-screenshots/4-sites.png | 세 사이트 수집 슬롯 |
| docs/store-screenshots/5-history.png | 실제 엔진이 표시한 지원/취소 배지 |
| docs/store-screenshots/raw/ | 실제 UI 원본과 촬영 manifest |
| docs/usage-guides/guide-*.png | 사이트별 수집 위치 도식 |

소개 이미지 5장은 **1280×800**, 안내 도식 3장은 **1120×760**입니다. 원본 팝업은 360px 화면을 2배 픽셀 밀도로 촬영합니다. 사이트 도식은 실제 로그인 화면이 아니며 이미지 안에도 이를 명시합니다.

## 필요한 도구

프로젝트 런타임 의존성을 늘리지 않기 위해 Playwright는 별도 제작 도구로 둡니다. 기존 .release-tools 설치를 재사용하거나, 루트의 커밋 제외 release 아래에만 설치하세요.

```powershell
# 아래 명령은 모두 모노레포 루트 기준입니다.
npm install --prefix ./release/screenshot-tools --no-save --package-lock=false playwright@1.58.2
npm exec --prefix ./release/screenshot-tools -- playwright install chromium
```

다른 설치를 사용하면 PLAYWRIGHT_MODULE에 playwright/index.mjs의 절대 경로를 지정합니다. BROWSER_EXECUTABLE로 설치된 Chromium 실행 파일을 지정할 수도 있습니다. 라이브러리 설치 위치 검색은 browser.cjs를 기준으로 합니다.

## 생성 순서

실행 중인 Vite의 apps/extension/dist를 덮어쓰지 않도록 **별도 정적 development 빌드**를 사용합니다. HMR 서버는 촬영에 필요하지 않습니다.

```powershell
npm exec --workspace=jobdiary-extension -- vite build --mode development --outDir ../../release/github-screenshots/extension-development
$env:EXTENSION_PATH = (Resolve-Path ./release/github-screenshots/extension-development).Path
# 선택: $env:PLAYWRIGHT_MODULE = 'C:/.../playwright/index.mjs'
# 선택: $env:BROWSER_EXECUTABLE = 'C:/.../chrome.exe'
node apps/extension/scripts/store-screenshots/capture.cjs
node apps/extension/scripts/store-screenshots/compose.cjs
node apps/extension/scripts/store-screenshots/check.cjs
```

Windows 실행 정책으로 npm.ps1이 막히면 npm.cmd를 사용합니다. EXTENSION_PATH를 생략하면 위 별도 출력 경로가 기본값입니다.

## 정확성과 개인정보 경계

- 로그인된 개인 Chrome 프로필을 사용하지 않습니다. 모든 사이트 HTTP는 예시 HTML로 대체하며 외부 서버로 보내지 않습니다.
- 수집 슬롯은 사람인 5·잡코리아 7·원티드 3건, 비교 캐시는 공고 ID가 있는 12건과 미확인 3건입니다. 두 건수의 의미를 합치지 않습니다.
- 사이트 예시의 배지는 DOM에 직접 그리지 않고 실제 확장 엔진이 넣게 합니다. 2개 일치 배지와 일치하지 않는 공고를 함께 보여줍니다.
- 사용자의 운영체제 클립보드를 덮어쓰지 않도록 캡처 프로필에서 클립보드 어댑터만 대체합니다. 실제 UI 핸들러가 만든 15행의 TSV·HTML 표와 완료 상태를 확인하며, 촬영 중에만 완료 표시 복귀 타이머를 늦춥니다. 실제 엑셀·노션 앱에서 붙여넣기를 검증한 이미지로 표현하지 않습니다.
- 실제 source UI commit·촬영 시각·화면 크기·예시 데이터 여부는 raw/capture-manifest.json, 이미지 규격은 render-manifest.json에 기록합니다. 프로필과 빌드 산출물은 release에만 남습니다.
- 기존 스토어 버전과 개발 UI는 다를 수 있습니다. 이 결과를 스토어에 게시했다고 안내하지 않습니다.

## 다시 만들 때

팝업·배지 UI를 바꾸면 capture → compose → check를 모두 실행합니다. 소개 카피만 바꾸면 compose → check로 충분합니다. 문구와 레이아웃은 compose.cjs, 사이트/수집 fixture는 capture.cjs를 수정합니다. 앱 소스에 이미지 촬영용 상태나 임시 사용자 데이터를 넣지 않습니다.
