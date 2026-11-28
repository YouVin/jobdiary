'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { TextField } from '@/components/ui/TextField';
import { getLatestEmail, updateEmail } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { hasPasswordIdentity } from '@/utils/authIdentity';
import { getEmailError } from '@/utils/authValidation';

const FAILED_MESSAGE = '이메일 변경을 요청하지 못했어요. 잠시 뒤 다시 시도해 주세요.';
const NOTICE_CLASS = 'flex min-h-12 items-center rounded-md bg-selected px-4 py-3 text-label break-keep text-text-brand-strong';

// Supabase 오류를 이메일 변경 상황에 맞는 문구로. 알 수 없는 오류는 FAILED_MESSAGE
function changeEmailErrorMessage(rawMessage: string, code?: string): string {
  const lower = rawMessage.toLowerCase();
  if (code === 'email_exists' || lower.includes('already')) return '이미 가입된 이메일이에요. 다른 이메일을 입력해 주세요.';
  if (lower.includes('not authorized') || lower.includes('rate limit') || lower.includes('for security purposes')) return '지금은 확인 메일을 보낼 수 없어요. 잠시 뒤 다시 해 주세요.';
  return FAILED_MESSAGE;
}

// 이메일 변경 — 제출해도 즉시 바뀌지 않고, 새 이메일로 온 확인 메일을 열어야 실제로 반영된다
// (docs/AUTH.md §6.5.3). 확인 전까지는 authStore의 session.user.email도 그대로다.
// 결과 안내는 할 일이 남아 있어(메일 확인) 토스트가 아니라 카드 안에 남긴다.
export function ChangeEmailSection() {
  const session = useAuthStore((state) => state.session);
  // 서버의 최신 이메일·바꾸는 중인 이메일. 세션 이메일은 토큰을 새로 받을 때까지 예전 값이다(#314)
  const [latest, setLatest] = useState<{ email: string | null; pendingEmail: string | null } | null>(null);
  const loadLatest = useCallback(() => {
    void getLatestEmail().then(setLatest);
  }, []);
  useEffect(() => {
    loadLatest();
  }, [loadLatest]);
  const currentEmail = latest?.email ?? session?.user.email ?? '';
  const pendingEmail = latest?.pendingEmail && latest.pendingEmail !== currentEmail ? latest.pendingEmail : null;
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
        setErrorMessage(changeEmailErrorMessage(error.message ?? '', error.code));
        return;
      }
      // 보안 이메일 변경(Supabase 기본값)이라 새 이메일과 지금 이메일 두 곳의 링크를 모두 눌러야 바뀐다
      setSuccessMessage('확인 메일을 보냈어요. 새 이메일과 지금 이메일로 온 링크를 모두 눌러야 바뀌어요.');
      setNewEmail('');
      setEmailTouched(false);
      loadLatest(); // 바꾸는 중인 이메일을 위에 보여 준다
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
        {/* 확인 전인 변경: 메일 링크를 눌러야 바뀐다는 것을 계속 보여 준다(새로고침해도) */}
        {/* 보낸 직후에는 아래 결과 상자 하나만 보인다(같은 말을 두 번 하지 않게) */}
        {pendingEmail && !successMessage && (
          <p className="text-label break-keep text-text-secondary">
            <span className="text-text-primary">{pendingEmail}</span>로 바꾸는 중이에요. 두 메일함에 온 확인 링크를 모두 눌러야 바뀌어요.
          </p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {/* ── 새 이메일 칸 ── */}
        <TextField
          ref={emailInput}
          id="newEmail"
          label="새 이메일"
          type="email"
          value={newEmail}
          onChange={(event) => {
            // 고치기 시작하면 지난 결과를 지운다(#314)
            setNewEmail(event.target.value);
            setErrorMessage(null);
            setSuccessMessage(null);
          }}
          // 빈 칸 안내는 저장을 눌렀을 때만(보낸 뒤 칸이 비워져도 안내가 겹쳐 뜨지 않게, #314)
          onBlur={() => setEmailTouched(Boolean(newEmail))}
          placeholder="new@example.com"
          autoComplete="email"
          aria-required="true"
          readOnly={isSubmitting}
          error={emailTouched ? emailError : null}
        />
        {/* ── 오류·안내·제출 버튼 ── */}
        {/* 칸 아래 안내가 보이는 동안에는 아래 오류를 숨겨 한 번에 하나만 */}
        <p role="alert" className={errorMessage && !(emailTouched && emailError) ? 'text-label text-danger-text' : 'sr-only'}>
          {emailTouched && emailError ? null : errorMessage}
        </p>
        <p role="status" className={successMessage && !(emailTouched && emailError) ? NOTICE_CLASS : 'sr-only'}>
          {emailTouched && emailError ? null : successMessage}
        </p>
        <Button type="submit" isLoading={isSubmitting} loadingLabel="요청하는 중" className="self-start">
          확인 메일 보내기
        </Button>
      </form>
    </Card>
  );
}
