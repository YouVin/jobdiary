'use client';

import { useEffect } from 'react';
import { startAuthSync } from '@/lib/authSync';
import { startApplicationHistorySync } from '@/lib/applicationHistorySync';

interface AuthProviderProps {
  children: React.ReactNode;
}

// 앱 전역에 한 번만 마운트되어 세션 상태를 authStore에 반영한다 (루트 레이아웃에서 사용)
export function AuthProvider({ children }: AuthProviderProps) {
  useEffect(() => {
    const stopHistory = startApplicationHistorySync();
    const stopAuth = startAuthSync();
    return () => { stopAuth(); stopHistory(); };
  }, []);

  return <>{children}</>;
}
