import { StepTrack } from '@/components/ui/StepTrack';
import { STATUS_INFO } from '@/constants/status';
import type { Status } from '@/types/application';
import { ACTIVE_STATUSES } from '@/utils/weekTimeline';

export { withDirection } from '@/components/ui/StepTrack';

interface StageTrackProps {
  company: string;
  stageIndex: number;
  onMove: (status: Status) => void;
  // 주면 트랙 아래에 단계 이름을 보여준다(열 머리가 없는 곳)
  labelsClassName?: string;
}

const STAGE_LABELS = ACTIVE_STATUSES.map((status) => STATUS_INFO[status].label);

// 기본 4단계 트랙 (#201): 지원 완료 → 서류 통과 → 면접 예정 → 면접 완료. 모양은 StepTrack 하나를 쓴다(#306).
// 결과(합격·탈락·지원 취소)는 트랙이 아니라 뱃지로 보여준다(stageIndex -1이면 지금 점 없음).
export function StageTrack({ company, stageIndex, onMove, labelsClassName }: StageTrackProps) {
  return (
    <StepTrack
      groupLabel={`${company} 단계`}
      steps={STAGE_LABELS}
      currentIndex={stageIndex}
      onSelect={(index) => onMove(ACTIVE_STATUSES[index])}
      labelsClassName={labelsClassName}
    />
  );
}
