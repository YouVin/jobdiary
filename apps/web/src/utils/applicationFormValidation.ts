import { isValidDateOnly } from '@/utils/applicationDeadline';

export type ApplicationFormField = 'company' | 'appliedAt' | 'deadlineAt' | 'interviewDate';
export type ApplicationFormErrors = Partial<Record<ApplicationFormField, string>>;

// 화면 순서대로 둔다. 제출 때 첫 오류 칸으로 포커스를 옮길 때 이 순서를 쓴다.
export const APPLICATION_FORM_FIELDS: ApplicationFormField[] = ['company', 'appliedAt', 'deadlineAt', 'interviewDate'];

// 지원 추가·수정 칸별 오류 (#205). 오류는 그 칸 아래에 보여주고, 무엇을 고치면 되는지 해요체로 쓴다.
export function getApplicationFormErrors(values: {
  company: string;
  appliedAt: string;
  deadlineAt: string;
  interviewDate?: string;
}): ApplicationFormErrors {
  const errors: ApplicationFormErrors = {};
  if (!values.company.trim()) errors.company = '회사명을 입력해 주세요.';
  if (!isValidDateOnly(values.appliedAt)) errors.appliedAt = '지원일을 올바르게 입력해 주세요.';
  if (values.deadlineAt && !isValidDateOnly(values.deadlineAt)) errors.deadlineAt = '공고 마감일을 올바르게 입력해 주세요.';
  if (values.interviewDate && !isValidDateOnly(values.interviewDate)) errors.interviewDate = '면접일을 올바르게 입력해 주세요.';
  return errors;
}

export function firstErrorField(errors: ApplicationFormErrors): ApplicationFormField | null {
  return APPLICATION_FORM_FIELDS.find((field) => errors[field]) ?? null;
}
