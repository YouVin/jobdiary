import { clsx } from 'clsx';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import type { StageSummary } from '@/utils/applicationStats';

interface JourneyCardProps {
  stage: StageSummary;
}

// 지원완료 → 서류통과 → 면접 → 합격을 단계로 잇고, 끝난 지원(탈락·지원취소)은 아래 한 줄로 뺀다.
// 점 색은 칸반 컬럼과 같은 상태 토큰이다. 클래스는 리터럴로 둔다.
export function JourneyCard({ stage }: JourneyCardProps) {
  const { counts } = stage;
  const passRate = stage.screeningPassRate === null ? null : Math.round(stage.screeningPassRate * 100);
  const steps = [
    { label: '지원완료', count: counts.applied, note: '결과 대기', dotClass: 'bg-status-applied' },
    { label: '서류통과', count: counts.screening, note: passRate === null ? '통과율 계산 전' : `서류 통과율 ${passRate}%`, dotClass: 'bg-status-screening' },
    { label: '면접', count: counts.interview + counts.interviewed, note: `예정 ${counts.interview} · 완료 ${counts.interviewed}`, dotClass: 'bg-status-interview' },
    { label: '합격', count: counts.offer, note: counts.offer > 0 ? '축하해요' : '아직 없어요', dotClass: 'bg-status-offer' },
  ];

  return (
    <DashboardCard
      title="전형 여정"
      titleId="journey-card-title"
      action={<span className="text-caption text-text-secondary tabular-nums">진행 중 {stage.inProgress}건</span>}
    >
      <ol className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {steps.map((step, index) => (
          <li
            key={step.label}
            className={clsx(
              'relative flex min-w-0 flex-col gap-2 rounded-section bg-page p-3',
              // 데스크톱·태블릿에서만 단계 사이를 선으로 잇는다(모바일 2열에서는 줄이 바뀌어 생략).
              index > 0 && 'md:before:absolute md:before:top-1/2 md:before:-left-2 md:before:h-px md:before:w-2 md:before:bg-card-border',
            )}
          >
            <span className="flex items-center gap-2 text-label text-text-secondary">
              <span className={`h-2 w-2 shrink-0 rounded-full ${step.dotClass}`} />
              {step.label}
            </span>
            <span className="flex items-baseline gap-1">
              <span className="text-heading-xl text-text-primary tabular-nums">{step.count}</span>
              <span className="text-label font-normal text-text-secondary">건</span>
            </span>
            <span className="text-caption text-text-secondary">{step.note}</span>
          </li>
        ))}
      </ol>
      <p className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-card-border pt-4 text-label text-text-secondary">
        <span>여정을 마친 지원</span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-status-rejected" />
          탈락 <b className="font-semibold text-text-primary tabular-nums">{counts.rejected}</b>
          {stage.autoRejected > 0 && (
            <>
              (마감 자동 <b className="font-semibold text-status-rejected-text tabular-nums">{stage.autoRejected}</b>)
            </>
          )}
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-status-canceled" />
          지원취소 <b className="font-semibold text-text-primary tabular-nums">{counts.canceled}</b>
        </span>
      </p>
    </DashboardCard>
  );
}
