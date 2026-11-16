'use client';

import { useEffect, useSyncExternalStore } from 'react';
import { useApplicationStore } from '@/store/applicationStore';
import { getTodayInKorea } from '@/utils/applicationDeadline';

const noopSubscribe = () => () => {};

// 홈과 지원 보드가 함께 쓰는 지원 내역 조회.
// - 페이지에 들어올 때마다 최신 내역을 다시 조회한다.
// - 이미 한 번 불러온 세션이면 이전 내역을 바로 보여주고 뒤에서 갱신한다(탭 이동 시 스켈레톤 깜빡임 방지).
// - 한국 날짜가 바뀐 뒤 화면으로 돌아오면 마감일 자동 탈락을 반영하도록 다시 조회한다.
// 반환값: 화면을 그려도 되는지 여부.
export function useApplicationsLoader(): boolean {
  // 서버에서는 항상 false, 하이드레이션 후 클라이언트에서만 true (hydration mismatch 방지)
  const mounted = useSyncExternalStore(noopSubscribe, () => true, () => false);
  const isLoading = useApplicationStore((state) => state.isLoading);
  const historyReady = useApplicationStore((state) => state.historyReady);
  const loadApplications = useApplicationStore((state) => state.loadApplications);

  // AuthGuard가 로그인 상태에서만 페이지를 마운트시키므로, 마운트 시 바로 조회한다.
  useEffect(() => {
    void loadApplications();
  }, [loadApplications]);

  useEffect(() => {
    let loadedDay = getTodayInKorea();
    const refreshOnNewDay = () => {
      if (document.visibilityState !== 'visible') return;
      const today = getTodayInKorea();
      if (today === loadedDay) return;
      loadedDay = today;
      void loadApplications();
    };
    document.addEventListener('visibilitychange', refreshOnNewDay);
    const timer = window.setInterval(refreshOnNewDay, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', refreshOnNewDay);
      window.clearInterval(timer);
    };
  }, [loadApplications]);

  return mounted && (historyReady || !isLoading);
}
