# 인증 설계 (AUTH)

> 현재 이메일+비밀번호 인증 위에 실무급 기능을 단계적으로 얹기 위한 설계 문서. 기존 구조 — `authStore`의 3상태(`loading`/`authenticated`/`unauthenticated`), 리다이렉트 소유권(단일 `useEffect`), `?import=1` 등 쿼리 신호 보존 — 은 유지한다는 전제로 설계한다. 이 문서는 설계만 다룬다. 구현은 6번 Phase 계획에 따라 별도로 진행한다.

---

## 1. 현재 상태 (되는 것)

- **인증 방식**: 이메일+비밀번호. Supabase Auth 기본 기능만 사용. Confirm email이 켜져 있어 회원가입 직후엔 세션이 없다(메일 인증 전까지 로그인 불가).
- **상태 관리**: [`src/store/authStore.ts`](../src/store/authStore.ts)의 `authStore`가 `status: 'loading' | 'authenticated' | 'unauthenticated'`와 `session`을 보관한다. `setSession(session)` 한 곳에서 `session` 유무로 `status`까지 함께 확정한다 — 상태가 어긋날 여지가 없다.
- **세션 부트스트랩/구독**: [`AuthProvider`](../src/components/auth/AuthProvider.tsx)가 루트 레이아웃에서 한 번만 마운트된다. 마운트 시 `getSession()`으로 새로고침 후 세션을 복원하고, `onAuthStateChange`로 이후 로그인/로그아웃 등 변화를 실시간 반영한다.
- **라우트 가드**: [`AuthGuard`](../src/components/auth/AuthGuard.tsx)는 `status==='unauthenticated'`면 `/login`으로 리다이렉트(이때 현재 쿼리를 그대로 붙여 보존), `status==='authenticated'`면 `children`(보드)을 렌더링, `loading`이면 로딩 화면만 보여준다. 지금은 "인증이 필요한 페이지"만 감싸고, `/login` 자체는 가드로 감싸져 있지 않다 — 로그인 상태로 `/login`에 들어왔을 때 보드로 돌려보내는 처리는 `LoginForm` 내부의 `useEffect`가 담당한다.
- **로그인/회원가입 폼**: [`LoginForm`](../src/components/auth/LoginForm.tsx) 하나가 탭 토글로 로그인·회원가입을 겸한다.
  - 이메일 정규식(`EMAIL_PATTERN`)과 비밀번호 최소 6자(`MIN_PASSWORD_LENGTH`) 검증 — **제출 시점에만** 검증한다(필드별 실시간/blur 검증은 없음).
  - Supabase 에러 메시지를 한글로 매핑하는 `getFriendlyErrorMessage` — 원문 문자열의 `includes()` 매칭으로 4가지 케이스만 다루고, 나머지는 공용 문구("요청 처리 중 문제가 발생했습니다...")로 뭉뚱그린다.
  - `isSubmitting`으로 제출 중 버튼을 비활성화하고 "처리 중..." 문구를 보여준다.
  - 회원가입 성공 후에도 세션이 없으면(이메일 확인 대기 상태) 리다이렉트하지 않고 "확인 메일을 발송했습니다..." 안내만 표시한다.
  - **리다이렉트 소유권은 단 하나의 `useEffect`**(`status==='authenticated'`를 구독)가 갖는다. `redirectToBoard()`가 `/login`에 붙어있던 쿼리(예: 익스텐션이 붙이는 `?import=1`)를 읽어 그대로 `/`에 이어 붙인다 — 로그인 폼의 다른 어떤 코드 경로도 직접 리다이렉트하지 않는다(중복 리다이렉트 방지, 이전 CodeRabbit 라운드에서 확정된 패턴).
- **로그아웃**: `HeaderActions`가 `signOut()`을 호출하고, 성공했을 때만 로컬 지원 목록을 초기화한다(`resetApplications`) — 실패한 채로 먼저 비우면 세션은 남았는데 데이터만 사라지는 손실이 생기기 때문.
- **Supabase 프로젝트 설정 현황**: 이메일 provider 활성화, Confirm email 켜짐, Site URL = Vercel 배포 도메인.
- **클라이언트 초기화**: [`src/lib/supabase.ts`](../src/lib/supabase.ts)는 지연 초기화(Proxy) 패턴을 쓴다 — 실제 속성에 접근하는 시점에만 클라이언트를 만들어서, 빌드/prerender 시점에 환경변수가 없어도 안전하다. `flowType`/`detectSessionInUrl` 같은 옵션은 명시적으로 설정하지 않아 supabase-js 기본값(브라우저에서 URL의 세션 정보를 자동 감지)에 의존하고 있다 — 비밀번호 재설정·OAuth를 붙일 때 이 기본값이 그대로 맞는지 재검토가 필요하다(§5).

---

## 2. 목표 기능 (실무급 전체)

### 2.1 회원가입 강화

- **비밀번호 확인(재입력)**: 두 값이 다르면 제출을 막고 필드 아래 즉시 안내.
- **비밀번호 강도 표시**: 길이 + 문자 종류(영문/숫자/특수문자) 조합만으로 계산하는 간단한 휴리스틱. 외부 라이브러리 없이(`zxcvbn` 등은 번들 크기 대비 이 프로젝트 규모엔 과함) 약함/보통/강함 3단계 정도의 막대·문구로 표시.
- **약관/개인정보처리방침 동의 체크박스**: 필수 항목 미동의 시 제출 불가. **실제 약관·정책 문서 자체는 이 설계의 범위 밖** — 법무 검토된 문서가 먼저 준비돼야 링크를 걸 수 있다(Phase 1 착수 전 확인 필요).
- **실시간(blur) 검증**: 현재는 제출 시점에만 전체 검증한다. 필드별 `touched` 상태를 추가해, 이메일/비밀번호 각각 포커스를 벗어날 때 그 필드만 즉시 검증·표시한다.

### 2.2 로그인 강화

- **에러 처리 확장**: §4 표 기준으로 `getFriendlyErrorMessage`의 매칭 케이스를 늘린다.
- **자동 로그인 유지(Remember me)**: 체크 시 세션을 `localStorage`(기본, 브라우저를 꺼도 유지)에, 체크 해제 시 `sessionStorage`(탭을 닫으면 소멸)에 저장하도록 전환한다. supabase-js는 `createClient`에 커스텀 `storage` 어댑터를 넘길 수 있으므로, 체크 상태에 따라 클라이언트를 다시 만들거나 storage 어댑터를 스위칭하는 방식이 필요하다 — 클라이언트가 지금 모듈 스코프에서 싱글턴(Proxy 캐시)이라 이 부분은 구현 시 설계를 다시 짚어야 한다.
- **비밀번호 재설정 진입**: "비밀번호를 잊으셨나요?" 링크 → `/reset-password`.

### 2.3 비밀번호 관리

- **비밀번호 재설정**: 이메일 입력 → `supabase.auth.resetPasswordForEmail(email, { redirectTo })` 호출 → 메일의 링크 클릭 → 링크가 `/update-password`로 이동시키며 Supabase가 임시 복구 세션을 발급(`PASSWORD_RECOVERY` 이벤트) → 새 비밀번호 입력 → `supabase.auth.updateUser({ password })`.
- **이메일 확인 재전송**: 회원가입 후 인증 메일을 못 받았을 때 재전송 — `supabase.auth.resend({ type: 'signup', email })`.

### 2.4 소셜 로그인 (구글)

- `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`.
- Supabase 대시보드에서 Google OAuth 클라이언트 등록이 선행돼야 한다(§5).
- 기존 이메일 계정과 구글 계정이 같은 이메일이면 자동으로 연결되는지, 별도 계정으로 취급되는지는 대시보드의 자동 연결(auto-linking) 설정에 좌우된다 — 착수 시점에 반드시 확인.

### 2.5 UX

- **비밀번호 표시/숨김 토글**: 눈 아이콘 버튼으로 `input type="password"` ↔ `"text"` 전환. 기존 카드/모달에서 쓰던 인라인 SVG 아이콘 패턴을 그대로 재사용.
- **로딩 상태**: 기존 패턴(버튼 `disabled` + 문구 전환)을 회원가입/재설정/OAuth 등 새 폼에도 동일하게 적용.
- **접근성**: 모든 `input`에 연결된 `<label htmlFor>`(현재도 라벨은 있지만 `htmlFor`/`id` 연결은 확인 필요), 에러·안내 메시지에 `role="alert"` 또는 `aria-live="polite"`, 필수 필드에 `aria-required="true"`.

### 2.6 계정 관리 (인증 후, `/account`)

- **비밀번호 변경**: 로그인 상태에서 `supabase.auth.updateUser({ password })`.
- **이메일 변경**: `supabase.auth.updateUser({ email })`. Supabase의 "Secure email change" 설정이 켜져 있으면 기존 이메일·새 이메일 양쪽 모두에서 확인이 필요할 수 있다 — 설정값 확인 후 UX에 반영.
- **회원 탈퇴**: 클라이언트 SDK로는 사용자가 자기 자신을 삭제할 수 없다. `auth.admin.deleteUser(id)`는 `service_role` 키가 필요한 관리자 API라, **클라이언트에는 절대 노출할 수 없다**(기존 원칙 그대로 유지). 별도의 서버리스 함수(Vercel Function 또는 Supabase Edge Function)를 하나 세워, 로그인된 사용자의 JWT로 본인 확인 후 서버 쪽에서만 `service_role`로 삭제를 수행하는 구조가 필요하다 — 이 프로젝트에 아직 없는 새로운 배포 단위이므로 Phase 5에서 별도로 검토한다.
- **프로필**: 현재 DB 스키마엔 프로필 테이블이 없다. `auth.users`의 `user_metadata`를 쓸지, 별도 `profiles` 테이블을 새로 만들지는 Phase 5에서 실제 필요한 필드(표시 이름 등)가 정해지면 결정한다.

---

## 3. 페이지/라우팅 구조 (검토/제안 — 최종은 논의 후 결정)

현재는 `/login` 한 페이지가 로그인·회원가입을 토글로 겸한다. 기능이 늘어나면(비밀번호 확인, 약관 동의, 강도 표시 등) 한 폼 안에서 모드 전환으로 다 처리하기엔 복잡도가 커진다. 아래는 분리안 제안이며, 실제로 나눌지·어디까지 나눌지는 구현 착수 전 별도로 논의한다.

| 경로 | 역할 | 접근 조건 | 비고 |
| --- | --- | --- | --- |
| `/login` | 로그인 전용 | 비로그인 상태만(로그인 상태로 접근 시 `/`로) | 현재 `LoginForm`의 로그인 모드만 남기고, 회원가입은 `/signup`으로 분리 |
| `/signup` | 회원가입 전용 | 비로그인 상태만 | 비밀번호 확인/강도/약관 동의 등 회원가입 전용 필드가 늘어나므로 분리 이점이 큼 |
| `/reset-password` | 비밀번호 재설정 이메일 요청 | 비로그인 상태만(로그인 상태에서의 접근 허용 여부는 논의) | 이메일 입력 → 발송 완료 안내만 있는 단순 폼 |
| `/update-password` | 재설정 링크 클릭 후 새 비밀번호 설정 | **일반 로그인이 아닌 "복구 세션"** 필요 | Supabase가 링크 클릭 시 발급하는 임시 세션을 `onAuthStateChange`의 `PASSWORD_RECOVERY` 이벤트로 감지해야 한다 — 기존 `AuthGuard`는 `authenticated`/`unauthenticated` 이분법이라, 이 페이지는 `AuthGuard`로 감싸지 않거나 복구 세션을 별도로 처리하는 로직이 추가로 필요하다 |
| `/account` | 계정 관리(비밀번호/이메일 변경, 탈퇴, 프로필) | 로그인 필수 | 기존 `AuthGuard`로 그대로 감쌀 수 있음 |

- 페이지를 나누더라도 로그인 ↔ 회원가입 사이 전환 링크("계정이 없으신가요? 회원가입")는 유지해 사용성을 지금과 동등하게 맞춘다.
- 리다이렉트 소유권 원칙(§1)은 페이지가 나뉘어도 유지한다 — 각 페이지는 여전히 `status` 변화를 지켜보는 단일 지점에서만 다음 화면으로 이동시킨다.

---

## 4. 에러 처리 정책

### 4.1 현재 → 확장 매핑 표

| 상황 | Supabase 에러 원문(예시) | 한글 문구 | 비고 |
| --- | --- | --- | --- |
| 이메일/비밀번호 불일치 | `Invalid login credentials` | 이메일 또는 비밀번호가 올바르지 않습니다. | 기존 |
| 중복 가입 | `User already registered` | 이미 가입된 이메일입니다. 로그인을 이용해주세요. | 기존 |
| 비밀번호 형식 오류 | `Password should be at least 6 characters` | 비밀번호는 6자 이상이어야 합니다. | 기존, 길이는 `MIN_PASSWORD_LENGTH` 참조라 문구도 항상 그 값과 일치 |
| 이메일 형식 오류 | `Unable to validate email address: invalid format` | 이메일 형식이 올바르지 않습니다. | 기존 |
| 이메일 미인증 상태로 로그인 시도 | `Email not confirmed` | 이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요. | 신규 — 재전송 버튼(§2.3)과 연결하면 좋음 |
| 요청 과다(rate limit) | `For security purposes, you can only request this after N seconds` | 잠시 후 다시 시도해주세요. | 신규 — 개발 중 반복 회원가입 테스트로 실제 겪었던 케이스, 남은 대기시간을 원문에서 파싱해 보여주면 더 친절 |
| 재설정/초대 링크 만료·무효 | `Email link is invalid or has expired` | 링크가 만료됐거나 잘못됐습니다. 다시 요청해주세요. | 신규 (§2.3 비밀번호 재설정) |
| OAuth 로그인 실패/취소 | provider별 상이 | 구글 로그인에 실패했습니다. 다시 시도해주세요. | 신규 (§2.4) |
| 네트워크 오류 | 요청 자체가 실패(throw), Supabase 에러 객체가 아님 | 네트워크 연결을 확인한 뒤 다시 시도해주세요. | 신규 — 현재 `LoginForm`은 `signIn`/`signUp`의 `{error}` 반환만 다루고 있어, fetch 자체가 실패하는 경우(오프라인 등)에 대한 try/catch가 없다. 구현 시 반드시 보강 |
| 그 외 | - | 요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요. | 기존 catch-all 유지 |

### 4.2 매칭 방식 개선 검토

현재 `getFriendlyErrorMessage`는 에러 메시지 **원문 문자열의 부분 일치**(`includes()`)로 분기한다. Supabase가 메시지 문구를 바꾸면 조용히 매칭이 깨질 수 있다. 최신 supabase-js의 `AuthError`는 `error.code`(예: `invalid_credentials`, `user_already_exists`, `email_not_confirmed`)를 함께 제공하므로, 매칭 기준을 문자열 `includes()`에서 `error.code` 기반으로 옮기는 리팩터를 Phase 2에서 함께 검토한다 — 이번 문서에서 방식을 확정하지는 않는다.

---

## 5. Supabase 설정 체크리스트

- [ ] **이메일 템플릿**: Confirm signup / Reset password / Change Email Address 각각 한국어로 커스터마이징. 링크가 실제 Vercel 프로덕션 도메인을 가리키는지 확인(Site URL 기반으로 생성됨).
- [ ] **Site URL**: 프로덕션 도메인으로 정확히 설정 — 이메일 링크·OAuth 콜백의 기본 리다이렉트 근거가 된다.
- [ ] **Additional Redirect URLs**: `http://localhost:3000`(로컬 개발용)과 필요 시 Vercel 프리뷰 도메인을 함께 등록. 누락 시 로컬에서 비밀번호 재설정·OAuth 콜백이 실패한다.
- [ ] **Google OAuth**: Google Cloud Console에서 OAuth 클라이언트 생성(승인된 리디렉션 URI = Supabase가 제공하는 콜백 URL) → Supabase 대시보드에 Client ID/Secret 등록 → 자동 계정 연결 옵션 확인(§2.4).
- [ ] **비밀번호 정책**: 최소 길이가 프론트(`MIN_PASSWORD_LENGTH=6`)와 Supabase 대시보드 설정이 일치하는지 확인. 강도 정책(문자 조합 요구 등)을 서버 쪽에도 걸지 결정.
- [ ] **Rate limit**: 회원가입/재설정 요청 관련 기본 제한값 확인 — 개발 중 반복 테스트로 걸렸던 적이 있어(§4.1) 실사용 시에도 사용자 경험에 영향을 줄 수 있다.
- [ ] **Secure email change**: 이메일 변경 시 신규/기존 주소 양쪽 확인을 요구할지 결정(§2.6).
- [ ] **`service_role` 키**: 회원 탈퇴 기능(§2.6) 구현 시에도 클라이언트 번들에 절대 포함되지 않도록 — 서버리스 함수 환경변수로만 존재해야 한다.
- [ ] **flowType/detectSessionInUrl**: 비밀번호 재설정·OAuth를 붙이는 시점에 supabase-js 기본값(§1)이 이 앱의 클라이언트 전용(Proxy 지연 초기화, SSR 없음) 구조와 맞는지 재확인. 필요하면 `createClient` 옵션에 명시적으로 설정.

---

## 6. Phase 계획 (구현 순서)

각 Phase는 앞 Phase의 완료를 전제하지 않는 한 독립적으로 착수 가능하도록 최대한 쪼갰다. 예외는 명시.

### Phase 1 — 회원가입 강화
- 범위: 비밀번호 확인, 비밀번호 강도 표시, 약관/개인정보 동의 체크, 필드별 실시간(blur) 검증.
- 의존성: 약관·개인정보처리방침 문서가 먼저 준비돼야 동의 체크박스에 실제 링크를 걸 수 있다(문서 자체는 이 Phase의 범위 밖).
- 기존 구조 영향: `LoginForm`(또는 §3에 따라 분리된 `/signup`)의 검증 로직만 확장 — `authStore`/`AuthGuard`/리다이렉트 소유권은 변경 없음.

### Phase 2 — 로그인 강화
- 범위: 에러 매핑 확장(§4), Remember me, 비밀번호 표시/숨김 토글, 비밀번호 재설정 "진입 링크"만 추가(실제 재설정 플로우는 Phase 3).
- 의존성: Phase 1과 독립적으로 진행 가능.
- 기존 구조 영향: Remember me 구현 시 `src/lib/supabase.ts`의 싱글턴 클라이언트 초기화 방식을 건드리게 되므로, 지연 초기화(Proxy) 패턴과 어떻게 공존시킬지 별도 설계가 필요하다.

### Phase 3 — 비밀번호 관리
- 범위: `/reset-password`, `/update-password` 페이지 신설(§3), 비밀번호 재설정 전체 플로우, 이메일 확인 재전송.
- 의존성: §5의 이메일 템플릿·Redirect URL 설정이 먼저 돼 있어야 실제로 동작을 확인할 수 있다.
- 기존 구조 영향: `AuthGuard`가 다루지 않던 "복구 세션" 상태를 새로 처리해야 한다(§3 `/update-password` 비고) — 이번 Phase에서 가장 설계 난도가 높은 부분.

### Phase 4 — 소셜 로그인 (구글)
- 범위: 구글 로그인 버튼, OAuth 콜백 처리.
- 의존성: §5의 Google OAuth 클라이언트 등록이 선행돼야 한다.
- 기존 구조 영향: 없음(신규 진입 경로 추가) — 단, 계정 자동 연결 정책에 따라 `getFriendlyErrorMessage`류의 에러 매핑에 OAuth 관련 케이스 추가 필요.

### Phase 5 — 계정 관리
- 범위: `/account` 페이지, 비밀번호/이메일 변경, 회원 탈퇴, 프로필.
- 의존성: 회원 탈퇴는 이 프로젝트에 아직 없는 서버리스 함수 인프라가 새로 필요하다(§2.6) — 다른 항목(비밀번호/이메일 변경)과 별도로 인프라 검토부터 시작해야 한다. 프로필은 스키마 결정(§2.6)이 선행돼야 착수 가능.
- 기존 구조 영향: 없음(인증된 사용자를 위한 신규 페이지) — `AuthGuard`를 그대로 재사용.
