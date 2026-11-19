'use client';

import { useId, useRef } from 'react';
import { Icon } from '@/components/common/Icon';
import { useDialogFocus } from '@/hooks/useDialogFocus';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  closeDisabled?: boolean; // true면 X/ESC/오버레이 클릭 모두 무시 (제출 중 등 닫으면 안 되는 상태)
}

export function Modal({ isOpen, onClose, title, children, closeDisabled = false }: ModalProps) {
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  useDialogFocus(panelRef, { isOpen, onClose, closeDisabled });

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
