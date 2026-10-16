'use client';

import { useRouter } from 'next/navigation';
import { Fragment, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useApplicationStore } from '@/store/applicationStore';

interface AuthGuardProps {
  children: React.ReactNode;
}

// 로그인한 사용자에게만 children을 보여준다.
// - loading: 세션 확인 중 — 깜빡임 방지를 위해 로딩만 표시하고 아무 곳으로도 보내지 않는다.
// - unauthenticated: /login으로 이동.
// - recovering: 비밀번호 재설정 진행 중인 임시 세션 — 보드 진입을 막고 /update-password로 보낸다.
// - authenticated: children(보드) 렌더링.
export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const userId = useAuthStore((state) => state.session?.user.id);
  const applicationUserId = useApplicationStore((state) => state.userId);
  const sessionVersion = useApplicationStore((state) => state.sessionVersion);

  useEffect(() => {
    if (status === 'unauthenticated') {
      // 쿼리(예: 익스텐션이 붙이는 ?import=1)를 보존해, 로그인 후 되돌아왔을 때도 신호가 살아있게 한다.
      const search = typeof window !== 'undefined' ? window.location.search : '';
      router.replace(`/login${search}`);
    } else if (status === 'recovering') {
      router.replace('/update-password');
    }
  }, [status, router]);

  if (status === 'authenticated' && userId === applicationUserId) {
    // 계정 변경 때 헤더 모달·필터·익스텐션 알림 등 내부 화면 상태도 새로 만든다.
    return <Fragment key={sessionVersion}>{children}</Fragment>;
  }

  // loading / unauthenticated(리다이렉트 중) / recovering(리다이렉트 중) — 보드 내용이 잠깐이라도 보이지 않게
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-page">
      <p className="text-body text-text-muted">로딩 중...</p>
    </div>
  );
}
