# 📏 개발 규칙 (Working Agreement)

취준일기 개발 시 **항상** 지키는 규칙. 즉흥적 판단이 아니라 이 문서를 기준으로 작업한다.

---

## 1. 커밋 원칙 (Atomic and Focused Commits)

> 원자적이고 집중된 커밋 — 한 커밋에는 하나의 작업만.

- **하나의 논리만**: 한 커밋에 둘 이상의 독립적인 작업을 담지 않는다.
- **완전한 상태**: 커밋은 특별한 경우가 아닌 이상, 완전한 빌드 및 실행이 가능한 상태여야 한다.
- **명확한 메시지**: 커밋 메시지는 어떤 작업이 이루어졌는지 명확히 설명한다.

### 실전 적용
```
❌ 나쁜 예: "feat: 칸반보드랑 스토어랑 카드 추가 다 함 (#3)"
   → 여러 작업이 한 커밋에 섞임

✅ 좋은 예:
   "feat: Application 타입 및 상태 상수 정의 (#2)"
   "feat: Zustand 스토어 및 localStorage 연동 (#2)"
   → 작업 단위로 분리
```

### 커밋 메시지 형식
```
타입: 한글 설명 (#이슈번호)

타입: feat / fix / chore / docs / style / refactor
```

---

## 2. 디자인 규칙 (Figma 디자인 시스템 준수)

모든 UI는 확정된 디자인 시스템을 따른다. 임의의 색/크기 사용 금지.

### 색상 — tailwind.config.ts 토큰만 사용
```
brand: #4F46E5 / hover #4338CA / tint #EEF2FF / text #3730A3
status: applied #A1A1AA / screening #378ADD / interview #7F77DD / offer #639922 / rejected #E24B4A
bg: page #FAFAFA / column #F2F2F4 / card-border #DEDEE2
text: primary #18181B / secondary #52525B / muted #A1A1AA
platform: saramin(#F4F4F5/#3F3F46) / wanted(#EEF2FF/#3730A3) / jobkorea(#FEF2F2/#991B1B)
```
→ 하드코딩 금지. `bg-brand`, `text-status-offer` 처럼 토큰으로.

### 타이포그래피 — Pretendard
```
heading/xl  28 · 600      heading/lg  22 · 500
heading/md  18 · 500      body        14 · 400
card/company 13 · 500     label       12 · 500
caption     11 · 400      badge       10 · 500
```

### 반응형 — 3개 브레이크포인트 (mobile-first)
```
Mobile   ~767px      기본 스타일
Tablet   768~1023px  md:
Desktop  1024px~     lg:
```
모든 컴포넌트는 세 화면을 고려한다.
예) `grid-cols-1 md:grid-cols-3 lg:grid-cols-5`

---

## 3. 코드 규칙 (컨벤션)

- named export (page.tsx, layout.tsx 제외)
- 함수형 컴포넌트 + hooks
- 변수명 직관적 영문 (company, appliedAt, isLoading)
- 단계 주석 한국어로
- Server/Client 컴포넌트 분리 (표시용 Server, 상태/이벤트 Client)
- 클라이언트 상태 Zustand, 조건부 클래스 clsx
- localStorage 접근은 lib/storage.ts 헬퍼만 경유

---

## 4. 브랜치 규칙

```
main          배포 (기본 브랜치는 dev로 설정됨)
dev           개발 통합
feat/[기능]    기능 개발
fix/[이슈]     버그 수정
design/[대상]  디자인
chore/[내용]  설정/문서/잡일
```

---

## 5. 작업 흐름 (한 사이클)

```
1. GitHub 이슈 생성 (템플릿 사용, 라벨 + 마일스톤)
2. 이슈 작업 브랜치 생성 (컨벤션에 맞게)
3. 개발 (이 규칙 문서 전부 준수)
4. Atomic 커밋 (작업 단위로 분리, 하나의 논리)
5. push → PR 생성 (base: dev, "Closes #N")
6. 병합 → 이슈 자동 종료
7. 다음 이슈
```

---

## 6. Claude(PM/개발) 행동 지침

- 개발 지시나 코드 생성 시 위 모든 규칙을 자동으로 적용한다.
- 색상/타이포/간격은 디자인 시스템 값을 정확히 사용한다.
- 커밋을 나눌 때 Atomic 원칙에 따라 작업을 분리해 제안한다.
- 반응형은 항상 3개 브레이크포인트를 고려한다.
- 규칙에서 벗어나야 할 상황이면 먼저 이유를 설명하고 확인받는다.