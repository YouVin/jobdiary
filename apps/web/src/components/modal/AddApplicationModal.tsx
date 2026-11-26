'use client';

import { useId, useState } from 'react';
import { ApplicationFormFields } from '@/components/modal/ApplicationFormFields';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Overlay';
import { useToast } from '@/components/ui/Toast';
import { type ApplicationFormValues, useApplicationFormValues } from '@/hooks/useApplicationFormValues';
import { useApplicationStore } from '@/store/applicationStore';

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

// 새 지원의 처음 칸 값. 저장 뒤·닫을 때도 이 값으로 되돌린다.
function emptyValues(): ApplicationFormValues {
  return { company: '', position: '', platform: 'saramin', status: 'applied', appliedAt: getTodayDateString(), deadlineAt: '', interviewDate: '' };
}

// 지원 추가 (#205): 디자인 시스템 가운데 창(Dialog, 폭 520, 모바일 아래 시트).
// - 저장 버튼은 늘 누를 수 있고, 빈 칸·잘못된 날짜는 칸 아래 오류 + 첫 오류 칸으로 포커스로 알린다.
// - 저장하면 창을 닫고 토스트("지원을 추가했어요"), 서버 오류는 창 안 알림 영역에 남기고 창을 닫지 않는다.
// 칸 값·검사는 수정 폼과 같은 useApplicationFormValues (#264). 면접일 칸은 수정에서만 보여 준다.
export function AddApplicationModal({ isOpen, onClose }: AddApplicationModalProps) {
  // ── 스토어·칸 값 ──
  const addApplication = useApplicationStore((state) => state.addApplication);
  const clearError = useApplicationStore((state) => state.clearError);
  const error = useApplicationStore((state) => state.error);
  const showToast = useToast();
  const idPrefix = useId();
  const formId = `${idPrefix}-form`;
  const form = useApplicationFormValues(emptyValues, idPrefix, false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── 저장: 칸 검사 → 추가 → 토스트·초기화·닫기 ──
  const handleSave = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSubmitting) return;
    if (!form.validate()) return;

    const { company, position, platform, status, appliedAt, deadlineAt } = form.values;
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
      form.reset(emptyValues());
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── 닫기: 취소/ESC/바깥 누름 등 저장 없이 닫히는 모든 경로에서도 폼과 에러를 초기화한다. 저장 중에는 닫지 않는다 ──
  const handleClose = () => {
    if (isSubmitting) return;
    clearError();
    form.reset(emptyValues());
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
          {/* ── 아래 버튼: 취소·지원 추가 ── */}
          <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
            취소
          </Button>
          <Button type="submit" form={formId} isLoading={isSubmitting} loadingLabel="저장하는 중">
            지원 추가
          </Button>
        </>
      }
    >
      {/* ── 칸: 회사·공고·경로·단계·지원일·마감일 → 저장 실패 알림 ── */}
      <form id={formId} onSubmit={handleSave} noValidate className="flex flex-col gap-4">
        <ApplicationFormFields {...form.fieldProps} disabled={isSubmitting} />
        <p role="alert" className={error ? 'rounded-md bg-danger-tint px-4 py-2 text-label text-danger-text' : 'sr-only'}>
          {error}
        </p>
      </form>
    </Dialog>
  );
}
