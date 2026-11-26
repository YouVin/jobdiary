import { clsx } from 'clsx';
import { ViewTransition } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { CompanyRow, RowList } from '@/components/ui/CompanyRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { IconButton } from '@/components/ui/IconButton';
import { daysBetween } from '@/utils/applicationStats';
import type { WeekDay, WeekEvent, WeekTimeline as Timeline } from '@/utils/weekTimeline';

interface WeekTimelineProps {
  timeline: Timeline;
  today: string;
  offset: number;
  onOffsetChange: (offset: number) => void;
  onSelect: (applicationId: string) => void;
}

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];
const KIND_LABEL: Record<WeekEvent['kind'], string> = { interview: '면접', deadline: '공고 마감' };
const KIND_DOT: Record<WeekEvent['kind'], string> = { interview: 'bg-event-interview', deadline: 'bg-event-deadline' };

function shortDate(date: string): string {
  return `${Number(date.slice(5, 7))}.${Number(date.slice(8, 10))}`;
}

export function weekTitle(offset: number): string {
  if (offset === 0) return '이번 주';
  if (offset === -1) return '지난주';
  if (offset === 1) return '다음 주';
  return offset > 0 ? `${offset}주 뒤` : `${-offset}주 전`;
}

function dayHeading(day: WeekDay): string {
  const base = `${Number(day.date.slice(5, 7))}월 ${day.dayOfMonth}일 ${WEEKDAYS[day.weekdayIndex]}요일`;
  return day.isToday ? `${base} · 오늘` : base;
}

// 지원 보드 주간 일정 (#204, 캔버스 주간 시안).
// 위: 요일 띠(그 주 7일, 일정 있는 날은 옅은 회색 판 + 점, 오늘은 마리골드 원) — 한눈에 보는 장식이라 스크린리더는 아래 목록을 읽는다.
// 아래: 날짜별 회사 한 줄 목록. 줄을 누르면 상세 패널. 지난날 일정은 흐리게 두지 않고 D-day 대신 "지남"으로 쓴다.
export function WeekTimeline({ timeline, today, offset, onOffsetChange, onSelect }: WeekTimelineProps) {
  const eventDays = timeline.days.filter((day) => day.events.length > 0);

  return (
    <Card aria-labelledby="week-title">
      {/* ── 머리: 주 이름·날짜 범위 | 범례·주 이동 ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 id="week-title" className="text-title-3 text-text-primary">
            {weekTitle(offset)}
          </h2>
          <span className="text-label text-text-secondary tabular-nums">
            {shortDate(timeline.start)} – {shortDate(timeline.end)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex gap-3 text-caption font-normal text-text-secondary" aria-hidden="true">
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-event-interview" />
              면접
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-event-deadline" />
              공고 마감
            </span>
          </span>
          <div role="group" aria-label="주 이동" className="flex items-center gap-1 rounded-md bg-muted p-1">
            <IconButton label="이전 주" icon="chevron-left" size="sm" onClick={() => onOffsetChange(offset - 1)} />
            <button
              type="button"
              onClick={() => onOffsetChange(0)}
              aria-disabled={offset === 0 || undefined}
              className={clsx(
                'h-9 rounded-sm px-3 text-label font-semibold transition-colors duration-fast focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
                offset === 0 ? 'cursor-default bg-surface text-text-primary' : 'cursor-pointer text-text-secondary hover:bg-surface hover:text-text-primary',
              )}
            >
              이번 주
            </button>
            <IconButton label="다음 주" icon="chevron-right" size="sm" onClick={() => onOffsetChange(offset + 1)} />
          </div>
        </div>
      </div>

      {/* 주를 옮기면 key가 바뀌어 이전 주와 새 주가 전환 타입(week-forward/back) 방향으로 넘어간다(#176). */}
      <ViewTransition
        key={timeline.start}
        name="week-days"
        share={{ 'week-forward': 'week-forward', 'week-back': 'week-back', default: 'none' }}
        default="none"
      >
        <div className="flex flex-col gap-4">
          {/* ── 요일 띠(장식, 스크린리더는 아래 목록을 읽음) ── */}
          <ol aria-hidden="true" className="grid grid-cols-7 gap-1">
            {timeline.days.map((day) => (
              <li
                key={day.date}
                className={clsx(
                  'flex h-16 flex-col items-center justify-center gap-1 rounded-sm tabular-nums',
                  day.events.length > 0 && 'bg-subtle',
                )}
              >
                <span className={clsx('text-caption font-normal', day.events.length > 0 ? 'text-text-primary' : 'text-text-secondary')}>
                  {WEEKDAYS[day.weekdayIndex]}
                </span>
                {day.isToday ? (
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-today text-body font-bold text-text-primary">{day.dayOfMonth}</span>
                ) : (
                  <span className={clsx('text-title-3', day.events.length > 0 ? 'text-text-primary' : 'text-text-secondary')}>{day.dayOfMonth}</span>
                )}
                {day.events.length > 0 && (
                  <span className="flex gap-1">
                    {day.events.slice(0, 3).map((event) => (
                      <span key={`${event.applicationId}-${event.kind}`} className={clsx('h-2 w-2 rounded-full', KIND_DOT[event.kind])} />
                    ))}
                  </span>
                )}
              </li>
            ))}
          </ol>

          {/* ── 날짜별 일정 목록(없으면 빈 상태) ── */}
          {eventDays.length === 0 ? (
            <EmptyState
              title={`${weekTitle(offset)}에는 잡힌 일정이 없어요`}
              description="면접일이나 공고 마감일을 기록하면 날짜별로 보여드려요"
            />
          ) : (
            <div className="flex flex-col gap-4 border-t border-line-divider pt-3">
              {eventDays.map((day) => (
                <div key={day.date} className="flex flex-col">
                  <h3 className={clsx('text-label font-semibold', day.isToday ? 'text-today-text' : 'text-text-secondary')}>{dayHeading(day)}</h3>
                  <RowList>
                    {day.events.map((event) => {
                      const daysLeft = daysBetween(today, day.date);
                      const dday = daysLeft === 0 ? 'D-DAY' : daysLeft > 0 ? `D-${daysLeft}` : '지남';
                      return (
                        <CompanyRow
                          key={`${event.applicationId}-${event.kind}`}
                          company={event.company}
                          platform={event.platform}
                          description={`${KIND_LABEL[event.kind]} · ${event.position}`}
                          trailing={<Badge tone={daysLeft === 0 ? 'today' : 'default'}>{dday}</Badge>}
                          onOpen={() => onSelect(event.applicationId)}
                          openLabel={`${event.company} ${KIND_LABEL[event.kind]}, ${dayHeading(day)}, ${dday}. 상세 보기`}
                        />
                      );
                    })}
                  </RowList>
                </div>
              ))}
            </div>
          )}
        </div>
      </ViewTransition>

      {/* ── 이 주 뒤 일정 안내 ── */}
      {timeline.laterCount > 0 && (
        <p className="text-label text-text-secondary">
          이 주 뒤에도 일정이 {timeline.laterCount}건 더 있어요.{' '}
          <button
            type="button"
            onClick={() => onOffsetChange(offset + 1)}
            className="cursor-pointer rounded-xs font-semibold text-text-brand hover:underline focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring"
          >
            다음 주 보기
          </button>
        </p>
      )}
    </Card>
  );
}
