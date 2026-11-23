'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useState } from 'react';
import { Icon } from '@/components/common/Icon';

// 디자인 시스템 알림(토스트) (#201). 방금 한 일이 끝났다고 짧게 알려준다.
// - 화면 아래 가운데, 검정 바탕. 3초 뒤 사라지고, 되돌릴 수 있는 일은 "되돌리기"와 함께 5초 보여준다.
// - 알림 영역(role=status, aria-live=polite)은 항상 그려 두어 스크린리더가 새 문구를 읽게 한다.
// - 오류는 토스트가 아니라 그 자리(입력칸 아래, 카드 안)에 보여준다.
// - 문구는 해요체 과거형 한 줄 ("지원 3건을 가져왔어요").
interface ToastOptions {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

interface ToastState extends ToastOptions {
  id: number;
}

const ToastContext = createContext<(options: ToastOptions) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);

  const show = useCallback((options: ToastOptions) => {
    setToast({ ...options, id: Date.now() });
  }, []);

  // 새 알림이 오면 타이머를 다시 시작한다. 되돌리기가 있으면 5초, 없으면 3초.
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), toast.actionLabel ? 5000 : 3000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-toast flex justify-center px-4">
        {toast && (
          <div
            key={toast.id}
            className="pointer-events-auto inline-flex h-12 items-center gap-3 rounded-md bg-inverse pr-2 pl-5 text-body text-text-on-color shadow-md motion-safe:animate-rise"
          >
            <Icon name="check" className="h-5 w-5 text-chart-2" />
            <span>{toast.message}</span>
            {toast.actionLabel && (
              <button
                type="button"
                onClick={() => {
                  toast.onAction?.();
                  setToast(null);
                }}
                className="h-9 cursor-pointer rounded-sm px-3 font-semibold text-chart-2 hover:bg-white/10 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-chart-2"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}

// 사용: const showToast = useToast(); showToast({ message: '지원 3건을 가져왔어요' });
export function useToast() {
  return useContext(ToastContext);
}
