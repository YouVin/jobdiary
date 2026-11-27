'use client';

import { useHiringProcessFill } from '@/hooks/useHiringProcessFill';

// 로그인한 화면 어디서든 공고 전형 절차를 배경에서 채운다(#295). 그리는 것은 없다.
export function HiringProcessFiller() {
  useHiringProcessFill();
  return null;
}
