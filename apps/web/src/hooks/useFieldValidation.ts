'use client';

import { useEffect, useRef, useState } from 'react';

interface CheckedField {
  value: string;
  error: string | null;
}

// 입력값은 즉시 반영하고, 오류 안내만 잠시 늦춘다. 타이머는 변경/언마운트 시 해제한다.
export function useFieldValidation(value: string, error: string | null) {
  const [checked, setChecked] = useState<CheckedField | null>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!value || !error) return;
    timer.current = window.setTimeout(() => setChecked({ value, error }), 400);
    return () => window.clearTimeout(timer.current);
  }, [value, error]);

  return {
    error: checked?.value === value && checked.error === error ? error : null,
    onBlur: () => {
      if (!value) return;
      window.clearTimeout(timer.current);
      setChecked({ value, error });
    },
    validate: () => {
      window.clearTimeout(timer.current);
      setChecked({ value, error });
    },
    reset: () => {
      window.clearTimeout(timer.current);
      setChecked(null);
    },
  };
}
