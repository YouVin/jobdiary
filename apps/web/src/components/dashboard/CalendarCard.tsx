'use client';

import { useId, useMemo, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { CalendarCell } from '@/components/ui/CalendarCell';
import { CompanyRow, RowList } from '@/components/ui/CompanyRow';
import { IconButton } from '@/components/ui/IconButton';
import { STATUS_INFO } from '@/constants/status';
import type { Application } from '@/types/application';
import { type CalendarDay, getMonthCalendar, shiftMonth } from '@/utils/applicationStats';

interface CalendarCardProps {
  today: string;
  applications: Application[]; // 단계는 낙관적 반영 값
  onSelect: (applicationId: string) => void; // 목록의 회사를 누르면 상세 패널
  style?: React.CSSProperties;
}

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];
const TOOLTIP_NAME_LIMIT = 3;

// 말풍선이 카드 밖으로 나가지 않게 월·화는 왼쪽, 토·일은 오른쪽에 맞춘다.
function tooltipAlign(dayIndex: number): 'start' | 'center' | 'end' {
  if (dayIndex <= 1) return 'start';
  if (dayIndex >= 5) return 'end';
  return 'center';
}

function DayTooltip({ month, day }: { month: number; day: CalendarDay }) {
  const names = day.companies.slice(0, TOOLTIP_NAME_LIMIT);
  const rest = day.companies.length - names.length;
  return (
    <>
      <span className="font-semibold whitespace-nowrap">
        {month}월 {day.day}일 · 지원 {day.count}곳
      </span>
      {names.map((name, index) => (
        <span key={index} className="truncate">
          {name}
        </span>
      ))}
      {rest > 0 && <span>외 {rest}곳</span>}
    </>
  );
}

// 지원 달력 (#203, 캔버스 메인 시안). 칸마다 그날 지원한 곳 수, 가장 많이 지원한 날 하나만 파랑, 오늘은 마리골드 원,
// 앞날에는 면접·공고 마감 점. 지난달·다음 달로 옮길 수 있다.
// - 지원한 날은 버튼: 누르면 아래에 그날 회사 목록(#190)이 열리고, 회사를 누르면 상세 패널. 마우스를 올리면 회사 이름 말풍선(#184).
// - 칸 이름은 "11월 18일 수요일, 오늘, 지원 3곳, 면접 1개"처럼 한 문장으로 읽는다.
export function CalendarCard({ today, applications, onSelect, style }: CalendarCardProps) {
  // ── 상태: 보는 달·고른 날짜 ──
  const currentMonth = today.slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const listId = useId();
  const calendar = useMemo(() => getMonthCalendar(applications, today, month), [applications, today, month]);

  const isCurrentMonth = month === currentMonth;
  const isOtherYear = calendar.year !== Number(today.slice(0, 4));
  const monthName = isOtherYear ? `${calendar.year}년 ${calendar.month}월` : `${calendar.month}월`;

  // ── 고른 날짜의 지원 목록 ──
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

  // ── 처리 함수 ──
  const moveMonth = (offset: number) => {
    setMonth((value) => shiftMonth(value, offset));
    setSelectedDate(null);
  };

  return (
    <Card aria-labelledby="calendar-title" className="h-full motion-safe:animate-rise" style={style}>
      {/* ── 머리: 달 이동·제목 | 이번 달로·이번 달 건수 ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="-ml-3 flex items-center gap-1">
          <IconButton label="지난달" icon="chevron-left" size="sm" onClick={() => moveMonth(-1)} />
          <h2 id="calendar-title" aria-live="polite" className="text-title-3 text-text-primary">
            {monthName} 지원 달력
          </h2>
          <IconButton label="다음 달" icon="chevron-right" size="sm" onClick={() => moveMonth(1)} />
        </div>
        <span className="flex shrink-0 items-center gap-2 text-label text-text-secondary tabular-nums">
          {!isCurrentMonth && (
            <button
              type="button"
              onClick={() => {
                setMonth(currentMonth);
                setSelectedDate(null);
              }}
              className="cursor-pointer rounded-xs font-semibold text-text-brand hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
            >
              이번 달
            </button>
          )}
          {isCurrentMonth ? '이번 달' : `${calendar.month}월`} {calendar.monthTotal}건
        </span>
      </div>

      {/* ── 달력: 요일 머리 → 날짜 칸(지원 수·일정 점·말풍선) ── */}
      <div role="group" aria-label={`${calendar.year}년 ${calendar.month}월 날짜별 지원`} className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((weekday) => (
          <span key={weekday} aria-hidden="true" className="pb-1 text-center text-caption font-normal text-text-secondary">
            {weekday}
          </span>
        ))}
        {calendar.weeks.flatMap((week, weekIndex) =>
          week.map((day, dayIndex) => {
            if (!day) return <span key={`${weekIndex}-${dayIndex}`} aria-hidden="true" />;
            const fullLabel = `${calendar.month}월 ${day.day}일 ${WEEKDAYS[dayIndex]}요일`;
            const isClickable = !day.isFuture && day.count > 0;
            const isSelected = selectedDate === day.date;
            return (
              <CalendarCell
                key={day.date}
                day={day.day}
                fullLabel={fullLabel}
                count={day.count}
                isTop={day.date === calendar.topDate}
                isToday={day.isToday}
                events={day.events}
                onSelect={isClickable ? () => setSelectedDate(isSelected ? null : day.date) : undefined}
                isSelected={isSelected}
                controls={listId}
                tooltip={isClickable ? <DayTooltip month={calendar.month} day={day} /> : undefined}
                tooltipAlign={tooltipAlign(dayIndex)}
              />
            );
          }),
        )}
      </div>

      {/* ── 고른 날짜의 회사 목록(누르면 상세 패널) ── */}
      {selectedDay && selectedApplications.length > 0 && (
        <div id={listId} role="region" aria-labelledby={`${listId}-title`} className="flex flex-col rounded-md bg-subtle px-4 pt-3 pb-1">
          <div className="flex items-center justify-between gap-2">
            <h3 id={`${listId}-title`} className="text-label font-semibold text-text-primary">
              {calendar.month}월 {selectedDay.day}일 · 지원 {selectedApplications.length}곳
            </h3>
            <IconButton label="날짜 목록 닫기" icon="close" size="sm" className="-mr-2" onClick={() => setSelectedDate(null)} />
          </div>
          <RowList>
            {selectedApplications.map((application) => (
              <CompanyRow
                key={application.id}
                company={application.company}
                platform={application.platform}
                description={`${application.position} · ${STATUS_INFO[application.status].label}`}
                onOpen={() => onSelect(application.id)}
                openLabel={`${application.company} ${application.position}, 기록·상세 보기`}
              />
            ))}
          </RowList>
        </div>
      )}

      {/* ── 범례 ── */}
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-caption font-normal text-text-secondary" aria-hidden="true">
        <span>
          <b className="font-semibold text-text-brand-strong">2</b> 그날 지원한 곳
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-event-interview" />
          면접
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-event-deadline" />
          공고 마감
        </span>
        <span>날짜를 누르면 그날 회사가 보여요</span>
      </div>
    </Card>
  );
}
