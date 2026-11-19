'use client';

import { useOptimistic, useState, useTransition } from 'react';
import { useApplicationStore } from '@/store/applicationStore';
import type { Application, Status } from '@/types/application';

// 저장 전에 화면에 먼저 반영할 단계 변경
function applyStatusChange(current: Application[], change: { id: string; status: Status }): Application[] {
  return current.map((application) => (application.id === change.id ? { ...application, status: change.status } : application));
}

// 단계 트랙에서 바꾼 단계를 저장 응답 전에 먼저 보여준다 (#174, React 19 useOptimistic).
// 성공하면 스토어 값으로 이어지고, 실패하면 transition이 끝날 때 원래 값으로 돌아가며 moveError로 알린다.
// 같은 오류가 페이지 위 공통 안내와 겹치지 않도록 스토어 오류는 지운다.
export function useStageMove(applications: Application[]) {
  const updateStatus = useApplicationStore((state) => state.updateStatus);
  const clearError = useApplicationStore((state) => state.clearError);
  const [optimisticApplications, applyOptimisticStatus] = useOptimistic(applications, applyStatusChange);
  const [, startTransition] = useTransition();
  const [moveError, setMoveError] = useState<string | null>(null);

  const moveStage = (applicationId: string, status: Status) => {
    const company = applications.find((application) => application.id === applicationId)?.company ?? '지원';
    setMoveError(null);
    startTransition(async () => {
      applyOptimisticStatus({ id: applicationId, status });
      const saved = await updateStatus(applicationId, status);
      if (!saved) {
        clearError();
        setMoveError(`${company}의 단계를 바꾸지 못해 원래대로 되돌렸어요. 잠시 뒤 다시 시도해 주세요.`);
      }
    });
  };

  return { optimisticApplications, moveStage, moveError, clearMoveError: () => setMoveError(null) };
}
