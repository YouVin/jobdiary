'use client';

import { type RefObject, useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

interface DialogFocusOptions {
  isOpen: boolean;
  onClose: () => void;
  closeDisabled?: boolean; // true면 ESC를 무시한다 (제출 중 등)
  // 열릴 때 포커스: 'field'는 첫 입력(없으면 첫 버튼), 'container'는 대화상자 자체(읽기 위주 패널)
  initialFocus?: 'field' | 'container';
}

// 공통 모달·상세 패널의 키보드 기준 (#156)
// - 열릴 때 연 요소를 기억하고 대화상자 안으로 포커스를 옮긴다.
// - ESC로 닫고, Tab/Shift+Tab은 대화상자 안에서 순환한다.
// - 닫힐 때 연 요소가 아직 화면에 있으면 포커스를 돌려준다.
export function useDialogFocus(containerRef: RefObject<HTMLElement | null>, { isOpen, onClose, closeDisabled = false, initialFocus = 'field' }: DialogFocusOptions) {
  // ESC·Tab 처리 effect가 제출 상태 변화마다 다시 실행되지 않도록 최신 값을 ref로 읽는다.
  const latest = useRef({ onClose, closeDisabled });
  useEffect(() => {
    latest.current = { onClose, closeDisabled };
  }, [onClose, closeDisabled]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const container = containerRef.current;
    if (container) {
      if (initialFocus === 'container') {
        container.focus();
      } else {
        const focusable = getFocusable(container);
        const firstField = focusable.find((element) => element.matches('input, select, textarea'));
        (firstField ?? focusable[0] ?? container).focus();
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // 창 안의 달력(DateField) 등이 먼저 처리한 Esc는 창을 닫지 않는다(#293)
      if (event.key === 'Escape' && !event.defaultPrevented && !latest.current.closeDisabled) {
        latest.current.onClose();
        return;
      }
      const current = containerRef.current;
      if (event.key !== 'Tab' || !current) {
        return;
      }
      const focusable = getFocusable(current);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === current || !current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (opener?.isConnected) opener.focus();
    };
  }, [isOpen, containerRef, initialFocus]);
}
