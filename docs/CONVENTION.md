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
dev 에서 개발 → 기능 완성 → main 으로 머지 → 자동 배포
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
lib/storage.ts                      ← localStorage 헬퍼
utils/format.ts                     ← 순수 변환 함수
types/application.ts                ← 타입 정의
```

- 컴포넌트 하나에 파일 하나
- 300줄 넘으면 분리 검토

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

- localStorage 동기화는 스토어 내부에서 처리
- 컴포넌트는 스토어 액션만 호출

---

## 6. 주석 규칙
```typescript
// 단계 주석은 한국어로 간결하게
// 1. 기존 데이터 불러오기
// 2. 중복 확인
// 3. 저장

// 왜(why)를 설명
// localStorage는 문자열만 저장 가능해서 JSON 직렬화
localStorage.setItem('applications', JSON.stringify(apps));
```

---

## 7. 데이터 저장 규칙 (1단계)
```typescript
// 모든 저장은 lib/storage.ts 헬퍼 경유
// localStorage 키: 'jobdiary:applications'
// 직접 localStorage 호출 금지, 헬퍼 함수만 사용
```