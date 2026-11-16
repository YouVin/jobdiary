import { DashboardCard } from '@/components/dashboard/DashboardCard';
import type { Status } from '@/types/application';
import type { ApplicationOverview, StageSummary } from '@/utils/applicationStats';

interface OverviewCardProps {
  overview: ApplicationOverview;
  stage: StageSummary;
}

// 막대·범례 순서와 색. 면접예정·면접완료는 칸반에서도 같은 색이라 한 덩어리로 묶는다.
// 색 클래스는 Tailwind가 정적으로 찾을 수 있도록 리터럴로 둔다.
const STAGE_SEGMENTS: { label: string; statuses: Status[]; colorClass: string }[] = [
  { label: '지원완료', statuses: ['applied'], colorClass: 'bg-status-applied' },
  { label: '서류통과', statuses: ['screening'], colorClass: 'bg-status-screening' },
  { label: '면접', statuses: ['interview', 'interviewed'], colorClass: 'bg-status-interview' },
  { label: '합격', statuses: ['offer'], colorClass: 'bg-status-offer' },
  { label: '탈락', statuses: ['rejected'], colorClass: 'bg-status-rejected' },
  { label: '지원취소', statuses: ['canceled'], colorClass: 'bg-status-canceled' },
];

export function OverviewCard({ overview, stage }: OverviewCardProps) {
  const segments = STAGE_SEGMENTS.map((segment) => ({
    ...segment,
    count: segment.statuses.reduce((total, status) => total + stage.counts[status], 0),
  }));
  const barLabel = segments.map((segment) => `${segment.label} ${segment.count}건`).join(', ');
  const stageNumbers = [
    { label: '진행 중', value: stage.inProgress },
    { label: '서류 통과', value: stage.passedScreening },
    { label: '종료', value: stage.closed },
  ];

  return (
    <DashboardCard className="flex flex-col justify-center">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-5 md:items-center md:gap-8">
        <div className="md:col-span-2">
          <h2 className="text-label text-text-secondary">전체 지원 수</h2>
          <p className="mt-2 flex items-baseline gap-1">
            <span className="text-display tracking-tight text-text-primary">{overview.total}</span>
            <span className="text-body text-text-secondary">건</span>
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-label">
            <div className="flex items-baseline gap-1">
              <dt className="text-text-secondary">지원한 기업</dt>
              <dd className="font-semibold text-text-primary tabular-nums">{overview.companyCount}곳</dd>
            </div>
            <div className="flex items-baseline gap-1">
              <dt className="text-text-secondary">이번 주</dt>
              <dd className="font-semibold text-text-primary tabular-nums">
                {overview.thisWeekCount > 0 ? `+${overview.thisWeekCount}` : 0}건
              </dd>
            </div>
            <div className="flex items-baseline gap-1">
              <dt className="text-text-secondary">직접 입력</dt>
              <dd className="font-semibold text-text-primary tabular-nums">{overview.manualCount}건</dd>
            </div>
          </dl>
        </div>

        <div className="md:col-span-3 md:border-l md:border-card-border md:pl-8">
          <h3 className="text-label text-text-secondary">전형 현황</h3>
          <dl className="mt-2 grid grid-cols-3 gap-3">
            {stageNumbers.map((item) => (
              <div key={item.label}>
                <dt className="text-caption text-text-secondary">{item.label}</dt>
                <dd className="flex items-baseline gap-1">
                  <span className="text-heading-xl text-text-primary tabular-nums">{item.value}</span>
                  <span className="text-label font-normal text-text-secondary">건</span>
                </dd>
              </div>
            ))}
          </dl>

          <div role="img" aria-label={`전형 단계별 건수: ${barLabel}`} className="mt-4 flex h-2 gap-1 rounded bg-column">
            {segments.map((segment) =>
              segment.count > 0 ? (
                // 막대 길이는 데이터로 정해지는 런타임 값이라 flex-grow만 inline style로 지정한다.
                <span key={segment.label} className={`block h-full rounded ${segment.colorClass}`} style={{ flexGrow: segment.count }} />
              ) : null,
            )}
          </div>
          <ul className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-caption text-text-secondary" aria-hidden="true">
            {segments.map((segment) => (
              <li key={segment.label} className="flex items-center gap-1">
                <span className={`h-2 w-2 rounded-full ${segment.colorClass}`} />
                {segment.label}
                <b className="font-semibold text-text-primary tabular-nums">{segment.count}</b>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-caption text-text-secondary">
            {stage.screeningPassRate === null
              ? '서류 통과율은 지원 내역이 생기면 계산됩니다.'
              : `서류 통과율 ${Math.round(stage.screeningPassRate * 100)}% · 지원취소 ${stage.counts.canceled}건 제외 ${stage.screeningBase}건 기준`}
            {stage.autoRejected > 0 && (
              <>
                {' · 마감 자동 탈락 '}
                <b className="font-semibold text-status-rejected-text tabular-nums">{stage.autoRejected}건</b>
              </>
            )}
          </p>
        </div>
      </div>
    </DashboardCard>
  );
}
