'use client';

import { useEffect, useState } from 'react';

// 디자인 시스템 숫자 올라가기 (#203). 메인 첫 화면 통계 숫자가 0부터 올라간다(duration-count 600ms, 감속 곡선).
// - 움직임 줄이기 설정이면 처음부터 최종 숫자를 보여준다.
// - 스크린리더는 움직이는 숫자 대신 최종 숫자(sr-only)만 읽는다.
// - 처음 나타날 때 한 번만 움직인다. 값이 바뀌면(가져오기 등) 바로 새 값으로 바꾼다.
const DURATION_MS = 600;

function prefersReducedMotion(): boolean {
  return typeof window === 'undefined' || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function CountUp({ value }: { value: number }) {
  const [start] = useState(() => (prefersReducedMotion() ? value : 0));
  const [progress, setProgress] = useState(() => (start === value ? 1 : 0));

  useEffect(() => {
    if (progress >= 1) return;
    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const next = Math.min((now - startedAt) / DURATION_MS, 1);
      setProgress(next);
      if (next < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // 처음 한 번만 움직인다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 감속 곡선(ease-out cubic). 다 올라간 뒤에는 늘 지금 값을 그대로 보여준다.
  const eased = 1 - (1 - progress) ** 3;
  const shown = progress >= 1 ? value : Math.round(start + (value - start) * eased);

  return (
    <>
      <span aria-hidden="true">{shown}</span>
      <span className="sr-only">{value}</span>
    </>
  );
}
