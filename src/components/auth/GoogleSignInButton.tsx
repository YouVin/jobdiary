'use client';

import Image from 'next/image';
import { useState } from 'react';
import { buttonClassName } from '@/components/common/buttonStyles';
import { signInWithGoogle } from '@/lib/auth';

interface GoogleSignInButtonProps {
  onStart: () => boolean;
  onError: (message: string) => void;
}

// 구글로 로그인/회원가입 — 로그인·회원가입 모드 공통으로 노출한다(구글은 가입/로그인 구분이 없다).
// 성공 흐름은 이 컴포넌트가 관여하지 않는다: 브라우저가 구글로 이동했다가 현재 URL(쿼리 포함) 그대로
// 되돌아오면, 그 시점의 세션 감지는 AuthProvider가, 보드로의 리다이렉트는 LoginForm의 기존
// useEffect가 그대로 처리한다 — 별도 콜백 페이지가 필요 없다.
export function GoogleSignInButton({ onStart, onError }: GoogleSignInButtonProps) {
  const [isRedirecting, setIsRedirecting] = useState(false);

  const handleClick = async () => {
    // onStart가 false를 반환하면(예: 회원가입 모드에서 약관 미동의) OAuth를 아예 시작하지 않는다 —
    // 진행 허용 여부를 상위(LoginForm)가 판단하므로, 여기서는 isRedirecting 상태에도 들어가지 않는다.
    if (!onStart()) {
      return;
    }

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
      className={buttonClassName('secondary', 'w-full')}
    >
      <GoogleIcon />
      {isRedirecting ? '이동 중...' : 'Google로 계속하기'}
    </button>
  );
}

// 브랜드 고유색을 보존한 SVG 자산. 일반 단색 아이콘과 달리 마스크를 사용하지 않는다.
function GoogleIcon() {
  return (
    <Image src="/icons/google.svg" width={16} height={16} alt="" className="h-4 w-4 shrink-0" />
  );
}
