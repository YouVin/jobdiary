'use client';

import { useEffect } from 'react';

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={handleRequestClose}
    >
      <div
        className="w-full max-w-105 rounded-[14px] bg-card p-5 shadow-lg"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[18px] font-medium text-text-primary">{title}</h2>
          <button
            type="button"
            onClick={handleRequestClose}
            disabled={closeDisabled}
            aria-label="닫기"
            className="flex h-6 w-6 items-center justify-center rounded text-text-secondary transition-colors hover:bg-column disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
