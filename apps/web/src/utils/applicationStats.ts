import type { Application, Platform, Status } from '@/types/application';
import { getTodayInKorea, isValidDateOnly } from '@/utils/applicationDeadline';

// 홈 대시보드 카드가 쓰는 통계. 검색·필터와 무관하게 항상 전체 지원 내역을 기준으로 계산한다.

const IN_PROGRESS_STATUSES: Status[] = ['applied', 'screening', 'interview', 'interviewed'];
const PASSED_SCREENING_STATUSES: Status[] = ['screening', 'interview', 'interviewed', 'offer'];
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
  passedScreening: number; // 서류 단계를 넘긴 건수 (서류통과 이후 + 합격)
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

  for (const application of applications) {
    counts[application.status] += 1;
    if (application.status === 'rejected' && application.statusSource === 'deadline') autoRejected += 1;
  }

  const sum = (statuses: Status[]) => statuses.reduce((total, status) => total + counts[status], 0);
  const passedScreening = sum(PASSED_SCREENING_STATUSES);
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
        kind,
        date,
        daysLeft: daysBetween(today, date),
      });
    }
  }

  return events.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === b.kind ? 0 : a.kind === 'interview' ? -1 : 1));
}

export interface CalendarDay {
  date: string; // YYYY-MM-DD
  day: number;
  count: number; // 그날 지원한 건수
  companies: string[]; // 그날 지원한 회사 이름 (목록 순서, 날짜 칸 말풍선용)
  applicationIds: string[]; // companies와 같은 순서의 지원 ID (날짜를 누르면 여는 회사 목록용, #190)
  isToday: boolean;
  isFuture: boolean;
}

export interface MonthCalendar {
  year: number;
  month: number; // 1~12
  weeks: Array<Array<CalendarDay | null>>; // 월요일 시작, 앞뒤 빈 칸은 null
  monthTotal: number;
}

// 오늘이 속한 달의 지원 달력. 익스텐션 팝업 달력과 같이 월요일에 시작한다.
export function getMonthCalendar(applications: Application[], today = getTodayInKorea()): MonthCalendar {
  const [year, month] = today.split('-').map(Number);
  const prefix = today.slice(0, 8); // YYYY-MM-
  const appliedByDate = new Map<string, Application[]>();
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
      isToday: date === today,
      isFuture: date > today,
    });
  }

  return { year, month, weeks, monthTotal };
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
