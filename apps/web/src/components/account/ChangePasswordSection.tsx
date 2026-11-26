'use client';

import { useRef, useState } from 'react';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { PasswordField } from '@/components/ui/TextField';
import { useToast } from '@/components/ui/Toast';
import { signIn, updatePassword } from '@/lib/auth';
import { captureApplicationSession } from '@/store/applicationStore';
import { useAuthStore } from '@/store/authStore';
import { hasPasswordIdentity } from '@/utils/authIdentity';
import { getConfirmPasswordError, getPasswordError, MIN_PASSWORD_LENGTH } from '@/utils/authValidation';

const FAILED_MESSAGE = '비밀번호를 바꾸지 못했어요. 잠시 뒤 다시 시도해 주세요.';

// 비밀번호 변경 전 현재 비밀번호를 재확인한다 — 세션이 탈취/방치된 상태에서 그대로 비밀번호가
// 바뀌는 것을 막기 위함이다 (docs/AUTH.md §6.5.2, §6.5.5). 바꾸면 토스트로 알린다(#205).
export function ChangePasswordSection() {
  const session = useAuthStore((state) => state.session);
  const email = session?.user.email ?? '';
  const canChangePassword = hasPasswordIdentity(session?.user);
  const showToast = useToast();
  const currentInput = useRef<HTMLInputElement>(null);
  const newInput = useRef<HTMLInputElement>(null);
  const confirmInput = useRef<HTMLInputElement>(null);

  // ── 입력·상태 ──
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [isChecked, setIsChecked] = useState(false); // 제출했거나 칸을 벗어난 뒤에만 오류를 보여준다
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 현재 비밀번호는 "일치하는지"가 아니라 "입력했는지"만 클라이언트에서 확인한다 —
  // 실제 일치 여부는 아래 signIn 재확인이 서버에서 검증한다.
  const currentPasswordError = currentPassword ? null : '지금 비밀번호를 입력해 주세요.';
  const newPasswordError = getPasswordError(newPassword);
  const confirmNewPasswordError = getConfirmPasswordError(newPassword, confirmNewPassword);

  if (!canChangePassword) {
    return (
      <Card aria-labelledby="change-password-title">
        <CardHeader title="비밀번호 변경" titleId="change-password-title" />
        <p className="text-body text-text-secondary">Google로 가입한 계정은 비밀번호가 없어요. 로그인은 Google 계정으로 해요.</p>
      </Card>
    );
  }

  // ── 제출: 검사 → 현재 비밀번호 확인 → 변경 ──
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    setErrorMessage(null);
    setIsChecked(true);

    // 첫 오류 칸으로 포커스를 옮겨 오류 문구를 함께 읽게 한다.
    const firstInvalid = currentPasswordError ? currentInput : newPasswordError ? newInput : confirmNewPasswordError ? confirmInput : null;
    if (firstInvalid) {
      requestAnimationFrame(() => firstInvalid.current?.focus());
      return;
    }

    const context = captureApplicationSession();
    if (!context) return;

    setIsSubmitting(true);
    try {
      const { error: reauthError } = await signIn(email, currentPassword);
      if (!context.isCurrent()) return;
      if (reauthError) {
        console.error('[change-password] 재확인 실패:', reauthError);
        setErrorMessage('지금 비밀번호가 맞지 않아요.');
        return;
      }

      const { error: updateError } = await updatePassword(newPassword);
      if (!context.isCurrent()) return;
      if (updateError) {
        console.error('[change-password] 변경 실패:', updateError);
        setErrorMessage(FAILED_MESSAGE);
        return;
      }

      showToast({ message: '비밀번호를 바꿨어요' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setIsChecked(false);
    } catch (error) {
      console.error('[change-password] 실패(예외):', error);
      setErrorMessage(FAILED_MESSAGE);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card aria-labelledby="change-password-title">
      <CardHeader title="비밀번호 변경" titleId="change-password-title" />
      {/* ── 입력 칸: 현재 → 새 비밀번호(강도) → 확인 ── */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        <fieldset disabled={isSubmitting} className="flex min-w-0 flex-col gap-4">
          <legend className="sr-only">비밀번호 변경</legend>
          <PasswordField
            ref={currentInput}
            id="currentPassword"
            label="지금 비밀번호"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            aria-required="true"
            error={isChecked ? currentPasswordError : null}
          />
          <div className="flex flex-col gap-2">
            <PasswordField
              ref={newInput}
              id="newPassword"
              label="새 비밀번호"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder={`${MIN_PASSWORD_LENGTH}자 이상`}
              autoComplete="new-password"
              aria-required="true"
              aria-describedby={newPassword ? 'new-password-strength' : undefined}
              error={isChecked ? newPasswordError : null}
            />
            {newPassword && <PasswordStrengthMeter id="new-password-strength" password={newPassword} />}
          </div>
          <PasswordField
            ref={confirmInput}
            id="confirmNewPassword"
            label="새 비밀번호 확인"
            value={confirmNewPassword}
            onChange={(event) => setConfirmNewPassword(event.target.value)}
            placeholder="비밀번호를 한 번 더 입력해 주세요"
            autoComplete="new-password"
            aria-required="true"
            error={isChecked ? confirmNewPasswordError : null}
          />
        </fieldset>
        {/* ── 오류·제출 버튼 ── */}
        <p role="alert" className={errorMessage ? 'text-label text-danger-text' : 'sr-only'}>
          {errorMessage}
        </p>
        <Button type="submit" isLoading={isSubmitting} loadingLabel="바꾸는 중" className="self-start">
          비밀번호 바꾸기
        </Button>
      </form>
    </Card>
  );
}
