import { PlatformBadge } from '@/components/badge/PlatformBadge';
import { BoardLink } from '@/components/dashboard/BoardLink';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { STATUS_DOT_CLASS, STATUS_INFO } from '@/constants/status';
import type { Application } from '@/types/application';
import { formatDate } from '@/utils/format';

interface RecentCardProps {
  applications: Application[];
  onSelect: (applicationId: string) => void;
}

export function RecentCard({ applications, onSelect }: RecentCardProps) {
  return (
    <DashboardCard title="최근 지원" titleId="recent-card-title" action={<BoardLink />}>
      {applications.length === 0 ? (
        <p className="rounded-sm bg-column p-4 text-small text-text-secondary">
          아직 지원 내역이 없습니다. 지원추가나 익스텐션에서 가져오기로 시작해보세요.
        </p>
      ) : (
        <ul>
          {applications.map((application) => {
            const statusLabel = STATUS_INFO[application.status].label;
            return (
              <li key={application.id} className="border-b border-card-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => onSelect(application.id)}
                  aria-label={`${application.company}, ${statusLabel}. 지원 정보 수정`}
                  className="flex w-full items-center gap-3 rounded-sm px-2 py-3 text-left hover:bg-page focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-card-company text-text-primary">{application.company}</span>
                    <span className="mt-1 flex items-center gap-2">
                      <PlatformBadge platform={application.platform} />
                      <span className="text-legacy-caption text-text-muted tabular-nums">{formatDate(application.appliedAt)}</span>
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-legacy-caption text-text-secondary">
                    <span className={`h-2 w-2 rounded-full ${STATUS_DOT_CLASS[application.status]}`} />
                    {statusLabel}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </DashboardCard>
  );
}
