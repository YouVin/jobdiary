# 대시보드 검색·필터

관련 이슈: #73. 진입점: `src/components/dashboard/DashboardClient.tsx`.

## 동작 기준

- 회사명 또는 공고명에 검색어가 포함되면 표시한다. 유니코드 NFKC, 앞뒤/연속 공백, 영문 대소문자를 정규화한다.
- 플랫폼: 전체(기본), 사람인, 원티드, 잡코리아, 직접입력.
- 종료 지원 숨기기: 합격(`offer`), 탈락(`rejected`), 지원취소(`canceled`) 카드를 숨긴다. 기본은 해제.
- 세 조건은 AND로 결합한다. 초기화는 모든 조건을 기본값으로 돌린다.
- 전체/표시 건수를 제공하고, 지원 내역 없음과 검색 결과 없음을 구분한다.
- 필터는 페이지 내 React 상태다. 새로고침하면 초기화하며 URL·DB·localStorage에 저장하지 않는다.
- 전체 데이터는 유지하고 화면에만 필터링한다. 중복 지원 배지는 전체 지원 내역 기준이다.
- 상태 이동을 위해 7개 컬럼은 유지한다. 컬럼 건수는 표시 중인 카드 수다. 숨김 설정 중 종료 컬럼으로 옮기면 저장 후 카드가 숨겨진다.

## 파일과 검증

- `src/utils/applicationFilters.ts`: 필터 조건 및 순수 함수.
- `src/components/dashboard/ApplicationFilters.tsx`: 입력·건수·초기화.
- `src/components/board/KanbanBoard.tsx`: 전체 데이터로 중복/드래그 처리, 표시 데이터로 카드 렌더링.
- 자동 검사: `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build`.
- 수동 확인: 모바일/데스크톱 입력, 키보드 접근, 복합 조건 및 초기화, 필터 상태에서 드래그·편집, 플랫폼 필터 후 중복 배지 유지.
