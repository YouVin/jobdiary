'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { updateEmail } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { hasPasswordIdentity } from '@/utils/authIdentity';
import { getEmailError } from '@/utils/authValidation';

const FAILED_MESSAGE = '이메일 변경을 요청하지 못했어요. 잠시 뒤 다시 시도해 주세요.';

// Supabase 오류를 이메일 변경 상황에 맞는 문구로. 알 수 없는 오류는 FAILED_MESSAGE
function changeEmailErrorMessage(rawMessage: string): string {
  const lower = rawMessage.toLowerCase();
  if (lower.includes('already') || lower.includes('email_exists')) return '이미 다른 계정에서 쓰는 이메일이에요.';
  if (lower.includes('not authorized') || lower.includes('rate limit') || lower.includes('for security purposes')) return '지금은 확인 메일을 보낼 수 없어요. 잠시 뒤 다시 해 주세요.';
  return FAILED_MESSAGE;
}

// 이메일 변경 — 제출해도 즉시 바뀌지 않고, 새 이메일로 온 확인 메일을 열어야 실제로 반영된다
// (docs/AUTH.md §6.5.3). 확인 전까지는 authStore의 session.user.email도 그대로다.
// 결과 안내는 할 일이 남아 있어(메일 확인) 토스트가 아니라 카드 안에 남긴다.
export function ChangeEmailSection() {
  const session = useAuthStore((state) => state.session);
  const currentEmail = session?.user.email ?? '';
  // Google로만 가입한 계정은 로그인 이메일이 Google 계정을 따른다(비밀번호 변경과 같은 기준, #314)
  const canChangeEmail = hasPasswordIdentity(session?.user);
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
    if (newEmail.trim().toLowerCase() === currentEmail.toLowerCase()) {
      setErrorMessage('지금 쓰는 이메일과 같아요.');
      emailInput.current?.focus();
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await updateEmail(newEmail);
      if (error) {
        console.error('[change-email] 실패:', error);
        setErrorMessage(changeEmailErrorMessage(error.message ?? ''));
        return;
      }
      // 보안 이메일 변경이 켜져 있으면 지금 이메일로도 확인 메일이 간다(Supabase 기본값). 두 경우 모두 맞는 안내로 쓴다
      setSuccessMessage(`${newEmail}로 확인 메일을 보냈어요. 메일의 링크를 눌러야 이메일이 바뀌어요. 지금 이메일로도 확인 메일이 오면 그 링크도 눌러 주세요.`);
      setNewEmail('');
      setEmailTouched(false);
    } catch (error) {
      console.error('[change-email] 실패(예외):', error);
      setErrorMessage(FAILED_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!canChangeEmail) {
    return (
      <Card aria-labelledby="change-email-title">
        <CardHeader title="이메일 변경" titleId="change-email-title" />
        <p className="text-body text-text-secondary">Google로 가입한 계정은 Google 계정의 이메일로 로그인해요. 지금 이메일: <span className="text-text-primary">{currentEmail}</span></p>
      </Card>
    );
  }

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
