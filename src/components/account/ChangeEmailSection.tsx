'use client';

import { useState } from 'react';
import { updateEmail } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { getEmailError } from '@/utils/authValidation';
import { fieldErrorClassName, inputClassName, labelClassName } from '@/components/auth/authFormStyles';

// 이메일 변경 — 제출해도 즉시 바뀌지 않고, 새 이메일로 온 확인 메일을 열어야 실제로 반영된다
// (docs/AUTH.md §6.5.3). 확인 전까지는 authStore의 session.user.email도 그대로다.
export function ChangeEmailSection() {
  const session = useAuthStore((state) => state.session);
  const currentEmail = session?.user.email ?? '';

  const [newEmail, setNewEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const emailError = getEmailError(newEmail);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmailTouched(true);

    if (emailError) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await updateEmail(newEmail);

      if (error) {
        console.error('[change-email] 실패:', error);
        setErrorMessage('이메일 변경 요청에 실패했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      setSuccessMessage(`${newEmail}로 확인 메일을 보냈습니다. 메일함에서 확인해야 이메일이 실제로 변경됩니다.`);
      setNewEmail('');
      setEmailTouched(false);
    } catch (error) {
      console.error('[change-email] 실패(예외):', error);
      setErrorMessage('이메일 변경 요청에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-[14px] border border-card-border bg-card p-5">
      <h2 className="text-[15px] font-semibold text-text-primary">이메일 변경</h2>
      <p className="mt-1 text-[12px] text-text-secondary">현재 이메일: {currentEmail}</p>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3" noValidate>
        <div>
          <label htmlFor="newEmail" className={labelClassName}>
            새 이메일
          </label>
          <input
            id="newEmail"
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            onBlur={() => setEmailTouched(true)}
            placeholder="new@example.com"
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

        {errorMessage && (
          <p role="alert" className="text-[12px] text-status-rejected">
            {errorMessage}
          </p>
        )}
        {successMessage && <p className="text-[12px] text-status-offer">{successMessage}</p>}

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-1 self-start rounded-lg bg-brand px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? '요청 중...' : '이메일 변경'}
        </button>
      </form>
    </section>
  );
}
