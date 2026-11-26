'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useFieldValidation } from '@/hooks/useFieldValidation';
import { useOAuthReturnError } from '@/hooks/useOAuthReturnError';
import { signIn, signUp } from '@/lib/auth';
import { type FriendlyAuthError, getFriendlyErrorMessage, GOOGLE_FAILED_MESSAGE } from '@/utils/authErrorMessage';
import { getConfirmPasswordError, getEmailError, getPasswordError } from '@/utils/authValidation';

export type AuthMode = 'signin' | 'signup';

// 로그인·가입 폼의 입력·검사·제출 (#264에서 LoginForm에서 분리). 화면은 LoginForm·EmailAuthFields가 그린다.
// 이메일 요청과 구글 요청은 requestPending 하나로 막아 동시에 두 요청이 나가지 않게 한다.
export function useEmailAuthForm(mode: AuthMode) {
  const isSignUp = mode === 'signup';

  // ── 입력 ──
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  // 약관은 체크·제출 시 확인하며 텍스트 입력은 아래 지연 검증 훅으로 안내한다.
  const [termsTouched, setTermsTouched] = useState(false);

  // ── 요청 상태·결과 ──
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOAuthPending, setIsOAuthPending] = useState(false);
  const requestPending = useRef(false);
  const [authError, setAuthError] = useState<FriendlyAuthError | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // ── 칸 검사: 이메일/비밀번호는 공통, 비밀번호 확인·약관은 가입만 ──
  const emailError = getEmailError(email);
  const passwordError = getPasswordError(password);
  const confirmPasswordError = isSignUp ? getConfirmPasswordError(password, confirmPassword) : null;
  const emailFeedback = useFieldValidation(email, emailError);
  const passwordFeedback = useFieldValidation(password, passwordError);
  const confirmationFeedback = useFieldValidation(confirmPassword, confirmPasswordError);
  const termsError = isSignUp && termsTouched && !agreedToTerms ? '이메일로 가입하려면 약관에 동의해 주세요.' : null;

  // ── 첫 오류 칸 포커스: 오류 설명과 aria-invalid가 DOM에 반영된 뒤 옮겨 함께 읽게 한다 ──
  const [focusRequest, setFocusRequest] = useState(0);
  const invalidField = useRef<string | null>(null);
  useEffect(() => {
    const id = invalidField.current;
    invalidField.current = null;
    if (id) document.getElementById(id)?.focus();
  }, [focusRequest]);

  // ── 구글에서 실패하고 돌아온 경우 안내 ──
  useOAuthReturnError(() => setAuthError({ message: GOOGLE_FAILED_MESSAGE, kind: 'other' }));

  // ── 이메일 제출: 칸 검사 → 로그인/가입 요청 → 결과 안내 ──
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (requestPending.current) return;
    setAuthError(null);
    setInfoMessage(null);

    // 제출을 시도하면 아직 blur하지 않은 필드의 인라인 에러도 바로 보이게 한다.
    emailFeedback.validate();
    passwordFeedback.validate();
    if (isSignUp) {
      confirmationFeedback.validate();
      setTermsTouched(true);
    }

    if (emailError || passwordError || (isSignUp && (confirmPasswordError || !agreedToTerms))) {
      const invalidId = emailError ? 'email' : passwordError ? 'password' : confirmPasswordError ? 'confirmPassword' : 'terms';
      invalidField.current = invalidId;
      setFocusRequest((value) => value + 1);
      return;
    }

    requestPending.current = true;
    setIsSubmitting(true);
    try {
      const result = isSignUp ? await signUp(email, password) : await signIn(email, password);

      if (result.error) {
        console.error(`[${mode}] 실패:`, result.error);
        setAuthError(getFriendlyErrorMessage(result.error.message));
        return;
      }

      // Confirm email이 켜져 있으면 회원가입은 성공해도 세션이 아직 없다 (메일 인증 대기).
      // 이 경우 홈으로 보내지 않고 메일 확인 안내만 표시한다.
      if (isSignUp && !result.session) {
        console.log(`[${mode}] 성공 (이메일 확인 대기)`);
        setInfoMessage('확인 메일을 보냈어요. 메일함에서 인증한 뒤 로그인해 주세요.');
        return;
      }

      // 리다이렉트는 여기서 하지 않는다 — authStore가 onAuthStateChange로 곧 authenticated가 되면
      // LoginForm의 이동 effect가 옮긴다. 리다이렉트 주체를 한 곳으로 유지해 중복 이동을 막는다.
      console.log(`[${mode}] 성공`);
    } catch (error) {
      // signIn/signUp이 예외를 던지는 경우(네트워크 오류 등)도 놓치지 않고 같은 매핑으로 안내한다.
      console.error(`[${mode}] 실패(예외):`, error);
      setAuthError(getFriendlyErrorMessage(error instanceof Error ? error.message : ''));
    } finally {
      requestPending.current = false;
      setIsSubmitting(false);
    }
  };

  // ── 구글 로그인: 시작 전 이메일 요청과 겹치지 않는지 보고, 이메일 칸 안내는 지운다 ──
  const startGoogle = () => {
    if (requestPending.current) return false;
    requestPending.current = true;
    setAuthError(null);
    setInfoMessage(null);
    emailFeedback.reset();
    passwordFeedback.reset();
    confirmationFeedback.reset();
    // Google은 인증 후 ConsentGate에서 현재 계정의 동의 여부를 확인한다.
    return true;
  };
  const handleOAuthPendingChange = useCallback((pending: boolean) => {
    setIsOAuthPending(pending);
    if (!pending) requestPending.current = false;
  }, []);
  const handleGoogleError = (message: string) => setAuthError({ message, kind: 'other' });

  return {
    isSignUp,
    fields: {
      isSignUp,
      email,
      onEmailChange: setEmail,
      emailFeedback,
      password,
      onPasswordChange: setPassword,
      passwordFeedback,
      confirmPassword,
      onConfirmPasswordChange: setConfirmPassword,
      confirmationFeedback,
      agreedToTerms,
      onAgreedToTermsChange: (checked: boolean) => {
        setAgreedToTerms(checked);
        setTermsTouched(true);
      },
      termsError,
    },
    isSubmitting,
    isOAuthPending,
    isBusy: isSubmitting || isOAuthPending,
    authError,
    infoMessage,
    handleSubmit,
    startGoogle,
    handleOAuthPendingChange,
    handleGoogleError,
  };
}

export type EmailAuthFieldValues = ReturnType<typeof useEmailAuthForm>['fields'];
