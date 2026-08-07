'use client';

import { useState } from 'react';
import { signInWithGoogle } from '@/lib/auth';

interface GoogleSignInButtonProps {
  onStart: () => void;
  onError: (message: string) => void;
}

// 구글로 로그인/회원가입 — 로그인·회원가입 모드 공통으로 노출한다(구글은 가입/로그인 구분이 없다).
// 성공 흐름은 이 컴포넌트가 관여하지 않는다: 브라우저가 구글로 이동했다가 현재 URL(쿼리 포함) 그대로
// 되돌아오면, 그 시점의 세션 감지는 AuthProvider가, 보드로의 리다이렉트는 LoginForm의 기존
// useEffect가 그대로 처리한다 — 별도 콜백 페이지가 필요 없다.
export function GoogleSignInButton({ onStart, onError }: GoogleSignInButtonProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleClick = async () => {
    onStart();
    setIsRedirecting(true);

    // 현재 URL(쿼리 포함) 그대로 돌아오게 해, 익스텐션이 붙인 ?import=1 같은 신호를 보존한다.
    const { error } = await signInWithGoogle(window.location.href);

    if (error) {
      console.error('[google] 리다이렉트 실패:', error);
      onError('구글 로그인에 실패했습니다. 다시 시도해주세요.');
      setIsRedirecting(false);
    }
    // 성공 시엔 이미 브라우저가 구글로 이동한 뒤라 이후 코드는 실행되지 않는다.
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isRedirecting}
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-card-border bg-card px-4 py-2 text-[14px] font-medium text-text-primary transition-colors hover:bg-column disabled:cursor-not-allowed disabled:opacity-50"
    >
      <GoogleIcon />
      {isRedirecting ? '이동 중...' : 'Google로 계속하기'}
    </button>
  );
}

// 구글 공식 4색 "G" 로고 — 브랜드 마크라 프로젝트 디자인 토큰 대신 구글 고유 색상을 그대로 사용한다.
function GoogleIcon() {
  return (
    <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.48a5.54 5.54 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.56-5.17 3.56-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.07 7.93-2.91l-3.88-3a7.4 7.4 0 0 1-10.98-3.89H1.06v3.09A12 12 0 0 0 12 24Z"
      />
      <path fill="#FBBC05" d="M5.07 14.2a7.2 7.2 0 0 1 0-4.4V6.72H1.06a12 12 0 0 0 0 10.57L5.07 14.2Z" />
      <path
        fill="#EA4335"
        d="M12 4.77c1.76 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.06 6.72L5.07 9.8A7.16 7.16 0 0 1 12 4.77Z"
      />
    </svg>
  );
}
