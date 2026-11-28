import { clsx } from 'clsx';
import type { ReactNode } from 'react';

// 디자인 시스템 달력 칸 (#201, #203). 칸마다 큰 정보 하나만 적는다(토스 소비 캘린더 방식).
// - 지난날: 날짜 아래 그날 지원한 곳 수. 지원한 날은 selected 바탕, 가장 많이 지원한 날 하나만 action 파랑.
// - 오늘: 마리골드 원(today). 앞날: 숫자 대신 일정 점(면접 파랑, 공고 마감 회색).
// 달력 아래에 범례(숫자·면접·공고 마감)를 꼭 둔다. 칸마다 일정 이름을 넣지 않는다.
export type CalendarEvent = 'interview' | 'deadline';

interface CalendarCellProps {
  day: number;
  fullLabel: string; // 스크린리더용 날짜 (예: 11월 18일 수요일)
  count?: number; // 그날 지원한 곳 수
  isTop?: boolean; // 이 달에 가장 많이 지원한 날
  isToday?: boolean;
  events?: CalendarEvent[];
  onSelect?: () => void; // 주면 버튼이 된다 (그날 회사 목록 열기)
  isSelected?: boolean; // 버튼일 때 지금 목록이 열린 날 (aria-pressed)
  controls?: string; // 버튼이 여닫는 목록 id
  tooltip?: ReactNode; // 마우스를 올리거나 키보드로 왔을 때 보이는 말풍선 (장식, 스크린리더는 칸 이름으로 읽는다)
  tooltipAlign?: 'start' | 'center' | 'end'; // 말풍선이 카드 밖으로 나가지 않게 맞출 쪽
  news?: string; // 그날 생긴 일(예: 서류 통과). 주면 칸 모서리에 작은 점을 찍고 칸 이름에 붙여 읽는다(돌아보기, #316)
}

const EVENT_CLASS: Record<CalendarEvent, string> = { interview: 'bg-event-interview', deadline: 'bg-event-deadline' };
const EVENT_LABEL: Record<CalendarEvent, string> = { interview: '면접', deadline: '공고 마감' };
const TOOLTIP_ALIGN = { start: 'left-0', center: 'left-1/2 -translate-x-1/2', end: 'right-0' } as const;

export function CalendarCell({
  day, fullLabel, count = 0, isTop = false, isToday = false, events = [], onSelect, isSelected = false, controls, tooltip, tooltipAlign = 'center', news,
}: CalendarCellProps) {
  // "11월 18일 수요일, 오늘, 지원 3곳, 면접 1개"처럼 칸 하나를 한 문장으로 읽는다.
  const parts = [fullLabel];
  if (isToday) parts.push('오늘');
  if (count > 0) parts.push(`지원 ${count}곳`);
  for (const kind of ['interview', 'deadline'] as const) {
    const n = events.filter((event) => event === kind).length;
    if (n > 0) parts.push(`${EVENT_LABEL[kind]} ${n}개`);
  }
  if (news) parts.push(news);

  const className = clsx(
    'group relative flex h-11 w-full flex-col items-center justify-center gap-px rounded-sm text-label leading-tight tabular-nums',
    isTop ? 'bg-action-primary text-text-on-color' : count > 0 ? 'bg-selected text-text-primary' : 'text-text-secondary',
    onSelect && 'cursor-pointer transition-colors duration-fast focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring',
    onSelect && !isTop && 'hover:bg-muted',
    // 목록이 열린 날은 진한 테두리로 표시한다(색만이 아니라 두께로도).
    isSelected && 'ring-2 ring-inset ring-text-primary',
  );

  const content = (
    <>
      {/* 그날 생긴 일: 지원한 날은 칸 모서리 작은 점(파랑 칸 위에서도 보이게 흰 테두리), 지원 없는 날은 숫자 자리에 점 */}
      {news && count > 0 && <span aria-hidden="true" className="absolute top-1 right-1 h-2 w-2 rounded-full bg-action-primary ring-2 ring-surface" />}
      {isToday ? (
        <span className="grid h-7 w-7 place-items-center rounded-full bg-today font-bold text-text-primary">{day}</span>
      ) : (
        <span>{day}</span>
      )}
      {count > 0 && <span className={clsx('text-caption', isTop ? 'text-text-on-color' : 'text-text-brand-strong')}>{count}</span>}
      {count === 0 && news && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-action-primary" />}
      {count === 0 && !news && events.length > 0 && (
        <span className="flex gap-1">
          {events.slice(0, 3).map((event, index) => (
            <span key={`${event}-${index}`} className={clsx('h-2 w-2 rounded-full', EVENT_CLASS[event])} />
          ))}
        </span>
      )}
      {tooltip && (
        <span
          aria-hidden="true"
          className={clsx(
            'pointer-events-none absolute bottom-full z-dropdown mb-2 hidden w-max max-w-44 flex-col gap-1 rounded-sm bg-inverse px-3 py-2 text-left text-caption font-normal text-text-on-color shadow-md group-hover:flex group-focus-visible:flex',
            TOOLTIP_ALIGN[tooltipAlign],
          )}
        >
          {tooltip}
        </span>
      )}
    </>
  );

  if (onSelect) {
    return (
      <button
        type="button"
        onClick={onSelect}
        aria-label={parts.join(', ')}
        aria-current={isToday ? 'date' : undefined}
        aria-pressed={isSelected}
        aria-controls={isSelected ? controls : undefined}
        className={className}
      >
        {content}
      </button>
    );
  }
  return (
    <div role="img" aria-label={parts.join(', ')} aria-current={isToday ? 'date' : undefined} className={className}>
      {content}
    </div>
  );
}
