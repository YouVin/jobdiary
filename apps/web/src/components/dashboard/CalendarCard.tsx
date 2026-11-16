import { clsx } from 'clsx';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import type { CalendarDay, MonthCalendar } from '@/utils/applicationStats';

interface CalendarCardProps {
  calendar: MonthCalendar;
}

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];

// 지원 건수 단계 색. 3건 이상은 진한 칸이라 글자를 흰색으로 바꾼다. 클래스는 리터럴로 둔다.
function cellClass(day: CalendarDay): string {
  if (day.isFuture) return 'border border-dashed border-card-border text-text-muted';
  if (day.count >= 4) return 'bg-heat-4 text-on-brand';
  if (day.count === 3) return 'bg-heat-3 text-on-brand';
  if (day.count === 2) return 'bg-heat-2 text-brand-text';
  if (day.count === 1) return 'bg-heat-1 text-brand-text';
  return 'bg-column text-text-secondary';
}

const LEGEND = ['bg-column', 'bg-heat-1', 'bg-heat-2', 'bg-heat-3', 'bg-heat-4'];

// 이번 달 어느 날 지원했는지 보여주는 읽기 전용 일기장 달력. 칸은 버튼이 아니며 날짜별 건수는 접근성 이름으로 읽는다.
export function CalendarCard({ calendar }: CalendarCardProps) {
  const title = `${calendar.month}월 지원 달력`;

  return (
    <DashboardCard
      title={title}
      titleId="calendar-card-title"
      action={<span className="text-caption text-text-secondary tabular-nums">이번 달 {calendar.monthTotal}건</span>}
    >
      <table className="w-full table-fixed border-separate border-spacing-1">
        <caption className="sr-only">{calendar.year}년 {calendar.month}월 날짜별 지원 건수</caption>
        <thead>
          <tr>
            {WEEKDAYS.map((weekday) => (
              <th key={weekday} scope="col" aria-label={`${weekday}요일`} className="pb-1 text-caption font-medium text-text-muted">
                {weekday}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {calendar.weeks.map((week, weekIndex) => (
            <tr key={weekIndex}>
              {week.map((day, dayIndex) => (
                <td key={dayIndex} className="p-0">
                  {day && (
                    <span
                      aria-label={day.isFuture ? `${calendar.month}월 ${day.day}일` : `${calendar.month}월 ${day.day}일 지원 ${day.count}건`}
                      aria-current={day.isToday ? 'date' : undefined}
                      title={day.isFuture ? undefined : `${day.count}건 지원`}
                      className={clsx(
                        'flex h-8 items-start rounded-md p-1 text-badge tabular-nums',
                        cellClass(day),
                        day.isToday && 'outline-2 outline-offset-1 outline-text-primary',
                      )}
                    >
                      {day.day}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-caption text-text-secondary">
        <span>색이 진할수록 그날 많이 지원했어요</span>
        <span className="flex items-center gap-1" aria-hidden="true">
          적음
          {LEGEND.map((className) => (
            <span key={className} className={`h-3 w-3 rounded-sm ${className}`} />
          ))}
          많음
        </span>
      </div>
    </DashboardCard>
  );
}
