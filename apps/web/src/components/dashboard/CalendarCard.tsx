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

const TOOLTIP_NAME_LIMIT = 3;

// 말풍선이 카드 밖으로 나가지 않게 월·화는 왼쪽, 토·일은 오른쪽에 맞추고 나머지는 가운데에 둔다.
function tooltipAlignClass(dayIndex: number): string {
  if (dayIndex <= 1) return 'left-0';
  if (dayIndex >= 5) return 'right-0';
  return 'left-1/2 -translate-x-1/2';
}

// 날짜 칸 말풍선 (#184). 마우스를 올리면 바로, 터치하면 탭한 칸(포커스)에 보인다.
// 화면 읽기 프로그램은 칸의 aria-label로 읽으므로 말풍선은 숨긴다.
function DayTooltip({ month, day, dayIndex }: { month: number; day: CalendarDay; dayIndex: number }) {
  const names = day.companies.slice(0, TOOLTIP_NAME_LIMIT);
  const restCount = day.companies.length - names.length;
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'pointer-events-none absolute bottom-full z-10 mb-2 hidden w-max max-w-40 flex-col gap-1 rounded-lg bg-text-primary px-3 py-2 text-left text-caption text-on-brand shadow-float group-hover:flex group-focus:flex',
        tooltipAlignClass(dayIndex),
      )}
    >
      <span className="whitespace-nowrap">
        {month}월 {day.day}일 · <b className="font-semibold">{day.count > 0 ? `지원 ${day.count}건` : '지원 없음'}</b>
      </span>
      {names.length > 0 && (
        <span className="flex flex-col">
          {names.map((company, index) => (
            <span key={index} className="truncate">{company}</span>
          ))}
          {restCount > 0 && <span>외 {restCount}건</span>}
        </span>
      )}
    </span>
  );
}

// 이번 달 어느 날 지원했는지 보여주는 읽기 전용 일기장 달력. 칸은 버튼이 아니며 날짜별 건수는 접근성 이름으로 읽는다.
// 지난 날짜 칸은 tabIndex -1로 탭(클릭) 포커스만 받아 말풍선을 연다. Tab 순서에는 넣지 않는다.
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
                      tabIndex={day.isFuture ? undefined : -1}
                      className={clsx(
                        'relative flex h-8 items-start rounded-md p-1 text-badge tabular-nums',
                        !day.isFuture && 'group cursor-default',
                        cellClass(day),
                        day.isToday && 'outline-2 outline-offset-1 outline-text-primary',
                      )}
                    >
                      {day.day}
                      {!day.isFuture && <DayTooltip month={calendar.month} day={day} dayIndex={dayIndex} />}
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
