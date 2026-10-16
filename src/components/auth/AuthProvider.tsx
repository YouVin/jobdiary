'use client';

import { useEffect } from 'react';
import { startAuthSync } from '@/lib/authSync';

interface AuthProviderProps {
  children: React.ReactNode;
}

// 앱 전역에 한 번만 마운트되어 세션 상태를 authStore에 반영한다 (루트 레이아웃에서 사용)
export function AuthProvider({ children }: AuthProviderProps) {
  useEffect(startAuthSync, []);

  return <>{children}</>;
}
