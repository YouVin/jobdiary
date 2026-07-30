'use client';

import { useState } from 'react';
import { ApplicationFormFields } from '@/components/modal/ApplicationFormFields';
import { useApplicationStore } from '@/store/applicationStore';
import { Application, Platform, Status } from '@/types/application';
import { toDateInputValue } from '@/utils/format';

interface EditApplicationFormProps {
  application: Application;
  onClose: () => void;
  isSubmitting: boolean;
  onSubmittingChange: (isSubmitting: boolean) => void;
}

export function EditApplicationForm({
  application,
  onClose,
  isSubmitting,
  onSubmittingChange,
}: EditApplicationFormProps) {
  const updateApplication = useApplicationStore((state) => state.updateApplication);
  const removeApplication = useApplicationStore((state) => state.removeApplication);
  const error = useApplicationStore((state) => state.error);

  const [company, setCompany] = useState(application.company);
  const [position, setPosition] = useState(application.position);
  const [platform, setPlatform] = useState<Platform>(application.platform);
  const [status, setStatus] = useState<Status>(application.status);
  const [appliedAt, setAppliedAt] = useState(() => toDateInputValue(application.appliedAt));
  const [interviewDate, setInterviewDate] = useState(() =>
    application.interviewDate ? toDateInputValue(application.interviewDate) : '',
  );
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  const handleSave = async () => {
    if (!company.trim()) {
      return;
    }

    onSubmittingChange(true);
    try {
      const succeeded = await updateApplication(application.id, {
        company: company.trim(),
        position: position.trim(),
        platform,
        status,
        appliedAt: new Date(appliedAt).toISOString(),
        // 비운 경우 undefined(변경 안 함)가 아니라 null(명시적으로 비움)을 보내야 DB에도 반영된다.
        interviewDate: interviewDate ? new Date(interviewDate).toISOString() : null,
      });

      // 실패 시 에러는 store.error에 남아 아래에 표시되고, 모달은 닫지 않는다.
      if (!succeeded) {
        return;
      }

      onClose();
    } finally {
      onSubmittingChange(false);
    }
  };

  // 삭제 버튼은 한 번 더 클릭해야 실제 삭제되는 2단계 확인 방식
  const handleDelete = async () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }

    onSubmittingChange(true);
    try {
      const succeeded = await removeApplication(application.id);

      if (!succeeded) {
        return;
      }

      onClose();
    } finally {
      onSubmittingChange(false);
    }
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

      {error && <p className="mt-3 text-[12px] text-status-rejected">{error}</p>}

      <div className="mt-5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleDelete}
          disabled={isSubmitting}
          className={
            isConfirmingDelete
              ? 'rounded-lg bg-status-rejected px-4 py-2 text-[14px] font-medium text-white transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50'
              : 'rounded-lg border border-status-rejected px-4 py-2 text-[14px] font-medium text-status-rejected transition-colors hover:bg-status-rejected/10 disabled:cursor-not-allowed disabled:opacity-50'
          }
        >
          {isConfirmingDelete ? '정말 삭제할까요?' : '삭제'}
        </button>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
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
      </div>
    </>
  );
}
