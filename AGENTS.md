# 취준일기 모노레포 작업 지침

- 웹앱은 `apps/web`, Chrome 익스텐션은 `apps/extension`에 있다.
- 각 앱의 `AGENTS.md`를 함께 읽고 해당 앱의 코드 규칙을 따른다.
- 웹앱 문서는 루트 `docs/`, 익스텐션 문서는 `apps/extension/docs/`가 기준이다.
- 웹앱 작업 전 `docs/README.md`와 관련 상세 문서를 확인한다.
- Next.js API를 수정하기 전 실제 설치된 `node_modules/next/dist/docs/`의 관련 문서를 읽는다.
  의존성이 앱 아래에 설치되어 있으면 해당 앱의 node_modules에서 찾는다.
- Supabase 설정·마이그레이션·Edge Functions는 루트 `supabase/`에 유지한다.
- 설치는 루트에서 `npm ci`로 수행하며 루트 `package-lock.json` 하나를 관리한다.
- 루트 명령: `npm run dev:web`, `npm run dev:extension`, `npm run lint`,
  `npm test`, `npm run build`. 개별 검증은 `test:web`, `test:extension`, `build:web`, `build:extension`을 사용한다.
- 환경 파일은 `apps/web/.env.local`에 두고 인증 정보·개인키·빌드 산출물을 커밋하지 않는다.
- 연동 계약을 바꾸면 보내는 쪽·받는 쪽·관련 문서를 함께 확인한다.
- 모노레포로 합쳐도 웹앱 인증과 익스텐션 실행 환경은 분리되어 있다.
- 작업 브랜치는 `feat/*`, `fix/*`, `chore/*`를 사용하며 배포와 스토어 제출은 별도 단계다.
