'use client';

import { useEffect, useRef, useState } from 'react';

interface CheckedField {
  value: string;
  error: string | null;
}

// 마우스(터치의 호환 마우스 이벤트 포함)를 누르고 있는지 기억한다 (#202).
// 칸 아래 링크·버튼을 누르는 순간 칸에서 포커스가 빠지며 오류 문구가 생기면, 그 높이만큼 링크가 밀려
// 손을 뗄 때 클릭이 링크 밖에서 끝나 사라진다(1024px 이상 14px, 미만 28px). 그래서 누르는 중에 칸을
// 벗어나면 오류 문구를 클릭이 끝난 뒤에 보여준다. Tab으로 벗어날 때는 지금처럼 바로 보여준다.
let isMousePressed = false;
const releaseWaiters = new Set<() => void>();

function releaseMouse() {
  isMousePressed = false;
  // click은 mouseup 바로 뒤에 같은 흐름으로 온다. 다음 차례(setTimeout 0)에 보여주면 click이 먼저 끝난다.
  for (const waiter of releaseWaiters) window.setTimeout(waiter, 0);
  releaseWaiters.clear();
}

if (typeof document !== 'undefined') {
  document.addEventListener('mousedown', () => { isMousePressed = true; }, true);
  document.addEventListener('mouseup', releaseMouse, true);
  // 창 밖에서 손을 떼 mouseup을 못 받는 경우에도 풀어 준다.
  window.addEventListener('blur', releaseMouse);
}

function runAfterMouseRelease(run: () => void) {
  if (isMousePressed) releaseWaiters.add(run);
  else run();
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
      runAfterMouseRelease(() => setChecked({ value, error }));
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
