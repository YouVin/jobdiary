'use client';

import { useState } from 'react';
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
// 처음에는 가까운 4건만, "나머지 N건 보기"로 그 자리에서 모두 펼친다. D-day 뱃지만 마리골드다.
export function UpcomingCard({ today, events, onSelect, limit = 4, style }: UpcomingCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
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
      <CardHeader title="다가오는 일정" titleId="upcoming-title" meta={`${events.length}건`} />
      {events.length === 0 ? (
        <EmptyState title="다가오는 일정이 없어요" description="면접일이나 공고 마감일을 기록하면 여기에 보여드려요" />
      ) : (
        <div className="flex flex-col gap-3">
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
        </div>
      )}
      {(hiddenCount > 0 || isExpanded) && events.length > limit && (
        <Button variant="text" size="sm" className="mt-auto self-start" aria-expanded={isExpanded} onClick={() => setIsExpanded((value) => !value)}>
          {isExpanded ? '접기' : `나머지 ${hiddenCount}건 보기`}
        </Button>
      )}
    </Card>
  );
}
