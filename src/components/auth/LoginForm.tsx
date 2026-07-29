'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { clsx } from 'clsx';
import { signIn, signUp } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';

type Mode = 'signin' | 'signup';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

const inputClassName =
  'w-full rounded-lg border border-border-strong px-3 py-2 text-[14px] text-text-primary focus:border-brand focus:outline-none';
const labelClassName = 'mb-1 block text-[12px] font-medium text-text-secondary';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  const isSignUp = mode === 'signup';

  // 이미 로그인된 상태로 /login에 들어오거나, 방금 로그인/회원가입에 성공하면 보드로 이동
  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/');
    }
  }, [status, router]);

  const handleModeChange = (nextMode: Mode) => {
    setMode(nextMode);
    setErrorMessage(null);
    setInfoMessage(null);
  };

  // 기본적인 형식 검증만 (이메일 형식, 비밀번호 최소 길이)
  const validate = (): string | null => {
    if (!EMAIL_PATTERN.test(email)) {
      return '올바른 이메일 형식을 입력해주세요.';
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;
    }
    return null;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);

    const validationError = validate();
    if (validationError) {
      setErrorMessage(validationError);
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

    // authStore가 onAuthStateChange로 곧 authenticated가 되어 위 useEffect가 이동시키지만,
    // 한 박자라도 빠르게 보드로 넘어가도록 여기서도 바로 이동시킨다.
    console.log(`[${mode}] 성공`);
    router.replace('/');
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div>
          <label className={labelClassName}>이메일</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className={inputClassName}
            autoComplete="email"
          />
        </div>

        <div>
          <label className={labelClassName}>비밀번호</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="6자 이상"
            className={inputClassName}
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />
        </div>

        {errorMessage && <p className="text-[12px] text-status-rejected">{errorMessage}</p>}
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
