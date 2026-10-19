# UI 디자인 시스템

2026-10-14, #81. 이후 전체 디자인 개편 전까지 적용하는 코드·스타일 기준이다. 기준 구현은 `tailwind.config.ts`이며, 이 작업에서 별도 Figma 파일을 조회하거나 수정하지 않았다.

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
| heading-xl | 28 / 40 | 큰 제목 |
| heading-lg | 22 / 32 | 페이지 제목 |
| heading-md | 18 / 28 | 모달·폼 제목 |
| body | 14 / 20 | 본문·입력·버튼 |
| small | 13 / 20 | 보조 본문 |
| card-company | 13 / 20 | 카드 회사명 (medium) |
| label | 12 / 16 | 라벨 |
| caption | 11 / 16 | 날짜·도움말 |
| badge | 10 / 12 | 상태·플랫폼 배지 |
| illustration-xs / illustration-sm | 6 / 8, 8 / 12 | `aria-hidden` 목업 안의 장식 텍스트만 |

- 입력·버튼은 `rounded-lg`, 모달·계정 섹션은 `rounded-card`(14px), 칸반 컬럼은 `rounded-section`(10px).
- 로그인 장식 프레임은 `rounded-2xl`, `rounded-3xl`, `rounded-4xl` 등 정수 px의 기본 토큰을 사용한다.
- 표면은 `bg-card`, 페이지는 `bg-page`, 브랜드 위 글자는 `text-on-brand`, 모달 배경은 `bg-overlay/50`.
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
