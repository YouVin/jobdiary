# 취준일기 (JobDiary)

사람인·원티드·잡코리아의 지원 내역을 수집하는 Chrome 익스텐션과,
지원 현황을 관리하는 웹앱을 함께 관리하는 모노레포다.

## 구성

| 경로 | 역할 |
| --- | --- |
| `apps/web` | Next.js 웹앱 |
| `apps/extension` | Vite·CRXJS 기반 Chrome 익스텐션 |
| `docs` | 웹앱 설계·검증 기록 및 통합 진행 계획 |
| `apps/extension/docs` | 익스텐션 설계·셀렉터·스토어·개인정보 문서 |
| `supabase` | 기존 데이터베이스 마이그레이션과 Edge Functions |

공통 연동 코드 추출과 지원 이력 자동 표시는 후속 단계다.
모노레포로 바꾼 배경·이력 보존·문제 해결·검증 근거는 [전환 사례](docs/MONOREPO_CASE_STUDY.md),
현재 진행 중인 마감일 검증은 [직접 확인 체크리스트](docs/DEADLINE_VALIDATION.md)를 참고한다.

## 개발

Node.js 22.12 이상 25 미만과 npm 11 이상을 사용한다. 의존성은 저장소 루트에서 설치한다.

```bash
npm ci
# 웹앱의 기존 환경 설정을 apps/web/.env.local에 준비
npm run dev:web          # http://localhost:3000
npm run dev:extension    # 별도 터미널에서 익스텐션 개발 서버
```

환경 변수 이름은 [웹앱 환경 예시](apps/web/.env.example)를 따른다.
환경 파일에 실제 값을 채우고, 환경 파일은 Git에 포함하지 않는다.

## 검증과 빌드

```bash
npm run lint
npm test
npm run build

# 필요한 앱만 실행
npm run test:web
npm run test:extension
npm run build:web
npm run build:extension
```

웹앱 결과는 `apps/web/.next`, 익스텐션 결과는 `apps/extension/dist`와
`apps/extension/release`에 생성된다. Chrome의 압축해제 확장 로드는
`apps/extension/dist`를 선택한다. 버전과 배포는 앱별로 관리한다.

## 문서

- [작업 문서 인덱스](docs/README.md)
- [모노레포 이전 기록과 배포 경로](docs/MONOREPO_MIGRATION.md)
- [GitHub·호스팅·이력서 링크 전환 체크리스트](docs/MONOREPO_HANDOFF.md)
- [단계별 진행 계획](docs/IMPLEMENTATION_ROADMAP.md)
- [웹앱 안내](apps/web/README.md)
- [익스텐션 안내](apps/extension/README.md)
- [웹앱 연동 계약](docs/INTEGRATION.md)

`main`은 배포, `dev`는 통합, 작업은 `feat/*`, `fix/*`, `chore/*` 브랜치에서 진행한다.
