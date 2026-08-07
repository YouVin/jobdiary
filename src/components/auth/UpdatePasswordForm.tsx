'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signOut, updatePassword } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { getConfirmPasswordError, getPasswordError } from '@/utils/authValidation';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { PasswordToggleButton } from '@/components/auth/PasswordToggleButton';
import { fieldErrorClassName, labelClassName, passwordInputClassName } from '@/components/auth/authFormStyles';

// /update-password 폼 — 페이지 자체가 authStore.status를 직접 구독해 가드한다 (docs/AUTH.md §6.3.2, §6.3.4).
// AuthGuard로 감싸지 않는다: AuthGuard의 "인증됨=허용" 규칙과 이 페이지의 "recovering만 허용" 규칙이 반대다.
export function UpdatePasswordForm() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const completeRecovery = useAuthStore((state) => state.completeRecovery);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const passwordError = getPasswordError(password);
  const confirmPasswordError = getConfirmPasswordError(password, confirmPassword);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setPasswordTouched(true);
    setConfirmPasswordTouched(true);

    if (passwordError || confirmPasswordError) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await updatePassword(password);

      if (error) {
        console.error('[update-password] 실패:', error);
        setErrorMessage('비밀번호 변경에 실패했습니다. 링크가 만료됐을 수 있습니다. 다시 요청해주세요.');
        return;
      }

      // 완료 후 처리: 자동 로그인 대신 로그아웃 후 재로그인을 요구한다 (docs/AUTH.md §6.3.2 확정 제안).
      // 재설정 링크가 계정 소유자가 아닌 사람에게 전달됐을 가능성을 고려해, 복구 세션을 이어가지 않는다.
      await signOut();
      completeRecovery();
      router.replace('/login?passwordUpdated=1');
    } catch (error) {
      console.error('[update-password] 실패(예외):', error);
      setErrorMessage('비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="w-full max-w-105 rounded-[14px] bg-card p-6 shadow-lg">
        <p className="text-center text-[14px] text-text-muted">확인 중...</p>
      </div>
    );
  }

  // recovering이 아니면(authenticated/unauthenticated) 유효한 복구 세션이 없다는 뜻이다 —
  // 링크 만료·재사용, 직접 접근, 새로고침으로 인한 recovering 유실 등이 모두 여기로 모인다 (docs/AUTH.md §6.3.6).
  if (status !== 'recovering') {
    return (
      <div className="w-full max-w-105 rounded-[14px] bg-card p-6 text-center shadow-lg">
        <p className="text-[14px] text-text-primary">유효하지 않거나 만료된 링크입니다.</p>
        <p className="mt-1 text-[12px] text-text-muted">비밀번호 재설정을 다시 요청해주세요.</p>
        <Link
          href="/reset-password"
          className="mt-5 inline-block rounded-lg bg-brand px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-brand-hover"
        >
          재설정 다시 요청하기
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-105 rounded-[14px] bg-card p-6 shadow-lg">
      <h1 className="mb-1 text-[16px] font-semibold text-text-primary">새 비밀번호 설정</h1>
      <p className="mb-5 text-[12px] text-text-secondary">새로 사용할 비밀번호를 입력해주세요.</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
        <div>
          <label htmlFor="newPassword" className={labelClassName}>
            새 비밀번호
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onBlur={() => setPasswordTouched(true)}
              placeholder="6자 이상"
              className={passwordInputClassName}
              autoComplete="new-password"
              aria-required="true"
              aria-invalid={passwordTouched && !!passwordError}
            />
            <PasswordToggleButton
              isVisible={showPassword}
              onToggle={() => setShowPassword((prev) => !prev)}
              fieldLabel="새 비밀번호"
            />
          </div>
          {passwordTouched && passwordError && (
            <p role="alert" className={fieldErrorClassName}>
              {passwordError}
            </p>
          )}
          {password && <PasswordStrengthMeter password={password} />}
        </div>

        <div>
          <label htmlFor="confirmNewPassword" className={labelClassName}>
            새 비밀번호 확인
          </label>
          <div className="relative">
            <input
              id="confirmNewPassword"
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
              fieldLabel="새 비밀번호 확인"
            />
          </div>
          {confirmPasswordTouched && confirmPasswordError && (
            <p role="alert" className={fieldErrorClassName}>
              {confirmPasswordError}
            </p>
          )}
        </div>

        {errorMessage && (
          <p role="alert" className="text-[12px] text-status-rejected">
            {errorMessage}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 rounded-lg bg-brand px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? '처리 중...' : '비밀번호 변경'}
        </button>
      </form>
    </div>
  );
}
