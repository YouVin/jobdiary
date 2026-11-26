import Link from 'next/link';
import { PasswordStrengthMeter } from '@/components/auth/PasswordStrengthMeter';
import { PolicyLinks } from '@/components/auth/PolicyLinks';
import { Checkbox } from '@/components/ui/Checkbox';
import { PasswordField, TextField } from '@/components/ui/TextField';
import { textLinkClassName } from '@/components/ui/TextLink';
import type { EmailAuthFieldValues } from '@/hooks/useEmailAuthForm';
import { MIN_PASSWORD_LENGTH } from '@/utils/authValidation';

interface EmailAuthFieldsProps {
  fields: EmailAuthFieldValues;
  disabled: boolean;
}

// 이메일 로그인·가입 입력 칸 (#264에서 LoginForm에서 분리). 값과 검사는 useEmailAuthForm이 가진다.
// 처리 중에는 칸만 잠근다(fieldset disabled). 제출 버튼은 밖에 있어 포커스가 버튼에 남는다.
export function EmailAuthFields({ fields, disabled }: EmailAuthFieldsProps) {
  const { isSignUp } = fields;

  return (
    <fieldset disabled={disabled} className="flex min-w-0 flex-col gap-4">
      <legend className="sr-only">{isSignUp ? '이메일 회원가입 정보' : '이메일 로그인 정보'}</legend>

      {/* ── 이메일 ── */}
      <TextField
        id="email"
        label="이메일"
        type="email"
        value={fields.email}
        onChange={(event) => fields.onEmailChange(event.target.value)}
        onBlur={fields.emailFeedback.onBlur}
        placeholder="you@example.com"
        autoComplete="email"
        aria-required="true"
        error={fields.emailFeedback.error}
      />

      {/* ── 비밀번호(로그인: 비밀번호 찾기 링크 | 가입: 강도 막대) ── */}
      <div className="flex flex-col gap-2">
        <PasswordField
          id="password"
          label="비밀번호"
          value={fields.password}
          onChange={(event) => fields.onPasswordChange(event.target.value)}
          onBlur={fields.passwordFeedback.onBlur}
          placeholder={`${MIN_PASSWORD_LENGTH}자 이상`}
          autoComplete={isSignUp ? 'new-password' : 'current-password'}
          aria-required="true"
          hint={isSignUp ? `${MIN_PASSWORD_LENGTH}자 이상 입력해 주세요.` : undefined}
          aria-describedby={isSignUp && fields.password ? 'password-strength' : undefined}
          error={fields.passwordFeedback.error}
          labelAction={
            isSignUp ? undefined : (
              <Link href="/reset-password" className={textLinkClassName('brand', 'text-label')}>
                비밀번호 찾기
              </Link>
            )
          }
        />
        {isSignUp && fields.password && <PasswordStrengthMeter id="password-strength" password={fields.password} />}
      </div>

      {/* ── 가입만: 비밀번호 확인·약관 동의 ── */}
      {isSignUp && (
        <PasswordField
          id="confirmPassword"
          label="비밀번호 확인"
          value={fields.confirmPassword}
          onChange={(event) => fields.onConfirmPasswordChange(event.target.value)}
          onBlur={fields.confirmationFeedback.onBlur}
          placeholder="비밀번호를 한 번 더 입력해 주세요"
          autoComplete="new-password"
          aria-required="true"
          error={fields.confirmationFeedback.error}
        />
      )}

      {isSignUp && (
        <Checkbox
          id="terms"
          checked={fields.agreedToTerms}
          onChange={(event) => fields.onAgreedToTermsChange(event.target.checked)}
          aria-required="true"
          error={fields.termsError}
        >
          [필수] <PolicyLinks />을 확인했고, 이용약관에 동의해요.
        </Checkbox>
      )}
    </fieldset>
  );
}
