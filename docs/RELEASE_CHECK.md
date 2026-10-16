# 릴리즈 검증 — 2026-10-17 (#96·#97)

## 범위와 결과

기준: #91·#92·#95가 병합된 dev에 정책·동의 확인 및 마이그레이션 이력 복원을 추가한 작업 브랜치.

- `npm test`: 64개 통과. 계정 전환·지연 응답·편집 충돌·날짜·자동 분류 회귀 포함.
- `npm run lint`, `npm run build`: 통과. Next.js 16.4.2, 정책 페이지도 정적 생성.
- `npm audit --omit=dev`: 0. 개발 도구 경고와 Supabase Free 플랜 한계는 SECURITY.md 참고.
- 실제 Chromium(Edge), 로컬 **프로덕션 빌드**, Supabase HTTP 응답은 테스트 fixture로 격리: 아래 7개 시나리오 통과, 브라우저 예외 0건.
  1. 공개 정책 페이지: 375·768·1440px 가로 넘침 없음.
  2. 이메일 가입: 미동의 API 차단, 동의 후 버전 전달.
  3. 동의 없는 소셜 사용자: 목록 접근 차단, 저장 실패 안내, 재시도·새로고침 유지.
  4. 빈 지원일: API 차단, 올바른 날짜 재저장 성공.
  5. 두 탭 편집: B탭의 수동 탈락→지원완료 복원을 A탭의 오래된 폼이 덮어쓰지 못함.
  6. 다른 탭 로그아웃→B 로그인: A 목록과 열린 편집창 제거.
  7. A 조회를 지연시킨 뒤 B로 전환: A 응답 무시, B 목록만 표시.

이 검증은 실제 Google OAuth 화면·이메일 발송·운영 계정 두 개를 사용하는 종단간 검증은 아니다. 실제 네트워크의 Supabase 장애·Google 설정까지 보증하지 않는다. 운영 DB 사용자 행은 읽거나 변경하지 않고 아래 카탈로그 검사만 별도로 실행했다.

## 재실행

프로젝트 운영 의존성에 브라우저 패키지를 넣지 않는다. 설치한 테스트 도구는 git에서 무시되는 폴더에 둔다.

```powershell
npm.cmd run build
npm.cmd install --prefix node_modules/.release-tools --no-audit --no-fund --ignore-scripts playwright@1.58.2
npm.cmd run start -- --port 3100
# 별도 터미널. Microsoft Edge 설치 필요. 운영 계정/비밀 키 불필요.
node scripts/verify-release-browser.mjs
```

## 운영 DB 이력과 권한

`supabase migration fetch --linked`로 **이미 적용된 SQL**을 복원했다. 기존 마감일 파일은 같은 내용의 이전 로컬 버전이므로 제거했다. 운영 SQL 재실행·migration repair·데이터 갱신은 하지 않았다.

`supabase migration list --linked` 결과 로컬/원격 모두 다음 세 버전:

| 버전 | 이름 |
| --- | --- |
| 202610130001 | application_status_source |
| 20261016124556 | application_deadline_auto_rejection |
| 20261016125542 | security_hardening |

기존 applications 기본 테이블은 이 마이그레이션들보다 먼저 만들어졌다. 이력 정합화가 빈 DB의 전체 자동 재구축까지 보장하는 것은 아니다. 새 환경은 SUPABASE.md의 기본 스키마와 정책을 먼저 확인한다.

2026-10-17 카탈로그 재검사: applications RLS 활성, authenticated에 CRUD만 부여, 각 정책은 본인 user_id만 허용하고 UPDATE의 USING/WITH CHECK 모두 존재. public의 두 트리거 함수는 anon/authenticated 실행 불가. Advisor 경고는 유출 비밀번호 보호 비활성화 1건이다.

## 정책의 근거와 운영 책임

운영자가 제공한 이름·문의 이메일과 저장 코드, Supabase 서울 리전을 기준으로 작성했다. 자동 분류가 채용사의 공식 탈락 통보가 아님을 명시했다. 제공업체의 로그·백업을 즉시 삭제한다고 약속하지 않는다. 문의 보유 기간 및 권리 요청 처리는 운영자가 계속 이행해야 한다.

- [개인정보 보호법 국외 이전 조항](https://law.go.kr/lsLinkCommonInfo.do?lsJoLnkSeq=1020398611)
- [Supabase 데이터 위치·이전 안내](https://supabase.com/legal/privacy-resources/data-residency-and-transfers-faq)
- [Vercel 처리위탁 계약](https://vercel.com/legal/dpa)

이는 구현과 공개 안내의 점검 결과이며 법률 전문가의 적법성 보증이 아니다. 수탁사·처리 국가·보존 정책 변경 및 서비스 확대 시 개인정보처리방침을 재검토한다.
