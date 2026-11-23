import { clsx } from 'clsx';
import { ViewTransition } from 'react';
import { Icon } from '@/components/common/Icon';
import type { WeekDay, WeekEvent, WeekTimeline as Timeline } from '@/utils/weekTimeline';

interface WeekTimelineProps {
  timeline: Timeline;
  offset: number;
  onOffsetChange: (offset: number) => void;
  onSelect: (applicationId: string) => void;
}

const WEEKDAYS = ['월', '화', '수', '목', '금', '토', '일'];
const KIND_LABEL: Record<WeekEvent['kind'], string> = { interview: '면접', deadline: '공고 마감' };
// 일정 종류별 캡슐 색. 면접은 브랜드, 공고 마감은 탈락 상태색. 클래스는 리터럴로 둔다.
const CAPSULE_CLASS: Record<WeekEvent['kind'], string> = {
  // 일정 종류 색은 홈 다가오는 일정과 같다(#197): 면접 보라, 공고 마감 주황.
  interview: 'border-event-interview bg-event-interview-tint text-event-interview-text',
  deadline: 'border-event-deadline bg-event-deadline-tint text-event-deadline-text',
};

function shortDate(date: string): string {
  return `${Number(date.slice(5, 7))}.${date.slice(8, 10)}`;
}

function weekTitle(offset: number): string {
  if (offset === 0) return '이번 주';
  if (offset === -1) return '지난주';
  if (offset === 1) return '다음 주';
  return offset > 0 ? `${offset}주 뒤` : `${-offset}주 전`;
}

function dayLabel(day: WeekDay): string {
  const base = `${Number(day.date.slice(5, 7))}월 ${day.dayOfMonth}일 ${WEEKDAYS[day.weekdayIndex]}요일`;
  const parts = [day.isToday ? `${base}, 오늘` : base];
  if (day.events.length) parts.push(`일정 ${day.events.length}건`);
  if (day.appliedCount) parts.push(`지원 ${day.appliedCount}건`);
  return parts.join(', ');
}

function Capsule({ event, onSelect, dimmed }: { event: WeekEvent; onSelect: (id: string) => void; dimmed: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(event.applicationId)}
      aria-label={`${event.company} ${KIND_LABEL[event.kind]}, 상세 보기`}
      title={`${event.company} · ${event.position}`}
      className={clsx(
        'flex w-full min-w-0 flex-col rounded-sm border-l-4 px-2 py-2 text-left transition-transform hover:-translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand',
        CAPSULE_CLASS[event.kind],
        dimmed && 'opacity-50',
      )}
    >
      <span className="truncate text-caption font-bold">{event.company}</span>
      <span className="text-caption">{KIND_LABEL[event.kind]}</span>
    </button>
  );
}

function AppliedFoot({ count }: { count: number }) {
  if (!count) return null;
  return (
    <p className="mt-auto flex items-center gap-2 border-t border-dashed border-card-border pt-2 text-caption text-text-muted">
      <span className="flex gap-1" aria-hidden="true">
        {Array.from({ length: Math.min(count, 4) }).map((_, index) => (
          <span key={index} className="h-1 w-1 rounded-full bg-text-muted" />
        ))}
      </span>
      <span>
        지원 <b className="font-semibold text-text-secondary tabular-nums">{count}건</b>
      </span>
    </p>
  );
}

// 지원보드 위쪽의 주간 일정. 데스크톱은 월~일 7칸, 모바일은 오늘과 일정이 있는 날만 세로로 보여준다.
export function WeekTimeline({ timeline, offset, onOffsetChange, onSelect }: WeekTimelineProps) {
  const agendaDays = timeline.days.filter((day) => day.events.length > 0 || day.isToday);

  return (
    <section aria-labelledby="week-title" className="mb-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <h2 id="week-title" className="text-heading-md font-semibold text-text-primary">{weekTitle(offset)}</h2>
          <span className="text-small text-text-muted tabular-nums">
            {shortDate(timeline.start)} – {shortDate(timeline.end)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <ul className="flex flex-wrap gap-3 text-caption text-text-secondary" aria-label="표시 안내">
            <li className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-event-interview" aria-hidden="true" />면접</li>
            <li className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-event-deadline" aria-hidden="true" />공고 마감</li>
            <li className="flex items-center gap-1"><span className="h-1 w-1 rounded-full bg-text-muted" aria-hidden="true" />그날 지원</li>
          </ul>
          <div className="flex items-center gap-1 rounded-sm border border-card-border bg-card p-1" role="group" aria-label="주 이동">
            <button
              type="button"
              onClick={() => onOffsetChange(offset - 1)}
              aria-label="이전 주"
              className="flex h-8 w-8 items-center justify-center rounded-sm text-text-secondary hover:bg-column hover:text-text-primary focus-visible:outline-2 focus-visible:outline-brand"
            >
              <Icon name="chevron-left" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onOffsetChange(0)}
              disabled={offset === 0}
              className="h-8 rounded-sm px-3 text-label text-text-secondary hover:bg-column hover:text-text-primary focus-visible:outline-2 focus-visible:outline-brand disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent"
            >
              이번 주
            </button>
            <button
              type="button"
              onClick={() => onOffsetChange(offset + 1)}
              aria-label="다음 주"
              className="flex h-8 w-8 items-center justify-center rounded-sm text-text-secondary hover:bg-column hover:text-text-primary focus-visible:outline-2 focus-visible:outline-brand"
            >
              <Icon name="chevron-right" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 주를 옮기면 key가 바뀌어 이전 주와 새 주가 전환 타입(week-forward/back) 방향으로 넘어간다. */}
      <ViewTransition
        key={timeline.start}
        name="week-days"
        share={{ 'week-forward': 'week-forward', 'week-back': 'week-back', default: 'none' }}
        default="none"
      >
        <div>
          <ol className="hidden grid-cols-7 gap-2 md:grid">
            {timeline.days.map((day) => (
              <li
                key={day.date}
                aria-label={dayLabel(day)}
                className={clsx(
                  'flex min-h-48 min-w-0 flex-col gap-2 rounded-card border bg-card p-3',
                  day.isToday ? 'border-brand shadow-card ring-1 ring-brand' : 'border-card-border',
                  day.weekdayIndex >= 5 && !day.isToday && 'bg-page',
                )}
              >
                <div className={clsx('flex items-baseline justify-between gap-1', day.isPast && 'opacity-50')}>
                  <span className="text-label text-text-muted">{WEEKDAYS[day.weekdayIndex]}</span>
                  {/* 태블릿 폭에서는 칸이 좁아 숫자와 겹친다. 오늘은 테두리와 숫자 색으로도 구분된다. */}
                  {day.isToday && <span className="hidden rounded-full bg-brand px-2 text-badge leading-4 text-on-brand lg:inline">오늘</span>}
                  <span className={clsx('text-heading-lg font-bold tabular-nums', day.isToday ? 'text-brand' : 'text-text-primary')}>
                    {day.dayOfMonth}
                  </span>
                </div>
                {day.events.map((event) => (
                  <Capsule key={`${event.applicationId}-${event.kind}`} event={event} onSelect={onSelect} dimmed={day.isPast} />
                ))}
                {!day.events.length && !day.isPast && <p className="text-caption text-text-muted">일정 없음</p>}
                <AppliedFoot count={day.appliedCount} />
              </li>
            ))}
          </ol>

          <ol className="flex flex-col gap-2 md:hidden">
            {agendaDays.map((day) => (
              <li
                key={day.date}
                aria-label={dayLabel(day)}
                className={clsx('grid grid-cols-[48px_minmax(0,1fr)] gap-3 rounded-card border bg-card p-3', day.isToday ? 'border-brand ring-1 ring-brand' : 'border-card-border')}
              >
                <div className="flex flex-col items-center text-caption text-text-muted">
                  {WEEKDAYS[day.weekdayIndex]}
                  <span className={clsx('text-heading-lg font-bold tabular-nums', day.isToday ? 'text-brand' : 'text-text-primary')}>{day.dayOfMonth}</span>
                  {day.isToday && '오늘'}
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                  {day.events.length ? (
                    day.events.map((event) => (
                      <Capsule key={`${event.applicationId}-${event.kind}`} event={event} onSelect={onSelect} dimmed={day.isPast} />
                    ))
                  ) : (
                    <p className="py-2 text-caption text-text-muted">
                      잡힌 일정이 없어요{day.appliedCount ? ` · 지원 ${day.appliedCount}건` : ''}
                    </p>
                  )}
                </div>
              </li>
            ))}
            {!agendaDays.length && <li className="rounded-card bg-column p-4 text-small text-text-secondary">이 주에는 잡힌 일정이 없어요.</li>}
          </ol>
        </div>
      </ViewTransition>

      {timeline.laterCount > 0 && (
        <p className="mt-3 text-caption text-text-muted">이 주 이후에 일정이 {timeline.laterCount}건 더 있어요. 다음 주로 넘겨 보세요.</p>
      )}
    </section>
  );
}
