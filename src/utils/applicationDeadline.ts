import type { Application } from '@/types/application';

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidDateOnly(value: string): boolean {
  if (!DATE_ONLY_PATTERN.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

// 마감일은 날짜만 저장한다. 한국 달력 기준으로 마감 다음 날부터 지난 것으로 본다.
export function getTodayInKorea(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function shouldAutoReject(
  application: Pick<Application, 'status' | 'deadlineAt' | 'statusSource'>,
  today = getTodayInKorea(),
): boolean {
  return application.status === 'applied' &&
    (application.statusSource === undefined || application.statusSource === 'extension' || application.statusSource === 'created') &&
    !!application.deadlineAt &&
    isValidDateOnly(application.deadlineAt) &&
    application.deadlineAt < today;
}
