# 취준일기 (JobDiary) — Claude Code 프로젝트 컨텍스트

## 프로젝트 소개
사람인·원티드·잡코리아 지원 내역을 크롬 익스텐션으로 자동 수집해서, 한 곳에서 칸반 보드로 관리하는 웹앱. 각 지원 건마다 일기를 남겨 취업 여정을 기록할 수 있음. 수익 모델은 광고 + 프리미엄(향후).

## 기술 스택
- Next.js 14 (App Router), TypeScript, Tailwind CSS
- Zustand (전역 상태)
- @dnd-kit/core, @dnd-kit/sortable (칸반 드래그앤드롭)
- html-to-image (이미지 카드 공유)
- localStorage (1단계 저장) → Supabase (2단계)
- Vercel 배포

## 개발 단계 (중요)
현재 1단계: 웹앱 대시보드를 localStorage 기반으로 먼저 완성.
- 데이터 직접 입력해서 칸반보드 UI/UX 검증
- 서버 없이 시작 (비용 0)
- 익스텐션은 2단계에서 별도 레포(jobdiary-extension)로 개발

## 폴더 구조 핵심
- `src/app/` — Next.js App Router 페이지
- `src/components/board/` — 칸반보드 관련 (KanbanBoard, Column, ApplicationCard)
- `src/components/diary/` — 일기 관련
- `src/components/common/` — 공통 (Header, PlatformBadge)
- `src/store/` — Zustand 스토어
- `src/types/` — 타입 정의
- `src/lib/storage.ts` — localStorage 헬퍼
- `src/utils/` — 순수 유틸

## 데이터 구조
```typescript
type Platform = 'saramin' | 'wanted' | 'jobkorea' | 'manual';
type Status = 'applied' | 'screening' | 'interview' | 'interviewed' | 'offer' | 'rejected' | 'canceled';

interface Application {
  id: string;
  company: string;       // 회사명
  position: string;      // 공고명
  platform: Platform;    // 어느 사이트
  status: Status;        // 현재 상태
  appliedAt: string;     // 지원일 (ISO)
  updatedAt: string;
  memo?: string;
  diary?: DiaryEntry[];  // 일기 목록
  interviewDate?: string;
  url?: string;
  externalId?: string;   // 각 사이트의 지원건 고유 ID (중복 판별용, 원티드는 없어서 optional)
}

interface DiaryEntry {
  id: string;
  content: string;       // 일기 내용
  mood?: string;         // 감정 (선택)
  createdAt: string;
}
```

## 상태 흐름
지원완료(applied) → 서류통과(screening) → 면접예정(interview) → 면접완료(interviewed) → 합격(offer) / 탈락(rejected)

- canceled(지원취소)는 사용자가 사이트에서 지원을 취소한 경우. 정상 흐름(applied→offer/rejected)과 별개의 종료 상태.

## 코딩 규칙
- named export 사용 (page.tsx, layout.tsx 제외)
- 함수형 컴포넌트 + hooks
- 변수명은 직관적인 영문 (company, appliedAt, isLoading)
- 단계별 주석은 한국어로
- for 루프 선호, 명시적 조건문 (유빈 스타일)
- 클라이언트 상태는 Zustand, 조건부 클래스는 clsx
- 반응형 필수 (모바일 우선), 공유 상태는 상위에서 관리해 props로 전달

## 디자인
- 깔끔하고 정돈된 느낌 (매일 보는 도구)
- 칸반 카드 가독성 최우선
- 상태별 색상: 지원완료(회색), 서류통과(파랑), 면접(보라), 합격(초록), 탈락(연한빨강)
- canceled(지원취소)는 회색 계열(비활성 느낌)로. 기존 applied가 회색이면 구분되게 canceled는 더 연한 회색 또는 취소선 느낌으로 표현
- 플랫폼 뱃지: 사람인(파랑), 원티드(검정), 잡코리아(빨강)

## 브랜치 전략
- main: 배포 (Vercel 자동 배포)
- dev: 개발 통합
- dev에서 작업 → main 머지 → 배포

## ⚠️ 개발 규칙 (항상 준수)

모든 개발은 docs/WORKING_AGREEMENT.md의 규칙을 따른다. 핵심:

### 커밋 (Atomic and Focused)
- 한 커밋 = 하나의 논리적 작업만
- 완전한 빌드/실행 가능 상태로 커밋
- 형식: `타입: 한글 설명 (#이슈번호)`

### 디자인 시스템 (하드코딩 금지, 토큰만)
- 색상: tailwind.config.ts의 brand/status/bg/text/platform 토큰
- 타이포: Pretendard 스케일
- 반응형: mobile-first 3단계 (기본 / md:768 / lg:1024)

### 코드
- named export, 함수형 컴포넌트
- Server(표시)/Client(상태·이벤트) 분리
- localStorage는 lib/storage.ts 헬퍼 경유

### 작업 흐름
이슈 → 브랜치 → 개발 → Atomic 커밋 → PR(base: dev, Closes #N) → 병합

@docs/WORKING_AGREEMENT.md
@AGENTS.md
