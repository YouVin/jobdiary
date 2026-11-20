import { clsx } from 'clsx';
import { useId, useState } from 'react';
import { PlatformBadge } from '@/components/badge/PlatformBadge';
import { Icon } from '@/components/common/Icon';
import { DashboardCard } from '@/components/dashboard/DashboardCard';
import { STATUS_DOT_CLASS, STATUS_INFO } from '@/constants/status';
import type { Application } from '@/types/application';
import type { CalendarDay, MonthCalendar } from '@/utils/applicationStats';

interface CalendarCardProps {
  calendar: MonthCalendar;
  applications: Application[]; // 날짜 목록에 보일 지원 (단계는 낙관적 반영 값)
  onSelect: (applicationId: string) => void; // 목록의 회사를 누르면 상세 패널
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

// 날짜 칸 말풍선 (#184). 마우스를 올리면 바로 보인다. 지원이 없는 날은 탭(포커스)해도 보이고,
// 지원이 있는 날(버튼)은 키보드 포커스에만 보인다. 탭·클릭하면 말풍선 대신 아래 회사 목록이 열린다(#190).
// 화면 읽기 프로그램은 칸의 aria-label로 읽으므로 말풍선은 숨긴다.
function DayTooltip({ month, day, dayIndex }: { month: number; day: CalendarDay; dayIndex: number }) {
  const names = day.companies.slice(0, TOOLTIP_NAME_LIMIT);
  const restCount = day.companies.length - names.length;
  return (
    <span
      aria-hidden="true"
      className={clsx(
        'pointer-events-none absolute bottom-full z-10 mb-2 hidden w-max max-w-40 flex-col gap-1 rounded-lg bg-text-primary px-3 py-2 text-left text-caption text-on-brand shadow-float group-hover:flex',
        day.count > 0 ? 'group-focus-visible:flex' : 'group-focus:flex',
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

interface DayApplicationsProps {
  id: string;
  label: string;
  applications: Application[];
  onSelect: CalendarCardProps['onSelect'];
  onClose: () => void;
}

// 고른 날짜에 지원한 회사 목록 (#190). 회사를 누르면 상세 패널(기록 남기기·정보 수정)이 열린다.
function DayApplications({ id, label, applications, onSelect, onClose }: DayApplicationsProps) {
  return (
    <div id={id} role="region" aria-label={`${label} 지원 목록`} className="mt-3 rounded-section bg-column p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-label font-semibold text-text-primary">
          {label} · 지원 {applications.length}건
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="날짜 목록 닫기"
          className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted hover:bg-card hover:text-text-primary focus-visible:outline-2 focus-visible:outline-brand"
        >
          <Icon name="close" className="h-4 w-4" />
        </button>
      </div>
      <ul className="flex flex-col gap-1">
        {applications.map((application) => (
          <li key={application.id}>
            <button
              type="button"
              onClick={() => onSelect(application.id)}
              aria-label={`${application.company} ${application.position}, 기록·상세 보기`}
              className="flex w-full items-center gap-3 rounded-lg bg-card px-3 py-2 text-left hover:bg-brand-tint focus-visible:outline-2 focus-visible:outline-brand"
            >
              <span className="min-w-0 flex-1">
                <b className="block truncate text-small font-semibold text-text-primary">{application.company}</b>
                <span className="block truncate text-caption text-text-muted">{application.position}</span>
              </span>
              <PlatformBadge platform={application.platform} />
              <span className="flex shrink-0 items-center gap-1 text-caption text-text-secondary">
                <span className={clsx('h-2 w-2 rounded-full', STATUS_DOT_CLASS[application.status])} aria-hidden="true" />
                {STATUS_INFO[application.status].label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

// 이번 달 어느 날 지원했는지 보여주는 일기장 달력. 날짜별 건수는 칸의 접근성 이름으로 읽는다.
// - 지원이 있는 지난 날짜·오늘 칸은 버튼이다. 누르면 아래에 그날 지원한 회사 목록을 열고, 다시 누르면 접는다(#190).
// - 지원이 없는 지난 날짜 칸은 tabIndex -1로 탭(클릭) 포커스만 받아 말풍선을 연다. Tab 순서에는 넣지 않는다.
export function CalendarCard({ calendar, applications, onSelect }: CalendarCardProps) {
  const title = `${calendar.month}월 지원 달력`;
  const listId = useId();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // 고른 날짜의 지원. 삭제 등으로 비면 목록을 그리지 않는다.
  let selectedDay: CalendarDay | null = null;
  for (const week of calendar.weeks) {
    for (const day of week) {
      if (day && day.date === selectedDate) selectedDay = day;
    }
  }
  const selectedApplications: Application[] = [];
  for (const applicationId of selectedDay?.applicationIds ?? []) {
    const application = applications.find((item) => item.id === applicationId);
    if (application) selectedApplications.push(application);
  }

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
              {week.map((day, dayIndex) => {
                if (!day) return <td key={dayIndex} className="p-0" />;
                const isSelected = selectedDate === day.date;
                const isClickable = !day.isFuture && day.count > 0;
                return (
                  <td key={dayIndex} className="p-0">
                    {isClickable ? (
                      <button
                        type="button"
                        aria-label={`${calendar.month}월 ${day.day}일 지원 ${day.count}건`}
                        aria-current={day.isToday ? 'date' : undefined}
                        aria-pressed={isSelected}
                        aria-controls={isSelected ? listId : undefined}
                        onClick={() => setSelectedDate(isSelected ? null : day.date)}
                        className={clsx(
                          'group relative flex h-8 w-full items-start rounded-md p-1 text-badge tabular-nums focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand',
                          cellClass(day),
                          // 고른 날짜는 브랜드색 테두리. 오늘을 고르면 오늘 테두리 대신 이 색을 쓴다(오늘은 aria-current로 남는다).
                          isSelected && 'outline-2 outline-offset-1 outline-brand',
                          !isSelected && day.isToday && 'outline-2 outline-offset-1 outline-text-primary',
                        )}
                      >
                        {day.day}
                        <DayTooltip month={calendar.month} day={day} dayIndex={dayIndex} />
                      </button>
                    ) : (
                      <span
                        aria-label={day.isFuture ? `${calendar.month}월 ${day.day}일` : `${calendar.month}월 ${day.day}일 지원 0건`}
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
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {selectedDay && selectedApplications.length > 0 && (
        <DayApplications
          id={listId}
          label={`${calendar.month}월 ${selectedDay.day}일`}
          applications={selectedApplications}
          onSelect={onSelect}
          onClose={() => setSelectedDate(null)}
        />
      )}
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-caption text-text-secondary">
        <span>색이 진할수록 많이 지원한 날이에요. 날짜를 누르면 회사 목록이 열려요</span>
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
