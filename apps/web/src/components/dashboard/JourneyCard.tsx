import { clsx } from 'clsx';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import type { StageSummary } from '@/utils/applicationStats';

interface JourneyCardProps {
  stage: StageSummary;
}

// 지원완료 → 서류통과 → 면접 → 합격을 단계로 잇는다. 숫자만 크게 가운데 두고 보조 문구는 두지 않는다 (#161).
// 점 색은 칸반 컬럼과 같은 상태 토큰이다. 클래스는 리터럴로 둔다.
export function JourneyCard({ stage }: JourneyCardProps) {
  const { counts } = stage;
  const steps = [
    { label: '지원완료', count: counts.applied, dotClass: 'bg-status-applied' },
    { label: '서류통과', count: counts.screening, dotClass: 'bg-status-screening' },
    { label: '면접', count: counts.interview + counts.interviewed, dotClass: 'bg-status-interview' },
    { label: '합격', count: counts.offer, dotClass: 'bg-status-offer' },
  ];

  return (
    <DashboardCard
      title="전형 여정"
      titleId="journey-card-title"
      className="flex flex-col"
      action={<span className="text-caption text-text-secondary tabular-nums">진행 중 {stage.inProgress}건</span>}
    >
      <ol className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-4">
        {steps.map((step, index) => (
          <li
            key={step.label}
            aria-label={`${step.label} ${step.count}건`}
            className={clsx(
              'relative flex min-w-0 flex-col items-center justify-center gap-3 rounded-section bg-page px-3 py-6',
              // 데스크톱·태블릿에서만 단계 사이를 점선으로 잇는다(모바일 2열에서는 줄이 바뀌어 생략).
              index > 0 && 'md:before:absolute md:before:top-1/2 md:before:-left-2 md:before:w-2 md:before:border-t md:before:border-dashed md:before:border-border-strong',
            )}
          >
            <span className="flex items-center gap-2 text-label text-text-secondary">
              <span className={`h-2 w-2 shrink-0 rounded-full ${step.dotClass}`} />
              {step.label}
            </span>
            <span className="flex items-baseline gap-1">
              <span className="text-heading-xl font-bold text-text-primary tabular-nums">{step.count}</span>
              <span className="text-label font-normal text-text-secondary">건</span>
            </span>
          </li>
        ))}
      </ol>
    </DashboardCard>
  );
}
