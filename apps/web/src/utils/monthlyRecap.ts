import { PLATFORM_INFO } from '@/constants/platform';
import type { Application, Platform, Status } from '@/types/application';
import { shiftMonth, toDateOnly } from '@/utils/applicationStats';
import { getStatusSteps } from '@/utils/statusHistory';

// 이번 달 돌아보기 (#275, #316). 앱 안에서 한 달을 한눈에 보는 창의 숫자·달력·소식을 만든다.
// 숫자와 소식은 모두 "그 달에 생긴 일" 기준이다: 그 달에 지원한 곳, 그 달에 서류 통과·합격으로 옮긴 곳, 그 달에 잡힌 면접, 그 달에 남긴 기록.

// 소식 종류. 한 날에 여러 개면 이 순서로 보여 준다(앞일수록 중요한 소식)
export type MonthEventKind = 'offer' | 'screening' | 'interview' | 'diary' | 'applied';
const EVENT_ORDER: MonthEventKind[] = ['offer', 'screening', 'interview', 'diary', 'applied'];

export interface MonthEvent {
  date: string; // YYYY-MM-DD (한국 날짜)
  kind: MonthEventKind;
  companies: string[]; // 지원은 그날 지원한 회사 모두, 나머지는 한 회사
  text?: string; // 기록은 첫 줄
}

export interface MonthlyRecap {
  month: string; // YYYY-MM
  monthNumber: number; // 11
  appliedCount: number; // 그 달에 지원한 곳
  passedCount: number; // 그 달에 서류 통과로 옮긴 곳
  interviewCount: number; // 그 달에 면접일이 있는 지원
  offerCount: number; // 그 달에 합격으로 옮긴 곳
  diaryCount: number; // 그 달에 남긴 기록
  appliedByDay: Record<number, number>; // 날(1~31) → 지원한 곳 수
  markedDays: number[]; // 서류 통과·면접·합격이 있던 날
  events: MonthEvent[]; // 최근 날짜부터
  topPlatform: string | null; // 가장 많이 지원한 사이트 이름
  busiestDay: { day: number; count: number } | null; // 가장 많이 지원한 날 (2곳 이상일 때만)
}

const PASSED: Status[] = ['screening', 'interview', 'interviewed', 'offer'];
const DIARY_PREVIEW = 40;

// 기록 시각(ISO)의 한국 날짜
function koreaDate(iso: string): string | null {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(time));
}

// 서류 통과한 날·합격한 날. 처음 저장할 때부터 그 단계였던 지원(가져오기 등)은 그날을 통과한 날로 보지 않는다.
function passedAndOfferDates(application: Application): { passed: string | null; offer: string | null } {
  let passed: string | null = null;
  let offer: string | null = null;
  let hasPassed = false;
  for (const step of getStatusSteps(application)) {
    const isPassedStage = PASSED.includes(step.status);
    if (isPassedStage && !hasPassed && !step.isFirst) passed = step.date;
    if (isPassedStage) hasPassed = true;
    if (step.status === 'offer' && !offer && !step.isFirst) offer = step.date;
  }
  return { passed, offer };
}

// 넘겨 볼 수 있는 달: 가장 이른 지원의 달부터 이번 달까지(오래된 달부터). 지원이 없으면 이번 달만
export function getRecapMonths(applications: Application[], today: string, maxMonths = 24): string[] {
  const current = today.slice(0, 7);
  let earliest = current;
  for (const application of applications) {
    const month = toDateOnly(application.appliedAt)?.slice(0, 7);
    if (month && month < earliest) earliest = month;
  }
  const months: string[] = [];
  for (let month = current; month >= earliest && months.length < maxMonths; month = shiftMonth(month, -1)) months.unshift(month);
  return months;
}

export function getMonthlyRecap(applications: Application[], month: string): MonthlyRecap {
  const inMonth = (date: string | null | undefined) => date?.slice(0, 7) === month;
  const dayOf = (date: string) => Number(date.slice(8, 10));

  const appliedByDay: Record<number, number> = {};
  const appliedCompanies = new Map<string, string[]>();
  const events: MonthEvent[] = [];
  const marked = new Set<number>();
  const byPlatform = new Map<Platform, number>();
  let interviewCount = 0;
  let passedCount = 0;
  let offerCount = 0;
  let diaryCount = 0;

  for (const application of applications) {
    // 그 달에 지원한 곳(날마다 묶는다)
    const appliedDate = toDateOnly(application.appliedAt);
    if (appliedDate && inMonth(appliedDate)) {
      appliedByDay[dayOf(appliedDate)] = (appliedByDay[dayOf(appliedDate)] ?? 0) + 1;
      appliedCompanies.set(appliedDate, [...(appliedCompanies.get(appliedDate) ?? []), application.company]);
      byPlatform.set(application.platform, (byPlatform.get(application.platform) ?? 0) + 1);
    }
    // 그 달에 서류 통과·합격으로 옮긴 곳
    const { passed, offer } = passedAndOfferDates(application);
    if (passed && inMonth(passed)) {
      passedCount += 1;
      marked.add(dayOf(passed));
      events.push({ date: passed, kind: 'screening', companies: [application.company] });
    }
    if (offer && inMonth(offer)) {
      offerCount += 1;
      marked.add(dayOf(offer));
      events.push({ date: offer, kind: 'offer', companies: [application.company] });
    }
    // 그 달에 잡힌 면접(지원한 달과 상관없이)
    const interviewDate = toDateOnly(application.interviewDate);
    if (interviewDate && inMonth(interviewDate)) {
      interviewCount += 1;
      marked.add(dayOf(interviewDate));
      events.push({ date: interviewDate, kind: 'interview', companies: [application.company] });
    }
    // 그 달에 남긴 기록(한국 날짜)
    for (const entry of application.diary ?? []) {
      const date = koreaDate(entry.createdAt);
      if (!date || !inMonth(date)) continue;
      diaryCount += 1;
      const firstLine = entry.content.split('\n').find((line) => line.trim())?.trim() ?? '';
      events.push({ date, kind: 'diary', companies: [application.company], text: firstLine.length > DIARY_PREVIEW ? `${firstLine.slice(0, DIARY_PREVIEW)}…` : firstLine });
    }
  }
  for (const [date, companies] of appliedCompanies) events.push({ date, kind: 'applied', companies });
  events.sort((a, b) => b.date.localeCompare(a.date) || EVENT_ORDER.indexOf(a.kind) - EVENT_ORDER.indexOf(b.kind));

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
  for (const [day, count] of Object.entries(appliedByDay).map(([d, c]) => [Number(d), c] as const).sort(([a], [b]) => a - b)) {
    if (count >= 2 && (!busiestDay || count > busiestDay.count)) busiestDay = { day, count };
  }

  return {
    month,
    monthNumber: Number(month.slice(5, 7)),
    appliedCount: Object.values(appliedByDay).reduce((sum, count) => sum + count, 0),
    passedCount,
    interviewCount,
    offerCount,
    diaryCount,
    appliedByDay,
    markedDays: [...marked].sort((a, b) => a - b),
    events,
    topPlatform,
    busiestDay,
  };
}

// 창 위 한 문장 ("이번 달 18곳에 지원했고, 1곳이 서류를 통과했어요")
export function summarizeMonthlyRecap(recap: MonthlyRecap, isCurrentMonth: boolean): string {
  const when = isCurrentMonth ? '이번 달' : `${recap.monthNumber}월에`;
  // 지원 뒤에 붙일 가장 큰 소식 하나(합격 > 서류 통과 > 면접)
  let news: string | null = null;
  if (recap.offerCount > 0) news = `${recap.offerCount}곳에 합격했어요`;
  else if (recap.passedCount > 0) news = `${recap.passedCount}곳이 서류를 통과했어요`;
  else if (recap.interviewCount > 0) news = `면접이 ${recap.interviewCount}번 있었어요`;
  if (recap.appliedCount > 0) return news ? `${when} ${recap.appliedCount}곳에 지원했고, ${news}.` : `${when} ${recap.appliedCount}곳에 지원했어요.`;
  if (news) return `${when} ${news}.`;
  return isCurrentMonth ? '이번 달은 아직 지원 소식이 없어요.' : `${recap.monthNumber}월에는 지원 소식이 없어요.`;
}

// 이미지 대체 글·공유 문구로 쓰는 한 문단
export function describeMonthlyRecap(recap: MonthlyRecap): string {
  const parts = [`${recap.monthNumber}월에 ${recap.appliedCount}곳 지원`, `서류 통과 ${recap.passedCount}곳`, `면접 ${recap.interviewCount}번`];
  if (recap.offerCount) parts.push(`합격 ${recap.offerCount}곳`);
  parts.push(`기록 ${recap.diaryCount}개`);
  return `${parts.join(', ')}.`;
}
