'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { signInWithGoogle } from '@/lib/auth';
import { getGoogleRedirectUrl } from '@/utils/authRedirect';

export const GOOGLE_FAILED_MESSAGE = '구글 로그인에 실패했어요. 다시 시도해 주세요.';

interface GoogleSignInButtonProps {
  onStart: () => boolean;
  onError: (message: string) => void;
  disabled?: boolean;
  onPendingChange: (pending: boolean) => void;
  describedBy?: string;
}

// 구글로 로그인/회원가입 — 로그인·회원가입 화면 공통으로 노출한다(구글은 가입/로그인 구분이 없다).
// 구글에서 /login으로 복귀하면 세션 감지는 AuthProvider가, 보드로의 리다이렉트는 LoginForm의 기존
// useEffect가 그대로 처리한다 — 별도 콜백 페이지가 필요 없다.
// 공통 Button(테두리형, 큰 크기)을 써서 이동 중에도 포커스가 버튼에 남는다(aria-disabled).
export function GoogleSignInButton({ onStart, onError, disabled = false, onPendingChange, describedBy }: GoogleSignInButtonProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);
  const pending = useRef(false);
  const attempt = useRef(0);

  useEffect(() => {
    const restore = (event: PageTransitionEvent) => {
      if (!event.persisted || !pending.current) return;
      // BFCache는 React 상태도 복원하므로 돌아오면 다음 인증을 허용한다.
      attempt.current++;
      pending.current = false;
      setIsRedirecting(false);
      onPendingChange(false);
    };
    window.addEventListener('pageshow', restore);
    return () => window.removeEventListener('pageshow', restore);
  }, [onPendingChange]);

  const handleClick = async () => {
    // 진행 허용 여부는 상위가 판단하며 ref로 렌더 전 연타도 차단한다.
    if (disabled || pending.current || !onStart()) {
      return;
    }

    const currentAttempt = ++attempt.current;
    pending.current = true;
    setIsRedirecting(true);
    onPendingChange(true);
    try {
      const { error } = await signInWithGoogle(getGoogleRedirectUrl(window.location.href));
      if (error) throw error;
      // SDK는 location.assign 후 resolve한다. 이동 직전까지 잠금 상태를 유지한다.
    } catch {
      if (currentAttempt !== attempt.current) return;
      pending.current = false;
      setIsRedirecting(false);
      onPendingChange(false);
      onError(GOOGLE_FAILED_MESSAGE);
    }
  };

  return (
    <Button
      variant="outline"
      size="lg"
      block
      onClick={handleClick}
      disabled={disabled}
      isLoading={isRedirecting}
      loadingLabel="Google로 이동하는 중"
      aria-describedby={describedBy}
    >
      {/* 브랜드 고유색을 보존한 SVG 자산. 단색 아이콘(Icon)과 달리 마스크를 쓰지 않는다. */}
      <Image src="/icons/google.svg" width={20} height={20} alt="" className="h-5 w-5 shrink-0" />
      Google로 계속하기
    </Button>
  );
}
