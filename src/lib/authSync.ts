import { getSession, onAuthStateChange } from '@/lib/auth';
import { useAuthStore } from '@/store/authStore';

// 초기 복원보다 최신 인증 이벤트를 우선하고 구독 해제 후의 응답은 반영하지 않는다.
export function startAuthSync(): () => void {
  let active = true;
  let eventReceived = false;
  const unsubscribe = onAuthStateChange((event, session) => {
    if (!active) return;
    eventReceived = true;
    const store = useAuthStore.getState();
    if (event === 'PASSWORD_RECOVERY' && session) {
      store.setRecovering(session);
    } else {
      store.setSession(session);
    }
  });

  void getSession().then(({ session, error }) => {
    if (active && !eventReceived) useAuthStore.getState().setSession(error ? null : session);
  }).catch(() => {
    if (active && !eventReceived) useAuthStore.getState().setSession(null);
  });

  return () => {
    active = false;
    unsubscribe();
  };
}
