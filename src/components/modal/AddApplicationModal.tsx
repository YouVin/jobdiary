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

  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [platform, setPlatform] = useState<Platform>('saramin');
  const [status, setStatus] = useState<Status>('applied');
  const [appliedAt, setAppliedAt] = useState(getTodayDateString);

  // 저장 후 다음 입력을 위해 폼 초기화
  const resetForm = () => {
    setCompany('');
    setPosition('');
    setPlatform('saramin');
    setStatus('applied');
    setAppliedAt(getTodayDateString());
  };

  const handleSave = () => {
    if (!company.trim()) {
      return;
    }

    addApplication({
      company: company.trim(),
      position: position.trim(),
      platform,
      status,
      appliedAt: new Date(appliedAt).toISOString(),
    });

    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="지원 추가">
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

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-border-strong px-4 py-2 text-[14px] font-medium text-text-secondary transition-colors hover:bg-column"
        >
          취소
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!company.trim()}
          className="rounded-lg bg-brand px-4 py-2 text-[14px] font-medium text-white transition-colors hover:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          저장
        </button>
      </div>
    </Modal>
  );
}
