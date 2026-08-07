// 인증 폼(로그인/회원가입/비밀번호 재설정/새 비밀번호) 전반에서 공유하는 스타일 상수.
// 토큰만 사용 — 색상 하드코딩 금지.
export const inputClassName =
  'w-full rounded-lg border border-border-strong px-3 py-2 text-[14px] text-text-primary focus:border-brand focus:outline-none';
export const passwordInputClassName = `${inputClassName} pr-9`;
export const labelClassName = 'mb-1 block text-[12px] font-medium text-text-secondary';
export const fieldErrorClassName = 'mt-1 text-[12px] text-status-rejected';
