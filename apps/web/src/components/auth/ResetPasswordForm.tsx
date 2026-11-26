'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { Button, buttonClassName } from '@/components/ui/Button';
import { TextField } from '@/components/ui/TextField';
import { textLinkClassName } from '@/components/ui/TextLink';
import { resetPasswordForEmail } from '@/lib/auth';
import { getEmailError } from '@/utils/authValidation';

// /reset-password 폼 — 이메일을 받아 재설정 링크를 요청한다 (docs/AUTH.md §6.3.1, §6.3.4)
export function ResetPasswordForm() {
  // ── 입력·상태 ──
  const [email, setEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const emailInput = useRef<HTMLInputElement>(null);
  const doneMessage = useRef<HTMLDivElement>(null);

  const emailError = getEmailError(email);

  // 보낸 뒤에는 폼이 사라지므로 포커스를 결과 안내로 옮겨 바로 읽히게 한다.
  useEffect(() => {
    if (isSubmitted) doneMessage.current?.focus();
  }, [isSubmitted]);

  // ── 제출: 재설정 링크 메일 요청 ──
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setEmailTouched(true);

    if (emailError) {
      emailInput.current?.focus();
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

  // ── 화면 2: 보냈어요 안내 ──
  if (isSubmitted) {
    return (
      <div className="flex flex-col gap-4">
        <div ref={doneMessage} tabIndex={-1} role="status" className="flex flex-col gap-1 rounded-lg bg-subtle p-5 focus:outline-none">
          <p className="text-body font-semibold text-text-primary">재설정 링크를 보냈어요</p>
          <p className="text-label text-text-secondary">가입한 이메일이 맞다면 잠시 뒤 메일함에 도착해요. 메일이 없으면 스팸함도 확인해 주세요.</p>
        </div>
        <Link href="/login" className={buttonClassName({ size: 'lg', block: true })}>
          로그인으로 돌아가기
        </Link>
      </div>
    );
  }

  // ── 화면 1: 이메일 입력 ──
  return (
    <form aria-label="비밀번호 재설정 링크 요청" onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
      <TextField
        ref={emailInput}
        id="email"
        label="이메일"
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        onBlur={() => setEmailTouched(true)}
        placeholder="you@example.com"
        autoComplete="email"
        aria-required="true"
        readOnly={isSubmitting}
        error={emailTouched ? emailError : null}
      />

      <Button type="submit" size="lg" block isLoading={isSubmitting} loadingLabel="링크를 보내는 중" className="mt-1">
        재설정 링크 보내기
      </Button>

      <Link href="/login" className={textLinkClassName('brand', 'self-center text-body')}>
        로그인으로 돌아가기
      </Link>
    </form>
  );
}
