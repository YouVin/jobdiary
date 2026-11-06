'use client';

import { useEffect } from 'react';
import { Icon } from '@/components/common/Icon';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  closeDisabled?: boolean; // true면 X/ESC/오버레이 클릭 모두 무시 (제출 중 등 닫으면 안 되는 상태)
}

export function Modal({ isOpen, onClose, title, children, closeDisabled = false }: ModalProps) {
  // ESC 키로 닫기
  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !closeDisabled) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose, closeDisabled]);

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
        className="w-full max-w-105 rounded-card bg-card p-5 shadow-float"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-heading-md font-medium text-text-primary">{title}</h2>
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
