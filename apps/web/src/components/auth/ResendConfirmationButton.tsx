'use client';

import { clsx } from 'clsx';
import { useId, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { resendSignUpEmail } from '@/lib/auth';

interface ResendConfirmationButtonProps {
  email: string;
}

const RESEND_FAILED_MESSAGE = '확인 메일을 다시 보내지 못했어요. 잠시 뒤 다시 시도해 주세요.';

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
        setResendMessage(RESEND_FAILED_MESSAGE);
        return;
      }

      setResendMessage('확인 메일을 다시 보냈어요. 메일함을 확인해 주세요.');
    } catch {
      setResendFailed(true);
      setResendMessage(RESEND_FAILED_MESSAGE);
    } finally {
      pending.current = false;
      setIsResending(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="text"
        size="sm"
        onClick={handleResend}
        isLoading={isResending}
        loadingLabel="확인 메일을 다시 보내는 중"
        aria-describedby={resendMessage ? messageId : undefined}
        className="-ml-2"
      >
        확인 메일 다시 보내기
      </Button>
      <p id={messageId} role="status" aria-atomic="true" className={clsx('text-label', resendFailed ? 'text-danger-text' : 'text-success-text')}>
        {isResending ? '확인 메일을 다시 보내고 있어요.' : resendMessage}
      </p>
    </div>
  );
}
