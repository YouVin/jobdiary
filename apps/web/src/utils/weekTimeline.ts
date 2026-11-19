import type { Application, Status } from '@/types/application';
import { getTodayInKorea } from '@/utils/applicationDeadline';
import { getWeekStart, toDateOnly } from '@/utils/applicationStats';

// 지원 보드 주간 타임라인 (#173). 날짜 기준은 홈 통계와 같다:
// 저장된 날짜는 UTC 날짜(toDateOnly), 오늘은 한국 날짜, 주는 월요일에 시작한다.

export const ACTIVE_STATUSES: Status[] = ['applied', 'screening', 'interview', 'interviewed'];
const DAY_MS = 24 * 60 * 60 * 1000;

export type WeekEventKind = 'interview' | 'deadline';

export interface WeekEvent {
  applicationId: string;
  company: string;
  position: string;
  kind: WeekEventKind;
}

export interface WeekDay {
  date: string; // YYYY-MM-DD
  dayOfMonth: number;
  weekdayIndex: number; // 0 = 월요일 … 6 = 일요일
  events: WeekEvent[]; // 면접 먼저, 같은 종류는 회사명 순
  appliedCount: number; // 그날 지원한 건수 (결과가 나온 지원 포함)
  isToday: boolean;
  isPast: boolean;
}

export interface WeekTimeline {
  start: string; // 월요일
  end: string; // 일요일
  days: WeekDay[];
  interviewCount: number;
  deadlineCount: number;
  laterCount: number; // 이 주 이후에 잡힌 면접·마감 건수
}

export function addDays(date: string, amount: number): string {
  return new Date(Date.parse(`${date}T00:00:00.000Z`) + amount * DAY_MS).toISOString().slice(0, 10);
}

interface DatedEvent extends WeekEvent {
  date: string;
}

// 진행 중인 지원의 면접일·공고 마감일만 일정으로 본다. 결과가 나온 지원의 일정은 더 챙길 일이 아니다.
function collectEvents(applications: Application[]): DatedEvent[] {
  const events: DatedEvent[] = [];
  for (const application of applications) {
    if (!ACTIVE_STATUSES.includes(application.status)) continue;
    const candidates: Array<[WeekEventKind, string | undefined]> = [
      ['interview', application.interviewDate],
      ['deadline', application.deadlineAt],
    ];
    for (const [kind, value] of candidates) {
      const date = toDateOnly(value);
      if (!date) continue;
      events.push({ applicationId: application.id, company: application.company, position: application.position, kind, date });
    }
  }
  return events;
}

function compareEvents(a: WeekEvent, b: WeekEvent): number {
  if (a.kind !== b.kind) return a.kind === 'interview' ? -1 : 1;
  return a.company.localeCompare(b.company, 'ko');
}

// offset: 0 = 이번 주, -1 = 지난주, 1 = 다음 주
export function getWeekTimeline(applications: Application[], today = getTodayInKorea(), offset = 0): WeekTimeline {
  const start = addDays(getWeekStart(today), offset * 7);
  const end = addDays(start, 6);
  const events = collectEvents(applications);

  const appliedCounts = new Map<string, number>();
  for (const application of applications) {
    const date = toDateOnly(application.appliedAt);
    if (date && date >= start && date <= end) appliedCounts.set(date, (appliedCounts.get(date) ?? 0) + 1);
  }

  const days: WeekDay[] = [];
  let interviewCount = 0;
  let deadlineCount = 0;
  for (let index = 0; index < 7; index += 1) {
    const date = addDays(start, index);
    const dayEvents = events
      .filter((event) => event.date === date)
      .map(({ applicationId, company, position, kind }) => ({ applicationId, company, position, kind }))
      .sort(compareEvents);
    for (const event of dayEvents) {
      if (event.kind === 'interview') interviewCount += 1;
      else deadlineCount += 1;
    }
    days.push({
      date,
      dayOfMonth: Number(date.slice(8, 10)),
      weekdayIndex: index,
      events: dayEvents,
      appliedCount: appliedCounts.get(date) ?? 0,
      isToday: date === today,
      isPast: date < today,
    });
  }

  const laterCount = events.filter((event) => event.date > end && event.date >= today).length;
  return { start, end, days, interviewCount, deadlineCount, laterCount };
}
