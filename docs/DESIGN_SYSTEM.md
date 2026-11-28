# UI 디자인 시스템

**지금 기준은 #199 전체 개편(2026-11-23, #200~#206)의 디자인 시스템이다.** 원본은 아래 링크의 디자인 시스템이고, 기준 구현은 `apps/web/tailwind.config.ts`와 `apps/web/src/components/ui/`다. 개편 전 기준(#81, #193)은 맨 아래 요약과 git 기록에 있다.

## 디자인 시스템 (#199~#206, 2026-11-23)

- 원본: [취준일기 디자인 시스템](https://claude.ai/artifact/RR4qTSJVUe774joAoq3mrf) — 브랜드 북, 토큰, 부품 14개 견본. 시안은 [캔버스](https://claude.ai/artifact/JB9dh1KMXVR9AssPfsBg6d)의 메인·지원 보드 3장·로그인 2장.
- 원칙: 회색이 화면 대부분을 맡고 파랑 하나(`action-primary` #3461D1)가 중요한 걸 알린다. 로고 네이비(#253A63)는 로고에만, 마리골드(#F2A33A)는 오늘·D-day에만. 회사는 항상 한 줄(CompanyRow)로 보여준다.
- **부품은 유동적으로 관리한다.** 디자인이 바뀌면 디자인 시스템 토큰·부품과 `tailwind.config.ts`(그리고 #201의 `components/ui/`)를 같은 이름으로 함께 고친다. 화면에 색·크기 값을 직접 쓰지 않는다.

### 토큰 이름 (Tailwind 클래스)

| 종류 | 이름 | 예 |
|---|---|---|
| 바탕 | `page`(#F5F7FA) · `surface` · `subtle` · `muted` · `selected` · `inverse` · `scrim` | `bg-surface`, `bg-selected` |
| 글자 | `text-primary` · `text-secondary` · `text-disabled`(비활성만) · `text-brand` · `text-brand-strong` · `text-logo` · `text-on-color` | `text-text-secondary` |
| 선 | `line-divider` · `line-input` · `line-focus` · `focus-ring` | `border-line-divider`, `outline-focus-ring` |
| 버튼 | `action-primary` · `action-hover` · `action-pressed` · `action-disabled` | `bg-action-primary` |
| 상태 | `today` · `success` · `danger` (각 DEFAULT·tint·text) · `info` (tint·text) | `bg-today-tint text-today-text` |
| 데이터 | `chart-1`~`3` · `chart-rest` · `chart-empty` · `stage-*`(지원 완료~지원 취소) · `event-*` | `bg-stage-screening` |
| 로고 | `logo-navy` · `logo-marigold` · `logo-grey` | |
| 글자 | `display` 30 · `title-1` 24 · `title-2` 20 · `title-3` 17 · `body` 15 · `label` 13 · `caption` 12 (모바일 `display-sm` 26 · `title-1-sm` 22) | `text-title-2` |
| 간격 | Tailwind 기본 4px 단위(`p-1`=4 … `p-16`=64). 카드 안쪽 `p-6`(모바일 `p-5`), 카드 사이 `gap-4`, 구역 사이 `gap-8`, 목록 줄 `py-3` | |
| 모서리 | `rounded-xs` 4 · `sm` 8 · `md` 12 · `lg` 16 · `xl` 20 · `full` (Tailwind 기본값을 덮어씀) | `rounded-md` |
| 그림자 | `shadow-sm`(흰 바탕 위 카드) · `shadow-md`(드롭다운·토스트) · `shadow-lg`(모달·패널). 카드에는 그림자 없음 | |
| 층 | `z-header` 10 · `z-dropdown` 20 · `z-panel` 30 · `z-modal` 40 · `z-toast` 50 | |
| 움직임 | `duration-fast` 150 · `duration-base` 250 · `duration-slow` 400, 곡선 `ease-soft`, 항상 `motion-safe:` | |

### 예전 이름 정리 (#200 → #206 완료)

- 개편 동안에는 예전 이름(`brand`·`status-*`·`card`·`column`·`heading-*`·`legacy-*`·`rounded-card` 등)을 뜻이 같은 새 값으로 연결해 두고, 화면을 하나씩 바꾸며 줄였다(645곳 → 0곳). #206에서 설정에서 모두 지웠다.
- 설정에 없는 이름은 Tailwind가 조용히 CSS를 만들지 않아 화면이 깨져도 빌드가 통과한다. 그래서 `npm run check:ui`가 예전 이름을 실패로 막는다. Tailwind 기본 글자 크기(`text-sm` 등)도 막는다.
- 개편 중 문제와 수치: [REDESIGN_TROUBLESHOOTING](REDESIGN_TROUBLESHOOTING.md).

### 공통 부품 (#201) — `src/components/ui/`, `src/components/charts/`

디자인 시스템 부품과 이름·모양을 1:1로 맞췄다. 새 화면은 이 부품만 조합하고, 화면에서 버튼·입력칸 스타일을 다시 만들지 않는다. 디자인이 바뀌면 부품 파일 하나를 고친다. 견본: 개발 서버의 `/dev/ui`(운영 404).

| 부품 | 파일 | 접근성 기본값 |
|---|---|---|
| Button · `buttonClassName` | `ui/Button.tsx` | 진짜 `<button>`. 비활성·로딩은 `aria-disabled`(포커스·이름 유지, 누름·제출만 막음), 로딩은 `aria-busy` + 숨은 "처리 중" |
| IconButton | `ui/IconButton.tsx` | `label` 필수 → `aria-label`, 44×44 |
| SelectField · TextAreaField | `ui/TextField.tsx` | 입력칸과 같은 이름표·도움말·오류 연결(#205). 선택칸은 브라우저 기본 select + 오른쪽 화살표(키보드 동작을 따로 만들지 않음), 여러 줄 칸은 글 길이만큼 늘어남(최소 96px) |
| DateField | `ui/DateField.tsx` | 날짜 칸(#293). 직접 치는 것은 브라우저 날짜 칸 그대로, 오른쪽 달력 버튼(`aria-expanded`)으로 칸 아래에 디자인 시스템 달력(월요일 시작·모서리 16·오늘 마리골드)을 펼친다. 날짜는 이름("2026년 11월 27일 금요일")·고른 날 `aria-pressed`·오늘 `aria-current="date"`, 화살표·Home·End·PageUp·PageDown, Enter 고르기, Esc는 달력만 닫음. 휴대폰은 칸을 누르면 OS 선택기 |
| TextField · PasswordField · SearchInput | `ui/TextField.tsx` | `<label for>` 자동 연결, 도움말·오류 `aria-describedby`(보이는 것만 연결), 오류 `aria-invalid`, 오류 자리는 비어 있어도 `role="status"`로 미리 둠, 비밀번호 보기는 이름 고정("○○ 보기") + `aria-pressed` + `aria-controls`, 검색 이름표는 sr-only, `ref`는 input까지 전달 |
| TextLink · `textLinkClassName` | `ui/TextLink.tsx` | 글자 링크 2종: `brand`(가입하기·비밀번호 찾기, 파란 굵은 글자) · `quiet`(이용약관, 본문색 + 밑줄). 포커스 링 3px |
| Checkbox | `ui/Checkbox.tsx` | 이름표 전체가 눌림 영역, 상자 20px, 오류 자리는 TextField와 같은 방식 |
| Tabs | `ui/Tabs.tsx` | 주소가 있으면 링크 + `aria-current="page"`, 없으면 버튼 + `aria-pressed` |
| FilterChip · ChipGroup | `ui/FilterChip.tsx` | `aria-pressed`, 묶음 `role="group"` + 이름 |
| Badge · StageDot | `ui/Badge.tsx` | 색만으로 구분하지 않게 항상 글자. 단계 점 색 `STAGE_DOT_CLASS` |
| CompanyRow · RowList · CompanyAvatar | `ui/CompanyRow.tsx` | `onOpen`이면 줄 전체가 버튼, 사이트 이름은 sr-only |
| Card · CardHeader · CardSummary | `ui/Card.tsx` | 제목 h2/h3, `aria-labelledby` 연결용 `titleId`. 여백·간격은 `padding`(md·sm·xs·flush)·`gap`(md·lg·none) 속성으로 바꾼다. className에 p-·gap-·flex-row를 덧붙이면 같은 속성 클래스 두 개 중 어느 쪽이 이길지 CSS 순서에 달려 있다(#204) |
| StatGroup · StatCell | `ui/StatCell.tsx` | `dl/dt/dd`로 "이름: 값". `animate`면 숫자가 0부터 올라간다(CountUp) |
| CountUp | `ui/CountUp.tsx` | 600ms 감속(`duration-count`). 움직임 줄이기면 바로 최종 값, 스크린리더는 최종 숫자(sr-only)만 읽음 |
| Menu | `ui/Menu.tsx` | 공개(disclosure) 방식: 버튼 `aria-expanded`·`aria-controls`, 열면 첫 항목 포커스, Esc 닫고 버튼으로 복귀, 바깥 누름·Tab 이탈 시 닫힘 |
| RatioBar · BarChart · DonutChart | `charts/` | `role="img"` + 모든 값을 담은 이름 |
| CalendarCell | `ui/CalendarCell.tsx` | 칸 하나를 "11월 18일 수요일, 오늘, 지원 3곳, 면접 1개"로 읽음, 오늘 `aria-current="date"`. 버튼이면 `aria-pressed`·`aria-controls`(열린 목록), 말풍선은 장식(aria-hidden) |
| StepTrack · StepDots | `ui/StepTrack.tsx` | 단계 트랙 하나(#306). 점이 버튼, 현재 `aria-current="step"`, 24×24. 단계 수만큼 열(2~10), 7단계부터 지금 단계 이름만(나머지는 점 `title`). `StepDots`는 칸반 카드용 누를 수 없는 작은 트랙 |
| StageTrack | `ui/StageTrack.tsx` | StepTrack에 기본 4단계(지원 완료~면접 완료)를 넣은 것 |
| ApplicationProcessTrack | `process/ProcessTrack.tsx` | 지원에 잇는 트랙(#295, #303): 전형 절차가 있으면 공고 단계로 StepTrack, 없으면 StageTrack. 상세 패널·결과 기다리는 중 |
| EmptyState | `ui/EmptyState.tsx` | 상황 + 다음 행동 |
| ToastProvider · useToast | `ui/Toast.tsx` | 항상 그려 둔 `role="status"` 영역, 3초(되돌리기 5초) |
| Dialog · SidePanel | `ui/Overlay.tsx` | body에 그린다(#293, 연 자리의 transform에 막이 갇히지 않게). `useDialogFocus`: 포커스 이동·Tab 순환·Esc·되돌리기, 제목·설명 연결, 모바일 아래 시트. 지원 추가는 Dialog(저장 버튼은 footer, `form` 속성으로 연결), 상세는 SidePanel(#205) |
| SkipLink | `ui/SkipLink.tsx` | 첫 Tab에 "본문으로 건너뛰기", 각 `<main id="main-content" tabIndex={-1}>` |

- 검사: `npm run verify:ui`(개발 서버 실행 중, 기본 `http://localhost:3000`, 다른 주소면 `TEST_ORIGIN`)가 `/dev/ui`를 axe(WCAG 2.2 AA + best-practice)와 키보드 시나리오로 검사한다.
- 예전 `common/buttonStyles.ts`·`formStyles.ts`·`common/Modal.tsx`·`PasswordToggleButton`·`PlatformBadge`는 #206에서 지웠다. 버튼·칸·창은 위 부품만 쓴다.
- 입력칸 오류 문구는 `useFieldValidation`이 띄운다. 칸 아래 링크·버튼을 마우스로 누르는 중에 칸을 벗어나면 오류 문구를 클릭이 끝난 뒤에 보여준다(누르는 순간 문구가 생기면 링크가 밀려 클릭이 사라진다, #202). Tab으로 벗어날 때는 바로 보여준다.

### 헤더·로그인한 화면 틀 (#203)

- 헤더: 흰 바탕 + 아래 구분선, 높이 64, 내용 폭 1200(`max-w-300`). 로고 · 주 메뉴(홈 / 지원 보드, 지금 화면은 `aria-current="page"` + `bg-subtle` 굵은 글자) · 오른쪽 버튼(익스텐션에서 가져오기 보조 · 지원 추가 주요 · 내 계정 메뉴). 모바일은 메뉴가 아래 줄 전체 폭이고 가져오기 버튼은 아이콘만(이름은 sr-only로 유지).
- 계정 설정·로그아웃은 "내 계정" 메뉴(`ui/Menu`) 안에 있다. 버튼은 `bg-selected` 원 + `text-brand-strong` 사람 아이콘.
- 본문: `bg-page` 위 카드 사이 16(`gap-4`), 좌우 여백 16/24/40. 가져오기 결과: 성공은 토스트(`ui/Toast`), 실패는 본문 맨 위 `ImportErrorNotice`(danger-tint).

### 겹쳐 뜨는 창·결과 알림 (#205)

- 제출 버튼은 늘 누를 수 있게 두고, 빈 칸·잘못된 값은 칸 아래 오류 + 첫 오류 칸 포커스로 알린다("회사명을 입력해 주세요."). 버튼을 비활성으로 막으면 왜 안 되는지 알 수 없다.
- 결과 알림: 창이 닫히며 끝나는 일(지원 추가·삭제)은 토스트, 창이 열린 채 끝나는 일(기록 남기기·정보 수정)은 창 안 알림 영역(`role="status"`). 누른 자리 가까이에서 알리고, aria-modal 창 밖을 읽지 않는 화면 읽기 환경(WebKit·VoiceOver 등)에서도 들린다.
- 할 일이 남은 결과(이메일 변경 → 메일 확인)는 토스트로 사라지게 두지 않고 카드 안에 남긴다.
- 되돌릴 수 없는 일(회원 탈퇴)은 빨강 제목 + 확인 문구 입력, 지원 삭제는 두 번 눌러 확인("정말 지울까요?").

### 로그인·회원가입 화면 (#202)

- 틀: `auth/AuthShell.tsx` — 왼쪽 폼(`<main>`), 오른쪽 소개(`<aside aria-label="서비스 미리보기">`). DOM에서는 항상 폼이 먼저라 읽는 순서·Tab 순서가 폼부터다. 1024px 미만은 소개가 위로 올라오는데(`order-first`) 화면 배치만 바뀐 것이다. 제목은 `AuthHeading`(h1)으로 서버에서 그린다.
- 주소: `/login`(로그인)·`/signup`(회원가입)은 `app/(entry)/` 묶음이 같은 틀을 나눠 쓰고, 둘 사이는 아래 "가입하기 / 로그인하기" 링크로 오간다(`?import=1` 유지). `/reset-password`·`/update-password`도 같은 틀이며, 메일 링크로 바로 들어오므로 1024px 미만에서는 소개 없이 폼부터 보인다(`mobileIntro={false}`).
- 소개: 1024px 이상 맥북(소개 오른쪽 끝에서 잘림), 미만 아이폰(640px 미만 0.9배). `auth/DeviceMockups.tsx`. 기기 속 화면은 지어낸 예시이며 회사 이름은 익명(A사·B사)이다. 소개 문구와 맥북은 한 묶음(폭 680)이다. 영역이 좁으면 묶음이 왼쪽 안쪽 여백에 붙어 맥북 오른쪽이 잘리고, 넓어지면 묶음 왼쪽 여백 `max(0, (안쪽 폭 − 680px)/2 − 32px)` 한 식으로 끊김 없이 영역 가운데로 옮겨진다(#215, 왼쪽 폼이 가운데 놓인 한 묶음인 것과 같은 방식).
- 기기 속 작은 글자: 디자인 시스템 글자 단계(caption~title-1)로 실제 크기에 그리고 화면 전체를 `[zoom:0.75]`로 줄인다. 임의 글자 크기를 만들지 않으며, `transform: scale`과 달리 줄인 만큼 자리도 줄어든다.
- 기기 고유색·모서리는 화면 역할 색과 섞지 않게 목업 전용 토큰으로 둔다: 색 `device-edge`·`device-steel`·`device-shade`·`device-glass`·`device-hinge`·`device-hinge-light`·`device-base`, 모서리 `rounded-device-phone`(46)·`device-phone-bezel`(45)·`device-phone-screen`(41)·`device-lid`(24)·`device-lid-inner`(23). 디자인 시스템 원본에는 없는 코드 전용 토큰이다.
- 문구는 해요체. 입력 검사 문구(`utils/authValidation.ts`)도 "~해 주세요"로 띄어 쓴다.

## 간격과 크기

- `p-3`, `gap-2`처럼 정수 Tailwind 단위만 쓴다(1 = 4px). `h-4.5`·`gap-1.5` 같은 소수 클래스와 `h-[18px]` 같은 임의 크기는 `check:ui`가 막는다.
- 카드 안쪽 24(모바일 20, `Card padding`), 카드 사이 16(`gap-4`), 카드 안 묶음 사이 16~24, 목록 한 줄 위아래 12(`py-3`), 버튼 아이콘 간격 8.
- 아이콘은 20(`h-5 w-5`), 작은 버튼 안 16. 누르는 칸은 최소 24×24, 아이콘 버튼은 44×44(좁은 곳 36).
- 같은 속성의 클래스를 둘 겹쳐 쓰지 않는다(예: `p-5`와 `p-2`). 어느 쪽이 이길지는 CSS 순서에 달려 있다. 부품이 여백 속성을 주면 그것을 쓴다(#204).
- `w-full`, `w-1/2`, 가운데 정렬용 `translate-*-1/2`, 장식용 비율은 반응형 표현이라 허용한다. 데이터로 정해지는 길이(막대 높이·비율 막대 조각·드래그 카드 폭)만 inline style로 준다.

## 글자·모서리·색

- 글자는 위 표의 7단계만 쓴다(`text-[13px]` 금지). 작은 장식 글자가 필요하면 단계 글자로 그리고 통째로 줄인다(로그인 기기 목업의 `[zoom:0.75]`).
- 모서리는 `xs`~`xl`과 `full`. 겹친 모서리는 안쪽 = 바깥 − 안쪽 여백. 로그인 모바일 첫 화면 아래 모서리만 Tailwind 기본 `rounded-b-4xl`(32), 기기 목업은 `device-*`.
- 색은 역할 이름만 쓴다(`bg-[#...]` 금지). 연한 바탕(tint)에는 같은 계열 진한 글자(text)를 올리고, 작은 글자는 4.5:1, 큰 글자·포커스 표시·입력칸 테두리는 3:1 이상으로 맞춘다(값마다 표 주석에 대비를 적었다).
- 차트 SVG는 데이터로 모양이 정해지므로 `src/components/charts/`에서만 그린다. 색은 토큰 클래스로 준다.

## SVG와 브랜드 자산

- 원본: `public/icons/*.svg`. JSX에 `<svg>`·`<path>`를 반복 작성하지 않고 공통 `Icon`을 쓴다(CSS mask라 부모 `text-*` 색을 따른다).
- Google 로고·사이트 아이콘(`public/brands/`)·취준일기 로고(`public/brand/`)처럼 고유색이 있는 자산은 `next/image`로 원본 그대로 쓴다. 장식 아이콘은 접근성 트리에서 숨기고, 아이콘만 있는 버튼에는 이름을 준다.
- 로고 (#197): 사용자가 직접 디자인한 일기장 마크(네이비 #253A63 + 마리골드 #F2A33A·회색 #8F98AD 책갈피)와 "취준일기" 글자 로고. `logo-mark.svg`(기본), `logo-mark-small.svg`(20px 이하), `logo-full.svg`(마크 + 글자), `logo-full-dark.svg`(어두운 바탕). 화면에서는 `BrandLogo`·`BrandMark`, 탭 아이콘은 `src/app/icon.svg`, 홈 화면 아이콘은 `src/app/apple-icon.png`.
- 사이트 공식 아이콘 (#193): 사람인(saramin.co.kr/favicon.ico, 48px)·잡코리아(jobkorea.co.kr/favicon.ico, 256px)·원티드(static.wanted.co.kr 공식 favicon, 256px)를 2026-11-20에 받아 PNG로만 바꿔(픽셀 그대로) `public/brands/`에 둔다. 각 회사의 상표이며 어느 사이트에서 지원했는지 표시하는 용도로만 쓴다. 공통 `PlatformIcon`이 같은 크기 칸(16·28)에 담는다.

## 검증

화면을 바꾸면 아래를 돌린다. 브라우저 검증은 Edge + axe-core(`node_modules/.release-tools`)로, 운영 계정 없이 Supabase HTTP를 fixture로 대신한다(`scripts/fixtures/sampleSession.mjs`: 예시 지원 50건·중복 묶음 2개).

| 명령 | 확인하는 것 |
|---|---|
| `npm run lint` | ESLint + `check:ui`(소수·임의 크기, 임의 색, 인라인 SVG, 기본 글자 크기, 예전 토큰) |
| `npm test` · `npm run build` | 단위 테스트(폼은 `tests/formHarness.mjs`로 직접 부른다) · 타입 검사 포함 운영 빌드 |
| `npm run verify:ui` | 개발 서버 `/dev/ui` 공통 부품 axe·키보드 |
| `scripts/verify-auth-accessibility.mjs` · `verify-auth-browser.mjs` · `verify-auth-loading-seo.mjs` | 로그인·가입·재설정 접근성, 인증 흐름, 스켈레톤·메타데이터 |
| `scripts/verify-dashboard-browser.mjs` · `verify-board-browser.mjs` · `verify-overlays-browser.mjs` | 홈·지원 보드·창·계정의 axe, 키보드(포커스 가두기·Esc·되돌리기·칸반 옮기기), 1440·768·390px 가로 넘침. `SHOT_DIR`을 주면 화면 저장 |
| `scripts/verify-release-browser.mjs` | 릴리즈 전 사용자 흐름(동의·편집 충돌·계정 전환·달력·중복 등) |
| `scripts/capture-readme-screens.mjs` | README 화면 이미지 4장 다시 찍기(운영 빌드) |

- 움직임·색 전환이 있는 화면은 다 끝난 뒤 잰다. 전환 도중에는 axe가 중간색을 대비 오류로 잡는다(트러블슈팅 14·29·33번).
- 실제 스크린리더 낭독, 실제 Google·메일 흐름, 익스텐션 연동(`verify-history-browser.mjs`, 익스텐션 빌드 필요)은 별도로 확인한다.

## 익스텐션 흑백 일기장 테마 (#127, 2026-11-05)

익스텐션 팝업은 웹앱과 별도로 `apps/extension/tailwind.config.ts`의 diary 토큰(paper/ink/hover/secondary/line/tint)을 쓴다. 이번 웹앱 개편(#199)에서는 바꾸지 않았다. [사용자 선택과 화면 검증](EXTENSION_POPUP_DESIGN.md), 지원 이력 배지(#135)는 [비교·접근성·성능 검증](APPLICATION_HISTORY_BADGES.md)을 따른다.

## 지난 기준 (요약)

- 2026-10-14 #81: 정수 간격 규칙, 공통 버튼·입력 스타일, `public/icons` SVG 관리, `check:ui` 도입.
- 2026-11-16 #156: 공통 모달에 `role="dialog"`·제목 연결·포커스 가두기·되돌리기(`useDialogFocus`). 지금 `ui/Overlay`가 같은 훅을 쓴다.
- 2026-11-20 #193: 그레이지 바탕·검정 강조, 사이트 공식 아이콘, `animate-rise`. #199에서 회색 + 파랑 하나 체계로 다시 바꿨다. 당시 값과 결정은 git 기록(이 문서의 #193 절)에 남아 있다.
