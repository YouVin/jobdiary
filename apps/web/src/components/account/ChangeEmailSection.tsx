'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { updateEmail } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { getEmailError } from '@/utils/authValidation';

const FAILED_MESSAGE = '이메일 변경을 요청하지 못했어요. 잠시 뒤 다시 시도해 주세요.';

// 이메일 변경 — 제출해도 즉시 바뀌지 않고, 새 이메일로 온 확인 메일을 열어야 실제로 반영된다
// (docs/AUTH.md §6.5.3). 확인 전까지는 authStore의 session.user.email도 그대로다.
// 결과 안내는 할 일이 남아 있어(메일 확인) 토스트가 아니라 카드 안에 남긴다.
export function ChangeEmailSection() {
  const session = useAuthStore((state) => state.session);
  const currentEmail = session?.user.email ?? '';
  const emailInput = useRef<HTMLInputElement>(null);

  // ── 입력·상태 ──
  const [newEmail, setNewEmail] = useState('');
  const [emailTouched, setEmailTouched] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const emailError = getEmailError(newEmail);

  // ── 제출: 검사 → 변경 확인 메일 요청 ──
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);
    setSuccessMessage(null);
    setEmailTouched(true);

    if (emailError) {
      emailInput.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await updateEmail(newEmail);
      if (error) {
        console.error('[change-email] 실패:', error);
        setErrorMessage(FAILED_MESSAGE);
        return;
      }
      setSuccessMessage(`${newEmail}로 확인 메일을 보냈어요. 메일함에서 확인해야 이메일이 바뀌어요.`);
      setNewEmail('');
      setEmailTouched(false);
    } catch (error) {
      console.error('[change-email] 실패(예외):', error);
      setErrorMessage(FAILED_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card aria-labelledby="change-email-title">
      <div className="flex flex-col gap-1">
        <CardHeader title="이메일 변경" titleId="change-email-title" />
        <p className="text-label text-text-secondary">
          지금 이메일: <span className="text-text-primary">{currentEmail}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {/* ── 새 이메일 칸 ── */}
        <TextField
          ref={emailInput}
          id="newEmail"
          label="새 이메일"
          type="email"
          value={newEmail}
          onChange={(event) => setNewEmail(event.target.value)}
          onBlur={() => setEmailTouched(true)}
          placeholder="new@example.com"
          autoComplete="email"
          aria-required="true"
          readOnly={isSubmitting}
          error={emailTouched ? emailError : null}
        />
        {/* ── 오류·안내·제출 버튼 ── */}
        <p role="alert" className={errorMessage ? 'text-label text-danger-text' : 'sr-only'}>
          {errorMessage}
        </p>
        <p role="status" className={successMessage ? 'rounded-md bg-selected px-4 py-3 text-label text-text-brand-strong' : 'sr-only'}>
          {successMessage}
        </p>
        <Button type="submit" isLoading={isSubmitting} loadingLabel="요청하는 중" className="self-start">
          확인 메일 보내기
        </Button>
      </form>
    </Card>
  );
}
