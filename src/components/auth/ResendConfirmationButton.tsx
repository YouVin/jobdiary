'use client';

import { useId, useRef, useState } from 'react';
import { resendSignUpEmail } from '@/lib/auth';

interface ResendConfirmationButtonProps {
  email: string;
}

// 이메일 미인증으로 로그인이 막혔을 때 확인 메일을 다시 보내는 버튼 (docs/AUTH.md §6.3.3)
export function ResendConfirmationButton({ email }: ResendConfirmationButtonProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendFailed, setResendFailed] = useState(false);
  const pending = useRef(false);
  const messageId = useId();

  const handleResend = async () => {
    if (pending.current) return;
    pending.current = true;
    setIsResending(true);
    setResendMessage(null);
    setResendFailed(false);
    try {
      const { error } = await resendSignUpEmail(email);

      if (error) {
        setResendFailed(true);
        console.error('[resend] 실패:', error);
        setResendMessage('재전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      setResendMessage('확인 메일을 다시 보냈습니다. 메일함을 확인해주세요.');
    } catch {
      setResendFailed(true);
      setResendMessage('재전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      pending.current = false;
      setIsResending(false);
    }
  };

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={handleResend}
        disabled={isResending}
        aria-busy={isResending}
        aria-describedby={resendMessage ? messageId : undefined}
        className="cursor-pointer rounded-sm text-label font-medium text-brand transition-colors hover:text-brand-hover hover:underline active:opacity-80 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      >
        {isResending ? '재전송 중...' : '확인 메일 재전송'}
      </button>
      <p id={messageId} role="status" aria-atomic="true" className={`mt-1 text-label ${resendFailed ? 'text-status-rejected-text' : 'text-status-offer-text'}`}>{resendMessage}</p>
    </div>
  );
}
