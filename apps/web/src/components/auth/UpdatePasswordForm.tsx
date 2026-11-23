'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { Button, buttonClassName } from '@/components/ui/Button';
import { PasswordField } from '@/components/ui/TextField';
import { signOut, updatePassword } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { getConfirmPasswordError, getPasswordError, MIN_PASSWORD_LENGTH } from '@/utils/authValidation';

// /update-password 폼 — 페이지 자체가 authStore.status를 직접 구독해 가드한다 (docs/AUTH.md §6.3.2, §6.3.4).
// AuthGuard로 감싸지 않는다: AuthGuard의 "인증됨=허용" 규칙과 이 페이지의 "recovering만 허용" 규칙이 반대다.
export function UpdatePasswordForm() {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const completeRecovery = useAuthStore((state) => state.completeRecovery);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [confirmPasswordTouched, setConfirmPasswordTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const confirmInput = useRef<HTMLInputElement>(null);

  const passwordError = getPasswordError(password);
  const confirmPasswordError = getConfirmPasswordError(password, confirmPassword);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);
    setPasswordTouched(true);
    setConfirmPasswordTouched(true);

    // 고칠 칸으로 포커스를 옮겨 오류 문구를 함께 읽게 한다.
    if (passwordError || confirmPasswordError) {
      (passwordError ? passwordInput : confirmInput).current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await updatePassword(password);

      if (error) {
        console.error('[update-password] 실패:', error);
        setErrorMessage('비밀번호를 바꾸지 못했어요. 링크가 만료됐을 수 있으니 다시 요청해 주세요.');
        return;
      }

      // 완료 후 처리: 자동 로그인 대신 로그아웃 후 재로그인을 요구한다 (docs/AUTH.md §6.3.2 확정 제안).
      // 재설정 링크가 계정 소유자가 아닌 사람에게 전달됐을 가능성을 고려해, 복구 세션을 이어가지 않는다.
      await signOut();
      completeRecovery();
      router.replace('/login?passwordUpdated=1');
    } catch (error) {
      console.error('[update-password] 실패(예외):', error);
      setErrorMessage('비밀번호를 바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <p role="status" className="rounded-lg bg-subtle p-5 text-body text-text-secondary">
        재설정 링크를 확인하고 있어요.
      </p>
    );
  }

  // recovering이 아니면(authenticated/unauthenticated) 유효한 복구 세션이 없다는 뜻이다 —
  // 링크 만료·재사용, 직접 접근, 새로고침으로 인한 recovering 유실 등이 모두 여기로 모인다 (docs/AUTH.md §6.3.6).
  if (status !== 'recovering') {
    return (
      <div className="flex flex-col gap-4">
        <div role="status" className="flex flex-col gap-1 rounded-lg bg-subtle p-5">
          <p className="text-body font-semibold text-text-primary">링크가 만료됐거나 올바르지 않아요</p>
          <p className="text-label text-text-secondary">비밀번호 재설정을 다시 요청해 주세요.</p>
        </div>
        <Link href="/reset-password" className={buttonClassName({ size: 'lg', block: true })}>
          재설정 다시 요청하기
        </Link>
      </div>
    );
  }

  return (
    <form aria-label="새 비밀번호 설정" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <fieldset disabled={isSubmitting} className="flex min-w-0 flex-col gap-4">
        <legend className="sr-only">새 비밀번호</legend>
        <div className="flex flex-col gap-2">
          <PasswordField
            ref={passwordInput}
            id="newPassword"
            label="새 비밀번호"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onBlur={() => setPasswordTouched(true)}
            placeholder={`${MIN_PASSWORD_LENGTH}자 이상`}
            autoComplete="new-password"
            aria-required="true"
            aria-describedby={password ? 'new-password-strength' : undefined}
            error={passwordTouched ? passwordError : null}
          />
          {password && <PasswordStrengthMeter id="new-password-strength" password={password} />}
        </div>

        <PasswordField
          ref={confirmInput}
          id="confirmNewPassword"
          label="새 비밀번호 확인"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          onBlur={() => setConfirmPasswordTouched(true)}
          placeholder="비밀번호를 한 번 더 입력해 주세요"
          autoComplete="new-password"
          aria-required="true"
          error={confirmPasswordTouched ? confirmPasswordError : null}
        />
      </fieldset>

      <p role="alert" aria-atomic="true" className={errorMessage ? 'text-label text-danger-text' : 'sr-only'}>
        {errorMessage}
      </p>

      <Button type="submit" size="lg" block isLoading={isSubmitting} loadingLabel="비밀번호를 바꾸는 중" className="mt-1">
        비밀번호 바꾸기
      </Button>
    </form>
  );
}
