'use client';

import { useState } from 'react';
import { signIn, updatePassword } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';
import { getConfirmPasswordError, getPasswordError } from '@/utils/authValidation';
import { hasPasswordIdentity } from '@/utils/authIdentity';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { PasswordToggleButton } from '@/components/auth/PasswordToggleButton';
import { fieldErrorClassName, labelClassName, passwordInputClassName } from '@/components/auth/authFormStyles';

// 비밀번호 변경 전 현재 비밀번호를 재확인한다 — 세션이 탈취/방치된 상태에서 그대로 비밀번호가
// 바뀌는 것을 막기 위함이다 (docs/AUTH.md §6.5.2, §6.5.5).
export function ChangePasswordSection() {
  const session = useAuthStore((state) => state.session);
  const email = session?.user.email ?? '';
  const canChangePassword = hasPasswordIdentity(session?.user);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);

  const [currentPasswordTouched, setCurrentPasswordTouched] = useState(false);
  const [newPasswordTouched, setNewPasswordTouched] = useState(false);
  const [confirmNewPasswordTouched, setConfirmNewPasswordTouched] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 현재 비밀번호는 "일치하는지"가 아니라 "입력했는지"만 클라이언트에서 확인한다 —
  // 실제 일치 여부는 아래 signIn 재확인이 서버에서 검증한다.
  const currentPasswordError = currentPassword ? null : '현재 비밀번호를 입력해주세요.';
  const newPasswordError = getPasswordError(newPassword);
  const confirmNewPasswordError = getConfirmPasswordError(newPassword, confirmNewPassword);

  if (!canChangePassword) {
    return (
      <section className="rounded-[14px] border border-card-border bg-card p-5">
        <h2 className="text-[15px] font-semibold text-text-primary">비밀번호 변경</h2>
        <p className="mt-2 text-[13px] text-text-secondary">소셜 로그인 계정은 비밀번호 변경이 없습니다.</p>
      </section>
    );
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setCurrentPasswordTouched(true);
    setNewPasswordTouched(true);
    setConfirmNewPasswordTouched(true);

    if (currentPasswordError || newPasswordError || confirmNewPasswordError) {
      return;
    }

    setIsSubmitting(true);
    try {
      const { error: reauthError } = await signIn(email, currentPassword);

      if (reauthError) {
        console.error('[change-password] 재확인 실패:', reauthError);
        setErrorMessage('현재 비밀번호가 올바르지 않습니다.');
        return;
      }

      const { error: updateError } = await updatePassword(newPassword);

      if (updateError) {
        console.error('[change-password] 변경 실패:', updateError);
        setErrorMessage('비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      setSuccessMessage('비밀번호가 변경됐습니다.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setCurrentPasswordTouched(false);
      setNewPasswordTouched(false);
      setConfirmNewPasswordTouched(false);
    } catch (error) {
      console.error('[change-password] 실패(예외):', error);
      setErrorMessage('비밀번호 변경에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="rounded-[14px] border border-card-border bg-card p-5">
      <h2 className="text-[15px] font-semibold text-text-primary">비밀번호 변경</h2>

      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3" noValidate>
        <div>
          <label htmlFor="currentPassword" className={labelClassName}>
            현재 비밀번호
          </label>
          <div className="relative">
            <input
              id="currentPassword"
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              onBlur={() => setCurrentPasswordTouched(true)}
              className={passwordInputClassName}
              autoComplete="current-password"
              aria-required="true"
              aria-invalid={currentPasswordTouched && !!currentPasswordError}
            />
            <PasswordToggleButton
              isVisible={showCurrentPassword}
              onToggle={() => setShowCurrentPassword((prev) => !prev)}
              fieldLabel="현재 비밀번호"
            />
          </div>
          {currentPasswordTouched && currentPasswordError && (
            <p role="alert" className={fieldErrorClassName}>
              {currentPasswordError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="newPassword" className={labelClassName}>
            새 비밀번호
          </label>
          <div className="relative">
            <input
              id="newPassword"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              onBlur={() => setNewPasswordTouched(true)}
              placeholder="6자 이상"
              className={passwordInputClassName}
              autoComplete="new-password"
              aria-required="true"
              aria-invalid={newPasswordTouched && !!newPasswordError}
            />
            <PasswordToggleButton
              isVisible={showNewPassword}
              onToggle={() => setShowNewPassword((prev) => !prev)}
              fieldLabel="새 비밀번호"
            />
          </div>
          {newPasswordTouched && newPasswordError && (
            <p role="alert" className={fieldErrorClassName}>
              {newPasswordError}
            </p>
          )}
          {newPassword && <PasswordStrengthMeter password={newPassword} />}
        </div>

        <div>
          <label htmlFor="confirmNewPassword" className={labelClassName}>
            새 비밀번호 확인
          </label>
          <div className="relative">
            <input
              id="confirmNewPassword"
              type={showConfirmNewPassword ? 'text' : 'password'}
              value={confirmNewPassword}
              onChange={(event) => setConfirmNewPassword(event.target.value)}
              onBlur={() => setConfirmNewPasswordTouched(true)}
              placeholder="비밀번호를 한 번 더 입력해주세요"
              className={passwordInputClassName}
              autoComplete="new-password"
              aria-required="true"
              aria-invalid={confirmNewPasswordTouched && !!confirmNewPasswordError}
            />
            <PasswordToggleButton
              isVisible={showConfirmNewPassword}
              onToggle={() => setShowConfirmNewPassword((prev) => !prev)}
              fieldLabel="새 비밀번호 확인"
            />
          </div>
          {confirmNewPasswordTouched && confirmNewPasswordError && (
            <p role="alert" className={fieldErrorClassName}>
              {confirmNewPasswordError}
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
          {isSubmitting ? '변경 중...' : '비밀번호 변경'}
        </button>
      </form>
    </section>
  );
}
