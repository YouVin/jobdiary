# 기술 설계

## 1. 기술 스택

### 웹앱
| 역할 | 기술 |
|------|------|
| 프레임워크 | Next.js 14 (App Router) |
| 언어 | TypeScript |
| 스타일 | Tailwind CSS |
| 상태관리 | Zustand |
| 드래그앤드롭 | @dnd-kit/core, @dnd-kit/sortable |
| 이미지 공유 | html-to-image |
| 저장 (1단계) | localStorage |
| 저장 (2단계) | Supabase |
| 배포 | Vercel |

### 크롬 익스텐션 (별도 레포)
| 역할 | 기술 |
|------|------|
| 표준 | Manifest V3 |
| 빌드 | CRXJS + Vite |
| 언어 | React + TypeScript |
| 저장 | chrome.storage |

---

## 2. 아키텍처

```
크롬 익스텐션 (수집)          웹앱 (조회/관리)
─────────────────           ──────────────────
채용 사이트                   Next.js 대시보드
  ↓ content script            ↓
지원 내역 추출                칸반 보드
  ↓                          ↓
chrome.storage      →→→      일기 · 통계 · 공유
                             ↓
                     localStorage (1단계)
                     Supabase (2단계)
```

- 익스텐션: 데이터를 **수집**해서 저장
- 웹앱: 데이터를 **조회·관리·기록**

---

## 3. 데이터 구조

```typescript
type Platform = 'saramin' | 'wanted' | 'jobkorea' | 'manual';

type Status =
  | 'applied'      // 지원완료
  | 'screening'    // 서류통과
  | 'interview'    // 면접예정
  | 'interviewed'  // 면접완료
  | 'offer'        // 합격
  | 'rejected';    // 탈락

interface Application {
  id: string;
  company: string;        // 회사명
  position: string;       // 공고명
  platform: Platform;     // 어느 사이트
  status: Status;         // 현재 상태
  appliedAt: string;      // 지원일 (ISO)
  updatedAt: string;      // 마지막 수정
  memo?: string;          // 간단 메모
  diary?: DiaryEntry[];   // 일기 목록
  interviewDate?: string; // 면접일
  url?: string;           // 공고 링크
}

interface DiaryEntry {
  id: string;
  content: string;        // 일기 내용
  mood?: string;          // 감정 (선택)
  createdAt: string;
}
```

### 상태 흐름
```
지원완료 → 서류통과 → 면접예정 → 면접완료 → 합격 / 탈락
```

---

## 4. 폴더 구조

```
jobdiary/
├── src/
│   ├── app/
│   │   ├── page.tsx              # 대시보드 (칸반)
│   │   ├── layout.tsx
│   │   └── globals.css
│   │
│   ├── components/
│   │   ├── board/               # 칸반
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── Column.tsx
│   │   │   ├── ApplicationCard.tsx
│   │   │   └── AddCardButton.tsx
│   │   ├── diary/               # 일기
│   │   │   ├── DiaryModal.tsx
│   │   │   └── DiaryEntry.tsx
│   │   ├── stats/               # 통계
│   │   │   └── StatsSummary.tsx
│   │   ├── share/               # 공유
│   │   │   ├── CopyButton.tsx
│   │   │   └── ShareCard.tsx
│   │   └── common/
│   │       ├── Header.tsx
│   │       └── PlatformBadge.tsx
│   │
│   ├── store/
│   │   └── applicationStore.ts  # Zustand
│   │
│   ├── types/
│   │   └── application.ts
│   │
│   ├── lib/
│   │   └── storage.ts           # localStorage 헬퍼
│   │
│   ├── constants/
│   │   └── status.ts            # 상태 라벨/색상
│   │
│   └── utils/
│       ├── format.ts
│       └── stats.ts
│
├── docs/                        # 문서
├── CLAUDE.md
├── AGENTS.md
└── README.md
```

---

## 5. 디자인

### 무드
깔끔하고 정돈된 느낌. 매일 보는 도구라 피로감 없어야 함. 칸반 카드 가독성 최우선. 라이트/다크 지원.

### 상태별 색상
| 상태 | 색상 |
|------|------|
| 지원완료 | 회색 |
| 서류통과 | 파랑 |
| 면접예정/완료 | 보라 |
| 합격 | 초록 |
| 탈락 | 연한 빨강 |

### 플랫폼 뱃지
사람인(파랑), 원티드(검정), 잡코리아(빨강)

### 화면 구성
```
[헤더] 로고 | 통계 요약 (총 23건 · 면접 3건)
[칸반 보드 - 가로 스크롤]
지원완료 → 서류통과 → 면접예정 → 합격 → 탈락
각 컬럼에 회사 카드 (드래그로 상태 변경)
카드 클릭 → 일기/메모 모달
```