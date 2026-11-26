import type { Application, Platform, Status } from '@/types/application';
import { getTodayInKorea, isValidDateOnly } from '@/utils/applicationDeadline';
import { hasPassedScreening } from '@/utils/statusHistory';

// 홈 대시보드 카드가 쓰는 통계. 검색·필터와 무관하게 항상 전체 지원 내역을 기준으로 계산한다.

const IN_PROGRESS_STATUSES: Status[] = ['applied', 'screening', 'interview', 'interviewed'];
const CLOSED_STATUSES: Status[] = ['offer', 'rejected', 'canceled'];
const PLATFORM_ORDER: Platform[] = ['saramin', 'jobkorea', 'wanted', 'manual'];
const DAY_MS = 24 * 60 * 60 * 1000;

export interface ApplicationOverview {
  total: number;
  companyCount: number; // 회사명 정규화 후 고유 개수
  thisWeekCount: number; // 한국 기준 이번 주 월요일부터 오늘까지 지원한 건수
  manualCount: number;
}

export interface StageSummary {
  counts: Record<Status, number>;
  inProgress: number; // 지원완료·서류통과·면접예정·면접완료
  passedScreening: number; // 서류를 통과한 적 있는 건수. 지금 단계가 아니라 탈락 전 단계까지 본다 (#283)
  closed: number; // 합격·탈락·지원취소
  screeningPassRate: number | null; // 0~1. 지원취소를 뺀 건수가 0이면 null
  screeningBase: number; // 통과율 분모 (전체 - 지원취소)
  autoRejected: number; // 마감일 기준 자동 탈락
}

export interface PlatformShare {
  platform: Platform;
  count: number;
  share: number; // 0~1
}

export interface UpcomingEvent {
  applicationId: string;
  company: string;
  position: string;
  platform: Platform; // 회사 한 줄(CompanyRow)의 사이트 아이콘 (#203)
  kind: 'interview' | 'deadline';
  date: string; // YYYY-MM-DD
  daysLeft: number; // 0이면 오늘
}

// 저장된 ISO 값을 화면 표시(formatDate)와 같은 UTC 기준 날짜로 바꾼다. 날짜만 있는 값은 그대로 쓴다.
export function toDateOnly(value: string | undefined): string | null {
  if (!value) return null;
  if (isValidDateOnly(value)) return value;
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return null;
  return date.toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) / DAY_MS);
}

// 한국 기준 오늘이 속한 주의 월요일 (YYYY-MM-DD)
export function getWeekStart(today: string): string {
  const date = new Date(`${today}T00:00:00.000Z`);
  const daysSinceMonday = (date.getUTCDay() + 6) % 7;
  return new Date(date.valueOf() - daysSinceMonday * DAY_MS).toISOString().slice(0, 10);
}

function normalizeCompany(company: string): string {
  return company.normalize('NFKC').replace(/\s+/g, '').toLowerCase();
}

export function getApplicationOverview(applications: Application[], today = getTodayInKorea()): ApplicationOverview {
  const companies = new Set<string>();
  const weekStart = getWeekStart(today);
  let thisWeekCount = 0;
  let manualCount = 0;

  for (const application of applications) {
    const company = normalizeCompany(application.company);
    if (company) companies.add(company);

    const appliedDate = toDateOnly(application.appliedAt);
    if (appliedDate && appliedDate >= weekStart && appliedDate <= today) thisWeekCount += 1;
    if (application.platform === 'manual') manualCount += 1;
  }

  return { total: applications.length, companyCount: companies.size, thisWeekCount, manualCount };
}

export function getStageSummary(applications: Application[]): StageSummary {
  const counts: Record<Status, number> = {
    applied: 0, screening: 0, interview: 0, interviewed: 0, offer: 0, rejected: 0, canceled: 0,
  };
  let autoRejected = 0;
  let passedScreening = 0;

  for (const application of applications) {
    counts[application.status] += 1;
    if (application.status !== 'canceled' && hasPassedScreening(application)) passedScreening += 1;
    if (application.status === 'rejected' && application.statusSource === 'deadline') autoRejected += 1;
  }

  const sum = (statuses: Status[]) => statuses.reduce((total, status) => total + counts[status], 0);
  const screeningBase = applications.length - counts.canceled;

  return {
    counts,
    inProgress: sum(IN_PROGRESS_STATUSES),
    passedScreening,
    closed: sum(CLOSED_STATUSES),
    screeningPassRate: screeningBase > 0 ? passedScreening / screeningBase : null,
    screeningBase,
    autoRejected,
  };
}

// 건수가 많은 순, 같으면 사람인·잡코리아·원티드·직접입력 순. 0건인 경로도 포함한다.
export function getPlatformShares(applications: Application[]): PlatformShare[] {
  const counts = new Map<Platform, number>();
  for (const platform of PLATFORM_ORDER) counts.set(platform, 0);
  for (const application of applications) {
    counts.set(application.platform, (counts.get(application.platform) ?? 0) + 1);
  }

  const total = applications.length;
  const shares = PLATFORM_ORDER.map((platform) => {
    const count = counts.get(platform) ?? 0;
    return { platform, count, share: total > 0 ? count / total : 0 };
  });
  return shares.sort((a, b) => b.count - a.count || PLATFORM_ORDER.indexOf(a.platform) - PLATFORM_ORDER.indexOf(b.platform));
}

// 종료되지 않은 지원의 오늘 이후 면접일·공고 마감일을 가까운 순으로. 같은 날이면 면접을 먼저 둔다.
export function getUpcomingEvents(applications: Application[], today = getTodayInKorea()): UpcomingEvent[] {
  const events: UpcomingEvent[] = [];

  for (const application of applications) {
    if (CLOSED_STATUSES.includes(application.status)) continue;

    const candidates: Array<[UpcomingEvent['kind'], string | undefined]> = [
      ['interview', application.interviewDate],
      ['deadline', application.deadlineAt],
    ];
    for (const [kind, value] of candidates) {
      const date = toDateOnly(value);
      if (!date || date < today) continue;
      events.push({
        applicationId: application.id,
        company: application.company,
        position: application.position,
        platform: application.platform,
        kind,
        date,
        daysLeft: daysBetween(today, date),
      });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === b.kind ? 0 : a.kind === 'interview' ? -1 : 1));
}

const WEEK_ORDINALS = ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째'];

// 다가오는 일정을 주별로 묶을 때의 이름 (#203). 이번 주·다음 주는 그대로, 그 뒤는 "12월 첫째 주".
// 주는 월요일에 시작하고, "몇째 주"는 그 날짜가 속한 달의 1일이 있는 주를 첫째 주로 센다.
export function getUpcomingWeekLabel(date: string, today = getTodayInKorea()): string {
  const weekGap = daysBetween(getWeekStart(today), getWeekStart(date)) / 7;
  if (weekGap === 0) return '이번 주';
  if (weekGap === 1) return '다음 주';
  const [year, month, day] = date.split('-').map(Number);
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const ordinal = Math.floor((day + firstWeekday - 1) / 7);
  return `${month}월 ${WEEK_ORDINALS[ordinal]} 주`;
}

export interface WeeklyCount {
  weekStart: string; // 그 주 월요일 (YYYY-MM-DD)
  count: number; // 그 주에 지원한 건수 (이번 주는 오늘까지)
  isThisWeek: boolean;
}

// 최근 N주(이번 주 포함) 주별 지원 건수, 오래된 주부터 (#203 주간 지원 막대).
export function getWeeklyApplications(applications: Application[], today = getTodayInKorea(), weekCount = 8): WeeklyCount[] {
  const thisWeek = getWeekStart(today);
  const weeks: WeeklyCount[] = [];
  for (let index = weekCount - 1; index >= 0; index -= 1) {
    const weekStart = new Date(Date.parse(`${thisWeek}T00:00:00.000Z`) - index * 7 * DAY_MS).toISOString().slice(0, 10);
    weeks.push({ weekStart, count: 0, isThisWeek: index === 0 });
  }
  for (const application of applications) {
    const date = toDateOnly(application.appliedAt);
    if (!date || date > today || date < weeks[0].weekStart) continue;
    const weekIndex = Math.floor(daysBetween(weeks[0].weekStart, date) / 7);
    weeks[weekIndex].count += 1;
  }
  return weeks;
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  day: number;
  count: number; // 그날 지원한 건수
  companies: string[]; // 그날 지원한 회사 이름 (목록 순서, 날짜 칸 말풍선용)
  applicationIds: string[]; // companies와 같은 순서의 지원 ID (날짜를 누르면 여는 회사 목록용, #190)
  events: Array<UpcomingEvent['kind']>; // 오늘 이후 그날의 면접·공고 마감 (진행 중인 지원만, #203)
  isToday: boolean;
  isFuture: boolean;
}

export interface MonthCalendar {
  year: number;
  month: number; // 1~12
  weeks: Array<Array<CalendarDay | null>>; // 월요일 시작, 앞뒤 빈 칸은 null
  monthTotal: number;
  topDate: string | null; // 이 달에 가장 많이 지원한 날 하나 (2건 이상일 때만, 같으면 앞 날짜)
}

// 기준 달에서 offset만큼 옮긴 달 (YYYY-MM). 달력의 지난달·다음 달 버튼용.
export function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

// 한 달의 지원 달력(기본은 오늘이 속한 달). 익스텐션 팝업 달력과 같이 월요일에 시작한다.
export function getMonthCalendar(applications: Application[], today = getTodayInKorea(), targetMonth = today.slice(0, 7)): MonthCalendar {
  const [year, month] = targetMonth.split('-').map(Number);
  const prefix = `${targetMonth}-`; // YYYY-MM-
  const appliedByDate = new Map<string, Application[]>();
  const eventsByDate = new Map<string, Array<UpcomingEvent['kind']>>();
  for (const event of getUpcomingEvents(applications, today)) {
    if (!event.date.startsWith(prefix)) continue;
    eventsByDate.set(event.date, [...(eventsByDate.get(event.date) ?? []), event.kind]);
  }
  let monthTotal = 0;
  for (const application of applications) {
    const date = toDateOnly(application.appliedAt);
    if (!date || !date.startsWith(prefix)) continue;
    const applied = appliedByDate.get(date) ?? [];
    applied.push(application);
    appliedByDate.set(date, applied);
    monthTotal += 1;
  }

  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cellCount = Math.ceil((firstWeekday + lastDay) / 7) * 7;
  const weeks: MonthCalendar['weeks'] = [];
  for (let index = 0; index < cellCount; index += 1) {
    if (index % 7 === 0) weeks.push([]);
    const day = index - firstWeekday + 1;
    if (day < 1 || day > lastDay) {
      weeks[weeks.length - 1].push(null);
      continue;
    }
    const date = `${prefix}${String(day).padStart(2, '0')}`;
    const applied = appliedByDate.get(date) ?? [];
    weeks[weeks.length - 1].push({
      date,
      day,
      count: applied.length,
      companies: applied.map((application) => application.company.trim()),
      applicationIds: applied.map((application) => application.id),
      events: eventsByDate.get(date) ?? [],
      isToday: date === today,
      isFuture: date > today,
    });
  }

  let topDate: string | null = null;
  let topCount = 1;
  for (const [date, applied] of [...appliedByDate].sort(([a], [b]) => a.localeCompare(b))) {
    if (applied.length > topCount) {
      topDate = date;
      topCount = applied.length;
    }
  }

  return { year, month, weeks, monthTotal, topDate };
}

// 지원일 최신순, 같은 날이면 최근 수정순
export function getRecentApplications(applications: Application[], limit = 4): Application[] {
  return [...applications]
    .sort((a, b) => {
      const byApplied = (toDateOnly(b.appliedAt) ?? '').localeCompare(toDateOnly(a.appliedAt) ?? '');
      return byApplied || b.updatedAt.localeCompare(a.updatedAt);
    })
    .slice(0, limit);
}
