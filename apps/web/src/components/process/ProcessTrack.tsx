'use client';

import { StageTrack } from '@/components/ui/StageTrack';
import { StepTrack } from '@/components/ui/StepTrack';
import { useProcessStep } from '@/hooks/useProcessStep';
import type { Application, Status } from '@/types/application';
import { ACTIVE_STATUSES } from '@/utils/weekTimeline';

// 지원 한 건의 단계 트랙 (#295, #303). 전형 절차가 있으면 공고의 단계 이름 그대로, 없으면 기본 4단계(이름 함께).
// 점을 누르면 바로 옮기고, 지원 단계(통계·보드)는 단계 종류로 따라 바뀐다(코딩테스트 → 서류 통과, 2차 면접 → 면접 예정).
// 모양은 ui/StepTrack이 맡고, 여기서는 지원 데이터에 잇기만 한다(#306). 상세 패널과 결과 기다리는 중이 같이 쓴다.
export function ApplicationProcessTrack({ application, onMove }: { application: Application; onMove: (applicationId: string, status: Status) => void }) {
  const { steps, currentIndex, selectStep } = useProcessStep(application, onMove);
  if (steps) {
    return (
      <StepTrack
        groupLabel={`${application.company} 전형 절차`}
        steps={steps.map((step) => step.name)}
        currentIndex={currentIndex}
        onSelect={(index) => void selectStep(index)}
        labelsClassName=""
      />
    );
  }
  return <StageTrack company={application.company} stageIndex={ACTIVE_STATUSES.indexOf(application.status)} onMove={(status) => onMove(application.id, status)} labelsClassName="" />;
}
