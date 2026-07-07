'use client';

import { useState } from 'react';
import { ApplicationFormFields } from '@/components/modal/ApplicationFormFields';
import { useApplicationStore } from '@/store/applicationStore';
import { Application, Platform, Status } from '@/types/application';
import { toDateInputValue } from '@/utils/format';

interface EditApplicationFormProps {
  application: Application;
  onClose: () => void;
}

export function EditApplicationForm({ application, onClose }: EditApplicationFormProps) {
  const updateApplication = useApplicationStore((state) => state.updateApplication);
  const removeApplication = useApplicationStore((state) => state.removeApplication);

  const [company, setCompany] = useState(application.company);
  const [position, setPosition] = useState(application.position);
  const [platform, setPlatform] = useState<Platform>(application.platform);
  const [status, setStatus] = useState<Status>(application.status);
  const [appliedAt, setAppliedAt] = useState(() => toDateInputValue(application.appliedAt));
  const [interviewDate, setInterviewDate] = useState(() =>
    application.interviewDate ? toDateInputValue(application.interviewDate) : '',
  );
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleSave = () => {
    if (!company.trim()) {
      return;
    }

    updateApplication(application.id, {
      company: company.trim(),
      position: position.trim(),
      platform,
      status,
      appliedAt: new Date(appliedAt).toISOString(),
      interviewDate: interviewDate ? new Date(interviewDate).toISOString() : undefined,
    });

    onClose();
  };

  // 삭제 버튼은 한 번 더 클릭해야 실제 삭제되는 2단계 확인 방식
  const handleDelete = () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }

    removeApplication(application.id);
    onClose();
  };

  return (
    <>
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
        interviewDate={interviewDate}
        onInterviewDateChange={setInterviewDate}
      />

      <div className="mt-5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleDelete}
          className={
            isConfirmingDelete
              ? 'rounded-lg bg-status-rejected px-4 py-2 text-[14px] font-medium text-white transition-colors hover:opacity-90'
              : 'rounded-lg border border-status-rejected px-4 py-2 text-[14px] font-medium text-status-rejected transition-colors hover:bg-status-rejected/10'
          }
        >
          {isConfirmingDelete ? '정말 삭제할까요?' : '삭제'}
        </button>

        <div className="flex gap-2">
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
      </div>
    </>
  );
}
