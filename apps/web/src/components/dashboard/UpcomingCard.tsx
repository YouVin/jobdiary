'use client';

import { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader } from '@/components/ui/Card';
import { CompanyRow, RowList } from '@/components/ui/CompanyRow';
import { EmptyState } from '@/components/ui/EmptyState';
import { getUpcomingWeekLabel, type UpcomingEvent } from '@/utils/applicationStats';

interface UpcomingCardProps {
  today: string;
  events: UpcomingEvent[]; // 가까운 순
  onSelect: (applicationId: string) => void; // 상세 패널 열기
  limit?: number;
  style?: React.CSSProperties;
}

const KIND_LABEL: Record<UpcomingEvent['kind'], string> = { interview: '면접', deadline: '공고 마감' };
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function shortDate(date: string): string {
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00.000Z`).getUTCDay()];
  return `${date.slice(5, 7)}.${date.slice(8, 10)} ${weekday}`;
}

// 다가오는 일정 (#203): 주별로 묶은 회사 한 줄 목록. 줄을 누르면 지원 보드와 같은 상세 패널이 열린다.
// 처음에는 가까운 4건만, "나머지 N건 보기"로 모두 펼친다. D-day 뱃지만 마리골드다.
// 태블릿·PC에서는 같은 줄 카드(주간 지원·달력)가 함께 늘어나지 않도록 펼친 목록을 카드 안에서 스크롤한다(#320).
export function UpcomingCard({ today, events, onSelect, limit = 4, style }: UpcomingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  // 펼치기 직전 목록 높이. 펼친 목록은 이 높이 이상을 차지해 줄 높이가 펼치기 전과 같다
  const listRef = useRef<HTMLDivElement>(null);
  const [collapsedHeight, setCollapsedHeight] = useState<number | null>(null);
  // 펼친 목록 아래에 더 있는지. 있으면 아래 끝을 흐리게 해 스크롤할 수 있다는 것을 보여 준다
  const [hasMoreBelow, setHasMoreBelow] = useState(false);
  const checkMoreBelow = (element: HTMLElement) => setHasMoreBelow(element.scrollTop + element.clientHeight < element.scrollHeight - 1);
  useEffect(() => {
    const element = listRef.current;
    if (!isExpanded || !element) return;
    // 크기가 정해지거나 바뀔 때(처음 펼칠 때·창 크기 변경) 다시 잰다
    const observer = new ResizeObserver(() => checkMoreBelow(element));
    observer.observe(element);
    return () => observer.disconnect();
  }, [isExpanded]);
  const visible = isExpanded ? events : events.slice(0, limit);
  const hiddenCount = events.length - visible.length;

  // 주 이름이 같은 일정끼리 묶는다(이미 날짜순이라 이어진 것끼리).
  const groups: { label: string; events: UpcomingEvent[] }[] = [];
  for (const event of visible) {
    const label = getUpcomingWeekLabel(event.date, today);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.events.push(event);
    else groups.push({ label, events: [event] });
  }

  return (
    <Card aria-labelledby="upcoming-title" className="h-full motion-safe:animate-rise" style={style}>
      {/* ── 머리 ── */}
      <CardHeader title="다가오는 일정" titleId="upcoming-title" meta={`${events.length}건`} />
      {/* ── 기간별(오늘·이번 주·그 뒤) 일정 목록, 없으면 빈 상태 ── */}
      {events.length === 0 ? (
        <EmptyState title="다가오는 일정이 없어요" description="면접일이나 공고 마감일을 넣으면 여기에 보여요" />
      ) : (
        <div
          ref={listRef}
          // md 이상: contain-size로 목록 길이가 줄 높이에 영향을 주지 않게 하고, 남은 높이 안에서 스크롤
          className={clsx('flex flex-col gap-3', isExpanded && 'md:flex-1 md:overflow-y-auto md:contain-size')}
          style={isExpanded && collapsedHeight ? { minHeight: collapsedHeight } : undefined}
          onScroll={isExpanded ? (event) => checkMoreBelow(event.currentTarget) : undefined}
        >
          {groups.map((group) => (
            <div key={group.label} className="flex flex-col">
              <h3 className="text-label font-semibold text-text-secondary">{group.label}</h3>
              <RowList>
                {group.events.map((event) => {
                  const isToday = event.daysLeft === 0;
                  const dday = isToday ? 'D-DAY' : `D-${event.daysLeft}`;
                  const kind = KIND_LABEL[event.kind];
                  return (
                    <CompanyRow
                      key={`${event.applicationId}-${event.kind}`}
                      company={event.company}
                      platform={event.platform}
                      description={`${shortDate(event.date)} · ${kind}`}
                      trailing={<Badge tone={isToday ? 'today' : 'default'}>{dday}</Badge>}
                      onOpen={() => onSelect(event.applicationId)}
                      openLabel={`${event.company} ${kind}, ${shortDate(event.date)}요일, ${dday}. 상세 보기`}
                    />
                  );
                })}
              </RowList>
            </div>
          ))}
          {/* 아래 끝 흐림: 목록 끝(간격 12px 뒤, 마지막 줄 아래 48px)에 겹쳐 있다가 스크롤 중에는 보이는 영역 아래에 머문다 */}
          {isExpanded && hasMoreBelow && <div aria-hidden="true" className="pointer-events-none sticky bottom-0 -mt-15 h-12 shrink-0 bg-linear-to-t from-surface" />}
        </div>
      )}
      {/* ── 나머지 펼치기 ── */}
      {(hiddenCount > 0 || isExpanded) && events.length > limit && (
        <Button
          variant="text"
          size="sm"
          className="self-start"
          aria-expanded={isExpanded}
          onClick={() => {
            if (!isExpanded) setCollapsedHeight(listRef.current?.getBoundingClientRect().height ?? null);
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? '접기' : `나머지 ${hiddenCount}건 보기`}
        </Button>
      )}
    </Card>
  );
}
