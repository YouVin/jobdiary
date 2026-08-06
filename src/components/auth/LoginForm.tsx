'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { signIn, signUp } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { getConfirmPasswordError, getEmailError, getPasswordError, MIN_PASSWORD_LENGTH } from '@/utils/authValidation';
import { getPasswordStrength, PasswordStrength } from '@/utils/passwordStrength';

type Mode = 'signin' | 'signup';

const inputClassName =
  'w-full rounded-lg border border-border-strong px-3 py-2 text-[14px] text-text-primary focus:border-brand focus:outline-none';
const labelClassName = 'mb-1 block text-[12px] font-medium text-text-secondary';
const fieldErrorClassName = 'mt-1 text-[12px] text-status-rejected';

// 강도별 막대 색/문구 — 기존 상태 색 토큰을 재사용한다 (하드코딩 색상 금지).
const PASSWORD_STRENGTH_INFO: Record<
  PasswordStrength,
  { label: string; barClassName: string; textClassName: string; filledSegments: number }
> = {
  weak: { label: '약함', barClassName: 'bg-status-rejected', textClassName: 'text-status-rejected', filledSegments: 1 },
  medium: { label: '보통', barClassName: 'bg-status-screening', textClassName: 'text-status-screening', filledSegments: 2 },
  strong: { label: '강함', barClassName: 'bg-status-offer', textClassName: 'text-status-offer', filledSegments: 3 },
};

// Supabase 에러 메시지는 영어·기술적이라 사용자에게는 번역된 문구로 보여준다
function getFriendlyErrorMessage(rawMessage: string): string {
  if (rawMessage.includes('Invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.';
  }
  if (rawMessage.includes('User already registered')) {
    return '이미 가입된 이메일입니다. 로그인을 이용해주세요.';
  }
  if (rawMessage.includes('Password should be at least')) {
    return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;
  }
  if (rawMessage.includes('Unable to validate email address')) {
    return '이메일 형식이 올바르지 않습니다.';
  }
  return '요청 처리 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.';
}

export function LoginForm() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);

  // blur(필드를 벗어남) 시점부터 해당 필드의 인라인 에러를 보여주기 위한 플래그
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [termsTouched, setTermsTouched] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const isSignUp = mode === 'signup';

  // 이메일/비밀번호 형식 검증은 로그인·회원가입 공통. 비밀번호 확인은 회원가입 전용.
  const emailError = getEmailError(email);
  const passwordError = getPasswordError(password);
  const confirmPasswordError = isSignUp ? getConfirmPasswordError(password, confirmPassword) : null;
  const passwordStrength = getPasswordStrength(password);

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

  const handleModeChange = (nextMode: Mode) => {
    setMode(nextMode);
    setErrorMessage(null);
    setInfoMessage(null);
    // 회원가입 전용 입력/터치 상태는 모드를 바꾸면 초기화해 이전 모드의 흔적이 남지 않게 한다.
    setConfirmPassword('');
    setAgreedToTerms(false);
    setEmailTouched(false);
    setPasswordTouched(false);
    setConfirmPasswordTouched(false);
    setTermsTouched(false);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
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
    const result = isSignUp ? await signUp(email, password) : await signIn(email, password);
    setIsSubmitting(false);

    if (result.error) {
      console.error(`[${mode}] 실패:`, result.error);
      setErrorMessage(getFriendlyErrorMessage(result.error.message));
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
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onBlur={() => setPasswordTouched(true)}
            placeholder="6자 이상"
            className={inputClassName}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            aria-required="true"
            aria-invalid={passwordTouched && !!passwordError}
          />
          {passwordTouched && passwordError && (
            <p role="alert" className={fieldErrorClassName}>
              {passwordError}
            </p>
          )}

          {isSignUp && password && (
            <div className="mt-1.5">
              <div className="flex gap-1">
                {[0, 1, 2].map((segmentIndex) => (
                  <div
                    key={segmentIndex}
                    className={clsx(
                      'h-1 flex-1 rounded-full',
                      segmentIndex < PASSWORD_STRENGTH_INFO[passwordStrength].filledSegments
                        ? PASSWORD_STRENGTH_INFO[passwordStrength].barClassName
                        : 'bg-column',
                    )}
                  />
                ))}
              </div>
              <p className={clsx('mt-1 text-[11px] font-medium', PASSWORD_STRENGTH_INFO[passwordStrength].textClassName)}>
                비밀번호 강도: {PASSWORD_STRENGTH_INFO[passwordStrength].label}
              </p>
            </div>
          )}
        </div>

        {isSignUp && (
          <div>
            <label htmlFor="confirmPassword" className={labelClassName}>
              비밀번호 확인
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              onBlur={() => setConfirmPasswordTouched(true)}
              placeholder="비밀번호를 한 번 더 입력해주세요"
              className={inputClassName}
              autoComplete="new-password"
              aria-required="true"
              aria-invalid={confirmPasswordTouched && !!confirmPasswordError}
            />
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

        {errorMessage && (
          <p role="alert" className="text-[12px] text-status-rejected">
            {errorMessage}
          </p>
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
