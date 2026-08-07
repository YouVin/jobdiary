'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { clsx } from 'clsx';
import { signIn, signUp } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { getConfirmPasswordError, getEmailError, getPasswordError, MIN_PASSWORD_LENGTH } from '@/utils/authValidation';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { PasswordToggleButton } from '@/components/auth/PasswordToggleButton';
import { ResendConfirmationButton } from '@/components/auth/ResendConfirmationButton';
import { fieldErrorClassName, inputClassName, labelClassName, passwordInputClassName } from '@/components/auth/authFormStyles';

type Mode = 'signin' | 'signup';

const noopSubscribe = () => () => {};

// /update-password가 완료 후 붙이는 ?passwordUpdated=1 신호가 현재 URL에 있는지.
// 서버에서는 항상 false, 하이드레이션 후 클라이언트에서만 실제 URL을 읽는다 (hydration mismatch 방지).
function hasPasswordUpdatedSignal(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return new URLSearchParams(window.location.search).get('passwordUpdated') === '1';
}

// 로그인 실패 원인의 "종류" — 특정 종류일 때만 추가 UI(예: 인증 메일 재전송 버튼)를 보여주기 위해 구분한다.
type AuthErrorKind = 'email-not-confirmed' | 'other';

interface FriendlyAuthError {
  message: string;
  kind: AuthErrorKind;
}

// Supabase 에러 메시지는 영어·기술적이라 사용자에게는 번역된 문구로 보여준다 (docs/AUTH.md §4)
function getFriendlyErrorMessage(rawMessage: string): FriendlyAuthError {
  if (rawMessage.includes('Invalid login credentials')) {
    return { message: '이메일 또는 비밀번호가 올바르지 않습니다.', kind: 'other' };
  }
  if (rawMessage.includes('User already registered')) {
    return { message: '이미 가입된 이메일입니다. 로그인을 이용해주세요.', kind: 'other' };
  }
  if (rawMessage.includes('Password should be at least')) {
    return { message: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`, kind: 'other' };
  }
  if (rawMessage.includes('Unable to validate email address')) {
    return { message: '이메일 형식이 올바르지 않습니다.', kind: 'other' };
  }
  if (rawMessage.includes('Email not confirmed')) {
    return {
      message: '이메일 인증이 완료되지 않았습니다. 메일함에서 확인 메일을 확인해주세요.',
      kind: 'email-not-confirmed',
    };
  }
  if (rawMessage.includes('For security purposes') || rawMessage.toLowerCase().includes('rate limit')) {
    return { message: '요청이 너무 잦습니다. 잠시 후 다시 시도해주세요.', kind: 'other' };
  }
  if (
    rawMessage.includes('Failed to fetch') ||
    rawMessage.includes('NetworkError') ||
    rawMessage.toLowerCase().includes('network')
  ) {
    return { message: '네트워크 연결을 확인한 뒤 다시 시도해주세요.', kind: 'other' };
  }
  // 매칭 기준을 error.code(예: invalid_credentials, email_not_confirmed) 기반으로 옮기는 방안은
  // docs/AUTH.md §4.2에서 검토됐지만, 이번 Phase 범위를 넘어서 적용하지 않는다. 문자열 부분일치라
  // Supabase가 메시지 문구를 바꾸면 매칭이 조용히 깨질 수 있다는 한계는 남아있다.
  return { message: '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.', kind: 'other' };
}

export function LoginForm() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // 비밀번호 표시/숨김은 필드별로 독립 — 비밀번호는 보이게 하고 확인란은 가려두는 등 조합이 자연스럽다.
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // blur(필드를 벗어남) 시점부터 해당 필드의 인라인 에러를 보여주기 위한 플래그
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [termsTouched, setTermsTouched] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authError, setAuthError] = useState<FriendlyAuthError | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const isSignUp = mode === 'signup';

  // 이메일/비밀번호 형식 검증은 로그인·회원가입 공통. 비밀번호 확인은 회원가입 전용.
  const emailError = getEmailError(email);
  const passwordError = getPasswordError(password);
  const confirmPasswordError = isSignUp ? getConfirmPasswordError(password, confirmPassword) : null;

  // /login에 붙은 쿼리(예: 익스텐션이 붙인 ?import=1)를 보존한 채 보드로 돌아간다.
  const redirectToBoard = useCallback(() => {
    const search = typeof window !== 'undefined' ? window.location.search : '';
    router.replace(`/${search}`);
  }, [router]);

  // 이미 로그인된 상태로 /login에 들어오거나, 방금 로그인/회원가입에 성공하면 보드로 이동
  useEffect(() => {
    if (status === 'authenticated') {
      redirectToBoard();
    }
  }, [status, redirectToBoard]);

  // /update-password에서 비밀번호 변경을 마치고 돌아온 경우(?passwordUpdated=1) 안내를 보여준다.
  // 렌더 중 상태를 맞추는 방식(React 공식 권장 패턴)이라 effect 안에서 setState를 직접 호출하지 않는다 —
  // 실제 부수효과(URL 정리)는 아래의 별도 effect가 담당한다.
  const passwordUpdatedSignal = useSyncExternalStore(noopSubscribe, hasPasswordUpdatedSignal, () => false);
  const [hasShownPasswordUpdatedMessage, setHasShownPasswordUpdatedMessage] = useState(false);

  if (passwordUpdatedSignal && !hasShownPasswordUpdatedMessage) {
    setHasShownPasswordUpdatedMessage(true);
    setInfoMessage('비밀번호가 변경됐습니다. 새 비밀번호로 로그인해주세요.');
  }

  // 새로고침해도 안내가 다시 뜨지 않도록 신호를 URL에서 제거한다 (?import=1과 같은 패턴). 이 effect는
  // setState를 호출하지 않고 history API만 다루므로 위 렌더 중 상태 조정과 역할이 분리돼 있다.
  useEffect(() => {
    if (!passwordUpdatedSignal) {
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete('passwordUpdated');
    window.history.replaceState({}, '', url.toString());
  }, [passwordUpdatedSignal]);

  const handleModeChange = (nextMode: Mode) => {
    setMode(nextMode);
    setAuthError(null);
    setInfoMessage(null);
    // 회원가입 전용 입력/터치/표시 상태는 모드를 바꾸면 초기화해 이전 모드의 흔적이 남지 않게 한다.
    setConfirmPassword('');
    setAgreedToTerms(false);
    setShowConfirmPassword(false);
    setEmailTouched(false);
    setPasswordTouched(false);
    setConfirmPasswordTouched(false);
    setTermsTouched(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError(null);
    setInfoMessage(null);

    // 제출을 시도하면 아직 blur하지 않은 필드의 인라인 에러도 바로 보이게 한다.
    setEmailTouched(true);
    setPasswordTouched(true);
    if (isSignUp) {
      setConfirmPasswordTouched(true);
      setTermsTouched(true);
    }

    if (emailError || passwordError || (isSignUp && (confirmPasswordError || !agreedToTerms))) {
      // 어떤 필드가 왜 막혔는지는 필드 아래 인라인 에러가 이미 보여주므로, 별도 상단 배너는 띄우지 않는다.
      return;
    }

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
        setInfoMessage('확인 메일을 발송했습니다. 메일함에서 인증 후 로그인해주세요.');
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
      setIsSubmitting(false);
    }
  };

  // 세션 확인 중이거나 이미 로그인된 상태(리다이렉트 진행 중)면 폼 대신 로딩만 보여준다
  if (status !== 'unauthenticated') {
    return (
      <div className="w-full max-w-105 rounded-[14px] bg-card p-6 shadow-lg">
        <p className="text-center text-[14px] text-text-muted">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-105 rounded-[14px] bg-card p-6 shadow-lg">
      <div className="mb-5 flex rounded-lg bg-column p-1">
        <button
          type="button"
          onClick={() => handleModeChange('signin')}
          className={clsx(
            'flex-1 rounded-md py-2 text-[14px] font-medium transition-colors',
            !isSignUp ? 'bg-card text-text-primary shadow-sm' : 'text-text-secondary',
          )}
        >
          로그인
        </button>
        <button
          type="button"
          onClick={() => handleModeChange('signup')}
          className={clsx(
            'flex-1 rounded-md py-2 text-[14px] font-medium transition-colors',
            isSignUp ? 'bg-card text-text-primary shadow-sm' : 'text-text-secondary',
          )}
        >
          회원가입
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <div>
          <label htmlFor="email" className={labelClassName}>
            이메일
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            onBlur={() => setEmailTouched(true)}
            placeholder="you@example.com"
            className={inputClassName}
            autoComplete="email"
            aria-required="true"
            aria-invalid={emailTouched && !!emailError}
          />
          {emailTouched && emailError && (
            <p role="alert" className={fieldErrorClassName}>
              {emailError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="password" className={labelClassName}>
            비밀번호
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => setPasswordTouched(true)}
              placeholder="6자 이상"
              className={passwordInputClassName}
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
              aria-required="true"
              aria-invalid={passwordTouched && !!passwordError}
            />
            <PasswordToggleButton
              isVisible={showPassword}
              onToggle={() => setShowPassword((prev) => !prev)}
              fieldLabel="비밀번호"
            />
          </div>
          {passwordTouched && passwordError && (
            <p role="alert" className={fieldErrorClassName}>
              {passwordError}
            </p>
          )}

          {isSignUp && password && <PasswordStrengthMeter password={password} />}

          {!isSignUp && (
            <div className="mt-1.5 text-right">
              <Link href="/reset-password" className="text-[12px] font-medium text-brand hover:underline">
                비밀번호를 잊으셨나요?
              </Link>
            </div>
          )}
        </div>

        {isSignUp && (
          <div>
            <label htmlFor="confirmPassword" className={labelClassName}>
              비밀번호 확인
            </label>
            <div className="relative">
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                onBlur={() => setConfirmPasswordTouched(true)}
                placeholder="비밀번호를 한 번 더 입력해주세요"
                className={passwordInputClassName}
                autoComplete="new-password"
                aria-required="true"
                aria-invalid={confirmPasswordTouched && !!confirmPasswordError}
              />
              <PasswordToggleButton
                isVisible={showConfirmPassword}
                onToggle={() => setShowConfirmPassword((prev) => !prev)}
                fieldLabel="비밀번호 확인"
              />
            </div>
            {confirmPasswordTouched && confirmPasswordError && (
              <p role="alert" className={fieldErrorClassName}>
                {confirmPasswordError}
              </p>
            )}
          </div>
        )}

        {isSignUp && (
          <div>
            <div className="flex items-start gap-2">
              <input
                id="terms"
                type="checkbox"
                checked={agreedToTerms}
                onChange={(event) => {
                  setAgreedToTerms(event.target.checked);
                  setTermsTouched(true);
                }}
                className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-brand"
                aria-required="true"
                aria-invalid={termsTouched && !agreedToTerms}
              />
              <label htmlFor="terms" className="text-[12px] text-text-secondary">
                이용약관 및 개인정보처리방침(준비 중)에 동의합니다.
              </label>
            </div>
            {termsTouched && !agreedToTerms && (
              <p role="alert" className={fieldErrorClassName}>
                약관에 동의해야 회원가입할 수 있습니다.
              </p>
            )}
          </div>
        )}

        {authError && (
          <div>
            <p role="alert" className="text-[12px] text-status-rejected">
              {authError.message}
            </p>
            {authError.kind === 'email-not-confirmed' && <ResendConfirmationButton email={email} />}
          </div>
        )}
        {infoMessage && <p className="text-[12px] text-status-offer">{infoMessage}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-lg bg-brand px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? '처리 중...' : isSignUp ? '회원가입' : '로그인'}
        </button>
      </form>
    </div>
  );
}
