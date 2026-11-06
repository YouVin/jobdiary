# 취준일기 웹앱 · JobDiary

사람인·잡코리아·원티드에 흩어진 지원내역을 Chrome 확장으로 가져와 단계별로 관리하는 웹앱입니다. 현재 저장소는 웹앱과 확장을 함께 개발하는 모노레포입니다.

[웹앱](https://jobdiary.vercel.app) · [프로젝트 소개](../../README.md) · [익스텐션 사용법](../extension/README.md)

## 현재 기능

- 7개 단계의 칸반 보드와 지원내역 추가·수정·삭제
- 드래그로 상태 변경, 면접일·선택적 공고 마감일 관리
- Chrome 확장 가져오기, 수신 데이터 검증과 중복 판별
- 로그인과 Supabase 기반 저장
- 확장에 보낼 최소 지원 이력 비교 캐시 동기화

지원 건별 일기 작성·통계·이미지 공유 UI는 후속 계획입니다. dev의 구현과 운영 배포는 별도로 관리합니다.

## 지원 기록이 들어오는 흐름

채용 사이트 지원현황 → 확장 수집/변환/저장 → 웹앱 가져오기 → 메시지·데이터 검증 → 기존 지원과 중복 판별 → 저장·칸반 표시 순서입니다.

웹앱은 최종 지원 이력을 관리합니다. 자동 표시용으로 확장에 보내는 정보는 공고 ID와 지원/취소 상태 등 최소 비교 정보이며, 계정과 origin을 구분합니다. 반복 수집이 사용자의 수동 상태를 덮어쓰지 않도록 처리합니다. [받는 쪽 연동 계약](../../docs/INTEGRATION.md)과 [동기화 설계](../../docs/APPLICATION_HISTORY_SYNC.md)를 참고하세요.

## 기술 스택

Next.js App Router · React · TypeScript · Tailwind CSS · Zustand · dnd-kit · Supabase · Vercel. 정확한 버전은 package.json과 루트 package-lock.json을 기준으로 합니다.

## 로컬 실행

설치는 모노레포 루트에서 수행합니다. Node.js 22.12 이상 25 미만, npm 11 이상을 사용합니다.

```bash
cd ../..   # apps/web에서 모노레포 루트로 이동
npm ci
# apps/web/.env.example을 참고해 apps/web/.env.local 준비
npm run dev:web
```

웹앱은 http://localhost:3000에서 실행됩니다. 개발 확장을 함께 확인할 때는 별도 터미널에서 npm run dev:extension을 실행합니다. 실제 환경 값이나 로그인 세션은 커밋하지 않습니다.

## 검증·빌드

```bash
# 모노레포 루트 기준
npm run lint
npm run test:web
npm run build:web
```

GitHub Actions는 웹앱과 확장을 별도 job으로 검증합니다. 웹앱 결과는 apps/web/.next에 생성되며 Vercel 배포와 확장 스토어 출시는 분리합니다.

## 설계와 작업 기록

- [문서 인덱스](../../docs/README.md) — 작업별 진입점과 확인 방법
- [화면·기술 설계](../../docs/TECH_DESIGN.md)
- [가져오기·중복 판별](../../docs/INTEGRATION.md)
- [인증](../../docs/AUTH.md) · [저장 구조](../../docs/SUPABASE.md)
- [마감일 처리](../../docs/DEADLINE.md)
- [웹앱 기준 비교 캐시](../../docs/APPLICATION_HISTORY_SYNC.md)
- [모노레포 전환 사례](../../docs/MONOREPO_CASE_STUDY.md)
- [개발 규칙](../../docs/WORKING_AGREEMENT.md) · [남은 작업](../../docs/ROADMAP.md)

main은 배포, dev는 통합 브랜치입니다. 변경은 이슈별 작업 브랜치와 dev 대상 PR로 관리합니다.
