'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { AuthFormSkeleton } from '@/components/auth/AuthFormSkeleton';
import { GOOGLE_FAILED_MESSAGE, GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { PolicyLinks } from '@/components/auth/PolicyLinks';
import { ResendConfirmationButton } from '@/components/auth/ResendConfirmationButton';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/Checkbox';
import { PasswordField, TextField } from '@/components/ui/TextField';
import { textLinkClassName } from '@/components/ui/TextLink';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { useOneTimeQueryMessage } from '@/hooks/useOneTimeQueryMessage';
import { signIn, signUp } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { getBoardRedirectPath } from '@/utils/authRedirect';
import { getConfirmPasswordError, getEmailError, getPasswordError, MIN_PASSWORD_LENGTH } from '@/utils/authValidation';

export type AuthMode = 'signin' | 'signup';

const noopSubscribe = () => () => {};

// 구글 로그인 취소/실패 시 Supabase가 redirectTo(현재 URL)에 error 정보를 담아 되돌려보낸다.
// implicit 플로우 기본값이라 해시(#error=...)로 오는 경우가 기본이지만, 쿼리(?error=...)로 오는
// 경우도 함께 본다 — supabase-js의 parseParametersFromURL과 동일하게 쿼리가 해시보다 우선한다.
function getOAuthErrorSignal(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  new URLSearchParams(window.location.search).forEach((value, key) => params.set(key, value));
  return params.get('error_description') || params.get('error') || params.get('error_code');
}

// 익스텐션이 붙인 ?import=1은 로그인 ↔ 가입 화면을 오가도 유지한다 (docs/AUTH.md 허용 목록과 같은 값만).
function getImportQuery(): string {
  return new URL(window.location.href).searchParams.get('import') === '1' ? '?import=1' : '';
}

// 로그인 실패 원인의 "종류" — 특정 종류일 때만 추가 UI(예: 인증 메일 재전송 버튼)를 보여주기 위해 구분한다.
type AuthErrorKind = 'email-not-confirmed' | 'other';

interface FriendlyAuthError {
  message: string;
  kind: AuthErrorKind;
}

// Supabase 에러 메시지는 영어·기술적이라 사용자에게는 번역된 문구로 보여준다 (docs/AUTH.md §4). 문구는 해요체 (#202).
function getFriendlyErrorMessage(rawMessage: string): FriendlyAuthError {
  if (rawMessage.includes('Invalid login credentials')) {
    return { message: '이메일이나 비밀번호가 맞지 않아요.', kind: 'other' };
  }
  if (rawMessage.includes('User already registered')) {
    return { message: '이미 가입한 이메일이에요. 로그인해 주세요.', kind: 'other' };
  }
  if (rawMessage.includes('Password should be at least')) {
    return { message: `비밀번호를 ${MIN_PASSWORD_LENGTH}자 이상 입력해 주세요.`, kind: 'other' };
  }
  if (rawMessage.includes('Unable to validate email address')) {
    return { message: '이메일 형식을 확인해 주세요.', kind: 'other' };
  }
  if (rawMessage.includes('Email not confirmed')) {
    return {
      message: '이메일 인증이 아직 끝나지 않았어요. 메일함에서 확인 메일을 열어 주세요.',
      kind: 'email-not-confirmed',
    };
  }
  if (rawMessage.includes('For security purposes') || rawMessage.toLowerCase().includes('rate limit')) {
    return { message: '요청이 너무 잦아요. 잠시 뒤 다시 시도해 주세요.', kind: 'other' };
  }
  if (
    rawMessage.includes('Failed to fetch') ||
    rawMessage.includes('NetworkError') ||
    rawMessage.toLowerCase().includes('network')
  ) {
    return { message: '인터넷 연결을 확인하고 다시 시도해 주세요.', kind: 'other' };
  }
  // 매칭 기준을 error.code(예: invalid_credentials, email_not_confirmed) 기반으로 옮기는 방안은
  // docs/AUTH.md §4.2에서 검토됐지만, 이번 Phase 범위를 넘어서 적용하지 않는다. 문자열 부분일치라
  // Supabase가 메시지 문구를 바꾸면 매칭이 조용히 깨질 수 있다는 한계는 남아있다.
  return { message: '요청을 처리하지 못했어요. 잠시 뒤 다시 시도해 주세요.', kind: 'other' };
}

interface LoginFormProps {
  mode: AuthMode;
}

// /login(로그인)과 /signup(회원가입)이 함께 쓰는 폼 (#202). 예전에는 한 화면의 탭으로 오갔고,
// 지금은 아래 "가입하기 / 로그인하기" 링크로 주소를 바꾼다. 화면이 바뀌면 입력·오류 상태도 새로 시작한다.
export function LoginForm({ mode }: LoginFormProps) {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const isSignUp = mode === 'signup';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  // 약관은 체크·제출 시 확인하며 텍스트 입력은 아래 지연 검증 훅으로 안내한다.
  const [termsTouched, setTermsTouched] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOAuthPending, setIsOAuthPending] = useState(false);
  const requestPending = useRef(false);
  const isBusy = isSubmitting || isOAuthPending;
  const handleOAuthPendingChange = useCallback((pending: boolean) => {
    setIsOAuthPending(pending);
    if (!pending) requestPending.current = false;
  }, []);
  const [authError, setAuthError] = useState<FriendlyAuthError | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  const invalidField = useRef<string | null>(null);

  // 오류 설명과 aria-invalid가 DOM에 반영된 뒤 포커스해 함께 읽을 수 있게 한다.
  useEffect(() => {
    const id = invalidField.current;
    invalidField.current = null;
    if (id) document.getElementById(id)?.focus();
  }, [focusRequest]);

  // 이메일/비밀번호 형식 검증은 로그인·회원가입 공통. 비밀번호 확인은 회원가입 전용.
  const emailError = getEmailError(email);
  const passwordError = getPasswordError(password);
  const confirmPasswordError = isSignUp ? getConfirmPasswordError(password, confirmPassword) : null;
  const emailFeedback = useFieldValidation(email, emailError);
  const passwordFeedback = useFieldValidation(password, passwordError);
  const confirmationFeedback = useFieldValidation(confirmPassword, confirmPasswordError);
  const termsError = isSignUp && termsTouched && !agreedToTerms ? '이메일로 가입하려면 약관에 동의해 주세요.' : null;

  const importQuery = useSyncExternalStore(noopSubscribe, getImportQuery, () => '');

  // /login에 붙은 쿼리(예: 익스텐션이 붙인 ?import=1)를 보존한 채 보드로 돌아간다.
  const redirectToBoard = useCallback(() => {
    router.replace(getBoardRedirectPath(window.location.href));
  }, [router]);

  // 이미 로그인된 상태로 /login에 들어오거나, 방금 로그인/회원가입에 성공하면 보드로 이동
  useEffect(() => {
    if (status === 'authenticated') {
      redirectToBoard();
    }
  }, [status, redirectToBoard]);

  // /update-password(비밀번호 변경 완료), 계정 탈퇴 완료 후 돌아온 경우의 1회성 안내.
  // useOneTimeQueryMessage가 렌더 중 상태 조정 + URL 정리를 함께 처리한다.
  const oneTimeMessage = useOneTimeQueryMessage({
    passwordUpdated: '비밀번호를 바꿨어요. 새 비밀번호로 로그인해 주세요.',
    accountDeleted: '탈퇴가 끝났어요. 그동안 이용해 주셔서 고마워요.',
  });

  // 구글 로그인 취소/실패 후 되돌아온 경우(#error=... 또는 ?error=...) 안내를 보여준다.
  // 렌더 중 상태 조정 + 별도 effect로 URL 정리.
  const oauthErrorSignal = useSyncExternalStore(noopSubscribe, getOAuthErrorSignal, () => null);
  const [hasShownOAuthError, setHasShownOAuthError] = useState(false);

  if (oauthErrorSignal && !hasShownOAuthError) {
    setHasShownOAuthError(true);
    setAuthError({ message: GOOGLE_FAILED_MESSAGE, kind: 'other' });
  }

  useEffect(() => {
    if (!oauthErrorSignal) {
      return;
    }

    const url = new URL(window.location.href);
    url.hash = '';
    url.searchParams.delete('error');
    url.searchParams.delete('error_description');
    url.searchParams.delete('error_code');
    window.history.replaceState({}, '', url.toString());
  }, [oauthErrorSignal]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requestPending.current) return;
    setAuthError(null);
    setInfoMessage(null);

    // 제출을 시도하면 아직 blur하지 않은 필드의 인라인 에러도 바로 보이게 한다.
    emailFeedback.validate();
    passwordFeedback.validate();
    if (isSignUp) {
      confirmationFeedback.validate();
      setTermsTouched(true);
    }

    if (emailError || passwordError || (isSignUp && (confirmPasswordError || !agreedToTerms))) {
      const invalidId = emailError ? 'email' : passwordError ? 'password' : confirmPasswordError ? 'confirmPassword' : 'terms';
      invalidField.current = invalidId;
      setFocusRequest((value) => value + 1);
      return;
    }

    requestPending.current = true;
    setIsSubmitting(true);
    try {
      const result = isSignUp ? await signUp(email, password) : await signIn(email, password);

      if (result.error) {
        console.error(`[${mode}] 실패:`, result.error);
        setAuthError(getFriendlyErrorMessage(result.error.message));
        return;
      }

      // Confirm email이 켜져 있으면 회원가입은 성공해도 세션이 아직 없다 (메일 인증 대기).
      // 이 경우 홈으로 보내지 않고 메일 확인 안내만 표시한다.
      if (isSignUp && !result.session) {
        console.log(`[${mode}] 성공 (이메일 확인 대기)`);
        setInfoMessage('확인 메일을 보냈어요. 메일함에서 인증한 뒤 로그인해 주세요.');
        return;
      }

      // 리다이렉트는 여기서 하지 않는다 — authStore가 onAuthStateChange로 곧 authenticated가 되면
      // 위 useEffect가 이동시킨다. 리다이렉트 주체를 한 곳으로 유지해 중복 이동을 막는다.
      console.log(`[${mode}] 성공`);
    } catch (error) {
      // signIn/signUp이 예외를 던지는 경우(네트워크 오류 등)도 놓치지 않고 같은 매핑으로 안내한다.
      console.error(`[${mode}] 실패(예외):`, error);
      setAuthError(getFriendlyErrorMessage(error instanceof Error ? error.message : ''));
    } finally {
      requestPending.current = false;
      setIsSubmitting(false);
    }
  };

  // 세션 확인 중이거나 이미 로그인된 상태(리다이렉트 진행 중)면 폼 대신 로딩만 보여준다
  if (status !== 'unauthenticated') {
    return <AuthFormSkeleton isSignUp={isSignUp} />;
  }

  const submitLabel = isSignUp ? '가입하기' : '로그인';
  const notice = infoMessage ?? oneTimeMessage;

  return (
    <div className="flex flex-col gap-8">
      {/* 처리 중 안내는 폼 밖에 미리 둔 알림 영역으로 읽는다. 버튼 글자 변화에만 기대지 않는다. */}
      <p role="status" aria-atomic="true" className="sr-only">
        {isSubmitting ? (isSignUp ? '이메일로 가입하고 있어요.' : '이메일로 로그인하고 있어요.') : isOAuthPending ? 'Google 로그인 화면으로 이동하고 있어요.' : ''}
      </p>

      <div className="flex flex-col gap-4">
        <form
          id="email-auth-form"
          aria-label={isSignUp ? '이메일 회원가입' : '이메일 로그인'}
          aria-busy={isSubmitting}
          onSubmit={handleSubmit}
          className="flex flex-col gap-4"
          noValidate
        >
          {/* 처리 중에는 입력만 잠근다. 제출 버튼은 밖에 두어 포커스가 버튼에 남는다(aria-disabled). */}
          <fieldset disabled={isBusy} className="flex min-w-0 flex-col gap-4">
            <legend className="sr-only">{isSignUp ? '이메일 회원가입 정보' : '이메일 로그인 정보'}</legend>
            <TextField
              id="email"
              label="이메일"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              onBlur={emailFeedback.onBlur}
              placeholder="you@example.com"
              autoComplete="email"
              aria-required="true"
              error={emailFeedback.error}
            />

            <div className="flex flex-col gap-2">
              <PasswordField
                id="password"
                label="비밀번호"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                onBlur={passwordFeedback.onBlur}
                placeholder={`${MIN_PASSWORD_LENGTH}자 이상`}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                aria-required="true"
                hint={isSignUp ? `${MIN_PASSWORD_LENGTH}자 이상 입력해 주세요.` : undefined}
                aria-describedby={isSignUp && password ? 'password-strength' : undefined}
                error={passwordFeedback.error}
                labelAction={
                  isSignUp ? undefined : (
                    <Link href="/reset-password" className={textLinkClassName('brand', 'text-label')}>
                      비밀번호 찾기
                    </Link>
                  )
                }
              />
              {isSignUp && password && <PasswordStrengthMeter id="password-strength" password={password} />}
            </div>

            {isSignUp && (
              <PasswordField
                id="confirmPassword"
                label="비밀번호 확인"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                onBlur={confirmationFeedback.onBlur}
                placeholder="비밀번호를 한 번 더 입력해 주세요"
                autoComplete="new-password"
                aria-required="true"
                error={confirmationFeedback.error}
              />
            )}

            {isSignUp && (
              <Checkbox
                id="terms"
                checked={agreedToTerms}
                onChange={(event) => {
                  setAgreedToTerms(event.target.checked);
                  setTermsTouched(true);
                }}
                aria-required="true"
                error={termsError}
              >
                [필수] <PolicyLinks />을 확인했고, 이용약관에 동의해요.
              </Checkbox>
            )}
          </fieldset>

          <Button
            type="submit"
            size="lg"
            block
            disabled={isOAuthPending}
            isLoading={isSubmitting}
            loadingLabel={isSignUp ? '가입하는 중' : '로그인하는 중'}
            className="mt-1"
          >
            {submitLabel}
          </Button>
        </form>

        {/* 이메일/구글 공통 오류·안내 — 처음부터 있는 알림 영역에 글자만 바꿔 넣어 스크린리더가 놓치지 않게 한다 */}
        <p role="alert" aria-atomic="true" className={authError ? 'text-label text-danger-text' : 'sr-only'}>
          {authError?.message}
        </p>
        {authError?.kind === 'email-not-confirmed' && <ResendConfirmationButton email={email} />}
        <p role="status" aria-atomic="true" className={notice ? 'text-label text-success-text' : 'sr-only'}>
          {notice}
        </p>

        <div aria-hidden="true" className="flex items-center gap-3 text-label text-text-secondary">
          <span className="h-px flex-1 bg-line-divider" />
          또는
          <span className="h-px flex-1 bg-line-divider" />
        </div>

        <GoogleSignInButton
          disabled={isBusy}
          describedBy="google-auth-hint"
          onPendingChange={handleOAuthPendingChange}
          onStart={() => {
            if (requestPending.current) return false;
            requestPending.current = true;
            setAuthError(null);
            setInfoMessage(null);
            emailFeedback.reset();
            passwordFeedback.reset();
            confirmationFeedback.reset();
            // Google은 인증 후 ConsentGate에서 현재 계정의 동의 여부를 확인한다.
            return true;
          }}
          onError={(message) => setAuthError({ message, kind: 'other' })}
        />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-body text-text-secondary">
          {isSignUp ? '이미 회원인가요? ' : '아직 회원이 아닌가요? '}
          <Link href={`${isSignUp ? '/login' : '/signup'}${importQuery}`} className={textLinkClassName('brand')}>
            {isSignUp ? '로그인하기' : '가입하기'}
          </Link>
        </p>
        <p id="google-auth-hint" className="text-label text-text-secondary">
          Google에서는 이메일과 프로필만 받아요. 약관 동의가 필요하면 로그인한 뒤 한 번만 물어봐요.{' '}
          <PolicyLinks joiner=" · " />
        </p>
      </div>
    </div>
  );
}
