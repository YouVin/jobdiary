'use client';

import { useEffect } from 'react';

// 처음 화면에 필요 없는 조각(상세 패널·칸반 등)을 첫 화면이 그려진 뒤 한가할 때 미리 받아 둔다 (#265).
// 첫 로드 크기에서는 빠지고, 실제로 누를 때는 이미 받아 둔 상태라 기다림이 없다.
export function usePreloadOnIdle(...loaders: Array<() => Promise<unknown>>) {
  useEffect(() => {
    const preload = () => {
      for (const load of loaders) void load().catch(() => {});
    };
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(preload, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = window.setTimeout(preload, 1500);
    return () => window.clearTimeout(timer);
    // 불러오기 함수는 모듈에서 한 번 만든 값이라 처음 한 번만 실행한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
