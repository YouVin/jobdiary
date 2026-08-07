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
| `/update-password` | 재설정 링크 클릭 후 새 비밀번호 설정 | **일반 로그인이 아닌 "복구 세션"** 필요 | `AuthGuard`로 감싸지 않고, 페이지 자체가 `authStore.status==='recovering'`을 직접 구독해 가드한다 — 구체적인 설계는 §6 Phase 3(§6.3.2~§6.3.4)에서 확정 |
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

- [ ] **이메일 템플릿**: Confirm signup / Reset password / Change Email Address 각각 한국어로 커스터마이징. 링크가 실제 Vercel 프로덕션 도메인을 가리키는지 확인(Site URL 기반으로 생성됨). **Reset password 템플릿은 `redirectTo`(`/update-password`)를 실제로 반영하는지 특히 확인** — Confirm signup과 목적지가 다르다(§6 Phase 3 §3.5).
- [ ] **Site URL**: 프로덕션 도메인으로 정확히 설정 — 이메일 링크·OAuth 콜백의 기본 리다이렉트 근거가 된다.
- [ ] **Additional Redirect URLs**: `http://localhost:3000`(로컬 개발용)과 필요 시 Vercel 프리뷰 도메인을 함께 등록. `/update-password` 경로까지 허용 목록에 포함되는지 확인(정확한 URL만 허용하는 설정이면 경로까지 명시 필요). 누락 시 로컬에서 비밀번호 재설정·OAuth 콜백이 실패한다.
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
- 기존 구조 영향: `authStore`에 `'recovering'` 상태를 추가하고(§6.3.2), `AuthGuard`·`LoginForm`의 리다이렉트 분기를 확장한다. 리다이렉트 소유권 원칙(§1) 자체는 유지된다 — 이동시키는 지점이 늘어나는 게 아니라, 기존 단일 지점들이 `'recovering'` 케이스까지 함께 판단하도록 넓어질 뿐이다. 이번 Phase에서 가장 설계 난도가 높은 부분.

#### 6.3.1 전체 흐름

| 단계 | 화면/트리거 | 상태·호출 |
| --- | --- | --- |
| 1 | `/login`에서 "비밀번호를 잊으셨나요?" 클릭 | 페이지 이동만, 호출 없음 |
| 2 | `/reset-password`에서 이메일 입력 | 로컬 폼 상태만 |
| 3 | 제출 | `supabase.auth.resetPasswordForEmail(email, { redirectTo: '<Site URL>/update-password' })` |
| 4 | 성공 응답 | "가입된 이메일이면 재설정 링크를 보내드렸습니다" 같은 중립적 안내만 표시(§6.3.6 엣지케이스 5 — 이메일 존재 여부를 노출하지 않는다). 로그인 화면으로 자동 이동하지 않고 이 안내에 머문다 |
| 5 | 사용자가 메일의 링크 클릭 | 브라우저가 `<Site URL>/update-password#access_token=...&type=recovery`(implicit flow 기준, §1의 flowType 기본값 전제)로 이동 |
| 6 | 페이지 로드 시 supabase-js가 URL의 토큰을 자동 감지 | 세션이 내부적으로 생성되고 `onAuthStateChange`가 `'PASSWORD_RECOVERY'` 이벤트로 알린다 — **`'SIGNED_IN'`이 아니라 이 전용 이벤트로 온다는 것이 이 설계 전체의 전제**(§6.3.2에서 검증 필요성 명시) |
| 7 | `AuthProvider`가 이벤트를 받아 `authStore.setRecovering(session)` 호출 | `status`가 `'recovering'`으로 전환 |
| 8 | `/update-password`가 `status==='recovering'`일 때만 새 비밀번호 폼을 보여줌 | 새 비밀번호 + 확인 입력. Phase 1의 강도 표시·검증 로직(`authValidation`/`passwordStrength`) 재사용 |
| 9 | 제출 | `supabase.auth.updateUser({ password })` |
| 10 | 성공 | §6.3.2 "완료 후 처리"에 따라 로그아웃 후 `/login`으로 이동 + "비밀번호가 변경됐습니다. 새 비밀번호로 로그인해주세요" 안내 |

#### 6.3.2 복구 세션 처리 (핵심)

**확정 제안: `authStore.status`에 `'recovering'`을 추가한다.**

```ts
// src/store/authStore.ts (설계 — 코드는 다음 단계)
export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'recovering';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  setSession: (session: Session | null) => void; // 기존 — 일반 로그인/로그아웃/세션 갱신용
  setRecovering: (session: Session) => void;      // 신규 — PASSWORD_RECOVERY 이벤트 전용
  completeRecovery: () => void;                   // 신규 — updateUser 성공 후 복구 세션을 명시적으로 종료
}
```

**왜 `session` 유무만으로는 판단할 수 없는가**: 복구 세션은 일반 로그인 세션과 구조가 동일한 JWT다. Supabase는 "이 세션이 복구용이었다"는 사실을 세션 객체 자체에 지속적으로 남겨두지 않는다 — 유일한 신호는 `onAuthStateChange`가 딱 한 번 쏘는 `'PASSWORD_RECOVERY'` 이벤트뿐이다. 그래서 이 신호를 **그 순간에 잡아서 store에 기록**해야 하며, `session` 값만 보고 사후에 "이게 복구 세션이었는지"를 재구성할 수 없다.

**`AuthProvider` 쪽 처리**:

```ts
// src/components/auth/AuthProvider.tsx (설계)
const unsubscribe = onAuthStateChange((event, session) => {
  if (event === 'PASSWORD_RECOVERY' && session) {
    setRecovering(session);
    return;
  }
  setSession(session);
});
```

**핵심 경쟁 상태와 그 방지책**: `AuthProvider`는 `onAuthStateChange` 구독과 별개로 마운트 시 `getSession()`도 호출해 새로고침 후 세션을 복원한다(§1). 문제는 — `/update-password`가 로드된 시점에 복구 세션은 이미 브라우저에 저장돼 있으므로, `getSession()`이 이 세션을 "그냥 평범한 세션"으로 반환할 수 있다는 점이다. `getSession()`의 콜백이 그대로 `setSession(session)`을 부르면, 방금 `'PASSWORD_RECOVERY'`로 세팅해둔 `status: 'recovering'`이 `'authenticated'`로 **덮어써질 위험**이 있다(두 비동기 호출의 완료 순서는 보장되지 않는다) — 사용자가 걱정한 "authenticated로 자동 전환"이 바로 이 경로에서 생긴다.

방지책은 **store 쪽에서 상태 전이 규칙을 강제**하는 것이다 — `AuthProvider`의 호출 순서에 의존하지 않는다:

```ts
setSession: (session) => {
  set((state) => {
    // 복구가 진행 중일 때는 일반 setSession 호출(예: getSession() 부트스트랩)이 들어와도
    // status를 되돌리지 않는다. 복구 상태를 벗어나는 유일한 통로는 completeRecovery()뿐이다.
    if (state.status === 'recovering') {
      return { session };
    }
    return { session, status: session ? 'authenticated' : 'unauthenticated' };
  });
},

setRecovering: (session) => set({ session, status: 'recovering' }),

completeRecovery: () => set({ status: 'unauthenticated', session: null }),
```

이렇게 하면 `getSession()`과 `onAuthStateChange('PASSWORD_RECOVERY')`가 어느 순서로 도착하든 최종 `status`는 항상 `'recovering'`으로 수렴한다.

> **검증 필요(구현 시)**: 이 설계는 "복구 링크를 열면 `onAuthStateChange`가 `'SIGNED_IN'`이 아니라 `'PASSWORD_RECOVERY'`만 쏜다"는 supabase-js의 동작을 전제로 한다. 이 동작은 버전에 따라 미묘하게 달라질 수 있으므로, Phase 3 착수 시 실제 설치된 `@supabase/supabase-js` 버전으로 반드시 재현 테스트해 확인한다. **대안**: 만약 `'SIGNED_IN'`도 함께(또는 대신) 온다면, 이벤트 타입만으로 구분하지 말고 URL의 해시 파라미터(`type=recovery`)를 함께 확인해 보강한다.

**`AuthGuard` 동작 확장**:

```ts
// src/components/auth/AuthGuard.tsx (설계)
useEffect(() => {
  if (status === 'unauthenticated') {
    router.replace(`/login${search}`);
  } else if (status === 'recovering') {
    router.replace('/update-password');
  }
}, [status, router]);

if (status === 'authenticated') {
  return <>{children}</>;
}
// loading / unauthenticated(리다이렉트 중) / recovering(리다이렉트 중) — 모두 로딩 화면만
```

즉 `AuthGuard`가 감싸는 보호 라우트(`/`)는 `'recovering'`을 `'authenticated'`로 인정하지 않고 무조건 `/update-password`로 돌려보낸다 — 새 비밀번호를 아직 정하지 않은 상태로 보드에 들어갈 수 없다.

**`/update-password` 페이지 자체의 가드**:
- `status==='recovering'`: 새 비밀번호 폼을 보여준다.
- `status==='loading'`: 로딩만 표시한다(아직 `onAuthStateChange`/`getSession`이 끝나지 않았을 수 있다 — 성급하게 "유효하지 않은 접근"을 띄우면 정상 흐름에서도 화면이 깜빡일 수 있다).
- `status==='authenticated' | 'unauthenticated'`: "유효하지 않거나 만료된 링크입니다" 안내 + `/reset-password`로 다시 요청하는 링크. 다만 `loading`에서 여기로 곧장 떨어지는 정상 케이스와 "진짜 잘못된 접근"을 구분하기 위해, 페이지 마운트 시 `window.location.hash`에 `type=recovery` 등 복구 관련 파라미터가 남아있는지도 함께 확인해, 있다면 이벤트 처리가 아직 안 끝난 것으로 보고 조금 더 기다리는 것을 권장한다(§6.3.6 엣지케이스 3과 연결).

**완료 후 처리(확정 제안): 로그아웃 후 재로그인 요구.**

`updateUser({ password })` 성공 직후, 복구 세션은 기술적으로 이미 유효한 로그인 세션이라 그대로 보드로 보낼 수도 있다(대안 — 마찰이 적다). 하지만:
- 재설정 링크는 이메일함에 남아있고 전달·공유될 수 있다 — 링크를 연 사람이 계정 소유자와 다를 가능성을 고려하면, 새 비밀번호 설정 직후 세션을 자동으로 이어가는 것보다 **명시적으로 종료하고 새 비밀번호로 다시 로그인하게 하는 쪽이 안전**하다.
- 방금 입력한 새 비밀번호를 잘못 기억/오타 냈는지 즉시 확인하는 효과도 있다(재로그인 자체가 검증 단계가 된다).

그래서 `updateUser` 성공 시 `signOut()` → (그로 인해 발생하는 `onAuthStateChange`가 `setSession(null)`을 부르며 자연히 `'unauthenticated'`로 정리되지만, 안전망으로 `completeRecovery()`도 함께 호출) → `/login`으로 이동 + "비밀번호가 변경됐습니다. 새 비밀번호로 로그인해주세요" 안내를 표시한다. 리다이렉트는 여기서도 기존 원칙대로 단일 지점(이 성공 처리 로직)에서만 수행한다.

#### 6.3.3 이메일 확인 재전송

- Phase 2에서 `getFriendlyErrorMessage`가 `Email not confirmed`를 "...메일함에서 확인 메일을 확인해주세요. (인증 메일 재전송 기능은 곧 추가될 예정입니다)"로 매핑해뒀다(§4). Phase 3에서 이 placeholder를 실제 동작으로 채운다.
- 위치: 로그인 시도가 이 에러로 실패했을 때, 에러 메시지 바로 아래 "인증 메일 재전송" 버튼을 보여준다. 별도 페이지를 만들지 않는다 — 로그인 실패라는 맥락에서 바로 이어지는 동작이라 `LoginForm` 안에 두는 게 자연스럽다.
- 호출: `supabase.auth.resend({ type: 'signup', email })`.
- 구현에 필요한 작은 구조 변경: 현재 `errorMessage`는 번역된 문자열 하나만 들고 있어서 "이 에러가 email-not-confirmed 케이스였는지"를 잃어버린다. 재전송 버튼을 조건부로 보여주려면 에러의 "종류"도 함께 들고 있어야 한다 — 예를 들어 `getFriendlyErrorMessage`가 문자열 대신 `{ message: string; kind: 'email-not-confirmed' | 'other' }`를 반환하도록 최소 확장하고, `LoginForm`은 `errorKind==='email-not-confirmed'`일 때만 재전송 버튼을 렌더링한다.
- 재전송 버튼도 자체 로딩/완료 상태("재전송했습니다" 안내)와 §5의 rate limit 정책의 영향을 받는다 — 짧은 시간에 반복 클릭하면 Supabase가 요청 과다 에러를 돌려줄 수 있으므로, 클릭 후 버튼을 잠시 비활성화한다.

#### 6.3.4 페이지/라우팅

| 경로 | 역할 | 접근 조건 | 비고 |
| --- | --- | --- | --- |
| `/reset-password` | 재설정 이메일 요청 | 제한 없음(비로그인/로그인 모두 접근 가능, `AuthGuard` 미적용) | 이메일 입력 → 제출 → 중립적 안내(§6.3.6 엣지케이스 5) |
| `/update-password` | 새 비밀번호 설정 | `status==='recovering'`일 때만 폼 렌더링, 그 외엔 안내 화면(§6.3.2) | `AuthGuard`로 감싸지 않는다 — `AuthGuard`의 "인증됨=보드 허용" 규칙과 이 페이지의 "recovering만 허용" 규칙이 반대이기 때문에, 페이지 자체가 `status`를 직접 구독해 자체 가드를 구현한다 |

§3(페이지/라우팅 구조)의 `/update-password` 행에 있던 "AuthGuard로 감싸지 않거나 복구 세션을 별도로 처리하는 로직이 필요하다"는 서술은 이 절의 설계로 구체화됐다 — **감싸지 않고, 페이지 자체가 `status`를 직접 판단한다**로 확정.

#### 6.3.5 Supabase 설정 체크리스트 (선행)

§5의 다음 항목들을 이 Phase에 맞춰 더 구체화한다(전체 체크리스트는 §5 참고 — 여기서는 비밀번호 재설정에 직접 관련된 부분만):

- **Reset Password 이메일 템플릿의 링크**가 `{{ .RedirectTo }}`(또는 대시보드가 제공하는 동등한 변수)를 실제로 사용해서, `resetPasswordForEmail(email, { redirectTo })`로 넘긴 `/update-password` URL로 정확히 연결되는지 대시보드에서 템플릿 원문을 직접 확인한다 — 템플릿이 `redirectTo`를 무시하고 고정 경로로 가게 설정돼 있으면 이 문서의 흐름 전체가 깨진다.
- **Confirm signup과 Reset password는 redirect 목적지가 다르다**: 회원가입 확인 메일의 링크는 Site URL 루트나 로그인 화면으로 보내 일반 세션(또는 세션 없음) 상태가 되면 그만이지만, 재설정 메일의 링크는 반드시 `/update-password`로 가야 `'PASSWORD_RECOVERY'` 처리가 이어진다. 두 템플릿을 같은 값으로 설정하지 않도록 주의.
- **Additional Redirect URLs**에 `/update-password`를 포함하는 패턴이 등록돼 있는지 확인(정확한 URL만 허용하는 설정이면 `.../update-password`까지 명시해야 하고, 와일드카드(`/**`)를 허용하는 설정이면 도메인만으로 충분한지 실제로 확인).

#### 6.3.6 엣지 케이스

1. **링크 만료**: Supabase 재설정 링크는 발급 후 일정 시간(기본값은 대시보드에서 확인·조정 가능) 후 만료된다. 만료된 링크를 열면 세션이 생성되지 않아 `'PASSWORD_RECOVERY'` 이벤트도 발생하지 않는다 — `/update-password`는 `status`가 결국 `'unauthenticated'`로 남아 자연스럽게 "유효하지 않거나 만료된 링크" 안내로 이어진다. 더 친절하게 하려면 URL에 Supabase가 붙이는 에러 파라미터(`error_description` 등)를 파싱해 "만료"와 "잘못된 링크"를 구분해 보여줄 수 있다(§4 "재설정/초대 링크 만료·무효" 매핑과 연결) — 1차 구현 범위에는 필수는 아님.
2. **이미 사용된 링크**: 재설정 링크는 1회성이다. 재사용 시도는 만료와 동일하게 처리된다(위와 같은 안내 경로).
3. **복구 도중 이탈/새로고침**: `/update-password`에서 새 비밀번호를 입력하지 않고 새로고침하면, `AuthProvider`가 다시 마운트되며 `getSession()`이 이미 저장된 복구 세션을 "평범한 세션"으로 돌려줄 수 있다 — 이 시점엔 `'PASSWORD_RECOVERY'` 이벤트가 다시 발생한다는 보장이 없다(그 이벤트는 "URL의 토큰을 막 처리했을 때" 한 번 쏘는 신호에 가깝다). 즉 **새로고침하면 recovering 상태를 잃고 로그인 화면으로 튕길 위험이 남는다.** 1차 구현에서는 이를 알려진 제약으로 남기고("새로고침하면 링크를 다시 열어야 할 수 있음"), 실사용 중 문제가 크면 `sessionStorage`에 "복구 진행 중" 플래그를 별도로 남겨 새로고침에도 버티게 하는 보강을 고려한다(대안, 이번 설계에서 확정하지 않음).
4. **복구 세션인데 `/update-password`가 아닌 곳(`/`, `/login`) 접근**: 보호 라우트(`/`)는 `AuthGuard`가 `'recovering'`을 감지해 `/update-password`로 돌려보낸다(§6.3.2). `/login`은 `AuthGuard`로 감싸지 않으므로, `LoginForm`의 기존 리다이렉트 `useEffect`(현재는 `status==='authenticated'`만 봄)에 `status==='recovering'`일 때 `/update-password`로 보내는 분기를 추가해야 한다 — 리다이렉트 소유권은 여전히 이 하나의 effect가 유지한다.
5. **가입되지 않은 이메일로 재설정 요청**: Supabase는 계정 존재 여부를 노출하지 않기 위해 보통 미가입 이메일에도 에러 없이 "성공"처럼 응답한다(사용자 열거 공격 방지). `/reset-password`는 이 정책을 그대로 따라 "가입된 이메일이면 재설정 메일을 보내드립니다" 같은 중립적 문구를 쓰고, 실제 이메일 존재 여부로 문구를 분기하지 않는다.

### Phase 4 — 소셜 로그인 (구글)
- 범위: 구글 로그인 버튼, OAuth 콜백 처리.
- 의존성: §5의 Google OAuth 클라이언트 등록이 선행돼야 한다.
- 기존 구조 영향: 없음(신규 진입 경로 추가) — 단, 계정 자동 연결 정책에 따라 `getFriendlyErrorMessage`류의 에러 매핑에 OAuth 관련 케이스 추가 필요.

### Phase 5 — 계정 관리
- 범위: `/account` 페이지, 비밀번호/이메일 변경, 회원 탈퇴, 프로필.
- 의존성: 회원 탈퇴는 이 프로젝트에 아직 없는 서버리스 함수 인프라가 새로 필요하다(§2.6) — 다른 항목(비밀번호/이메일 변경)과 별도로 인프라 검토부터 시작해야 한다. 프로필은 스키마 결정(§2.6)이 선행돼야 착수 가능.
- 기존 구조 영향: 없음(인증된 사용자를 위한 신규 페이지) — `AuthGuard`를 그대로 재사용.
