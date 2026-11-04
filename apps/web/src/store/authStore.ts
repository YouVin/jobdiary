import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { useApplicationStore } from '@/store/applicationStore';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'recovering';

interface AuthState {
  status: AuthStatus;
  session: Session | null;
  setSession: (session: Session | null) => void;
  setRecovering: (session: Session) => void;
  completeRecovery: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  status: 'loading',
  session: null,

  // getSession/onAuthStateChange 결과를 반영. session 유무로 status도 함께 확정한다.
  // 단, 같은 사용자의 복구 세션이면 일반 인증으로 되돌리지 않는다 — getSession() 부트스트랩이
  // 이미 저장된 복구 세션을 "평범한 세션"으로 돌려주면서 recovering을 authenticated로 덮어쓰는
  // 경쟁 상태를 store 차원에서 막기 위함이다 (docs/AUTH.md §6.3.2). AuthProvider의 호출 순서에
  // 의존하지 않도록 여기(store)에서도 방어한다. 로그아웃과 다른 사용자 로그인은 정상 반영한다.
  setSession: (session) => {
    set((state) => {
      const status = session
        ? (state.status === 'recovering' && state.session?.user.id === session.user.id ? 'recovering' : 'authenticated')
        : 'unauthenticated';
      useApplicationStore.getState().setUser(status === 'authenticated' ? session!.user.id : null);
      return { session, status };
    });
  },

  // PASSWORD_RECOVERY 이벤트 전용 — 복구 세션을 일반 인증과 구분해 표시한다.
  setRecovering: (session) => {
    useApplicationStore.getState().setUser(null);
    set({ session, status: 'recovering' });
  },

  // updateUser로 새 비밀번호 설정을 마친 뒤 복구 세션을 명시적으로 종료한다.
  completeRecovery: () => {
    useApplicationStore.getState().setUser(null);
    set({ status: 'unauthenticated', session: null });
  },
}));
