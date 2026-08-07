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
  const setRecovering = useAuthStore((state) => state.setRecovering);

  useEffect(() => {
    // 이후 로그인/로그아웃 등 상태 변화를 실시간 구독
    const unsubscribe = onAuthStateChange((event, session) => {
      // 비밀번호 재설정 링크로 발급된 임시 세션은 일반 로그인과 구분해야 한다 — 여기서 잡아두지
      // 않으면 이후엔 session 값만으로 "복구용이었는지"를 재구성할 방법이 없다 (docs/AUTH.md §6.3.2).
      if (event === 'PASSWORD_RECOVERY' && session) {
        setRecovering(session);
        return;
      }
      setSession(session);
    });

    // 새로고침 시 기존 세션 복원 (로그인 유지의 핵심)
    getSession().then(({ session }) => {
      setSession(session);
    });

    return unsubscribe;
  }, [setSession, setRecovering]);

  return <>{children}</>;
}
