import { clsx } from 'clsx';
import { BoardLink } from '@/components/dashboard/BoardLink';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import type { UpcomingEvent } from '@/utils/applicationStats';
import { formatDateWithWeekday } from '@/utils/format';

interface UpcomingCardProps {
  events: UpcomingEvent[];
  onSelect: (applicationId: string) => void;
  limit?: number;
}

const KIND_LABEL: Record<UpcomingEvent['kind'], string> = { interview: '면접', deadline: '공고 마감' };

export function UpcomingCard({ events, onSelect, limit = 4 }: UpcomingCardProps) {
  const visible = events.slice(0, limit);
  const hiddenCount = events.length - visible.length;

  return (
    <DashboardCard title="다가오는 일정" titleId="upcoming-card-title" icon="calendar" action={<BoardLink />}>
      {visible.length === 0 ? (
        <p className="rounded-lg bg-column p-4 text-small text-text-secondary">
          다가오는 면접이나 공고 마감이 없습니다. 지원 카드에 면접일이나 공고 마감일을 입력하면 여기에 모입니다.
        </p>
      ) : (
        <ul>
          {visible.map((event) => {
            const dday = event.daysLeft === 0 ? 'D-DAY' : `D-${event.daysLeft}`;
            const kind = KIND_LABEL[event.kind];
            return (
              <li key={`${event.applicationId}-${event.kind}`} className="border-b border-card-border last:border-b-0">
                <button
                  type="button"
                  onClick={() => onSelect(event.applicationId)}
                  aria-label={`${dday} ${event.company} ${kind}, ${formatDateWithWeekday(event.date)}. 지원 정보 수정`}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-page focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                >
                  <span
                    className={clsx(
                      'flex w-12 shrink-0 justify-center rounded-md py-1 text-label font-semibold tabular-nums',
                      event.kind === 'interview' ? 'bg-brand-tint text-brand-text' : 'bg-column text-text-secondary',
                    )}
                  >
                    {dday}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-card-company text-text-primary">{event.company}</span>
                    <span className="block truncate text-caption text-text-secondary">
                      {kind} · {event.position}
                    </span>
                  </span>
                  <span className="shrink-0 text-caption text-text-secondary tabular-nums">{formatDateWithWeekday(event.date)}</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {hiddenCount > 0 && <p className="mt-2 text-caption text-text-secondary">외 {hiddenCount}건은 지원 보드에서 확인할 수 있어요.</p>}
    </DashboardCard>
  );
}
