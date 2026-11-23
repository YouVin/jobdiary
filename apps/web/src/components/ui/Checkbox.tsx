'use client';

import { clsx } from 'clsx';
import { type InputHTMLAttributes, type ReactNode, useId } from 'react';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'children'> {
  children: ReactNode; // 이름표. 안에 링크를 넣어도 된다.
  error?: string | null;
}

// 디자인 시스템 체크박스 (#202). 약관 동의처럼 한 문장짜리 선택에 쓴다.
// - 이름표 전체를 눌러도 체크된다. 상자는 20px, 색은 주요 파랑.
// - 오류 자리는 입력칸(TextField)처럼 비어 있을 때도 알림 영역으로 남겨 두고, 오류면 aria-invalid로 연결한다.
export function Checkbox({ children, error, id, className, 'aria-describedby': describedBy, ...rest }: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const describedByIds = [describedBy, error ? errorId : null].filter(Boolean).join(' ') || undefined;

  return (
    <div className={clsx('flex flex-col gap-2', className)}>
      <div className="flex items-start gap-2">
        <input
          id={inputId}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          aria-describedby={describedByIds}
          className="mt-px size-5 shrink-0 cursor-pointer accent-action-primary focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring disabled:cursor-not-allowed"
          {...rest}
        />
        <label htmlFor={inputId} className="cursor-pointer text-label text-text-secondary">
          {children}
        </label>
      </div>
      <p id={errorId} role="status" aria-atomic="true" className={error ? 'text-label text-danger-text' : 'sr-only'}>
        {error}
      </p>
    </div>
  );
}
