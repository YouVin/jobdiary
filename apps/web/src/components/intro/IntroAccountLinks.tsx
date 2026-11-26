'use client';

import Link from 'next/link';
import { buttonClassName } from '@/components/ui/Button';
import { textLinkClassName } from '@/components/ui/TextLink';
import { useAuthStore } from '@/store/authStore';

// 소개 페이지 머리 오른쪽 (#286). 페이지는 정적으로 그리고, 로그인 상태는 브라우저에서만 알 수 있어 이 부분만 클라이언트다.
// 확인 전(loading)과 로그아웃 상태는 같은 모양(로그인·시작하기)이라 처음 그린 HTML과 어긋나지 않는다.
export function IntroAccountLinks() {
  const isSignedIn = useAuthStore((state) => state.status === 'authenticated');

  if (isSignedIn) {
    return (
      <Link href="/" className={buttonClassName({ size: 'sm' })}>
        내 홈으로
      </Link>
    );
  }

  return (
    <span className="flex items-center gap-4">
      <Link href="/login" className={textLinkClassName('quiet', 'text-label')}>
        로그인
      </Link>
      <Link href="/signup" className={buttonClassName({ size: 'sm' })}>
        시작하기
      </Link>
    </span>
  );
}
