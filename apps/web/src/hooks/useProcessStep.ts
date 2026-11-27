'use client';

import { useState } from 'react';
import { useApplicationStore } from '@/store/applicationStore';
import type { Application, Status } from '@/types/application';
import { getCurrentStepIndex, getProcessSteps, statusForStep } from '@/utils/hiringProcess';

// 지원별 전형 절차에서 지금 단계와 옮기기 (#295, #303).
// 점을 누르면 저장을 기다리지 않고 바로 그 단계로 보인다. 지원 단계(보드 열·통계)가 바뀌면 onMove(낙관적 이동)로 옮기고,
// 같은 지원 단계 안(1차 → 2차 면접)이면 고른 단계만 저장한다. 저장에 실패하면 원래 단계로 돌아간다.
export function useProcessStep(application: Application, onMove: (applicationId: string, status: Status) => void) {
  const saveHiringProcess = useApplicationStore((state) => state.saveHiringProcess);
  const [pending, setPending] = useState<{ step: number; status: Status } | null>(null);
  const steps = getProcessSteps(application);
  const process = application.hiringProcess;

  // 고른 단계는 지원 단계가 그대로일 때만 쓴다(그사이 보드에서 끌어 옮겼으면 지원 단계를 따른다)
  const isPendingValid = pending !== null && pending.status === application.status;
  const currentIndex = steps ? (isPendingValid ? pending.step : getCurrentStepIndex(application, steps)) : -1;

  const selectStep = async (index: number) => {
    if (!steps || !process) return;
    const status = statusForStep(steps[index]);
    setPending({ step: index, status });
    if (status !== application.status) onMove(application.id, status);
    await saveHiringProcess(application.id, { ...process, step: index });
    setPending(null);
  };

  return { steps, currentIndex, selectStep };
}
