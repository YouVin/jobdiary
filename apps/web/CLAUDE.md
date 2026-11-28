# 취준일기 (JobDiary) 웹앱 — Claude Code 프로젝트 컨텍스트

> 이 파일은 요약이다. 기준은 실제 코드와 ../../AGENTS.md, ../../docs/README.md(문서 인덱스)다.
> 여기와 문서가 다르면 코드와 문서를 따르고, 이 파일을 같은 PR에서 고친다(#222).

## 프로젝트 소개
사람인·원티드·잡코리아 지원 내역을 크롬 익스텐션(`apps/extension`)으로 가져와, 홈 대시보드와 지원 보드(주간·보드·중복)에서 관리하는 웹앱.
지원마다 상세 패널에서 기록(일기)을 남겨 취업 여정을 쌓는다. 운영: https://jobdiary.vercel.app (Vercel).

## 기술 스택 (package.json 기준)
- Next.js 16 (App Router, Turbopack) · React 19 · TypeScript
  - 학습 데이터와 API가 다르다. 코드를 쓰기 전 `node_modules/next/dist/docs/`의 관련 문서를 읽는다(AGENTS.md).
- Tailwind CSS v4 + JS 설정(`tailwind.config.ts`의 디자인 시스템 토큰만 사용)
- Supabase(인증·DB, `lib/supabase.ts`) — 지원 데이터는 `store/applicationStore.ts` → `lib/applicationsApi.ts` → Supabase로만 저장한다
- Zustand(클라이언트 상태), clsx(조건부 클래스), @dnd-kit/core(칸반 끌기·키보드 옮기기)

## 폴더 구조 핵심
- `src/app/` — 페이지. `(entry)` 로그인·가입, `(protected)` 로그인 필요 화면(홈·지원 보드), `(legal)` 약관
- `src/components/ui/` — 공통 부품(Button·TextField·Card·Badge·Tabs·Overlay 등). 화면은 이 부품을 조합한다
- `src/components/{dashboard,board,detail,auth,header,account,import,...}/` — 화면별 부품
- `src/store/` Zustand 스토어 · `src/lib/` Supabase·API·브라우저 저장(`storage.ts`는 화면 기억값 같은 브라우저 전용 값만) · `src/utils/` 순수 함수 · `src/types/` 타입
- 데이터 구조는 `src/types/application.ts`가 기준이다(여기에 베껴 두지 않는다).
- 불러오는 방향은 화면 → hooks → store → lib → utils 한 방향, Supabase는 lib에서만 부른다(docs/CONVENTION.md "폴더 역할", `npm run check:layers`).

## 상태 흐름
지원 완료(applied) → 서류 통과(screening) → 면접 예정(interview) → 면접 완료(interviewed) → 합격(offer) / 탈락(rejected)
- 지원 취소(canceled)는 사이트에서 지원을 취소한 경우로, 정상 흐름과 별개의 종료 상태다.
- 상태를 누가 바꿨는지(`statusSource`: extension·created·manual·deadline)는 docs/INTEGRATION.md §5와 docs/DEADLINE.md.

## 코딩 규칙
- named export 사용 (page.tsx, layout.tsx 제외), 함수형 컴포넌트 + hooks
- 변수명은 직관적인 영문 (company, appliedAt, isLoading), 단계별 주석은 한국어로
- for 루프 선호, 명시적 조건문
- 클라이언트 상태는 Zustand, 조건부 클래스는 clsx, 공유 상태는 상위에서 관리해 props로 전달
- Server(표시)/Client(상태·이벤트) 분리

## 디자인
- 매일 보는 도구라 깔끔하고 읽기 쉽게. 회색이 화면 대부분, 파랑 하나가 중요한 것을 알린다.
- 색·글자·간격·모서리·단계 색은 모두 **docs/DESIGN_SYSTEM.md**와 `tailwind.config.ts` 토큰만 쓴다. 값을 화면에 직접 쓰지 않는다.
- `npm run check:ui`(lint에 포함)가 예전 토큰 이름과 Tailwind 기본 글자 크기를 실패로 막는다.
- 반응형은 모바일 우선. 쓰는 단계는 `sm`(640, 글자 한 단계)·`md`(768, 헤더 메뉴 한 줄)·`lg`(1024, 주된 레이아웃 전환). 자세한 표는 WORKING_AGREEMENT 2절.

## 작업 흐름과 검증
- 이슈 → 브랜치(`feat/` `fix/` `design/` `chore/`, dev에서) → Atomic 커밋 `타입: 한글 설명 (#이슈)` → PR(base: dev, `Closes #N`) → 병합
- 운영 배포는 별도 dev → main PR이다(`.claude/skills/jobdiary-release`).
- 커밋 전: `npm run lint`, `npm test`, `npx tsc --noEmit`. 화면이 바뀌면 운영 빌드(`next start -p 3100`)로 `scripts/verify-*.mjs` 브라우저 검증.
- 디자인 개편 문제 해결은 docs/REDESIGN_TROUBLESHOOTING.md에 전후 수치와 함께 남긴다.

@../../docs/WORKING_AGREEMENT.md
@AGENTS.md
