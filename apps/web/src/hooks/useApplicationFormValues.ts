'use client';

import { useState } from 'react';
import type { Platform, Status } from '@/types/application';
import { type ApplicationFormErrors, fieldId, firstErrorField, getApplicationFormErrors } from '@/utils/applicationFormValidation';

export interface ApplicationFormValues {
  company: string;
  position: string;
  platform: Platform;
  status: Status;
  appliedAt: string; // YYYY-MM-DD (date 입력값)
  deadlineAt: string; // 비우면 상시 채용
  interviewDate: string; // 수정 폼만 보여 준다
}

// 지원 추가·수정 폼이 같이 쓰는 칸 값·오류 (#264). 칸은 ApplicationFormFields가 그린다.
// fieldProps는 ApplicationFormFields에 그대로 넘기는 값·바꾸기 함수 묶음이다.
// withInterviewDate가 false면 면접일 칸을 보여 주지 않는다(지원 추가).
export function useApplicationFormValues(initial: ApplicationFormValues | (() => ApplicationFormValues), idPrefix: string, withInterviewDate: boolean) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState<ApplicationFormErrors>({});
  const set = <K extends keyof ApplicationFormValues>(field: K) => (value: ApplicationFormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
  };

  // 제출 전 검사. 오류가 있으면 첫 오류 칸으로 포커스를 옮기고 false.
  // 오류 문구가 칸에 연결된 뒤 포커스해 함께 읽히게 한다(requestAnimationFrame).
  const validate = (): boolean => {
    const nextErrors = getApplicationFormErrors({
      company: values.company,
      appliedAt: values.appliedAt,
      deadlineAt: values.deadlineAt,
      interviewDate: withInterviewDate ? values.interviewDate : undefined,
    });
    setErrors(nextErrors);
    const first = firstErrorField(nextErrors);
    if (first) {
      requestAnimationFrame(() => document.getElementById(fieldId(idPrefix, first))?.focus());
      return false;
    }
    return true;
  };

  const reset = (next: ApplicationFormValues) => {
    setValues(next);
    setErrors({});
  };

  const fieldProps = {
    idPrefix,
    company: values.company,
    onCompanyChange: set('company'),
    position: values.position,
    onPositionChange: set('position'),
    platform: values.platform,
    onPlatformChange: set('platform'),
    status: values.status,
    onStatusChange: set('status'),
    appliedAt: values.appliedAt,
    onAppliedAtChange: set('appliedAt'),
    deadlineAt: values.deadlineAt,
    onDeadlineAtChange: set('deadlineAt'),
    ...(withInterviewDate ? { interviewDate: values.interviewDate, onInterviewDateChange: set('interviewDate') } : {}),
    errors,
  };

  return { values, errors, fieldProps, validate, reset };
}
