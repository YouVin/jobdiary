import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  setSession: (session: Session | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  session: null,

  // getSession/onAuthStateChange 결과를 반영. session 유무로 status도 함께 확정한다
  setSession: (session) => {
    set({
      session,
      status: session ? 'authenticated' : 'unauthenticated',
    });
  },
}));
