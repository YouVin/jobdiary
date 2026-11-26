# 컨벤션

## 1. Git 컨벤션

### 브랜치 전략
```
main          ← 배포 브랜치 (Vercel 자동 배포, 직접 push 금지)
dev           ← 개발 통합 브랜치
feat/[기능명]  ← 기능 개발 (선택, 큰 기능일 때)
fix/[이슈명]   ← 버그 수정
```

기본 작업 흐름:
```
기능별 이슈 → dev 기반 작업 브랜치 → 코드·관련 docs 갱신 → 검증 → dev 대상 PR
배포 시: dev → main PR → 검사 확인 → 병합 → 배포 확인
```

### 커밋 메시지 규칙
```
feat: 칸반보드 카드 드래그 기능 추가
fix: 지원일 표시 형식 오류 수정
chore: 프로젝트 초기 세팅
docs: 기획서 작성
style: 카드 컴포넌트 스타일 정리
refactor: 스토어 로직 분리
```

형식: `타입: 한글 설명` (간결하게)

### 커밋 타입
| 타입 | 용도 |
|------|------|
| feat | 새 기능 |
| fix | 버그 수정 |
| chore | 설정, 패키지, 잡일 |
| docs | 문서 |
| style | 스타일 (기능 변화 없음) |
| refactor | 리팩터링 |

---

## 2. 코딩 스타일

### TypeScript
```typescript
// 타입 명시적으로
const addApplication = (app: Application): void => { ... }

// interface 사용 (객체 타입)
interface ApplicationCardProps {
  application: Application;
  onStatusChange: (id: string, status: Status) => void;
}

// named export (page.tsx, layout.tsx 는 예외로 default)
export function ApplicationCard({ application }: ApplicationCardProps) { ... }
```

### 컴포넌트 구조
```typescript
// 순서: 타입 → 컴포넌트 (훅 → 핸들러 → 렌더링)
interface Props {
  application: Application;
}

export function ApplicationCard({ application }: Props) {
  // 1. 훅
  const updateStatus = useApplicationStore((s) => s.updateStatus);
  // 2. 핸들러
  const handleClick = () => { ... };
  // 3. 렌더링
  return <div className="...">...</div>;
}
```

### 변수명 규칙
```
컴포넌트: PascalCase       → ApplicationCard, KanbanBoard
함수/변수: camelCase       → addApplication, appliedAt, isLoading
상수: UPPER_SNAKE_CASE     → STATUS_LABELS, PLATFORM_COLORS
파일(컴포넌트): PascalCase  → ApplicationCard.tsx
파일(유틸/훅/store): camel  → storage.ts, useApplications.ts
라우트: lowercase          → page.tsx, layout.tsx
```

---

## 3. 폴더/파일 규칙
```
components/board/KanbanBoard.tsx    ← 칸반 관련
components/diary/DiaryEntry.tsx     ← 일기 관련
components/common/Header.tsx        ← 공통
store/applicationStore.ts           ← Zustand 스토어
lib/applicationsApi.ts               ← Supabase 지원 내역 API
utils/format.ts                     ← 순수 변환 함수
types/application.ts                ← 타입 정의
```

- 컴포넌트 하나에 파일 하나
- 300줄 넘으면 분리 검토

### 폴더 역할 (#262)

`apps/web/src` 안의 폴더는 한 방향으로만 불러온다. `npm run lint`의 `check:layers`(`scripts/check-layers.mjs`)가 반대 방향을 실패로 막는다. 타입만 불러오는 `import type`은 검사하지 않는다.

```
app·components (화면: 보여 주기)
   ↓
hooks (화면 동작: 이벤트·구독·타이머)
   ↓
store (Zustand 상태와 액션)
   ↓
lib (바깥과 통신: Supabase·Edge Function·익스텐션·브라우저 저장)
   ↓
utils (순수 함수: 입력 → 출력, React·Supabase 없음) · types · constants
```

| 폴더 | 하는 일 | 하지 않는 일 |
|---|---|---|
| `app/` | 주소별 페이지, 메타데이터, 레이아웃. 화면 컴포넌트를 배치 | 데이터 불러오기·저장 로직 |
| `components/` | 화면 표시와 사용자 입력 받기. 스토어 액션이나 lib 함수를 부른다 | Supabase 직접 호출 |
| `hooks/` | 여러 화면이 쓰는 동작(가져오기 감지, 단계 옮기기, 포커스) | 화면 그리기 |
| `store/` | 여러 화면이 같이 보는 상태와, 저장까지 묶인 액션 | 화면·hook 불러오기 |
| `lib/` | 바깥 시스템과 통신. **Supabase는 여기서만** 부른다 | 화면·hook 불러오기. store는 `*Sync.ts`(바깥과 상태 맞추기)만 읽는다 |
| `utils/` | 계산·변환·검증. 테스트하기 쉬운 순수 함수 | React·Next·Supabase·store·lib 불러오기 |

**서버 액션(Server Actions)을 쓰지 않는 이유:** 데이터는 브라우저의 Supabase 클라이언트가 사용자 세션으로 부르고, 권한은 DB의 RLS가 지킨다. 페이지는 모두 정적으로 만들어진다(`next build`의 ○). 서버 액션을 넣으면 같은 권한 검사를 서버에 한 번 더 만들어야 하고 정적 페이지 이점도 줄어든다. 서버에서만 해야 하는 일(AI 키 사용, 계정 삭제, 이미지 대신 받기)은 Supabase Edge Function에 둔다.

---

## 4. Tailwind 사용 규칙
```typescript
// className 직접 작성
<div className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm">

// 조건부 클래스는 clsx
import { clsx } from 'clsx';
<div className={clsx('rounded-lg p-3', isDragging && 'opacity-50')}>

// 인라인 style 지양
```

---

## 5. 상태관리 규칙 (Zustand)
```typescript
// store/applicationStore.ts
interface ApplicationStore {
  applications: Application[];
  addApplication: (app: Application) => void;
  updateStatus: (id: string, status: Status) => void;
  removeApplication: (id: string) => void;
}

// 컴포넌트에서는 필요한 것만 선택 (리렌더 최소화)
const applications = useApplicationStore((s) => s.applications);
```

- 지원 내역 영속 저장은 스토어에서 `lib/applicationsApi.ts`를 통해 처리
- 화면 검색·필터처럼 페이지 안에서만 사용하는 상태는 React 로컬 상태로 관리
- 컴포넌트는 스토어 액션만 호출

---

## 6. 주석 규칙
```typescript
// 단계 주석은 한국어로 간결하게
// 1. 기존 데이터 불러오기
// 2. 중복 확인
// 3. 저장

// 왜(why)를 설명
// 필터에 가려진 지원도 중복 판별에는 포함한다.
const duplicateIds = getDuplicateApplicationIds(applications);
```

### 화면 구역 주석 (#263)

화면 파일은 위에서 아래로 읽으면 화면의 어느 부분인지 바로 찾을 수 있게 `── 이름 ──` 표시를 단다. 검색할 때는 `── `로 찾는다.

```tsx
// page.tsx 맨 위: 주소·로그인 필요 여부·화면 구성 파일·화면 순서
// 지원 보드(/board) · 로그인 필요. 화면 구성: components/board/BoardClient.tsx

export function BoardClient() {
  // ── 데이터 ──          스토어·불러오기
  // ── 처리 함수 ──       버튼·입력에 연결되는 함수
  // ── 불러오는 중 ──     먼저 돌려주는 화면(early return)

  return (
    <>
      {/* ── 머리말: 제목·한 줄 설명·보기 탭 ── */}
      {/* ── 본문: 고른 보기 ── */}
      {/* ── 상세 패널(오른쪽) ── */}
    </>
  );
}
```

- 이름은 화면에 보이는 말로 쓰고, 구역 안의 순서가 중요하면 `→`로, 나란히 있으면 `|`로 적는다(예: `전형 여정 | 지원 경로`).
- 짧은 공통 부품(`components/ui`)이나 구역이 하나뿐인 파일에는 달지 않는다.
- 화면을 바꾸면 주석도 같이 고친다. 주석과 화면이 다르면 화면이 맞다.

---

## 7. 데이터 저장 규칙 (현재)

지원 내역은 `applicationStore.ts` → `lib/applicationsApi.ts` → Supabase 순서로 접근한다.
`lib/storage.ts`는 브라우저에만 두는 값(지원 보드 보기 선택, 마지막 가져오기 시각, 방문 기록 날짜 등)만 다루며 지원 내역은 저장하지 않는다.
DB 변경·적용 이력은 [SUPABASE.md](SUPABASE.md), 가져오기 보존 규칙은 [INTEGRATION.md](INTEGRATION.md)를 따른다.
