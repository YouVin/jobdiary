'use client';

import { useEffect } from 'react';
import { recordAcquisition } from '@/lib/acquisitionApi';

// 가입·동의를 마친 화면에서 기억해 둔 가입 경로를 한 번 보낸다(#290). 기억한 게 없으면 요청하지 않는다.
export function useAcquisition(userId: string | undefined, enabled: boolean) {
  useEffect(() => {
    if (!enabled || !userId) {
      return;
    }
    void recordAcquisition();
  }, [userId, enabled]);
}
