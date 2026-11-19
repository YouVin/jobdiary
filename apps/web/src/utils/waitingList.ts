import type { Application, Status } from '@/types/application';
import { getTodayInKorea } from '@/utils/applicationDeadline';
import { daysBetween, getWeekStart, toDateOnly } from '@/utils/applicationStats';
import { ACTIVE_STATUSES, addDays, type WeekEventKind } from '@/utils/weekTimeline';

// 지원 보드 "결과 기다리는 중" 목록 (#174). 날짜 기준은 주간 타임라인(weekTimeline.ts)과 같다.
// 이번 주 일정(면접·공고 마감)이 있는 진행 중 지원은 위 타임라인에 이미 보이므로 목록에서 뺀다.

export const STALE_DAYS = 14; // 지원완료에서 이만큼 지나면 "소식 없음"으로 강조
export const RESULT_STATUSES = ['rejected', 'offer', 'canceled'] as const;
export type ResultStatus = (typeof RESULT_STATUSES)[number];

export interface WaitingItem {
  application: Application;
  stageIndex: number; // 0 지원완료 … 3 면접완료
  waitDays: number; // 지원일부터 오늘까지
  isStale: boolean;
  nextEvent: { kind: WeekEventKind; date: string; daysLeft: number } | null; // 오늘 이후 가장 가까운 일정
}

export interface WaitingBoard {
  items: WaitingItem[]; // 지원일이 오래된 순
  scheduledCount: number; // 같은 조건이지만 이번 주 일정이 있어 타임라인에 있는 지원 수
  stageCounts: Record<Status, number>; // 진행 단계별 전체 건수 (단계 버튼용)
  resultCounts: Record<ResultStatus, number>;
  resultTotal: number;
}

function eventDates(application: Application): Array<[WeekEventKind, string]> {
  const dates: Array<[WeekEventKind, string]> = [];
  const interview = toDateOnly(application.interviewDate);
  const deadline = toDateOnly(application.deadlineAt);
  if (interview) dates.push(['interview', interview]);
  if (deadline) dates.push(['deadline', deadline]);
  return dates;
}

// stage를 주면 그 단계만 목록에 남긴다(단계 버튼). 건수 집계는 stage와 상관없이 전체 기준이다.
export function getWaitingBoard(applications: Application[], today = getTodayInKorea(), stage: Status | null = null): WaitingBoard {
  const weekStart = getWeekStart(today);
  const weekEnd = addDays(weekStart, 6);
  const stageCounts = { applied: 0, screening: 0, interview: 0, interviewed: 0, offer: 0, rejected: 0, canceled: 0 } as Record<Status, number>;
  const items: WaitingItem[] = [];
  let scheduledCount = 0;

  for (const application of applications) {
    stageCounts[application.status] += 1;
    const stageIndex = ACTIVE_STATUSES.indexOf(application.status);
    if (stageIndex < 0) continue;
    if (stage && application.status !== stage) continue;

    const dates = eventDates(application);
    if (dates.some(([, date]) => date >= weekStart && date <= weekEnd)) {
      scheduledCount += 1;
      continue;
    }

    let nextEvent: WaitingItem['nextEvent'] = null;
    for (const [kind, date] of dates) {
      if (date < today) continue;
      if (!nextEvent || date < nextEvent.date) nextEvent = { kind, date, daysLeft: daysBetween(today, date) };
    }

    const appliedDate = toDateOnly(application.appliedAt) ?? today;
    const waitDays = Math.max(0, daysBetween(appliedDate, today));
    items.push({
      application,
      stageIndex,
      waitDays,
      isStale: application.status === 'applied' && waitDays >= STALE_DAYS,
      nextEvent,
    });
  }

  // 오래 기다린 순. 같은 날 지원은 회사명 가나다순.
  items.sort((a, b) => b.waitDays - a.waitDays || a.application.company.localeCompare(b.application.company, 'ko'));

  const resultCounts = { rejected: stageCounts.rejected, offer: stageCounts.offer, canceled: stageCounts.canceled };
  return {
    items,
    scheduledCount,
    stageCounts,
    resultCounts,
    resultTotal: resultCounts.rejected + resultCounts.offer + resultCounts.canceled,
  };
}
