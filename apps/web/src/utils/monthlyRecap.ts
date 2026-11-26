import { PLATFORM_INFO } from '@/constants/platform';
import type { Application, Platform } from '@/types/application';
import { getTodayInKorea } from '@/utils/applicationDeadline';
import { toDateOnly } from '@/utils/applicationStats';
import { hasPassedScreening } from '@/utils/statusHistory';

// 이번 달 돌아보기 (#275). 이미지로 저장해 밖에 올리는 카드라 회사 이름은 넣지 않고 숫자만 모은다.

export interface MonthlyRecap {
  month: string; // YYYY-MM
  monthNumber: number; // 11
  appliedCount: number; // 이번 달 지원한 곳
  passedCount: number; // 그중 서류를 통과한 적 있는 곳 (면접 후 탈락 포함, #283)
  interviewCount: number; // 이번 달 면접일이 있는 지원
  offerCount: number; // 그중 합격
  diaryCount: number; // 이번 달 남긴 기록
  topPlatform: string | null; // 가장 많이 지원한 사이트 이름
  busiestDay: { day: number; count: number } | null; // 가장 많이 지원한 날 (2곳 이상일 때만)
  totalCount: number; // 지금까지 전체
}

// 기록 시각(ISO)의 한국 날짜
function koreaDate(iso: string): string | null {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(time));
}

export function getMonthlyRecap(applications: Application[], today = getTodayInKorea()): MonthlyRecap {
  const month = today.slice(0, 7);
  const inMonth = (date: string | null) => date?.slice(0, 7) === month;

  let appliedCount = 0;
  let passedCount = 0;
  let offerCount = 0;
  let interviewCount = 0;
  let diaryCount = 0;
  const byPlatform = new Map<Platform, number>();
  const byDay = new Map<string, number>();

  for (const application of applications) {
    // 지원일 기준: 이번 달 지원한 곳과 그 결과
    const appliedDate = toDateOnly(application.appliedAt);
    if (inMonth(appliedDate) && appliedDate) {
      appliedCount += 1;
      if (hasPassedScreening(application)) passedCount += 1;
      if (application.status === 'offer') offerCount += 1;
      byPlatform.set(application.platform, (byPlatform.get(application.platform) ?? 0) + 1);
      byDay.set(appliedDate, (byDay.get(appliedDate) ?? 0) + 1);
    }
    // 면접일·기록은 지원한 달과 상관없이 이번 달에 있었던 것
    if (inMonth(toDateOnly(application.interviewDate))) interviewCount += 1;
    for (const entry of application.diary ?? []) {
      if (inMonth(koreaDate(entry.createdAt))) diaryCount += 1;
    }
  }

  // 같은 수면 먼저 나온 쪽(사이트는 사람인·잡코리아·원티드·직접 순, 날짜는 이른 날)
  let topPlatform: string | null = null;
  let topPlatformCount = 0;
  for (const platform of ['saramin', 'jobkorea', 'wanted', 'manual'] as Platform[]) {
    const count = byPlatform.get(platform) ?? 0;
    if (count > topPlatformCount) {
      topPlatform = PLATFORM_INFO[platform].label;
      topPlatformCount = count;
    }
  }
  let busiestDay: MonthlyRecap['busiestDay'] = null;
  for (const [date, count] of [...byDay].sort(([a], [b]) => a.localeCompare(b))) {
    if (count >= 2 && (!busiestDay || count > busiestDay.count)) busiestDay = { day: Number(date.slice(8, 10)), count };
  }

  return {
    month,
    monthNumber: Number(month.slice(5, 7)),
    appliedCount,
    passedCount,
    interviewCount,
    offerCount,
    diaryCount,
    topPlatform,
    busiestDay,
    totalCount: applications.length,
  };
}

// 이미지 대체 글·공유 문구로 쓰는 한 문단
export function describeMonthlyRecap(recap: MonthlyRecap): string {
  const parts = [`${recap.monthNumber}월에 ${recap.appliedCount}곳 지원`, `서류 통과 이상 ${recap.passedCount}곳`, `면접 ${recap.interviewCount}번`];
  if (recap.offerCount) parts.push(`합격 ${recap.offerCount}곳`);
  parts.push(`기록 ${recap.diaryCount}개`);
  return `${parts.join(', ')}.`;
}
