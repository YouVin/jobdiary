'use client';

import { useState } from 'react';
import { resendSignUpEmail } from '@/lib/auth';

interface ResendConfirmationButtonProps {
  email: string;
}

// 이메일 미인증으로 로그인이 막혔을 때 확인 메일을 다시 보내는 버튼 (docs/AUTH.md §6.3.3)
export function ResendConfirmationButton({ email }: ResendConfirmationButtonProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleResend = async () => {
    setIsResending(true);
    setResendMessage(null);
    try {
      const { error } = await resendSignUpEmail(email);

      if (error) {
        console.error('[resend] 실패:', error);
        setResendMessage('재전송에 실패했습니다. 잠시 후 다시 시도해주세요.');
        return;
      }

      setResendMessage('확인 메일을 다시 보냈습니다. 메일함을 확인해주세요.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={handleResend}
        disabled={isResending}
        className="text-[12px] font-medium text-brand hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isResending ? '재전송 중...' : '확인 메일 재전송'}
      </button>
      {resendMessage && <p className="mt-1 text-[12px] text-status-offer">{resendMessage}</p>}
    </div>
  );
}
