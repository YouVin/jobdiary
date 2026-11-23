'use client';

import { useId, useState } from 'react';
import { ApplicationFormFields, fieldId } from '@/components/modal/ApplicationFormFields';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Overlay';
import { useToast } from '@/components/ui/Toast';
import { useApplicationStore } from '@/store/applicationStore';
import type { Platform, Status } from '@/types/application';
import { type ApplicationFormErrors, firstErrorField, getApplicationFormErrors } from '@/utils/applicationFormValidation';

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

// 지원 추가 (#205): 디자인 시스템 가운데 창(Dialog, 폭 520, 모바일 아래 시트).
// - 저장 버튼은 늘 누를 수 있고, 빈 칸·잘못된 날짜는 칸 아래 오류 + 첫 오류 칸으로 포커스로 알린다.
// - 저장하면 창을 닫고 토스트("지원을 추가했어요"), 서버 오류는 창 안 알림 영역에 남기고 창을 닫지 않는다.
export function AddApplicationModal({ isOpen, onClose }: AddApplicationModalProps) {
  const addApplication = useApplicationStore((state) => state.addApplication);
  const clearError = useApplicationStore((state) => state.clearError);
  const error = useApplicationStore((state) => state.error);
  const showToast = useToast();
  const idPrefix = useId();
  const formId = `${idPrefix}-form`;

  const [company, setCompany] = useState('');
  const [position, setPosition] = useState('');
  const [platform, setPlatform] = useState<Platform>('saramin');
  const [status, setStatus] = useState<Status>('applied');
  const [appliedAt, setAppliedAt] = useState(getTodayDateString);
  const [deadlineAt, setDeadlineAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<ApplicationFormErrors>({});

  // 저장 후 다음 입력을 위해 폼 초기화
  const resetForm = () => {
    setCompany('');
    setPosition('');
    setPlatform('saramin');
    setStatus('applied');
    setAppliedAt(getTodayDateString());
    setDeadlineAt('');
    setErrors({});
  };

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const nextErrors = getApplicationFormErrors({ company, appliedAt, deadlineAt });
    setErrors(nextErrors);
    const first = firstErrorField(nextErrors);
    if (first) {
      // 오류 문구가 칸에 연결된 뒤 포커스해 함께 읽히게 한다.
      requestAnimationFrame(() => document.getElementById(fieldId(idPrefix, first))?.focus());
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
        deadlineAt: deadlineAt || undefined,
      });
      // 실패 시 에러는 store.error에 남아 아래에 표시되고, 창은 닫지 않는다.
      if (!succeeded) return;

      showToast({ message: `${company.trim()} 지원을 추가했어요` });
      resetForm();
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // 취소/ESC/바깥 누름 등 저장 없이 닫히는 모든 경로에서도 폼과 에러를 초기화한다. 저장 중에는 닫지 않는다.
  const handleClose = () => {
    if (isSubmitting) return;
    clearError();
    resetForm();
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="지원 추가"
      description="직접 지원한 곳을 기록해요. 사이트 지원은 익스텐션으로 가져올 수 있어요."
      closeDisabled={isSubmitting}
      footer={
        <>
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button type="submit" form={formId} isLoading={isSubmitting} loadingLabel="저장하는 중">
            지원 추가
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSave} noValidate className="flex flex-col gap-4">
        <ApplicationFormFields
          idPrefix={idPrefix}
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
          deadlineAt={deadlineAt}
          onDeadlineAtChange={setDeadlineAt}
          errors={errors}
          disabled={isSubmitting}
        />
        <p role="alert" className={error ? 'rounded-md bg-danger-tint px-4 py-2 text-label text-danger-text' : 'sr-only'}>
          {error}
        </p>
      </form>
    </Dialog>
  );
}
