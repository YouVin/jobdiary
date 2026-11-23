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
// 일정 종류 색 (#193): 면접은 보라, 공고 마감은 주황. 오늘 일정의 D-day 배지만 검정이다.
const KIND_DOT: Record<UpcomingEvent['kind'], string> = { interview: 'bg-event-interview', deadline: 'bg-event-deadline' };
const KIND_TEXT: Record<UpcomingEvent['kind'], string> = { interview: 'text-event-interview-text', deadline: 'text-event-deadline-text' };
const KIND_BADGE: Record<UpcomingEvent['kind'], string> = {
  interview: 'bg-event-interview-tint text-event-interview-text',
  deadline: 'bg-event-deadline-tint text-event-deadline-text',
};
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

// 날짜가 세로로 이어지는 일정 타임라인. 행을 누르면 지원 수정 모달을 연다.
export function UpcomingCard({ events, onSelect, limit = 4 }: UpcomingCardProps) {
  const visible = events.slice(0, limit);
  const hiddenCount = events.length - visible.length;

  return (
    <DashboardCard title="다가오는 일정" titleId="upcoming-card-title" icon="calendar" action={<BoardLink />}>
      {visible.length === 0 ? (
        <p className="rounded-sm bg-column p-4 text-small text-text-secondary">
          다가오는 면접이나 공고 마감이 없습니다. 지원 카드에 면접일이나 공고 마감일을 입력하면 여기에 모입니다.
        </p>
      ) : (
        <ul className="relative flex flex-col gap-1">
          {/* 타임라인 세로선: 버튼 왼쪽 여백(8px) + 날짜 칸(48px) + 점 칸 가운데(12px) */}
          <span aria-hidden="true" className="absolute top-4 bottom-4 left-17 w-px bg-card-border" />
          {visible.map((event) => {
            const isToday = event.daysLeft === 0;
            const dday = isToday ? 'D-DAY' : `D-${event.daysLeft}`;
            const kind = KIND_LABEL[event.kind];
            const day = Number(event.date.slice(8, 10));
            const weekday = WEEKDAYS[new Date(`${event.date}T00:00:00.000Z`).getUTCDay()];
            return (
              <li key={`${event.applicationId}-${event.kind}`}>
                <button
                  type="button"
                  onClick={() => onSelect(event.applicationId)}
                  aria-label={`${dday} ${event.company} ${kind}, ${formatDateWithWeekday(event.date)}. 지원 정보 수정`}
                  className="relative flex w-full items-center rounded-sm px-2 py-2 text-left hover:bg-column focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                >
                  <span className="flex w-12 shrink-0 flex-col items-end pr-1">
                    <span className="text-diary-date text-text-primary tabular-nums">{day}</span>
                    <span className="text-caption text-text-secondary">{isToday ? `${weekday} · 오늘` : weekday}</span>
                  </span>
                  <span className="flex w-6 shrink-0 justify-center">
                    <span
                      className={clsx(
                        'h-3 w-3 rounded-full ring-2 ring-card',
                        KIND_DOT[event.kind],
                      )}
                    />
                  </span>
                  <span className="min-w-0 flex-1 pl-2">
                    <span className="block truncate text-card-company text-text-primary">{event.company}</span>
                    <span className="block truncate text-caption text-text-secondary">
                      <span className={clsx('font-medium', KIND_TEXT[event.kind])}>{kind}</span> · {event.position}
                    </span>
                  </span>
                  <span
                    className={clsx(
                      'ml-2 shrink-0 rounded-full px-2 py-1 text-caption font-semibold tabular-nums',
                      isToday ? 'bg-text-primary text-on-brand' : KIND_BADGE[event.kind],
                    )}
                  >
                    {dday}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {hiddenCount > 0 && <p className="mt-2 text-caption text-text-secondary">외 {hiddenCount}건은 지원보드에서 확인할 수 있어요.</p>}
    </DashboardCard>
  );
}
