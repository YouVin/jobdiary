'use client';

import { useId, useState } from 'react';
import { ApplicationFormFields, fieldId } from '@/components/modal/ApplicationFormFields';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { useApplicationStore } from '@/store/applicationStore';
import type { Application, Platform, Status } from '@/types/application';
import { shouldAutoReject } from '@/utils/applicationDeadline';
import { type ApplicationFormErrors, firstErrorField, getApplicationFormErrors } from '@/utils/applicationFormValidation';
import { toDateInputValue } from '@/utils/format';

interface EditApplicationFormProps {
  application: Application;
  onClose: () => void;
  isSubmitting: boolean;
  onSubmittingChange: (isSubmitting: boolean) => void;
  onSaved?: () => void; // 저장 뒤 패널이 열린 채 상세로 돌아가므로 결과는 패널 안 알림 영역으로 알린다(#205)
}

// 상세 패널 안 정보 수정 (#205). 칸은 지원 추가와 같고, 아래에 삭제(두 번 눌러 확인)·취소·저장.
// 저장 결과는 패널 안(onSaved)에서, 삭제 결과는 패널이 닫히므로 토스트로 알린다.
// 패널이 열린 동안의 결과를 패널 안에서 알리면 aria-modal 창 밖을 읽지 않는 환경(WebKit 등)에서도 들린다.
export function EditApplicationForm({ application, onClose, isSubmitting, onSubmittingChange, onSaved }: EditApplicationFormProps) {
  const updateApplication = useApplicationStore((state) => state.updateApplication);
  const removeApplication = useApplicationStore((state) => state.removeApplication);
  const error = useApplicationStore((state) => state.error);
  const showToast = useToast();
  const idPrefix = useId();

  // 폼을 연 뒤 props가 갱신돼도 입력값의 기준 버전은 바꾸지 않는다.
  const [initialApplication] = useState(application);

  const [company, setCompany] = useState(application.company);
  const [position, setPosition] = useState(application.position);
  const [platform, setPlatform] = useState<Platform>(application.platform);
  const [status, setStatus] = useState<Status>(application.status);
  const [appliedAt, setAppliedAt] = useState(() => toDateInputValue(application.appliedAt));
  const [deadlineAt, setDeadlineAt] = useState(application.deadlineAt ?? '');
  const [interviewDate, setInterviewDate] = useState(() => (application.interviewDate ? toDateInputValue(application.interviewDate) : ''));
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [errors, setErrors] = useState<ApplicationFormErrors>({});

  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    const nextErrors = getApplicationFormErrors({ company, appliedAt, deadlineAt, interviewDate });
    setErrors(nextErrors);
    const first = firstErrorField(nextErrors);
    if (first) {
      requestAnimationFrame(() => document.getElementById(fieldId(idPrefix, first))?.focus());
      return;
    }

    onSubmittingChange(true);
    try {
      const statusChanged = status !== initialApplication.status;
      const autoRejected = !statusChanged && shouldAutoReject({
        status,
        deadlineAt: deadlineAt || undefined,
        statusSource: initialApplication.statusSource,
      });
      const succeeded = await updateApplication(application.id, {
        company: company.trim(),
        position: position.trim(),
        platform,
        status: autoRejected ? 'rejected' : (statusChanged ? status : undefined),
        statusSource: autoRejected ? 'deadline' : undefined,
        appliedAt: new Date(appliedAt).toISOString(),
        deadlineAt: deadlineAt || null,
        // 비운 경우 undefined(변경 안 함)가 아니라 null(명시적으로 비움)을 보내야 DB에도 반영된다.
        interviewDate: interviewDate ? new Date(interviewDate).toISOString() : null,
      }, initialApplication.updatedAt);

      // 실패 시 에러는 store.error에 남아 아래에 표시되고, 화면은 그대로 둔다.
      if (!succeeded) return;
      onSaved?.();
      onClose();
    } finally {
      onSubmittingChange(false);
    }
  };

  // 삭제 버튼은 한 번 더 눌러야 실제 삭제되는 2단계 확인 방식
  const handleDelete = async () => {
    if (!isConfirmingDelete) {
      setIsConfirmingDelete(true);
      return;
    }

    onSubmittingChange(true);
    try {
      const succeeded = await removeApplication(application.id);
      if (!succeeded) return;
      showToast({ message: `${application.company} 지원을 지웠어요` });
      onClose();
    } finally {
      onSubmittingChange(false);
    }
  };

  return (
    <form onSubmit={handleSave} noValidate className="flex flex-col gap-4">
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
        interviewDate={interviewDate}
        onInterviewDateChange={setInterviewDate}
        errors={errors}
        disabled={isSubmitting}
      />

      <p role="alert" className={error ? 'rounded-md bg-danger-tint px-4 py-2 text-label text-danger-text' : 'sr-only'}>
        {error}
      </p>
      {/* 삭제 확인 단계로 바뀐 것을 스크린리더에도 알린다 */}
      <p role="status" className="sr-only">
        {isConfirmingDelete ? '한 번 더 누르면 이 지원이 지워져요.' : ''}
      </p>

      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
        <Button variant="danger" onClick={handleDelete} disabled={isSubmitting}>
          {isConfirmingDelete ? '정말 지울까요?' : '삭제'}
        </Button>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={onClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button type="submit" isLoading={isSubmitting} loadingLabel="저장하는 중">
            저장
          </Button>
        </div>
      </div>
    </form>
  );
}
