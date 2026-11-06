import { isValidDateOnly } from '@/utils/applicationDeadline';

export function getApplicationDateError(dates: {
  appliedAt: string;
  deadlineAt: string;
  interviewDate?: string;
}): string | null {
  if (!isValidDateOnly(dates.appliedAt)) return '지원일을 올바르게 입력해주세요.';
  if (dates.deadlineAt && !isValidDateOnly(dates.deadlineAt)) return '공고 마감일을 올바르게 입력해주세요.';
  if (dates.interviewDate && !isValidDateOnly(dates.interviewDate)) return '면접일을 올바르게 입력해주세요.';
  return null;
}
