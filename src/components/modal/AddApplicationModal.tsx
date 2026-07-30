'use client';

import { useState } from 'react';
import { Modal } from '@/components/common/Modal';
import { ApplicationFormFields } from '@/components/modal/ApplicationFormFields';
import { useApplicationStore } from '@/store/applicationStore';
import { Platform, Status } from '@/types/application';

interface AddApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 오늘 날짜를 date input 값 형식('YYYY-MM-DD')으로 변환
function getTodayDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function AddApplicationModal({ isOpen, onClose }: AddApplicationModalProps) {
  const addApplication = useApplicationStore((state) => state.addApplication);
  const clearError = useApplicationStore((state) => state.clearError);
  const error = useApplicationStore((state) => state.error);

  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [platform, setPlatform] = useState<Platform>('saramin');
  const [status, setStatus] = useState<Status>('applied');
  const [appliedAt, setAppliedAt] = useState(getTodayDateString);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 저장 후 다음 입력을 위해 폼 초기화
  const resetForm = () => {
    setCompany('');
    setPosition('');
    setPlatform('saramin');
    setStatus('applied');
    setAppliedAt(getTodayDateString());
  };

  const handleSave = async () => {
    if (!company.trim()) {
      return;
    }

    setIsSubmitting(true);
    try {
      const succeeded = await addApplication({
        company: company.trim(),
        position: position.trim(),
        platform,
        status,
        appliedAt: new Date(appliedAt).toISOString(),
      });

      // 실패 시 에러는 store.error에 남아 아래에 표시되고, 모달은 닫지 않는다.
      if (!succeeded) {
        return;
      }

      resetForm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // 취소/ESC/오버레이 클릭 등 저장 없이 닫히는 모든 경로에서도 폼과 에러를 초기화.
  // 저장 요청이 진행 중일 때는 무시 (버튼은 disabled로 막히지만 ESC/오버레이/X는 별도 경로라 여기서도 막아야 함).
  const handleClose = () => {
    if (isSubmitting) {
      return;
    }
    clearError();
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="지원 추가" closeDisabled={isSubmitting}>
      <ApplicationFormFields
        company={company}
        onCompanyChange={setCompany}
        position={position}
        onPositionChange={setPosition}
        platform={platform}
        onPlatformChange={setPlatform}
        status={status}
        onStatusChange={setStatus}
        appliedAt={appliedAt}
        onAppliedAtChange={setAppliedAt}
      />

      {error && <p className="mt-3 text-[12px] text-status-rejected">{error}</p>}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={handleClose}
          disabled={isSubmitting}
          className="rounded-lg border border-border-strong px-4 py-2 text-[14px] font-medium text-text-secondary transition-colors hover:bg-column disabled:cursor-not-allowed disabled:opacity-50"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!company.trim() || isSubmitting}
          className="rounded-lg bg-brand px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? '저장 중...' : '저장'}
        </button>
      </div>
    </Modal>
  );
}
