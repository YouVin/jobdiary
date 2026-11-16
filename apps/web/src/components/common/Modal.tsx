'use client';

import { useEffect, useId, useRef } from 'react';
import { Icon } from '@/components/common/Icon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  closeDisabled?: boolean; // true면 X/ESC/오버레이 클릭 모두 무시 (제출 중 등 닫으면 안 되는 상태)
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
}

export function Modal({ isOpen, onClose, title, children, closeDisabled = false }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  // ESC·Tab 처리 effect가 제출 상태 변화마다 다시 실행되지 않도록 최신 값을 ref로 읽는다.
  const latest = useRef({ onClose, closeDisabled });
  useEffect(() => {
    latest.current = { onClose, closeDisabled };
  }, [onClose, closeDisabled]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    // 열릴 때: 모달을 연 요소를 기억하고, 첫 입력(없으면 첫 버튼)으로 포커스를 옮긴다.
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    if (panel) {
      const focusable = getFocusable(panel);
      const firstField = focusable.find((element) => element.matches('input, select, textarea'));
      (firstField ?? focusable[0] ?? panel).focus();
    }

    // ESC로 닫기, Tab/Shift+Tab은 모달 안에서 순환한다.
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !latest.current.closeDisabled) {
        latest.current.onClose();
        return;
      }
      if (event.key !== 'Tab' || !panelRef.current) {
        return;
      }
      const focusable = getFocusable(panelRef.current);
      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !panelRef.current.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !panelRef.current.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // 닫힐 때: 연 요소가 아직 화면에 있으면 포커스를 돌려준다.
      if (opener?.isConnected) opener.focus();
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleRequestClose = () => {
    if (!closeDisabled) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-overlay/50 px-4"
      onClick={handleRequestClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="w-full max-w-105 rounded-card bg-card p-5 shadow-float focus:outline-none"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 id={titleId} className="text-heading-md font-medium text-text-primary">{title}</h2>
          <button
            type="button"
            onClick={handleRequestClose}
            disabled={closeDisabled}
            aria-label="닫기"
            className="flex h-6 w-6 items-center justify-center rounded text-text-secondary transition-colors hover:bg-column disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
