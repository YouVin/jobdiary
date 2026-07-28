'use client';

import { useEffect } from 'react';
import { getSession, onAuthStateChange } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';

interface AuthProviderProps {
  children: React.ReactNode;
}

// 앱 전역에 한 번만 마운트되어 세션 상태를 authStore에 반영한다 (루트 레이아웃에서 사용)
export function AuthProvider({ children }: AuthProviderProps) {
  const setSession = useAuthStore((state) => state.setSession);

  useEffect(() => {
    // 이후 로그인/로그아웃 등 상태 변화를 실시간 구독
    const unsubscribe = onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // 새로고침 시 기존 세션 복원 (로그인 유지의 핵심)
    getSession().then(({ session }) => {
      setSession(session);
    });

    return unsubscribe;
  }, [setSession]);

  return <>{children}</>;
}
