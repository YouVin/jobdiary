import type { Application, StatusChange, Status } from '@/types/application';
import { daysBetween, toDateOnly } from '@/utils/applicationStats';

// 단계 변경 이력 (#283)으로 "어디까지 갔는지"와 "얼마나 걸렸는지"를 계산한다.
// 이력은 DB 트리거가 2026-11-26부터 남긴다. 그 전 지원은 면접 날짜·단계 기록으로 어디까지 갔는지만 추정한다.

const CLOSED: Status[] = ['rejected', 'canceled'];
// 앞으로 나아간 정도. 면접 예정·완료는 같은 "면접" 단계로 본다
const RANK: Record<Status, number> = { applied: 0, screening: 1, interview: 2, interviewed: 2, offer: 3, rejected: -1, canceled: -1 };
const MIN_SAMPLES = 2; // 평균은 2곳 이상 모였을 때만 보여 준다
const REVERT_MS = 10 * 60 * 1000; // 10분 안에 되돌린 변경은 실수로 보고 지나온 기록에서 숨긴다

function isClosed(status: Status): boolean {
  return CLOSED.includes(status);
}

// 시각(ISO)의 한국 날짜
function koreaDate(iso: string): string | null {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date(time));
}

// 이력이 없는 예전 지원: 면접 날짜가 있으면 면접까지, 단계를 적어 둔 기록이 있으면 그 단계까지 갔다고 본다
function estimateReached(application: Application): Status {
  let reached: Status = 'applied';
  if (application.interviewDate) reached = 'interview';
  for (const entry of application.diary ?? []) {
    if (entry.status && !isClosed(entry.status) && RANK[entry.status] > RANK[reached]) reached = entry.status;
  }
  return reached;
}

// 끝나기 전 마지막 단계. 진행 중이거나 합격이면 지금 단계 그대로다.
// 탈락했다 다시 진행으로 옮긴 경우처럼 고친 것은 마지막 변경만 보므로 따라간다.
export function getReachedStatus(application: Application): Status {
  if (!isClosed(application.status)) return application.status;
  const history = application.statusHistory ?? [];
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const change = history[index];
    if (!isClosed(change.to)) break; // 이력이 지금 단계와 이어지지 않으면 추정으로
    if (change.from === null) break; // 처음부터 탈락으로 저장된 지원
    if (!isClosed(change.from)) return change.from;
  }
  return estimateReached(application);
}

// 서류를 통과한 적이 있는지: 지금 서류 통과 이후이거나, 서류 통과 이후에 끝난 곳
export function hasPassedScreening(application: Application): boolean {
  return RANK[getReachedStatus(application)] >= RANK.screening;
}

// 탈락한 지원이 어디서 떨어졌는지 짧게 ("면접 후 탈락"). 서류 단계에서 떨어졌으면 null
export function getRejectedAfterLabel(application: Application): string | null {
  if (application.status !== 'rejected') return null;
  const reached = getReachedStatus(application);
  if (RANK[reached] >= RANK.interview) return reached === 'offer' ? '합격 후 탈락' : '면접 후 탈락';
  if (reached === 'screening') return '서류 통과 후 탈락';
  return null;
}

export interface StageFunnel {
  applied: number; // 지원취소를 뺀 전체
  screening: number; // 서류 통과까지 간 곳
  interview: number; // 면접까지 간 곳
  offer: number; // 합격
}

// 지나온 단계 흐름: 지원 → 서류 통과 → 면접 → 합격. 지금 단계가 아니라 어디까지 갔는지로 센다.
export function getStageFunnel(applications: Application[]): StageFunnel {
  const funnel: StageFunnel = { applied: 0, screening: 0, interview: 0, offer: 0 };
  for (const application of applications) {
    if (application.status === 'canceled') continue;
    const rank = RANK[getReachedStatus(application)];
    funnel.applied += 1;
    if (rank >= RANK.screening) funnel.screening += 1;
    if (rank >= RANK.interview) funnel.interview += 1;
    if (application.status === 'offer') funnel.offer += 1;
  }
  return funnel;
}

export interface AverageDays {
  days: number; // 반올림한 평균 일수
  count: number; // 평균에 쓴 지원 수
}

export interface StageDurations {
  toScreening: AverageDays | null; // 지원일 → 서류 통과로 옮긴 날
  afterInterview: AverageDays | null; // 면접일 → 합격·탈락으로 옮긴 날
}

function average(values: number[]): AverageDays | null {
  if (values.length < MIN_SAMPLES) return null;
  const sum = values.reduce((total, value) => total + value, 0);
  return { days: Math.round(sum / values.length), count: values.length };
}

// 결과까지 걸린 날. 이력에 남은 실제 변경만 쓴다(예전 지원·처음부터 그 단계로 저장된 지원은 빠진다).
export function getStageDurations(applications: Application[]): StageDurations {
  const toScreening: number[] = [];
  const afterInterview: number[] = [];
  for (const application of applications) {
    const history = application.statusHistory ?? [];
    const appliedDate = toDateOnly(application.appliedAt);
    const interviewDate = toDateOnly(application.interviewDate);

    const passed = history.find((change) => change.from === 'applied' && RANK[change.to] >= RANK.screening);
    const passedDate = passed ? koreaDate(passed.at) : null;
    if (appliedDate && passedDate && passedDate >= appliedDate) toScreening.push(daysBetween(appliedDate, passedDate));

    if (interviewDate) {
      const result = history.find((change) => (change.to === 'offer' || change.to === 'rejected') && change.from !== null && RANK[change.from] === RANK.interview);
      const resultDate = result ? koreaDate(result.at) : null;
      if (resultDate && resultDate >= interviewDate) afterInterview.push(daysBetween(interviewDate, resultDate));
    }
  }
  return { toScreening: average(toScreening), afterInterview: average(afterInterview) };
}

export interface StatusStep {
  key: string;
  status: Status; // 옮긴 단계
  date: string; // 한국 날짜
  at: string;
  source: StatusChange['source'];
  isFirst: boolean; // 처음 저장할 때의 단계
}

// 지나온 기록에 넣을 단계 변경. 지원 완료로 처음 저장한 것은 "지원했어요"와 겹쳐 빼고,
// 10분 안에 바로 되돌린 변경(잘못 옮김·되돌리기)은 둘 다 뺀다.
export function getStatusSteps(application: Application): StatusStep[] {
  const kept: StatusChange[] = [];
  for (const change of application.statusHistory ?? []) {
    const last = kept.at(-1);
    const isRevert = last && last.from === change.to && last.to === change.from && Date.parse(change.at) - Date.parse(last.at) < REVERT_MS;
    if (isRevert) kept.pop();
    else kept.push(change);
  }
  const steps: StatusStep[] = [];
  for (const [index, change] of kept.entries()) {
    const date = koreaDate(change.at);
    if (!date || (change.from === null && change.to === 'applied')) continue;
    steps.push({ key: `status-${index}-${change.at}`, status: change.to, date, at: change.at, source: change.source, isFirst: change.from === null });
  }
  return steps;
}
