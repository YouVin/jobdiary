'use client';

import { useState } from 'react';
import { clsx } from 'clsx';
import { signIn, signUp } from '@/lib/auth';

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
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isSignUp = mode === 'signup';

  const resetMessages = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleModeChange = (nextMode: Mode) => {
    setMode(nextMode);
    resetMessages();
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
    resetMessages();

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

    // 성공 처리: 세션 유지/화면 분기는 S-3c에서 다룬다. 이번엔 성공 확인까지만.
    console.log(`[${mode}] 성공:`, result.user);
    setSuccessMessage(isSignUp ? '회원가입 성공! 로그인 상태입니다.' : '로그인 성공!');
  };

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
        {successMessage && <p className="text-[12px] text-status-offer">{successMessage}</p>}

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
