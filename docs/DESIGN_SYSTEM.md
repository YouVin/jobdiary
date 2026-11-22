# UI 디자인 시스템

2026-10-14, #81. 2026-11-20 #193에서 색·모서리·움직임 기준을 그레이지·검정 강조로 바꿨다(아래 절). 간격·타이포·SVG 규칙은 그대로다. 기준 구현은 `tailwind.config.ts`이며, 이 작업에서 별도 Figma 파일을 조회하거나 수정하지 않았다.

## 간격과 크기

- `h-4`, `w-4`, `gap-2`, `p-3`처럼 정수 Tailwind 단위만 사용한다. 기본 1단위는 4px다.
- `h-4.5`, `gap-1.5`, `p-2.5` 같은 소수 클래스와 이를 숨기는 `h-[18px]` 같은 임의 크기는 추가하지 않는다.
- 카드 패딩 12px(`p-3`), 폼 간격 12px(`gap-3`), 버튼 아이콘 간격 8px(`gap-2`), 보조 문구 간격 4px(`mt-1`), 섹션 패딩 20~24px(`p-5`/`p-6`).
- 일반 아이콘은 16px(`h-4 w-4`), 작은 배지 아이콘은 12px(`h-3 w-3`). 체크박스는 16px.
- 테두리는 1px(`border`), 컬럼 드롭 강조는 2px(`border-2`). 반 픽셀 테두리는 사용하지 않는다.
- `w-full`, `h-auto`, `w-1/2`, 중앙 정렬용 `translate-*-1/2`, 장식용 정수 퍼센트/비율은 반응형 표현이므로 허용한다. SVG path 좌표·불투명도·그림자 알파 값은 간격 단위가 아니므로 임의로 반올림하지 않는다.
- 드래그 중 실제 카드 폭은 런타임 측정값을 사용한다. 이를 강제로 정수 격자에 맞춰 드래그 미리보기 크기를 바꾸지 않는다.

## 글자·모서리·색상

`text-[13px]`처럼 직접 지정하지 않고 아래 토큰을 사용한다. 글자 크기는 기존 시스템의 정수 px를 보존하며, 행간도 정수 px로 정의한다.

| 토큰 | 크기 / 행간 | 용도 |
|---|---|---|
| diary-day · diary-month · diary-date | 56/56 · 14/20 · 20/24 | 홈 일기장 날짜. 글꼴은 Pretendard (#158, #161) |
| lead | 20 / 32 | 홈 일기장 요약 문장 (#158) |
| heading-xl | 28 / 40 | 큰 제목, 대시보드 보조 숫자 |
| heading-lg | 22 / 32 | 페이지 제목 |
| heading-md | 18 / 28 | 모달·폼 제목 |
| body | 14 / 20 | 본문·입력·버튼 |
| small | 13 / 20 | 보조 본문 |
| card-company | 13 / 20 | 카드 회사명 (medium) |
| label | 12 / 16 | 라벨 |
| caption | 11 / 16 | 날짜·도움말 |
| badge | 10 / 12 | 상태·플랫폼 배지 |
| illustration-xs / illustration-sm | 6 / 8, 8 / 12 | `aria-hidden` 목업 안의 장식 텍스트만 |

- 데이터로 그리는 차트 SVG는 `src/components/charts/`에서만 작성하고 색은 토큰 클래스로 지정한다. 플랫폼 차트 색은 `platform.*.chart` (#149, [HOME_DASHBOARD](HOME_DASHBOARD.md)).
- 버튼·메뉴·알약은 `rounded-full`, 입력은 `rounded-xl`, 카드·모달·패널은 `rounded-card`(20px), 카드 안의 칸·묶음은 `rounded-section`(14px) (#193).
- 로그인 장식 프레임은 `rounded-2xl`, `rounded-3xl`, `rounded-4xl` 등 정수 px의 기본 토큰을 사용한다.
- 페이지는 `bg-page`(그레이지), 카드·패널·입력 표면은 `bg-card`, 카드 안의 낮은 면은 `bg-column`, 카드 위에 떠 있는 행·알약·입력칸은 `bg-raised`(흰색), 브랜드(검정) 위 글자는 `text-on-brand`, 모달 배경은 `bg-overlay/50`.
- 색·그림자·타이포 정의를 컴포넌트나 globals.css에 복제하지 않는다. `shadow-card`, `shadow-float`를 재사용한다.

## 공통 코드

- 입력·라벨·에러: `src/components/common/formStyles.ts`. 기존 authFormStyles는 이 위치로 통합했다.
- 버튼·버튼 모양 링크: `buttonClassName('primary' | 'secondary' | 'danger' | 'dangerOutline', 추가 배치 클래스)`.
- 공통 버튼 스타일에 크기·색·포커스·disabled를 정의한다. 개별 화면에는 `mt-4`, `w-full` 같은 배치만 추가한다.
- 텍스트 버튼·탭·아이콘 버튼은 목적에 맞는 크기를 유지하되 키보드 포커스를 표시한다.
- 버튼은 pointer 커서, hover 색상, active 강조, focus-visible 외곽선을 제공한다. disabled는 not-allowed 커서와 흐림을 적용하고 hover/active 강조를 억제한다. 링크·체크박스도 포커스를 표시한다.
- 상태색 막대/배지와 작은 안내 글자의 색을 구분한다. 글자는 `status-rejected-text`, `status-offer-text`, `status-screening-text` 토큰으로 대비를 확보한다. 기본 상태색은 유지한다.
- 입력의 label은 중첩 또는 `htmlFor`/`id`로 연결한다. 여러 번 나타나는 폼은 `useId`로 충돌을 방지한다.
- import는 외부 패키지 → 프로젝트 별칭 → 별도 type import 순으로 정리한다. 기능 로직과 표시 스타일은 분리한다.

## SVG 관리

- 원본: `public/icons/*.svg`. JSX에 `<svg>`와 `<path>`를 반복 작성하지 않는다.
- 단색 아이콘: `Icon`의 타입이 지정된 이름을 사용한다. CSS mask가 부모 `text-*` 색을 상속하므로 파일마다 색을 복제하지 않는다.
- Google처럼 여러 색이 필요한 브랜드 자산은 `next/image`로 표시하고 SVG 안에 고유색을 보존한다. 이 색은 UI 테마색 예외다.
- 장식 아이콘은 접근성 트리에서 숨긴다. 아이콘 전용 버튼에는 `aria-label`을 제공한다.
- `Icon`의 마스크 경로와 드래그 측정값처럼 런타임에 결정되는 값만 필요한 범위에서 inline style을 사용한다.

## 검증

`npm run lint`는 ESLint와 `npm run check:ui`를 함께 실행한다. 소수 간격·크기, 임의 타이포·모서리·테두리, 인라인 SVG, 임의 HEX 색상 사용을 차단한다. `npm test`, `npm run build`도 확인한다. SVG 파일은 XML 파싱과 브라우저 로딩을 확인한다.
화면 검증은 모바일·태블릿·데스크톱에서 입력/버튼/아이콘 잘림과 가로 넘침을 확인하고, 실제 계정 동작과 목업 표시 검증을 구분해 기록한다.

### #81 검증 범위

- 기존 회귀 테스트 21개, ESLint·UI 규칙 검사, 타입 검사를 포함한 프로덕션 빌드 통과.
- Chrome의 390/768/1440px 화면에서 실제 로그인 페이지와 실제 공통 컴포넌트로 구성한 정적 UI fixture를 확인했다. 가로 넘침과 런타임 예외 없음.
- SVG 12개 XML 유효성·HTTP 로딩, 아이콘 색상/크기, 모바일 장식 숨김, 비밀번호 표시 전환, Tab 포커스 표시 확인.
- fixture는 헤더·검색 필터·카드·지원 입력 폼·버튼의 표시 검증용이며 저장 동작을 실행하지 않았다. 로그인 후 실제 DB를 사용하는 지원 추가/수정/드래그·계정 변경·탈퇴는 이번 화면 검증 범위에 포함하지 않았다.


## 익스텐션 흑백 일기장 테마 (#127, 2026-11-05)

사용자가 승인한 흑백 시안을 익스텐션 팝업에만 적용한다. apps/extension/tailwind.config.ts의 diary 토큰(paper/ink/hover/secondary/line/tint)을 사용하고 웹앱 브랜드 토큰은 유지한다. 본문은 기존 시스템 sans-serif, 월 이름은 시스템 serif와 diary-month(44/48), 읽기 전용 보조 달력은 diary-calendar(9/12) 토큰을 사용한다. 작은 달력은 클릭 대상이 아니며 오늘은 큰 날짜 표시와 time으로 함께 제공한다. 간격은 정수 Tailwind 단위, 장식 SVG는 확장의 public/icons 파일, 색은 공통 토큰으로 관리한다. [사용자 선택과 화면 검증](EXTENSION_POPUP_DESIGN.md)을 참고한다.


### 익스텐션 지원 이력 배지 (#135)

사용자 요청에 따라 흑백 일기장 테마를 지원 이력 배지에도 적용한다. diary ink/paper/secondary 토큰, 12px 굵은 본문·24px 높이·4px 간격을 사용한다. 지원은 체크와 어두운 배경, 취소는 되돌림 기호와 밝은 테두리로 구분한다. 웹앱의 색상 체계는 변경하지 않는다. [비교·접근성·성능 검증](APPLICATION_HISTORY_BADGES.md)을 따른다.

## 모달 접근성 (#156, 2026-11-16)

- 재현: 지원추가나 지원 카드로 모달을 열면 포커스가 연 버튼에 남고, Tab으로 모달 뒤 헤더·칸반까지 이동했다. 닫은 뒤에는 포커스가 문서 처음으로 돌아갔다. 모달에 `role="dialog"`와 제목 연결이 없어 보조기기가 열림을 알리지 못했다. 홈 대시보드(#148) 확인 중 dialog 역할로 모달을 찾지 못해 발견했다.
- 원인: 공통 `Modal`이 ESC 닫기만 처리하고 대화상자 역할·포커스 관리를 하지 않았다.
- 수정: `role="dialog"`, `aria-modal="true"`, `useId`로 만든 제목 `aria-labelledby`. 열릴 때 첫 입력(없으면 첫 버튼)으로 포커스를 옮기고, Tab/Shift+Tab을 모달 안에서 순환하며, 닫히면 연 요소가 화면에 남아 있을 때 포커스를 돌려준다. 제출 중 닫기 막기(`closeDisabled`)는 그대로 유지한다.
- 검증: 프로덕션 빌드에서 지원 추가 모달을 키보드로 열기 → 첫 입력 포커스 → Tab·Shift+Tab 각 40회 모달 안 유지 → ESC 닫기 후 지원추가 버튼 포커스 복귀, 브라우저 예외 0건. `scripts/verify-release-browser.mjs` 7개 항목 통과. 스크린리더 실제 낭독은 확인하지 않았다.

## 그레이지 바탕·검정 강조 개편 (#193, 2026-11-20)

사용자가 고른 레퍼런스(그레이지 바탕, 검정 하나로 강조, 알약 모양, 큰 둥근 모서리, 부드러운 움직임)와 시안을 바탕으로 웹앱 기준값을 바꿨다. 토큰 이름은 그대로 두고 값만 바꿔, 화면 코드를 고치지 않아도 앱 전체가 함께 바뀐다. 화면별 배치 개편은 #191(지원보드 흐름), #194(지원보드 요약·일정·중복), #195(홈)에서 한다.

| 토큰 | 이전 | 지금 | 비고 |
|---|---|---|---|
| `page` | #FAFAFA | #F1F1ED | 그레이지 바탕 |
| `card` | #FFFFFF | #FCFCFA | 카드·패널 표면 |
| `column` | #F2F2F4 | #F4F4F0 | 카드 안의 낮은 면, 마우스를 올린 행 |
| `raised` (새) | — | #FFFFFF | 카드 위 행·알약·입력칸 |
| `card-border` / `border-strong` | #DEDEE2 / #A1A1AA | #E4E4DF / #8E8D87 | 입력 테두리는 card 위 3.24:1 |
| `brand` / `brand-hover` / `brand-text` | #4F46E5 / #4338CA / #3730A3 | #18181B / #3F3F3C / #18181B | 인디고 대신 검정 강조 |
| `brand-tint` | #EEF2FF | #E6E6E0 | 밝은 면 위 선택 배경 |
| `brand-tint-100~300` | 라벤더 | #F1F1EC / #E2E2DC / #D3D3CC | 로그인 장식 |
| `text-secondary` / `text-muted` | #52525B / #A1A1AA | #52524E / #66655F | muted는 page·column·card·brand-tint 위 4.67~5.69:1 |
| `heat-1~4` | 인디고 4단계 | #E3E8FC / #BCC8F6 / #4F63D6 / #3243B5 | 연한 파랑 → 진한 남색. 3·4단계 흰 글자 5.14:1 이상 |
| `platform-*-bg/text` | 사람인 회색·원티드 인디고·잡코리아 빨강 | 각 사이트 아이콘 색 계열의 연한 배경 + 진한 글자 | 배지 대비 6.23:1 이상 |
| `platform-*-chart` | 사이트 원색 | 사람인 #4876EF · 잡코리아 #0B40D0 · 원티드 #0068FF→#FF8FC0→#FF5A00(chart·mid·end) · 직접입력 #8E8C84 | 사이트 공식 아이콘에서 뽑은 색. 도넛·사이트 점 |
| `rounded-card` / `rounded-section` | 14px / 10px | 20px / 14px | |
| `shadow-card` / `shadow-float` | 브라운 rgba | 무채색 rgba | |

- **조작은 검정, 데이터는 색**: 버튼·선택된 메뉴·탭·포커스는 검정 하나로 강조하고, 사이트·달력·단계처럼 데이터를 구분하는 곳은 색을 쓴다. 처음에는 데이터까지 무채색으로 칠했으나 사용자가 "어둡기만 하고 사이트별 색이 있어야 한다"고 해서 사이트·달력 색을 되돌렸다.
- 일정 종류 색 `event-*`: 면접은 보라(`event-interview` #6A5FDB), 공고 마감은 주황(`event-deadline` #C2621A). 점은 카드 위 4.04:1 이상, 배지는 tint 배경 + text 글자(면접 6.42:1, 마감 4.95:1). 홈 다가오는 일정의 점·종류 글자·D-day 배지에 쓰고, 오늘 일정의 배지만 검정이다.
- 형광펜 강조 `highlight-*`(blue·violet·amber)와 `animate-mark`: 홈 일기장 문장의 숫자와 다음 일정을 글자 아래쪽 절반만 칠하고, 처음 열 때 왼쪽부터 칠해진다(`motion-safe`). 강조 앞뒤 여백은 두지 않는다(조사 앞에 띄어쓰기처럼 보임). 아래 칩에는 무엇을 세는지 색 점을 둔다.
- 로고 (#197): 사용자가 직접 디자인한 일기장 마크(네이비 #253A63 일기장 + 주황 #F2A33A·회색 #8F98AD 책갈피 + 주황 밑줄)와 "취준일기" 글자 로고. 원본은 `public/brand/`의 `logo-mark.svg`(기본 마크), `logo-mark-small.svg`(20px 이하용, 선이 굵음), `logo-full.svg`(마크 + 글자, 글자는 도형이라 글꼴과 무관), `logo-full-dark.svg`(어두운 바탕용). 헤더·로그인은 공통 `BrandLogo`(글자 로고), 작은 장식은 `BrandMark small`을 쓴다. 브라우저 탭 아이콘은 `src/app/icon.svg`(= logo-mark-small), 아이폰 홈 화면 아이콘은 `src/app/apple-icon.png`(logo-mark를 흰 바탕 180px로 렌더링). #193의 임시 마크(일기장 + 체크 + 파란 책갈피)를 대체했다. 여러 색을 가진 브랜드 자산이라 SVG 안에 고유색을 둔다.
- 상태색(`status-*`)은 단계 구분용 점·막대로 그대로 둔다. 작은 상태 글자는 기존 `*-text` 토큰을 쓴다(card·page 위 5.26:1 이상).
- 움직임: `animate-rise`(아래에서 8px 올라오며 나타남, 0.5초)와 `ease-soft` 곡선을 추가했다. 화면에서는 반드시 `motion-safe:animate-rise`처럼 `motion-safe` 변형으로만 써서 모션 줄이기 설정에서는 움직이지 않게 한다. 공통 모달에 먼저 적용했다.
- 공통 부품: 버튼은 알약(`rounded-full`), 입력은 흰 둥근 칸(`rounded-xl bg-raised`), 헤더는 흰 줄 없이 바탕과 이어지고 원형 로고와 알약 메뉴(선택 항목은 검정)를 쓴다. 모바일 메뉴도 헤더 아래 전체 폭 알약이다.
- 익스텐션은 이번에 바꾸지 않았다. 사이트 배지 색은 웹앱과 익스텐션 값이 달라졌으며, 익스텐션 개편 때 맞춘다.

### 사이트 공식 아이콘 (#193)

사용자 요청으로 지원 경로·사이트 배지의 S·J·W 글자 칸을 각 사이트의 공식 탭 아이콘으로 바꿨다. 아이콘은 각 회사의 상표이며, 어느 사이트에서 지원했는지 표시하는 용도로만 원본 그대로 쓴다(색·모양을 바꾸지 않는다).

| 사이트 | 원본 (2026-11-20 받음) | 저장 | 비고 |
|---|---|---|---|
| 사람인 | https://www.saramin.co.kr/favicon.ico (48×48) | `public/brands/saramin.png` | 파란 사각형에 흰 S. 칸을 꽉 채운다 |
| 잡코리아 | https://www.jobkorea.co.kr/favicon.ico (256×256) | `public/brands/jobkorea.png` | 투명 바탕의 파란 J. 흰 칸 안에 둔다 |
| 원티드 | https://static.wanted.co.kr/favicon/new/favicon.ico (256×256) | `public/brands/wanted.png` | 파랑·분홍·주황 심볼. 흰 칸 안에 둔다. 공식 [브랜드센터](https://wanted.co.kr/brandcenter) 있음 |

- ICO를 PNG로만 바꿨고(픽셀 그대로) 다른 편집은 하지 않았다. 사람인 원본은 48px라 28px 이하로만 쓴다.
- 공통 `PlatformIcon`(`components/badge/`)이 모든 사이트를 같은 크기·같은 모서리의 칸(sm 16px, md 28px)에 담는다. 처음 시안에서 사람인만 칸을 꽉 채우고 나머지는 작게 들어가 크기가 달라 보인다는 의견을 반영했다. 사이트 배지(`PlatformBadge`)와 일기장 사이트 칩은 sm, 지원 경로 목록은 md를 쓴다.
- 도넛의 원티드 조각은 SVG 그라데이션(`WANTED_GRADIENT_STROKE`), 기다리는 목록의 원티드 점은 CSS 그라데이션이다.
- 사용자가 처음 보낸 잡코리아 이미지는 "파란 사각형에 흰 J"였지만 공식 탭 아이콘은 투명 바탕 파란 J다. 상표 색을 뒤집어 만들지 않고 공식 원본을 썼다.

### #193 검증

- 처음에는 바탕 #E8E8E3·카드 #F7F7F3·칸 #EFEFEA로 잡았으나, 사용자가 실제 데이터 화면을 보고 "너무 어둡다"고 해서 바탕·칸·카드·달력 농도를 한 단계 밝혔다. 다시 빌드하지 않고 CSS 색만 바꿔 끼운 "지금 / 밝게 / 더 밝게" 세 단계를 같은 홈·지원보드에서 비교해 "밝게"를 골랐다(위 표가 최종 값).
- 대비는 WCAG 공식으로 계산했다(위 표의 값). 카드 테두리와 바탕의 대비는 1.13:1로 낮아, 카드 경계는 바탕과 표면 색 차이·그림자·테두리를 함께 써서 구분한다.
- `npm test` 127개, `npm run lint`(check:ui 포함), `npx tsc --noEmit`, `npm run build` 통과.
- 프로덕션 빌드에서 `scripts/verify-release-browser.mjs` 14개, `scripts/verify-auth-loading-seo.mjs` 4개(axe 포함) 통과.
- 예시 데이터 48건과 빈 계정으로 홈·지원보드 1440/768/390px, 로그인 1440/390px, 계정, 지원 추가 모달을 찍어 확인. 가로 넘침·브라우저 예외 없음. 홈·지원보드 배치는 이후 이슈에서 바꾸므로 이번에는 색·모양만 바뀐 상태다.
