'use client';

import Link from 'next/link';
import { useState } from 'react';
import { buttonClassName } from '@/components/common/buttonStyles';
import { fieldErrorClassName, inputClassName, labelClassName } from '@/components/common/formStyles';
import { resetPasswordForEmail } from '@/lib/auth';
import { getEmailError } from '@/utils/authValidation';

// /reset-password 폼 — 이메일을 받아 재설정 링크를 요청한다 (docs/AUTH.md §6.3.1, §6.3.4)
export function ResetPasswordForm() {
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const emailError = getEmailError(email);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEmailTouched(true);

    if (emailError) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await resetPasswordForEmail(email, `${window.location.origin}/update-password`);

      if (error) {
        // 계정 존재 여부를 노출하지 않기 위해, 실패해도 사용자에게는 항상 같은 중립적 안내를 보여준다
        // (docs/AUTH.md §6.3.6 엣지케이스 5). 실패 원인은 콘솔 로그로만 남긴다.
        console.error('[reset-password] 요청 실패:', error);
      }
    } finally {
      setIsSubmitting(false);
      setIsSubmitted(true);
    }
  };

  if (isSubmitted) {
    return (
      <div className="w-full max-w-105 rounded-card bg-card p-6 text-center shadow-float">
        <p className="text-body text-text-primary">입력하신 이메일로 재설정 링크를 보냈습니다.</p>
        <p className="mt-1 text-label text-text-muted">가입된 이메일이 맞다면 잠시 후 메일함을 확인해주세요.</p>
        <Link
          href="/login"
          className={buttonClassName('primary', 'mt-5')}
        >
          로그인으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-105 rounded-card bg-card p-6 shadow-float">
      <h1 className="mb-1 text-heading-md text-text-primary">비밀번호 재설정</h1>
      <p className="mb-5 text-label text-text-secondary">가입하신 이메일을 입력하면 재설정 링크를 보내드립니다.</p>

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

        <button
          type="submit"
          disabled={isSubmitting}
          className={buttonClassName('primary', 'mt-2')}
        >
          {isSubmitting ? '처리 중...' : '재설정 링크 보내기'}
        </button>

        <Link href="/login" className="text-center text-label font-medium text-brand hover:underline">
          로그인으로 돌아가기
        </Link>
      </form>
    </div>
  );
}
