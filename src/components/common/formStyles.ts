// 인증·계정·지원 입력·필터에서 공유한다. 화면별로 폼 기본 스타일을 복제하지 않는다.
export const inputClassName =
  'w-full rounded-lg border border-border-strong bg-card px-3 py-2 text-body text-text-primary focus:border-brand focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2';
export const passwordInputClassName = `${inputClassName} pr-10`;
export const labelClassName = 'mb-1 block text-label text-text-secondary';
export const fieldErrorClassName = 'mt-1 text-label text-status-rejected';
