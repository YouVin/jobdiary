import type { Application, HiringProcess, ProcessStep, Status, StepKind } from '@/types/application';
import { getReachedStatus } from '@/utils/statusHistory';

// 공고 전형 절차 (#295)의 순수 계산.
// - 글로 적힌 절차("서류전형 → 1차면접 → 최종합격")는 여기 규칙으로 읽는다(AI 비용 0). 못 읽으면 서버 AI.
// - 단계 이름은 공고 그대로 두고, 종류(서류·테스트·면접·최종)로 지원 단계(Status)와 통계에 잇는다.

export const MAX_STEPS = 10;
export const MAX_STEP_NAME = 30;

// 절차가 시작되는 머리말
const HEADER = /(전형\s*절차|채용\s*절차|채용\s*전형|전형\s*과정|채용\s*과정|채용\s*프로세스|전형\s*방법|선발\s*절차|진행\s*절차)/;
// 단계 사이 기호: > → -> ⇒ ▶ ► 〉 》 ≫ › » >>> =>
const SEPARATOR = /\s*(?:>{1,3}|→|->|⇒|=>|▶|►|〉|》|≫|›|»)\s*/;

// 이름으로 종류 정하기. "최종 면접"은 면접, "서류 합격 발표"는 서류가 먼저 걸리게 순서를 둔다.
export function kindOfStep(name: string): StepKind {
  if (/면접|인터뷰|interview|PT|발표\s*면접|컬처|culture|핏/i.test(name)) return 'interview';
  if (/서류|접수|지원서|이력서/.test(name)) return 'document';
  if (/코딩|코테|테스트|test|과제|인적성|필기|설문|역량\s*검사|적성|검사|포트폴리오|실기|시험/i.test(name)) return 'test';
  if (/합격|발표|처우|입사|채용|오퍼|offer|최종|계약/i.test(name)) return 'final';
  return 'test';
}

function cleanName(value: string): string {
  return value
    .replace(/^\s*(step\s*\d+|\d+\s*[.)차]?\s*단계|\d+\s*[.)]|[-·•ㆍ*]+)\s*/i, '')
    .replace(/\s*[:：].*$/, '') // "1. 서류 접수 : 이력서…" 설명 빼기
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_STEP_NAME);
}

function toSteps(names: string[]): ProcessStep[] {
  const steps: ProcessStep[] = [];
  for (const raw of names) {
    const name = cleanName(raw);
    if (!name || !/[가-힣A-Za-z]/.test(name) || steps.at(-1)?.name === name) continue;
    steps.push({ name, kind: kindOfStep(name) });
    if (steps.length === MAX_STEPS) break;
  }
  return steps;
}

// 줄 앞의 글머리표·머리말 떼기: "· 전형절차 : 서류전형 → …" → "서류전형 → …"
const HEADER_PREFIX = new RegExp(`^.*?${HEADER.source}\\s*[:：]?\\s*`);
function stripHeader(line: string): string {
  return line.replace(/^\s*[:：]\s*/, '').replace(/^[·•ㆍ\-*]\s*/, '').replace(HEADER_PREFIX, '');
}

// 글에서 절차 찾기: 머리말 뒤 몇 줄 안에서 ① 기호로 이어진 한 줄 또는 ② 번호 붙은 줄들. 2단계 이상일 때만 믿는다.
export function extractProcessFromText(text: string): ProcessStep[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].match(HEADER);
    if (!match) continue;
    // 그림으로 된 절차의 글자("1", "서류 접수" …)가 줄마다 끼는 공고가 있어 아래 20줄까지 본다
    const window = [lines[index].slice((match.index ?? 0) + match[0].length), ...lines.slice(index + 1, index + 21)].map(stripHeader);

    // ① "서류전형 > 1차면접 > 최종합격" (머리말 같은 줄 또는 아래 줄)
    for (const line of window) {
      const parts = line.split(SEPARATOR);
      if (parts.length >= 2 && parts.every((part) => part.trim().length <= 40)) {
        const steps = toSteps(parts);
        if (steps.length >= 2) return steps;
      }
    }

    // ② "1. 서류 접수 : …" "2. 사전 설문조사 : …" 처럼 번호가 이어지는 줄
    const numbered: string[] = [];
    for (const line of window) {
      if (/^\d+\s*[.)]\s*\S/.test(line)) numbered.push(line);
      else if (numbered.length > 0) break;
    }
    const steps = toSteps(numbered);
    if (steps.length >= 2) return steps;
  }
  return [];
}

// 사용자가 한 줄로 고친 절차("서류 > 코딩테스트 > 1차 면접 > 최종 합격")
export function parseProcessInput(value: string): ProcessStep[] {
  return toSteps(value.split(/\s*(?:>|→|,)\s*/));
}

export function formatProcessInput(steps: ProcessStep[]): string {
  return steps.map((step) => step.name).join(' > ');
}

export function createHiringProcess(steps: ProcessStep[], source: HiringProcess['source'], now = new Date()): HiringProcess {
  return { steps, source, checkedAt: now.toISOString() };
}

// ── 단계 ↔ 지원 단계 ──
// 그 단계에 와 있으면 지원 단계는: 서류 → 지원 완료, 테스트 → 서류 통과, 면접 → 면접 예정,
// 최종 → 이름에 합격·채용·입사가 있으면 합격, 아니면(결과 발표·처우 협의) 면접 완료.
export function statusForStep(step: ProcessStep): Status {
  if (step.kind === 'document') return 'applied';
  if (step.kind === 'test') return 'screening';
  if (step.kind === 'interview') return 'interview';
  return /합격|채용|입사|오퍼|offer/i.test(step.name) ? 'offer' : 'interviewed';
}

function lastIndexOf(steps: ProcessStep[], predicate: (step: ProcessStep) => boolean): number {
  for (let index = steps.length - 1; index >= 0; index -= 1) if (predicate(steps[index])) return index;
  return -1;
}

// 지금 단계 번호. 트랙에서 고른 번호가 지금 지원 단계와 맞으면 그대로(1차·2차 면접 구분),
// 보드 끌기·익스텐션 동기화로 지원 단계만 바뀌었으면 지원 단계로 다시 찾는다. 끝난 지원은 탈락 전 단계로.
export function getCurrentStepIndex(application: Application, steps: ProcessStep[]): number {
  const status = ['rejected', 'canceled'].includes(application.status) ? getReachedStatus(application) : application.status;
  const chosen = application.hiringProcess?.step;
  if (chosen !== undefined && steps[chosen] && statusForStep(steps[chosen]) === status) return chosen;

  const first = steps.findIndex((step) => statusForStep(step) === status);
  if (status === 'interviewed') {
    // 면접을 마쳤으면 마지막 면접(결과 기다림 단계가 있으면 그 단계)
    const waiting = steps.findIndex((step) => statusForStep(step) === 'interviewed');
    return waiting >= 0 ? waiting : Math.max(lastIndexOf(steps, (step) => step.kind === 'interview'), 0);
  }
  if (first >= 0) return first;
  if (status === 'screening') return Math.max(lastIndexOf(steps, (step) => step.kind === 'document'), 0); // 테스트 없이 서류만 통과
  if (status === 'offer') return steps.length - 1;
  return 0;
}

// 공고에서 읽을 지원: 공고 주소가 있고, 아직 안 읽었고, 진행 중인 지원(끝난 지원은 비용을 쓰지 않는다)
export function needsProcess(application: Application): boolean {
  return !!application.url && application.hiringProcess == null && !['offer', 'rejected', 'canceled'].includes(application.status);
}
