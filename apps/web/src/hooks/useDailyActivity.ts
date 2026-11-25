'use client';

import { useEffect } from 'react';
import { recordDailyActivity } from '@/lib/activityApi';

// 로그인·동의를 마친 화면에서 방문 날짜를 기록한다(#256).
// 탭을 며칠 열어 두는 사용자도 있으므로 화면이 다시 보일 때도 확인한다(오늘 기록했으면 요청 없음).
export function useDailyActivity(userId: string | undefined, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }

    const record = () => {
      if (document.visibilityState === 'visible') {
        void recordDailyActivity(userId);
      }
    };

    record();
    document.addEventListener('visibilitychange', record);
    return () => document.removeEventListener('visibilitychange', record);
  }, [userId, enabled]);
}
