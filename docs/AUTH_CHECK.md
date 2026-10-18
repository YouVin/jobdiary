# 로그인·가입 예외 점검 (#101·#103, 갱신 2026-10-19)

## 발견과 조치

| 경로 | 확인 결과 | 조치 |
| --- | --- | --- |
| 가입 탭 → Google | 체크 없이 클릭하면 이동하지 않음. 인증 후 ConsentGate도 있어 중복 확인 | Google은 인증 후 미동의 계정만 확인 |
| OAuth SDK throw | catch가 없어 이동 중 상태가 남고 예외가 전파됨 | 반환 오류·throw 모두 안내 후 잠금 해제 |
| Google 화면 → 뒤로가기 | 운영 사이트의 실제 Google 진입·뒤로가기·재진입은 정상. BFCache에 상태가 보존되는 경우 기존 코드에는 잠금 해제 경로가 없었음 | pageshow.persisted 복원 처리, 단위 테스트로 상태 복원 재현 |
| 이메일 요청 중 방식 전환 | 모드/Google 전환이 열려 있어 서로 다른 인증 요청이 겹칠 수 있음 | 공유 ref 잠금·필드 및 버튼 비활성화 |
| 오류 콜백 → 재시도 | error_code 단독은 안내·URL 정리 대상에서 빠져 있음. 원래 전체 URL을 다음 OAuth에 복사 | error_code 감지, redirectTo와 보드 복귀에 import=1만 허용 |

## 검증

실제 Chromium(Edge) + 로컬 프로덕션 빌드 + 설치된 Supabase SDK. Google/Supabase HTTP 응답은 fixture로 격리했다. 신규 계정을 생성하거나 실제 메일을 발송하지 않는다.

브라우저 시나리오 8개 통과, pageerror 0건:

1. 가입 탭에서 미체크 상태로 Google 인증 시작.
2. 제공자 화면 뒤로가기 후 재시도.
3. 잘못된 이메일·비밀번호를 입력해도 Google 요청에는 전달하지 않고 별도 인증.
4. 취소 콜백의 해시 오류 안내·정리 후 import=1 보존 재시도.
5. error_code 단독 쿼리 오류 안내·정리.
6. 성공 콜백을 SDK가 세션으로 복원 → 신규 계정 동의 1회 → 로그아웃/재로그인 시 생략.
7. 이메일 가입 후 확인 메일 대기 상태에서 Google 인증으로 전환.
8. 이메일 요청 지연 중 Google/모드 전환 차단 → 실패 안내 후 다시 허용.

단위 회귀 6개 추가: SDK throw/반환 오류, 같은 프레임 연타, BFCache 복원, 복원 전 응답의 늦은 오류, 이메일 요청 중 비활성화, 복귀 URL 정리. 전체 테스트 70개, lint/UI 규칙, 프로덕션 빌드로 확인한다.

별도 운영 확인: 격리된 새 브라우저에서 `jobdiary.vercel.app/login` → **실제 accounts.google.com 로그인 화면** → 뒤로가기 시 버튼 활성 → Google 재진입을 확인했다. 계정 선택·비밀번호 입력·사용자 승인까지 진행하지 않았다. 실제 동일 이메일의 identity 연결이나 운영 성공 콜백까지 검증한 것은 아니다.

## 입력 안내 개선 (#103)

- Google 가입은 이메일 가입 체크박스와 독립적으로 시작하고, 인증 후 해당 계정의 미동의 정책만 확인한다. #102 미병합 상태에서는 운영 화면에 아직 반영되지 않는다.
- 빈 이메일·비밀번호는 포커스 이탈만으로 오류를 표시하지 않는다. 입력 후 400ms 멈추거나 입력된 필드에서 blur하면 오류를 표시한다. 제출은 지연 없이 모든 필수값을 확인한다.
- 이메일 공백, @ 누락·중복, 아이디·도메인 누락을 구분한다. 서버의 가입 여부를 조회하는 기능은 아니다.
- 유효한 값으로 바꾸면 오류는 즉시 사라진다. 오류가 있는 값을 계속 고치는 동안에는 안내를 숨기고 다음 입력 정지 시 갱신한다. aria-describedby와 role=status로 입력과 안내를 연결한다.
- useFieldValidation은 로컬 상태와 타이머만 사용하며 추가 패키지·네트워크 요청이 없다. 타이머는 다음 입력·모드 변경·Google 전환·언마운트에서 취소한다. 가벼운 형식 검사는 타이핑마다 수행하되 안내 표시만 늦춘다.
- 기존 8개에 빈 값 제출, 399/400ms 경계·즉시 수정, blur·모드 전환 시 초기화 검증 3개를 추가했다. 브라우저 11개 통과. 전체 기존 테스트 70개와 상세 이메일 단위 테스트 1개 통과, lint·build 통과.
- 검증 시점/안내 근거: [W3C WAI 폼 알림](https://www.w3.org/WAI/tutorials/forms/notifications/), [React 제어 입력](https://react.dev/reference/react-dom/components/input). 400ms는 이 프로젝트의 UX 선택이며 특정 사이트의 표준이라고 주장하지 않는다.

## 재실행

```powershell
npm.cmd install --prefix node_modules/.release-tools --no-audit --no-fund --ignore-scripts playwright@1.58.2
npm.cmd run build
npm.cmd run start -- --port 3100
# 별도 터미널
node scripts/verify-auth-browser.mjs
npm.cmd test
```

## UX 및 동일 이메일 처리 근거

- [Auth0 약관 확인 안내](https://support.auth0.com/center/s/article/how-to-add-terms-and-conditions-or-terms-of-service-to-the-signup-screen): 소셜 인증의 로그인/가입 구분과 별도 화면에서 확인하는 방식을 안내한다. 서비스마다 구현이 같다는 뜻은 아니다.
- [Google OpenID Connect](https://developers.google.com/identity/openid-connect/openid-connect): Google 계정 정보 공유 승인은 서비스 자체 약관 동의와 구분한다.
- [Supabase identity linking](https://supabase.com/docs/guides/auth/auth-identity-linking): 동일 이메일의 자동 연결과 미인증 identity 탈취 방지 처리. 단순히 폼에 입력한 이메일을 믿고 다른 Google 계정과 합치지 않는다.

약관 버전 미보유 계정은 최초 확인이 필요하며, 이메일 가입 전 확인을 했어도 OAuth가 다른 계정으로 돌아오면 그 계정에 대한 확인을 다시 받는다. 동의 기록은 기존처럼 사용자 메타데이터의 UI 기록이며 권한 판단에 쓰지 않는다.
